# CampusEats Orders REST Service

**Team Members**

1. Aakash — 20252651001 (Leader)
2. sahil kumar — 20252651044
3. sonu jha — 20252651056
4. vedansh rahguwanshi — 20252651062
5. shanu singh — 20252651050

## Part A — Model the service

### A1. Chosen service

**Orders Service.** The Assignment 2 schema gives ownership of `orders` and `order_items` to the Order Service. Catalogue owns `food_items`, and Payment owns `payments`; therefore this implementation does not move those tables across boundaries.

### A2. Operations we would have written as SOAP

- `placeOrder(userId, items)`
- `getOrder(orderId)`
- `listOrders(status)`
- `cancelOrder(orderId)`

### A3. Resource nouns

- `orders`
- `orders/{orderId}`
- `orders?status=...`
- `orders/{orderId}/cancellation`

The verbs from the SOAP-style operation names do not appear in the collection URL.

### A4. Resource table

| Method | URL | What it does | Success | Failure |
|---|---|---|---|---|
| POST | `/orders` | Creates an order and charges Payments | 201 + Location | 400, 503 |
| GET | `/orders/{orderId}` | Reads one order | 200 | 404 |
| GET | `/orders?status=CONFIRMED` | Lists orders filtered by status | 200 | 422 |
| POST | `/orders/{orderId}/cancellation` | Changes the order state to CANCELLED | 200 | 404, 409 |

### A5. Hard choice

Cancellation is the least comfortable operation to map directly to CRUD because it is a state transition rather than creation of a new business object. I used the sub-resource `/orders/{orderId}/cancellation` because it makes the domain action explicit while still treating the order as the durable resource. I rejected `/cancelOrder` because it preserves the SOAP/RPC verb style, and I rejected `DELETE /orders/{id}` because cancellation does not mean that the historical order disappears.

## Part B — OpenAPI

`openapi.yaml` was written before the handler implementation. Reusable request, response and error shapes are declared once under `components.schemas` and referenced with `$ref`.

Validation command used after implementation:

```text
python -c "import yaml; yaml.safe_load(open('openapi.yaml')); print('YAML parse: 0 errors')"
```

Expected output:

```text
YAML parse: 0 errors
```

For the final submission, also run `openapi-spec-validator openapi.yaml` and capture its zero-error output or use editor.swagger.io.

## Part C — Implementation

The service follows the required separation: `models.py` stores the domain record, `store.py` owns in-process persistence, `errors.py` provides the single `problem()` error shape, and `app.py` contains HTTP handling and validation.

The internal `Order` contains `_id` and `idempotency_key`. `as_json()` intentionally does not expose the idempotency key or the internal identifier field. It publishes `id` instead.

`validate()` is called before request fields are used. Without it, a request such as `{"user_id":"seven","items":[]}` could reach business logic and cause incorrect calculations or an unhandled exception instead of a controlled 400 response.

`POST /orders` requires `Idempotency-Key`. The key is stored with the original response. A repeat with the same key returns the original 201 response and Location instead of creating another order. The same key is also forwarded to Payments.

## Part D — Network hardening

The Payments address is read from the `PAYMENTS_URL` environment variable. No payment URL is hard-coded in the application.

The outbound request has a two-second timeout and up to three attempts. The delay uses exponential backoff plus jitter. HTTP 4xx responses are never retried. Retryable transport/5xx/408/429 failures reuse the same idempotency key so a retried payment creation remains safe.

### Fallback

If Payments is unreachable after the retry budget, the Orders service returns **503 Service Unavailable** and does not publish the order as created. Degrading to a locally-created confirmed order would be incorrect because it could tell the student that an order is confirmed even though payment authorization is unknown. Failing closed preserves the business invariant that a confirmed order has a successful payment result.

## Assignment 3 comparison

The repository's existing Assignment 3 SOAP artefact is the CampusPay payment partner WSDL. It defines one `charge` operation, XML Schema types, a credentials SOAP header, a `PaymentFault`, a SOAP binding and a SOAP address. The WSDL is 114 physical lines in the repository's GitHub view, while the raw file is 104 lines because the GitHub code viewer adds display line numbering/formatting. For a fair line-count comparison in the same checkout, count the raw file with `wc -l Soap/partner.wsdl`.

### 1. WSDL versus OpenAPI line count

Run:

```bash
wc -l Soap/partner.wsdl orders_rest/openapi.yaml
```

The difference is mostly structural contract machinery. WSDL needs explicit XML Schema definitions plus messages, port types, bindings, SOAP operations, headers/fault declarations and service/port/address information. OpenAPI represents HTTP methods, paths, parameters, reusable JSON schemas and HTTP responses directly, so it does not need separate WSDL message/portType/binding layers.

Two things the WSDL declares that this OpenAPI contract does not need are **SOAP bindings/soapAction** and a separate **wsdl:message/portType/port** model. HTTP methods and paths already provide those roles.

### 2. SOAP Fault versus REST problem response

The WSDL declares a `PaymentFault` containing `code`, `message` and an optional `providerReference`, and binds it with `soap:fault`. The corresponding REST style is an HTTP status plus the common problem body:

```json
{
  "type": "https://campuseats.example/problems/503",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "Payment service is unavailable; order was not created"
}
```

Returning an application error inside `200 OK` is bad for the network because HTTP intermediaries, clients, monitoring systems, caches and retry logic use the status code to distinguish success from failure. A 200 response can therefore be cached, counted as successful, or skipped by failure handling even though the business operation failed.

### 3. UDDI publish/find/bind

**Publish** and **find** are largely replaced by modern service configuration and API documentation/discovery mechanisms. The application still performs a form of **bind** when it obtains the Payments service address from `PAYMENTS_URL` and makes the HTTP call. The explicit UDDI registry workflow disappeared; configuration/environment variables, DNS/service discovery and OpenAPI documentation take over the practical jobs of locating and understanding the service.

### 4. XML Schema versus `validate()`

The specific function carrying the validation responsibility is `validate()` in `app.py`. OpenAPI documents the intended shape but does not automatically validate this handwritten Python server. Without `validate()`, a body with a string `user_id`, an empty `items` list, a negative price, or a non-positive quantity could reach the business logic.

### 5. Where SOAP would still be preferable

I would still choose the SOAP stack for a tightly controlled enterprise payment integration where WS-Security and formal SOAP contract/fault interoperability are mandatory. The guarantee I would be buying is standardized message-level security and a formally described XML contract that participating enterprise systems can validate and enforce independently of the HTTP transport. For ordinary CampusEats CRUD resources, REST is simpler and exposes the failure semantics of the HTTP network directly.

## Curl transcript

After starting the service and a mock Payments service, capture the following with `curl -i`:

```bash
export PAYMENTS_URL=http://localhost:9000
python app.py
```

Successful create:

```bash
curl -i -X POST http://localhost:8000/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: order-demo-001' \
  -d '{"user_id":7,"items":[{"item_id":1,"name":"Thali","unit_price":80,"quantity":2}]}'
```

Repeat the exact same request and show the original `201` and `Location`.

Malformed body:

```bash
curl -i -X POST http://localhost:8000/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: bad-001' \
  -d '{"user_id":"seven","items":[]}'
```

Missing resource:

```bash
curl -i http://localhost:8000/orders/99999
```

State conflict:

```bash
curl -i -X POST http://localhost:8000/orders/1/cancellation
curl -i -X POST http://localhost:8000/orders/1/cancellation
```

The second cancellation must show `409` with the same `type/title/status/detail` problem shape.
