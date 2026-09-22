const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { app, resetForTests, etagFor } = require("../app");
const store = require("../store");

let server;
let baseUrl;
let paymentServer;

async function startServer(handler) {
  return new Promise(resolve => {
    const s = http.createServer(handler);
    s.listen(0, "127.0.0.1", () => resolve(s));
  });
}

async function request(path, options = {}) {
  const response = await fetch(baseUrl + path, options);
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { response, body };
}

function payload() {
  return {
    user_id: 7,
    items: [{ item_id: 1, name: "Thali", unit_price: 80, quantity: 2 }]
  };
}

test.before(async () => {
  resetForTests();

  paymentServer = await startServer(async (req, res) => {
    if (req.url === "/charges" && req.method === "POST") {
      let data = "";
      req.on("data", chunk => { data += chunk; });
      req.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ provider_reference: "pay-test-001" }));
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const paymentPort = paymentServer.address().port;
  process.env.PAYMENTS_URL = `http://127.0.0.1:${paymentPort}`;

  server = await startServer(app);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  await new Promise(resolve => paymentServer.close(resolve));
});

test.beforeEach(() => resetForTests());

test("create returns 201 and Location", async () => {
  const { response, body } = await request("/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": "Bearer test",
      "Idempotency-Key": "create-001"
    },
    body: JSON.stringify(payload())
  });

  assert.equal(response.status, 201);
  assert.equal(response.headers.get("location"), "/orders/1");
  assert.equal(body.status, "CONFIRMED");
  assert.ok(response.headers.get("etag"));
});

test("same Idempotency-Key returns original result without duplicate", async () => {
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": "Bearer test",
    "Idempotency-Key": "repeat-001"
  };

  const first = await request("/orders", {
    method: "POST", headers, body: JSON.stringify(payload())
  });
  const second = await request("/orders", {
    method: "POST", headers, body: JSON.stringify(payload())
  });

  assert.equal(first.response.status, 201);
  assert.equal(second.response.status, 201);
  assert.equal(second.response.headers.get("location"), first.response.headers.get("location"));
  assert.deepEqual(second.body, first.body);
  assert.equal(store.listOrders().length, 1);
});

test("malformed domain input returns 400", async () => {
  const { response, body } = await request("/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test",
      "Idempotency-Key": "bad-001"
    },
    body: JSON.stringify({ user_id: "seven", items: [] })
  });
  assert.equal(response.status, 400);
  assert.equal(body.status, 400);
});

test("missing resource returns 404", async () => {
  const { response, body } = await request("/orders/99999", {
    headers: { "Authorization": "Bearer test", "Accept": "application/json" }
  });
  assert.equal(response.status, 404);
  assert.equal(body.status, 404);
});

test("missing authorization returns 401", async () => {
  const { response, body } = await request("/orders");
  assert.equal(response.status, 401);
  assert.equal(body.status, 401);
});

test("unsupported Accept returns 406", async () => {
  const { response, body } = await request("/orders", {
    headers: { "Authorization": "Bearer test", "Accept": "text/html" }
  });
  assert.equal(response.status, 406);
  assert.equal(body.status, 406);
});

test("list supports filter, sort and pagination", async () => {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer test",
    "Idempotency-Key": "list-001"
  };
  await request("/orders", { method: "POST", headers, body: JSON.stringify(payload()) });
  const result = await request("/orders?status=CONFIRMED&sort=total_amount&order=desc&page=1&limit=1", {
    headers: { "Authorization": "Bearer test", "Accept": "application/json" }
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.orders.length, 1);
  assert.equal(result.body.total, 1);
});

test("conditional GET returns 304", async () => {
  const created = await request("/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test",
      "Idempotency-Key": "etag-001"
    },
    body: JSON.stringify(payload())
  });
  const etag = created.response.headers.get("etag");

  const result = await request("/orders/1", {
    headers: {
      "Authorization": "Bearer test",
      "Accept": "application/json",
      "If-None-Match": etag
    }
  });

  assert.equal(result.response.status, 304);
  assert.equal(result.body, null);
});

test("stale If-Match returns 412", async () => {
  await request("/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test",
      "Idempotency-Key": "match-001"
    },
    body: JSON.stringify(payload())
  });

  const result = await request("/orders/1", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test",
      "Accept": "application/json",
      "If-Match": "\"stale-etag\""
    },
    body: JSON.stringify(payload())
  });

  assert.equal(result.response.status, 412);
  assert.equal(result.body.status, 412);
});

test("OPTIONS returns Allow and CORS headers", async () => {
  const { response } = await request("/orders/1", {
    method: "OPTIONS",
    headers: {
      Origin: "https://example.com",
      "Access-Control-Request-Method": "DELETE"
    }
  });

  assert.equal(response.status, 204);
  assert.match(response.headers.get("allow"), /GET/);
  assert.match(response.headers.get("allow"), /DELETE/);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
});

test("DELETE returns 204 and is repeat-safe at resource semantics", async () => {
  await request("/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test",
      "Idempotency-Key": "delete-001"
    },
    body: JSON.stringify(payload())
  });

  const first = await request("/orders/1", {
    method: "DELETE",
    headers: { "Authorization": "Bearer test" }
  });
  assert.equal(first.response.status, 204);

  const second = await request("/orders/1", {
    method: "DELETE",
    headers: { "Authorization": "Bearer test" }
  });
  assert.equal(second.response.status, 404);
});

test("cancel action is a POST sub-resource and supports idempotency key", async () => {
  await request("/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test",
      "Idempotency-Key": "cancel-create"
    },
    body: JSON.stringify(payload())
  });

  const headers = {
    "Authorization": "Bearer test",
    "Accept": "application/json",
    "Idempotency-Key": "cancel-001"
  };
  const first = await request("/orders/1/cancel", { method: "POST", headers });
  const second = await request("/orders/1/cancel", { method: "POST", headers });

  assert.equal(first.response.status, 200);
  assert.equal(second.response.status, 200);
  assert.deepEqual(second.body, first.body);
});

test("X-HTTP-Method-Override can perform PUT", async () => {
  await request("/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test",
      "Idempotency-Key": "override-create"
    },
    body: JSON.stringify(payload())
  });
  const get = await request("/orders/1", { headers: { "Authorization": "Bearer test" } });
  const etag = get.response.headers.get("etag");

  const updated = { ...payload(), user_id: 8 };
  const result = await request("/orders/1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test",
      "Accept": "application/json",
      "If-Match": etag,
      "X-HTTP-Method-Override": "PUT"
    },
    body: JSON.stringify(updated)
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.user_id, 8);
});
