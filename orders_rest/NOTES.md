# CS 543 — Web Services — Assignment 5
## CampusEats Orders REST Service — HTTP Methods & Headers

**Team ID:** `<ENTER_TEAM_ID>`

### Team Members

| Roll No. | Name |
|---|---|
| 20252651001 | Aakash |
| 20252651044 | Sahil Kumar |
| 20252651056 | Sonu Jha |
| 20252651062 | Vedansh Raghuwanshi |
| 20252651050 | Shanu Singh |

> Replace `<ENTER_TEAM_ID>` with the actual Team ID before submission.

---

# Part A — Methods and the message

## A1. CampusEats method map

| Action | Method | URL |
|---|---|---|
| List/search orders | GET | `/orders` |
| Read one order | GET | `/orders/{orderId}` |
| Create order | POST | `/orders` |
| Replace order | PUT | `/orders/{orderId}` |
| Modify order | PATCH | `/orders/{orderId}` |
| Remove order | DELETE | `/orders/{orderId}` |
| Cancel order | POST | `/orders/{orderId}/cancel` |
| Checkout order | POST | `/orders/{orderId}/checkout` |
| OPTIONS / supported methods | OPTIONS | `/orders/{orderId}` |

The old Assignment 4 route `/orders/{orderId}/cancellation` is retained as a deprecated compatibility route. New documentation uses `/orders/{orderId}/cancel`.

No verb is embedded in a collection URL such as `/createOrder` or `/cancelOrder`.

## A2. Non-CRUD actions

Cancellation and checkout are state-changing business actions rather than ordinary CRUD. They are modeled as POST sub-resources:

```text
POST /orders/42/cancel
POST /orders/42/checkout
```

This avoids RPC-style URLs such as:

```text
POST /cancelOrder
POST /checkoutOrder
```

## A3. Safe and idempotent

| Endpoint | Safe | Idempotent | Reason |
|---|---:|---:|---|
| GET `/orders` | Yes | Yes | Read only |
| GET `/orders/{id}` | Yes | Yes | Read only |
| POST `/orders` | No | No by default | Can create a new order |
| PUT `/orders/{id}` | No | Yes | Same replacement gives same final representation |
| PATCH `/orders/{id}` | No | Depends on patch | It changes state |
| DELETE `/orders/{id}` | No | Yes at resource semantics | Repeating leaves the resource absent |
| POST `/orders/{id}/cancel` | No | Yes when the same Idempotency-Key is reused | Prevents duplicate cancellation work |
| POST `/orders/{id}/checkout` | No | Yes when the same Idempotency-Key is reused | Prevents duplicate checkout work |

No GET endpoint changes server state.

## A4. Query parameters

`GET /orders` supports filtering, sorting and pagination:

```text
GET /orders?status=CONFIRMED&sort=total_amount&order=desc&page=1&limit=10
```

The query string keeps the operation a pure GET/read.

## A5. OPTIONS, Allow and method override

Example:

```http
OPTIONS /orders/42 HTTP/1.1
Host: localhost:8000
Origin: https://example.com
Access-Control-Request-Method: DELETE
```

Response:

```http
HTTP/1.1 204 No Content
Allow: GET, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
```

A constrained client may use the documented fallback:

```http
POST /orders/42 HTTP/1.1
X-HTTP-Method-Override: PUT
```

The override is not a replacement for normal HTTP methods; it is a compatibility mechanism.

## A6. Full exchange

### Request

```http
POST /orders HTTP/1.1
Host: localhost:8000
Content-Type: application/json
Accept: application/json
Authorization: Bearer demo-token
Idempotency-Key: order-demo-001

{
  "user_id": 7,
  "items": [
    {
      "item_id": 1,
      "name": "Thali",
      "unit_price": 80,
      "quantity": 2
    }
  ]
}
```

### Response

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /orders/1
ETag: "example-etag"
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000

{
  "id": 1,
  "user_id": 7,
  "items": [
    {
      "item_id": 1,
      "name": "Thali",
      "unit_price": 80,
      "quantity": 2
    }
  ],
  "total_amount": 160,
  "status": "CONFIRMED",
  "created_at": "2026-09-22T00:00:00.000Z",
  "payment_reference": "pay-demo-001"
}
```

The request uses HTTP/1.1.

---

# Part B — Headers

## B1. Content-Type and negotiation

Requests carrying JSON use:

```http
Content-Type: application/json
```

The client requests JSON with:

```http
Accept: application/json
```

If an unsupported response type such as `text/html` is requested:

```http
HTTP/1.1 406 Not Acceptable
Content-Type: application/json
```

Large JSON responses are eligible for gzip when the client sends:

```http
Accept-Encoding: gzip
```

## B2. Status and Location

| Situation | Response |
|---|---|
| Create | `201 Created` + `Location` |
| Read | `200 OK` |
| Delete | `204 No Content` |
| Malformed/invalid request | `400 Bad Request` |
| Missing resource | `404 Not Found` |
| State conflict | `409 Conflict` |
| Domain validation refusal | `422 Unprocessable Entity` |
| Missing/empty bearer token | `401 Unauthorized` |
| Unsupported representation | `406 Not Acceptable` |
| Rate limit exceeded | `429 Too Many Requests` |
| Matching ETag on GET | `304 Not Modified` |
| Stale `If-Match` | `412 Precondition Failed` |

On `201`, `Location` points to the newly created order. A 3xx response would use `Location` to identify the redirect target.

## B3. Authorization

Protected endpoints require:

```http
Authorization: Bearer demo-token
```

No real authentication system is required. The service only checks that the header contains a non-empty Bearer token.

Missing or empty token:

```http
HTTP/1.1 401 Unauthorized
```

## B4. Cache-Control and ETag

`GET /orders/{id}` returns:

```http
Cache-Control: max-age=60
ETag: "..."
```

The ETag is generated from the current JSON representation. When the resource changes, the representation changes and therefore the ETag changes.

## B5. Rate limiting

The service uses a per-client in-process budget of 100 requests per 60 seconds.

Normal responses include:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
```

When the client exceeds the budget:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
```

The client identity is based on the Authorization header when present, otherwise the client IP.

## B6. CORS

The service returns:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept, Authorization, If-Match, If-None-Match, Idempotency-Key, X-HTTP-Method-Override
```

The OPTIONS handler also answers browser preflight requests.

## B7. Security/general headers

Responses include:

```http
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
Server: CampusEats-JS
```

Node's HTTP stack supplies the Date header. Production deployment should use HTTPS so HSTS has its intended effect.

---

# Part C — Caching and safe retries

## C1. Conditional GET → 304

First:

```http
GET /orders/1 HTTP/1.1
Authorization: Bearer demo-token
Accept: application/json
```

Suppose the response contains:

```http
ETag: "a1b2c3d4e5f6"
```

A later request sends:

```http
GET /orders/1 HTTP/1.1
Authorization: Bearer demo-token
Accept: application/json
If-None-Match: "a1b2c3d4e5f6"
```

If unchanged:

```http
HTTP/1.1 304 Not Modified
ETag: "a1b2c3d4e5f6"
```

There is no body. This saves bandwidth and avoids retransmitting unchanged JSON.

## C2. Conditional write → 412

Suppose the current ETag is:

```text
"new-etag"
```

A stale client sends:

```http
PUT /orders/1 HTTP/1.1
Authorization: Bearer demo-token
Content-Type: application/json
Accept: application/json
If-Match: "old-etag"

{
  "user_id": 8,
  "items": [
    {
      "item_id": 1,
      "name": "Thali",
      "unit_price": 80,
      "quantity": 2
    }
  ]
}
```

The service returns:

```http
HTTP/1.1 412 Precondition Failed
```

This prevents a stale editor from overwriting a newer version.

## C3. Idempotency-Key

Create:

```http
POST /orders HTTP/1.1
Idempotency-Key: order-001
```

The server stores the original result for that key. A retry using the same key returns the original `201` result and `Location` rather than creating a second order.

The same pattern is supported for checkout and cancellation when an `Idempotency-Key` is supplied.

A duplicate order or checkout could cause real damage by creating two orders, charging a customer twice, or triggering duplicate fulfillment/payment work.

## C4. Safe-retry plan

| Operation | Mechanism | Why |
|---|---|---|
| GET `/orders` | Natural retry | Safe + idempotent |
| GET `/orders/{id}` | `If-None-Match` | Efficient conditional read |
| PUT `/orders/{id}` | `If-Match` | Prevent stale overwrite |
| PATCH `/orders/{id}` | `If-Match` | Prevent stale modification |
| DELETE `/orders/{id}` | Idempotent resource operation | Repeating does not recreate it |
| POST `/orders` | `Idempotency-Key` | Prevent duplicate creation |
| POST `/orders/{id}/cancel` | `Idempotency-Key` | Prevent duplicate action work |
| POST `/orders/{id}/checkout` | `Idempotency-Key` | Prevent duplicate checkout work |

---

# Part D — Verification

## D1. curl -v commands

### 1. Create — 201 + Location

```bash
curl -v -X POST http://localhost:8000/orders \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer demo-token' \
  -H 'Idempotency-Key: curl-create-001' \
  -d '{"user_id":7,"items":[{"item_id":1,"name":"Thali","unit_price":80,"quantity":2}]}'
```

Expected:

```text
HTTP/1.1 201 Created
Location: /orders/1
ETag: "..."
```

### 2. Repeat with same Idempotency-Key

Run the exact same command again.

Expected:

```text
HTTP/1.1 201 Created
Location: /orders/1
```

The JSON result and Location are the original result. No second order is created.

### 3. Conditional GET — 304

First obtain the ETag:

```bash
curl -v http://localhost:8000/orders/1 \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer demo-token'
```

Then:

```bash
curl -v http://localhost:8000/orders/1 \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer demo-token' \
  -H 'If-None-Match: "PASTE_ETAG_HERE"'
```

Expected:

```text
HTTP/1.1 304 Not Modified
```

### 4. Conditional write — 412

```bash
curl -v -X PUT http://localhost:8000/orders/1 \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer demo-token' \
  -H 'If-Match: "stale-etag"' \
  -d '{"user_id":8,"items":[{"item_id":1,"name":"Thali","unit_price":80,"quantity":2}]}'
```

Expected:

```text
HTTP/1.1 412 Precondition Failed
```

### 5. 400

```bash
curl -v -X POST http://localhost:8000/orders \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer demo-token' \
  -H 'Idempotency-Key: curl-bad-001' \
  -d '{"user_id":"seven","items":[]}'
```

Expected:

```text
HTTP/1.1 400 Bad Request
```

### 6. 404

```bash
curl -v http://localhost:8000/orders/99999 \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer demo-token'
```

Expected:

```text
HTTP/1.1 404 Not Found
```

### 7. 401

```bash
curl -v http://localhost:8000/orders
```

Expected:

```text
HTTP/1.1 401 Unauthorized
```

---

# D2. Headers table

| Endpoint | Request headers | Important response headers |
|---|---|---|
| GET `/orders` | Accept, Authorization | Content-Type, rate-limit, CORS, security |
| GET `/orders/{id}` | Accept, Authorization, If-None-Match | ETag, Cache-Control, rate-limit, CORS |
| POST `/orders` | Content-Type, Accept, Authorization, Idempotency-Key | Location, ETag, rate-limit, CORS |
| PUT `/orders/{id}` | Content-Type, Accept, Authorization, If-Match | ETag, rate-limit, CORS |
| PATCH `/orders/{id}` | Content-Type, Accept, Authorization, If-Match | ETag, rate-limit, CORS |
| DELETE `/orders/{id}` | Accept, Authorization | rate-limit, CORS, security |
| POST `/orders/{id}/cancel` | Accept, Authorization, Idempotency-Key | ETag, rate-limit, CORS |
| POST `/orders/{id}/checkout` | Content-Type, Accept, Authorization, Idempotency-Key | rate-limit, CORS |
| OPTIONS `/orders/{id}` | Origin, Access-Control-Request-Method, Access-Control-Request-Headers | Allow, Access-Control-Allow-* |

---

# The eight required answers

## 1. Three endpoints

**Create order**

```text
POST /orders
Success: 201 Created
Important header: Location
```

Location identifies the newly created resource so the client knows where to retrieve it.

**Read order**

```text
GET /orders/{id}
Success: 200 OK
Important header: ETag
```

ETag identifies the current representation and enables conditional caching.

**Delete order**

```text
DELETE /orders/{id}
Success: 204 No Content
Important behavior: no response body
```

The 204 status communicates that deletion succeeded without returning another representation.

## 2. Safe and idempotent

GET endpoints are safe and idempotent.

PUT is idempotent but not safe because it changes the resource.

DELETE is idempotent at resource semantics but not safe because it changes state.

POST `/orders` is neither safe nor naturally idempotent. It is made retry-safe with `Idempotency-Key`.

## 3. ETag, 304 and 412

Example:

```text
ETag: "a1b2c3d4e5f6"
```

Matching `If-None-Match` produces:

```text
304 Not Modified
```

This saves bandwidth.

A stale `If-Match` on PUT/PATCH produces:

```text
412 Precondition Failed
```

This prevents lost updates.

## 4. 400 versus 422

400 is used when the request is malformed or cannot satisfy basic request validation.

Example:

```json
{
  "user_id": "seven",
  "items": []
}
```

The service returns 400.

422 is used when the request is syntactically valid but a domain/query rule rejects it.

Example:

```text
GET /orders?status=UNKNOWN
```

The JSON/HTTP request is valid, but `UNKNOWN` is not a supported order status, so the service returns 422.

## 5. Browser/CORS

The browser enforced its same-origin/CORS security policy. A server-side 200 does not automatically allow browser JavaScript to read the response.

The relevant header is:

```http
Access-Control-Allow-Origin: *
```

The service also handles OPTIONS preflight requests and advertises allowed methods and request headers.

## 6. Cache-Control

A normal single-order GET can use:

```http
Cache-Control: max-age=60
```

because short-lived caching can reduce repeated transfers and ETag provides validation.

The `POST /orders` creation response can use:

```http
Cache-Control: no-store
```

because it contains the newly created order and may include payment-related information. `no-store` prevents browsers and intermediary caches from storing that response.

## 7. When should search use POST?

GET is appropriate while the search can be represented cleanly through query parameters:

```text
GET /orders?status=CONFIRMED&sort=total_amount&page=1
```

POST can be appropriate for very complex or very large search criteria that do not fit well in a URL.

The trade-off is that POST loses some normal GET advantages such as simple URL bookmarking/sharing and conventional GET caching semantics.

## 8. Location on 201 versus 3xx

For:

```http
201 Created
Location: /orders/42
```

Location identifies the newly created resource.

For:

```http
302 Found
Location: /orders/42
```

Location identifies the URI to which the client should redirect/follow.

---

# Running the JavaScript service

From `orders_rest`:

```bash
npm install
npm start
```

The service runs on:

```text
http://127.0.0.1:8000
```

Tests:

```bash
npm test
```

Syntax check:

```bash
npm run syntax
```

## Important

This JavaScript version intentionally keeps the same in-process data-store approach as the original Python Assignment 4 service. The Python files are replaced by:

- `app.js` — Express HTTP service
- `models.js` — Order model
- `store.js` — in-memory store
- `errors.js` — common problem response
- `payment_client.js` — hardened Payments HTTP client
- `server.js` — server startup
- `tests/orders.test.js` — Assignment 5 tests
- `openapi.yaml` — updated contract
- `NOTES.md` — Assignment 5 documentation
