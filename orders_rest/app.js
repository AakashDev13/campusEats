const express = require("express");
const crypto = require("crypto");
const methodOverride = require("method-override");

const { Order } = require("./models");
const store = require("./store");
const { problem } = require("./errors");
const paymentClient = require("./payment_client");

const app = express();

const VALID_STATUSES = new Set(["PENDING", "CONFIRMED", "CANCELLED"]);
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map();

app.disable("x-powered-by");
app.set("json spaces", 2);

app.use(express.json({ limit: "1mb" }));

// Assignment 5: documented fallback for clients that cannot send PUT/PATCH/DELETE.
app.use(methodOverride("X-HTTP-Method-Override"));

// Security + CORS headers on every response.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Strict-Transport-Security", "max-age=31536000");
  res.setHeader("Server", "CampusEats-JS");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, If-Match, If-None-Match, Idempotency-Key, X-HTTP-Method-Override"
  );
  res.setHeader("Access-Control-Expose-Headers", "Location, ETag, X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After");
  next();
});

// OPTIONS implements both CORS preflight and Allow for resources.
app.options(/.*/, (req, res) => {
  const path = req.path;
  if (path === "/orders") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
  } else if (/^\/orders\/[^/]+$/.test(path)) {
    res.setHeader("Allow", "GET, PUT, PATCH, DELETE, OPTIONS");
  } else if (/^\/orders\/[^/]+\/cancellation$/.test(path) || /^\/orders\/[^/]+\/cancel$/.test(path)) {
    res.setHeader("Allow", "POST, OPTIONS");
  } else {
    res.setHeader("Allow", "OPTIONS");
  }
  return res.status(204).end();
});

// Per-client rate limit.
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return next();

  const clientId = req.get("Authorization") || req.ip;
  const now = Date.now();
  let bucket = rateBuckets.get(clientId);

  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    bucket = { startedAt: now, count: 0 };
    rateBuckets.set(clientId, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, RATE_LIMIT - bucket.count);
  res.setHeader("X-RateLimit-Limit", RATE_LIMIT);
  res.setHeader("X-RateLimit-Remaining", remaining);

  if (bucket.count > RATE_LIMIT) {
    res.setHeader("Retry-After", 60);
    return res.status(429).json(problem(429, "Too Many Requests", "Per-client rate limit exceeded"));
  }
  next();
});

function acceptsJson(req) {
  const accept = req.get("Accept");
  if (!accept || accept === "*/*") return true;
  return accept.split(",").some(part => {
    const type = part.trim().split(";")[0].toLowerCase();
    return type === "application/json" || type === "*/*";
  });
}

function requireJsonAccept(req, res, next) {
  if (!acceptsJson(req)) {
    return res.status(406).json(problem(406, "Not Acceptable", "Only application/json is supported"));
  }
  next();
}

function requireAuthorization(req, res, next) {
  const auth = req.get("Authorization") || "";
  if (!auth.startsWith("Bearer ") || !auth.slice(7).trim()) {
    return res.status(401).json(problem(401, "Unauthorized", "Bearer token is required"));
  }
  next();
}

function requireJsonContentType(req, res, next) {
  const contentType = req.get("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return res.status(400).json(problem(400, "Bad Request", "Content-Type: application/json is required"));
  }
  next();
}

function validateOrder(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "Request body must be a JSON object";
  }
  if (!Number.isInteger(data.user_id)) {
    return "user_id must be an integer";
  }
  const items = data.items;
  if (!Array.isArray(items) || items.length === 0) {
    return "items must be a non-empty array";
  }
  if (items.length > 20) {
    return "The order cannot contain more than 20 items";
  }

  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return "Each item must be an object";
    }
    if (!Number.isInteger(item.item_id)) return "item_id must be an integer";
    if (typeof item.name !== "string" || !item.name.trim()) return "item name is required";
    if (typeof item.unit_price !== "number" || !Number.isFinite(item.unit_price) || item.unit_price <= 0) {
      return "unit_price must be positive";
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return "quantity must be a positive integer";
    }
  }
  return null;
}

function validatePatch(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "Request body must be a JSON object";
  if ("user_id" in data && !Number.isInteger(data.user_id)) return "user_id must be an integer";
  if ("status" in data && !VALID_STATUSES.has(data.status)) return "Unsupported order status";
  if ("items" in data) {
    const error = validateOrder({ user_id: 1, items: data.items });
    if (error) return error;
  }
  return null;
}

function etagFor(order) {
  const body = JSON.stringify(order.asJson());
  return `"${crypto.createHash("sha256").update(body).digest("hex").slice(0, 16)}"`;
}

function setEtag(res, etag) {
  res.setHeader("ETag", etag);
}

function sendJson(res, status, body, headers = {}) {
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, String(value));
  }
  return res.status(status).json(body);
}

function maybeGzip(req, res, rawBody) {
  const acceptEncoding = req.get("Accept-Encoding") || "";
  if (rawBody.length > 1024 && /\bgzip\b/i.test(acceptEncoding)) {
    res.setHeader("Content-Encoding", "gzip");
  }
}

// gzip large JSON responses when the client advertises gzip.
const compression = require("compression");
app.use(compression({ threshold: 1024 }));

// Error handler for malformed JSON.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json(problem(400, "Bad Request", "Malformed JSON"));
  }
  next(err);
});

// Collection: GET /orders
app.get("/orders", requireJsonAccept, requireAuthorization, (req, res) => {
  const { status, sort = "created_at", order = "asc", page = "1", limit = "10" } = req.query;

  if (status && !VALID_STATUSES.has(status)) {
    return res.status(422).json(problem(422, "Unprocessable Entity", "Unsupported order status filter"));
  }

  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || !Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 100) {
    return res.status(422).json(problem(422, "Unprocessable Entity", "page must be >= 1 and limit must be between 1 and 100"));
  }

  let orders = store.listOrders(status);

  if (sort === "created_at") {
    orders.sort((a, b) => a.created_at.localeCompare(b.created_at));
  } else if (sort === "total_amount") {
    orders.sort((a, b) => a.total_amount - b.total_amount);
  } else if (sort === "id") {
    orders.sort((a, b) => a._id - b._id);
  } else {
    return res.status(422).json(problem(422, "Unprocessable Entity", "Unsupported sort field"));
  }

  if (order.toLowerCase() === "desc") orders.reverse();
  else if (order.toLowerCase() !== "asc") {
    return res.status(422).json(problem(422, "Unprocessable Entity", "order must be asc or desc"));
  }

  const total = orders.length;
  const start = (pageNumber - 1) * limitNumber;
  const paged = orders.slice(start, start + limitNumber);

  return res.status(200).json({
    orders: paged.map(o => o.asJson()),
    page: pageNumber,
    limit: limitNumber,
    total
  });
});

// Collection: POST /orders
app.post("/orders", requireJsonAccept, requireAuthorization, requireJsonContentType, async (req, res) => {
  const error = validateOrder(req.body);
  if (error) return res.status(400).json(problem(400, "Bad Request", error));

  const key = (req.get("Idempotency-Key") || "").trim();
  if (!key) return res.status(400).json(problem(400, "Bad Request", "Idempotency-Key header is required"));

  const previous = store.getIdempotent(key);
  if (previous) {
    res.setHeader("Location", previous.location);
    return res.status(previous.status).json(previous.body);
  }

  const items = req.body.items;
  const total = Number(items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0).toFixed(2));
  const provisionalId = Math.max(0, ...store.listOrders().map(o => o._id)) + 1;

  try {
    const payment = await paymentClient.charge(provisionalId, total, key);
    const order = new Order(provisionalId, req.body.user_id, items, total, {
      status: "CONFIRMED",
      paymentReference: payment.provider_reference || null,
      idempotencyKey: key
    });
    store.createOrder(order);

    const body = order.asJson();
    const location = `/orders/${order._id}`;
    store.saveIdempotent(key, { status: 201, body, location });

    res.setHeader("Location", location);
    res.setHeader("Cache-Control", "no-store");
    setEtag(res, etagFor(order));
    return res.status(201).json(body);
  } catch (err) {
    return res.status(503).json(problem(503, "Service Unavailable", "Payment service is unavailable; order was not created"));
  }
});

function parseOrderId(req, res) {
  const id = Number(req.params.orderId);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json(problem(400, "Bad Request", "Order id must be a positive integer"));
    return null;
  }
  return id;
}

// Single resource GET
app.get("/orders/:orderId", requireJsonAccept, requireAuthorization, (req, res) => {
  const id = parseOrderId(req, res);
  if (id === null) return;

  const order = store.getOrder(id);
  if (!order) return res.status(404).json(problem(404, "Not Found", "Order not found"));

  const etag = etagFor(order);
  setEtag(res, etag);
  res.setHeader("Cache-Control", "max-age=60");

  if (req.get("If-None-Match") === etag) return res.status(304).end();

  return res.status(200).json(order.asJson());
});

// PUT replacement
app.put("/orders/:orderId", requireJsonAccept, requireAuthorization, requireJsonContentType, (req, res) => {
  const id = parseOrderId(req, res);
  if (id === null) return;

  const order = store.getOrder(id);
  if (!order) return res.status(404).json(problem(404, "Not Found", "Order not found"));

  const match = req.get("If-Match");
  const currentEtag = etagFor(order);
  if (!match) return res.status(412).json(problem(412, "Precondition Failed", "If-Match header is required"));
  if (match !== currentEtag) return res.status(412).json(problem(412, "Precondition Failed", "Resource ETag does not match"));

  const error = validateOrder(req.body);
  if (error) return res.status(400).json(problem(400, "Bad Request", error));

  // Preserve immutable creation timestamp and id; replace mutable representation.
  order.user_id = req.body.user_id;
  order.items = req.body.items;
  order.total_amount = Number(req.body.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0).toFixed(2));
  store.save(order);

  const etag = etagFor(order);
  setEtag(res, etag);
  return res.status(200).json(order.asJson());
});

// PATCH partial modification
app.patch("/orders/:orderId", requireJsonAccept, requireAuthorization, requireJsonContentType, (req, res) => {
  const id = parseOrderId(req, res);
  if (id === null) return;

  const order = store.getOrder(id);
  if (!order) return res.status(404).json(problem(404, "Not Found", "Order not found"));

  const match = req.get("If-Match");
  const currentEtag = etagFor(order);
  if (!match || match !== currentEtag) {
    return res.status(412).json(problem(412, "Precondition Failed", "Resource ETag does not match"));
  }

  const error = validatePatch(req.body);
  if (error) return res.status(400).json(problem(400, "Bad Request", error));

  if ("user_id" in req.body) order.user_id = req.body.user_id;
  if ("items" in req.body) {
    order.items = req.body.items;
    order.total_amount = Number(req.body.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0).toFixed(2));
  }
  if ("status" in req.body) order.status = req.body.status;
  store.save(order);

  const etag = etagFor(order);
  setEtag(res, etag);
  return res.status(200).json(order.asJson());
});

// DELETE resource
app.delete("/orders/:orderId", requireJsonAccept, requireAuthorization, (req, res) => {
  const id = parseOrderId(req, res);
  if (id === null) return;

  const order = store.getOrder(id);
  if (!order) return res.status(404).json(problem(404, "Not Found", "Order not found"));

  // store.deleteOrder is intentionally used here rather than a state transition.
  store.deleteOrder(id);
  return res.status(204).end();
});

async function cancelOrder(req, res) {
  const id = parseOrderId(req, res);
  if (id === null) return;

  const key = (req.get("Idempotency-Key") || "").trim();
  if (key) {
    const previous = store.getIdempotent(`cancel:${key}`);
    if (previous) {
      return res.status(previous.status).json(previous.body);
    }
  }

  const order = store.getOrder(id);
  if (!order) return res.status(404).json(problem(404, "Not Found", "Order not found"));
  if (order.status === "CANCELLED") return res.status(409).json(problem(409, "Conflict", "Order is already cancelled"));
  if (order.status === "DELIVERED") return res.status(409).json(problem(409, "Conflict", "Delivered orders cannot be cancelled"));

  order.status = "CANCELLED";
  store.save(order);
  const body = order.asJson();

  if (key) store.saveIdempotent(`cancel:${key}`, { status: 200, body });
  setEtag(res, etagFor(order));
  return res.status(200).json(body);
}

// Non-CRUD action as a POST sub-resource.
app.post("/orders/:orderId/cancellation", requireJsonAccept, requireAuthorization, async (req, res) => {
  await cancelOrder(req, res);
});

// Assignment wording example uses /cancel, so support the clearer singular action route too.
app.post("/orders/:orderId/cancel", requireJsonAccept, requireAuthorization, async (req, res) => {
  await cancelOrder(req, res);
});

// Optional checkout action. It demonstrates a non-CRUD POST sub-resource.
app.post("/orders/:orderId/checkout", requireJsonAccept, requireAuthorization, requireJsonContentType, async (req, res) => {
  const id = parseOrderId(req, res);
  if (id === null) return;

  const key = (req.get("Idempotency-Key") || "").trim();
  if (!key) return res.status(400).json(problem(400, "Bad Request", "Idempotency-Key header is required"));

  const cacheKey = `checkout:${key}`;
  const previous = store.getIdempotent(cacheKey);
  if (previous) return res.status(previous.status).json(previous.body);

  const order = store.getOrder(id);
  if (!order) return res.status(404).json(problem(404, "Not Found", "Order not found"));
  if (order.status === "CANCELLED") return res.status(409).json(problem(409, "Conflict", "Cancelled orders cannot be checked out"));
  if (order.status === "CONFIRMED") {
    const body = order.asJson();
    store.saveIdempotent(cacheKey, { status: 200, body });
    return res.status(200).json(body);
  }

  order.status = "CONFIRMED";
  store.save(order);
  const body = order.asJson();
  store.saveIdempotent(cacheKey, { status: 200, body });
  setEtag(res, etagFor(order));
  return res.status(200).json(body);
});

// Compatibility route from Assignment 4 is retained above. Unknown paths are 404.
app.use((req, res) => {
  res.status(404).json(problem(404, "Not Found", "The requested resource does not exist"));
});

// Express JSON error handler must be last.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.type === "entity.parse.failed") {
    return res.status(400).json(problem(400, "Bad Request", "Malformed JSON"));
  }
  console.error(err);
  return res.status(500).json(problem(500, "Internal Server Error", "Unexpected server error"));
});

function resetForTests() {
  store.reset();
  rateBuckets.clear();
}

module.exports = { app, resetForTests, etagFor, VALID_STATUSES };
