# CS543 Web Services — Assignment 4
## Rebuilding a CampusEats Service in REST

**Team ID:** ____________________  
**Roll No / Name:** ____________________  
**Service chosen:** Catalogue  
**Previous SOAP partner:** CampusPay Payment Gateway

> Note: This implementation preserves the Assignment 2 boundary: the Catalogue owns menu/food-item data. The Payments service is only an outbound dependency; it does not own the Catalogue store.

## A2 — Operations that could have been SOAP

Starting from the catalogue-style operations:

- addMenuItem(...)
- getMenuItem(...)
- getMenu(...)
- setAvailability(...)

These verbs are used only as the starting point. They do not appear as REST URL verbs.

## A4 — Resource table

| Method | URL | What it does | Success | Failure |
|---|---|---|---|---|
| POST | `/menu-items` | Creates a durable menu item | 201 | 400, 409, 422 |
| GET | `/menu-items/{item_id}` | Reads one menu item | 200 | 404 |
| GET | `/menu-items?category=...&available=...` | Filters menu items | 200 | 400 |
| PATCH | `/menu-items/{item_id}/availability` | Changes availability state | 200 | 400, 404, 409, 422 |

## A5 — Hard mapping choice

`setAvailability(...)` mapped least comfortably because the SOAP name describes an action while REST should expose a resource. I treated availability as a state sub-resource, `/menu-items/{id}/availability`, and used `PATCH` because only part of the menu item's state changes. I rejected `/setAvailability` because it keeps the RPC verb in the URL, and I rejected a full replacement `PUT` because the operation changes only one state field.

# B — OpenAPI

`openapi.yaml` was written before the Flask handlers. All four endpoints are documented there. Request and response shapes are defined once under `components.schemas` and reused through `$ref`.

Validate with:

```bash
openapi-spec-validator openapi.yaml
```

Expected result:

```text
openapi.yaml: OK
```

If your installed validator prints no output on success, that is also a successful zero-error result; capture the terminal showing the command followed by the next shell prompt.

# C — Implementation

## C2 — Record vs representation

`MenuItem` is the stored record. Its `as_json()` method is the published representation. The stored record contains `internal_id`, while `as_json()` deliberately omits it. Therefore an internal identifier does not leak through the API.

## C4 — Manual validation

The specific functions are:

```text
validate_menu_item()
validate_availability()
```

They run before request fields are used.

Without `validate_menu_item()`, a body such as:

```json
{"name": "Dosa"}
```

could reach the code without the required `category` and `price` fields and cause incorrect processing instead of the specified 400 response.

## C7 — Idempotency

`POST /menu-items` requires `Idempotency-Key`. The key is stored with the created record in the in-process store. Repeating the same key returns the original record rather than creating a duplicate.

## C8 — Tests

The four required behaviours are covered by `tests/test_app.py`:

1. create → 201 and Location
2. idempotent repeat → original result
3. malformed body → 400
4. unknown id → 404

Run:

```bash
pytest -q
```

Expected:

```text
4 passed
```

# D — Surviving a bad network

## D1/D2 — Outbound call

The code contains a real HTTP POST in `payment_call()`. The destination is read from the environment variable:

```text
PAYMENTS_URL
```

There is no hard-coded CampusEats payment URL.

The call uses a 2-second timeout, up to three attempts, exponential backoff and random jitter. HTTP 4xx responses are never retried. The outbound POST carries the same `Idempotency-Key`, so a retried create has a stable key.

Example:

```bash
export PAYMENTS_URL=http://localhost:6000/charge
```

For normal local testing, leave `PAYMENTS_URL` unset; the code then uses the documented fallback path so the four required tests can run without a second live service.

## D3 — Fallback

When the required dependency is configured but unreachable, the Catalogue service fails closed with `503 Service Unavailable` rather than pretending the dependent operation succeeded. Degrading would be wrong here because returning success while a required CampusEats dependency is unavailable could leave the caller believing that an operation completed when the dependent side did not.

# Answers

## 1. WSDL vs OpenAPI line count

The Assignment 3 `partner.wsdl` is **114 lines** and this Assignment 4 `openapi.yaml` is **168 lines**, so the OpenAPI file is **54 lines longer** in this submission. The difference is not simply “SOAP is longer.” A WSDL describes SOAP-specific messaging and transport details that a REST/OpenAPI contract can express more directly through HTTP methods, URLs, parameters and HTTP response codes.

Two things declared by the WSDL that the OpenAPI contract does not need in the same SOAP-specific form are:

1. SOAP message/binding details such as the SOAP-over-HTTP binding and SOAPAction.
2. WSDL `portType`/`binding`/`service` machinery for exposing an operation through a SOAP endpoint.


## 2. SOAP Fault → REST problem

Assignment 3's SOAP fault contains the provider-specific `CARD_DECLINED` vocabulary:

```xml
<soap:Fault>
    <faultcode>soap:Client</faultcode>
    <faultstring>Payment was declined by the issuer.</faultstring>
    <detail>
        <pay:PaymentFault>
            <pay:code>CARD_DECLINED</pay:code>
            <pay:message>The payment instrument was declined.</pay:message>
            <pay:providerReference>...</pay:providerReference>
        </pay:PaymentFault>
    </detail>
</soap:Fault>
```

In REST, the equivalent CampusEats error should be represented as an HTTP error status plus the single `problem()` shape, for example:

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json
```

```json
{
  "type": "about:blank",
  "title": "Payment Declined",
  "status": 422,
  "detail": "The payment for the CampusEats order was declined."
}
```

Returning this error inside `200 OK` is a problem because an intermediary, HTTP client, proxy or monitoring system uses the HTTP status code to understand whether the request succeeded. A `200` tells that network layer “success”, even if application data contains an error. That can break retries, monitoring, caching and client error handling.

## 3. UDDI publish/find/bind

The three UDDI ideas do not disappear completely, but their implementation changes:

- **Publish:** still exists — the API can be published in a catalogue/registry.
- **Find:** still exists — a consumer can discover the service endpoint and contract.
- **Bind:** still exists conceptually — the consumer uses the discovered endpoint and OpenAPI contract to make HTTP calls.

What disappears is the need for a SOAP/UDDI-specific binding mechanism. HTTP URLs, HTTP methods, media types and the OpenAPI contract take over much of the job.

## 4. XML Schema vs manual validation

The responsibility is now carried by:

```text
validate_menu_item()
```

and for the state-changing endpoint:

```text
validate_availability()
```

For example, without validation a request missing `price` could get past the boundary and cause incorrect application behaviour instead of being rejected as a malformed request.

## 5. When SOAP would still be preferred

I would still choose the SOAP stack for the external payment-partner edge when the partner requires a mature enterprise SOAP contract with message-level security and WS-* guarantees. The guarantee being bought is not merely “XML”; it is the standardized SOAP/WS-* ecosystem for features such as message-level security and reliable enterprise messaging semantics that can remain meaningful beyond a single HTTP hop.

# Curl transcript

The following commands produce the required evidence.

Start the service:

```bash
python3 app.py
```

Successful create:

```bash
curl -i -X POST http://localhost:5000/menu-items \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-123' \
  -d '{"name":"Masala Dosa","category":"South Indian","price":80}'
```

Expected:

```text
HTTP/1.1 201 CREATED
Location: /menu-items/1
```

Repeat with the same key:

```bash
curl -i -X POST http://localhost:5000/menu-items \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-123' \
  -d '{"name":"Masala Dosa","category":"South Indian","price":80}'
```

Expected: original `201` response and the same `Location`.

Malformed body:

```bash
curl -i -X POST http://localhost:5000/menu-items \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: bad-1' \
  -d '{"name":"Dosa"}'
```

Expected: `400 BAD REQUEST`.

Missing resource:

```bash
curl -i http://localhost:5000/menu-items/999
```

Expected: `404 NOT FOUND`.

State conflict:

```bash
curl -i -X PATCH http://localhost:5000/menu-items/1/availability \
  -H 'Content-Type: application/json' \
  -d '{"available":true}'
```

If item 1 is already available, expected: `409 CONFLICT`.

# Final verification

Run:

```bash
python3 -m pip install -r requirements.txt
pytest -q
openapi-spec-validator openapi.yaml
```

Capture the terminal output for both validation and tests and include it with the submission.
