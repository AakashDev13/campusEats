# CS543 Web Services — Assignment 5

## HTTP Methods & Headers — CampusEats Catalogue

**Team ID:** 08
**Roll No / Name:** Aakash [20252651001] Sonu Jha [20252651056] Sahil Kumar [20252651044]
 
**Service:** Catalogue

---

# Part A — HTTP Methods

## A1 — HTTP Method Map

| Action              | HTTP Method | URL                                  | Purpose                          |
| ------------------- | ----------- | ------------------------------------ | -------------------------------- |
| Create menu item    | POST        | `/menu-items`                        | Creates a new menu item          |
| List menu items     | GET         | `/menu-items`                        | Reads menu items                 |
| Get one menu item   | GET         | `/menu-items/{item_id}`              | Reads one menu item              |
| Replace menu item   | PUT         | `/menu-items/{item_id}`              | Replaces the menu item           |
| Change availability | POST        | `/menu-items/{item_id}/availability` | Performs the availability action |

GET requests are read-only and do not modify server state.

---

## A2 — Non-CRUD Actions

The availability operation is an action rather than a complete resource replacement.

Instead of using a URL such as:

`POST /setAvailability`

the service uses:

`POST /menu-items/{item_id}/availability`

This keeps the action associated with the menu-item resource and avoids putting an RPC-style verb directly in the URL.

---

## A3 — Safe and Idempotent Methods

| Endpoint                        | Method | Safe | Idempotent                                        | Reason                                                          |
| ------------------------------- | ------ | ---- | ------------------------------------------------- | --------------------------------------------------------------- |
| `/menu-items`                   | GET    | Yes  | Yes                                               | Only reads the collection                                       |
| `/menu-items/{id}`              | GET    | Yes  | Yes                                               | Only reads one item                                             |
| `/menu-items`                   | POST   | No   | Application-level retry-safe with Idempotency-Key | Same key returns the original result                            |
| `/menu-items/{id}`              | PUT    | No   | Yes                                               | Repeating the same replacement produces the same intended state |
| `/menu-items/{id}/availability` | POST   | No   | Not generally                                     | It represents an action                                         |

GET requests do not change server state.

The create operation uses an `Idempotency-Key` to make retries safe against duplicate creation.

---

## A4 — Filtering, Sorting and Pagination

The collection remains a pure GET request.

Examples:

`GET /menu-items?category=Fast%20Food`

`GET /menu-items?available=true`

`GET /menu-items?sort=price&order=desc`

`GET /menu-items?page=1&limit=10`

The supported query parameters are:

* `category`
* `available`
* `sort`
* `order`
* `page`
* `limit`

These parameters do not change server state.

---

## A5 — OPTIONS and Method Override

The service implements OPTIONS for the collection and individual menu-item resources.

Example:

`OPTIONS /menu-items`

returns:

`Allow: GET, POST, OPTIONS`

Example:

`OPTIONS /menu-items/1`

returns:

`Allow: GET, PUT, OPTIONS`

For constrained clients that cannot send PUT, the service supports the documented fallback:

`X-HTTP-Method-Override: PUT`

Example:

```http
POST /menu-items/1 HTTP/1.1
Host: 127.0.0.1:5000
X-HTTP-Method-Override: PUT
```

The server processes this request as a PUT operation.

---

## A6 — Full HTTP Request and Response

### Request

```http
POST /menu-items HTTP/1.1
Host: 127.0.0.1:5000
Content-Type: application/json
Accept: application/json
Authorization: Bearer test-token
Idempotency-Key: A6-test-001

{
  "name": "Burger",
  "category": "Fast Food",
  "price": 100,
  "available": true
}
```

### Response

```http
HTTP/1.1 201 CREATED
Content-Type: application/json
Location: /menu-items/2
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
Access-Control-Allow-Origin: *
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
```

```json
{
  "available": true,
  "category": "Fast Food",
  "id": 2,
  "name": "Burger",
  "price": 100.0
}
```

The request successfully created a menu item and returned `201 Created` with the `Location` header identifying the new resource.

---

# Part B — HTTP Headers and Status Codes

## B1 — Content Negotiation and Compression

JSON request bodies use:

`Content-Type: application/json`

Clients can request JSON using:

`Accept: application/json`

If the client requests an unsupported response type such as:

`Accept: text/html`

the service returns:

`406 Not Acceptable`

For large responses, the service supports gzip compression when the client sends:

`Accept-Encoding: gzip`

The response then includes:

`Content-Encoding: gzip`

and:

`Vary: Accept-Encoding`

---

## B2 — Status Codes and Location

The service uses the following status codes:

| Status                     | Usage                                         |
| -------------------------- | --------------------------------------------- |
| `200 OK`                   | Successful GET or PUT                         |
| `201 Created`              | Successful POST that creates a resource       |
| `204 No Content`           | Successful OPTIONS response                   |
| `304 Not Modified`         | Conditional GET when resource has not changed |
| `400 Bad Request`          | Malformed or invalid request                  |
| `401 Unauthorized`         | Missing or invalid Authorization header       |
| `404 Not Found`            | Resource does not exist                       |
| `406 Not Acceptable`       | Unsupported Accept type                       |
| `409 Conflict`             | Duplicate menu item                           |
| `412 Precondition Failed`  | If-Match ETag does not match                  |
| `422 Unprocessable Entity` | Valid request rejected by a domain rule       |
| `429 Too Many Requests`    | Rate limit exceeded                           |
| `503 Service Unavailable`  | Required dependency unavailable               |

When a menu item is created successfully, the response contains:

`201 Created`

and a `Location` header such as:

`Location: /menu-items/2`

---

## B3 — Authorization

Protected endpoints require:

`Authorization: Bearer <token>`

For example:

```http
Authorization: Bearer test-token
```

If the Authorization header is missing or contains an empty Bearer token, the service returns:

`401 Unauthorized`

No real authentication or token-generation system is implemented. The assignment only requires header-level handling.

---

## B4 — Cache-Control and ETag

Single-item GET responses include:

`Cache-Control: private, max-age=60`

and an `ETag`.

Example:

```http
ETag: "5d2458fe995cd6a0642720c64ee71358ef7ce63a0082b199503a7fbc4bfc58c4"
```

The ETag is generated from the current representation of the menu item.

When the resource changes, its ETag changes.

---

## B5 — Rate Limiting

The service sends:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: <remaining>
```

The rate limit is maintained per client.

When the limit is exceeded, the service returns:

`429 Too Many Requests`

and:

```http
Retry-After: 60
```

---

## B6 — CORS

The service supports CORS using:

```http
Access-Control-Allow-Origin: *
```

OPTIONS requests are used for CORS preflight.

The preflight response includes:

```http
Access-Control-Allow-Methods: GET, POST, OPTIONS
```

and the allowed request headers include:

```http
Content-Type
Accept
Authorization
Idempotency-Key
If-Match
If-None-Match
X-HTTP-Method-Override
```

---

## B7 — Security Headers

The service includes:

```http
X-Content-Type-Options: nosniff
```

and:

```http
Strict-Transport-Security: max-age=31536000
```

The Flask/Werkzeug framework also supplies standard headers such as:

`Date`

and:

`Server`

In production, HTTPS should be used so that Strict-Transport-Security has the intended effect.

---

# Part C — Conditional Requests and Safe Retries

## C1 — If-None-Match

The client can send the ETag received from an earlier GET:

```http
If-None-Match: "5d2458fe995cd6a0642720c64ee71358ef7ce63a0082b199503a7fbc4bfc58c4"
```

If the current ETag matches, the server returns:

```text
HTTP/1.1 304 NOT MODIFIED
```

No response body is returned.

---

## C2 — If-Match

Updates require the client to provide:

```http
If-Match: "<current-etag>"
```

If the supplied ETag does not match the current resource ETag, the server returns:

```text
HTTP/1.1 412 PRECONDITION FAILED
```

This prevents one client from accidentally overwriting changes made by another client.

---

## C3 — Idempotency-Key

The create endpoint requires:

```http
Idempotency-Key: <unique-key>
```

When the same key is sent again, the service returns the original result instead of creating another menu item.

This protects against duplicate creation when a client retries after a timeout or uncertain network response.

---

## C4 — Safe-Retry Plan

| Endpoint                             | Retry Mechanism                   | Reason                            |
| ------------------------------------ | --------------------------------- | --------------------------------- |
| `GET /menu-items`                    | Normal retry                      | GET is safe                       |
| `GET /menu-items/{id}`               | `If-None-Match`                   | Avoids unnecessary response body  |
| `POST /menu-items`                   | `Idempotency-Key`                 | Prevents duplicate creation       |
| `PUT /menu-items/{id}`               | `If-Match`                        | Prevents lost updates             |
| `POST /menu-items/{id}/availability` | Verify current state before retry | Avoids unintended repeated action |
| Conditional GET                      | `If-None-Match`                   | Returns 304 if unchanged          |
| Conditional PUT                      | `If-Match`                        | Returns 412 if resource changed   |

---

# Part D — Testing and Documentation

## D1 — Curl Test Transcript

### Test 1 — Create Resource

Command:

```bash
curl -v -X POST http://127.0.0.1:5000/menu-items \
-H "Content-Type: application/json" \
-H "Accept: application/json" \
-H "Authorization: Bearer test-token" \
-H "Idempotency-Key: D1-create-001" \
-d '{"name":"Dosa","category":"South Indian","price":80,"available":true}'
```

Result:

```text
HTTP/1.1 201 CREATED
Location: /menu-items/3
```

Response body:

```json
{
  "available": true,
  "category": "South Indian",
  "id": 3,
  "name": "Dosa",
  "price": 80.0
}
```

---

### Test 2 — Repeat Same Create Request

The same request was repeated with the same:

```http
Idempotency-Key: D1-create-001
```

Result:

```text
HTTP/1.1 201 CREATED
Location: /menu-items/3
```

The response returned the same menu item with ID `3`. No duplicate resource was created.

---

### Test 3 — Get Current ETag

Command:

```bash
curl -i http://127.0.0.1:5000/menu-items/3
```

Result:

```text
HTTP/1.1 200 OK
ETag: "5d2458fe995cd6a0642720c64ee71358ef7ce63a0082b199503a7fbc4bfc58c4"
Cache-Control: private, max-age=60
```

---

### Test 4 — Conditional GET

Command:

```bash
curl -v http://127.0.0.1:5000/menu-items/3 \
-H 'If-None-Match: "5d2458fe995cd6a0642720c64ee71358ef7ce63a0082b199503a7fbc4bfc58c4"'
```

Result:

```text
HTTP/1.1 304 NOT MODIFIED
ETag: "5d2458fe995cd6a0642720c64ee71358ef7ce63a0082b199503a7fbc4bfc58c4"
```

No response body was returned.

---

### Test 5 — Conditional Write with Wrong ETag

Command:

```bash
curl -i -X PUT http://127.0.0.1:5000/menu-items/3 \
-H "Content-Type: application/json" \
-H "Accept: application/json" \
-H "Authorization: Bearer test-token" \
-H 'If-Match: "wrong-etag-123"' \
-d '{"name":"Dosa Updated","category":"South Indian","price":90,"available":true}'
```

Result:

```text
HTTP/1.1 412 PRECONDITION FAILED
```

The response contained the current ETag:

```text
ETag: "5d2458fe995cd6a0642720c64ee71358ef7ce63a0082b199503a7fbc4bfc58c4"
```

---

### Test 6 — Bad Request

Command:

```bash
curl -i -X POST http://127.0.0.1:5000/menu-items \
-H "Content-Type: application/json" \
-H "Accept: application/json" \
-H "Authorization: Bearer test-token" \
-H "Idempotency-Key: D1-400-001" \
-d '{"name":"Test","category":"Food","available":true}'
```

Result:

```text
HTTP/1.1 400 BAD REQUEST
```

Detail:

```text
Missing required field(s): price
```

---

### Test 7 — Not Found

Command:

```bash
curl -i http://127.0.0.1:5000/menu-items/9999
```

Result:

```text
HTTP/1.1 404 NOT FOUND
```

Detail:

```text
Menu item 9999 was not found.
```

---

### Test 8 — Unauthorized

Command:

```bash
curl -i -X POST http://127.0.0.1:5000/menu-items \
-H "Content-Type: application/json" \
-H "Accept: application/json" \
-H "Idempotency-Key: D1-401-001" \
-d '{"name":"Unauthorized Test","category":"Test","price":50,"available":true}'
```

Result:

```text
HTTP/1.1 401 UNAUTHORIZED
```

Detail:

```text
Authorization Bearer token is required.
```

---

# D2 — Request and Response Headers Table

| Endpoint                             | Request Headers                                                             | Response Headers                                                                                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /menu-items`                   | `Content-Type`, `Accept`, `Authorization`, `Idempotency-Key`                | `Content-Type`, `Location`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Access-Control-Allow-Origin`              |
| `GET /menu-items`                    | `Accept`                                                                    | `Content-Type`, `Cache-Control`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Access-Control-Allow-Origin`         |
| `GET /menu-items/{id}`               | `Accept`, `If-None-Match`                                                   | `Content-Type`, `ETag`, `Cache-Control`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Access-Control-Allow-Origin` |
| `PUT /menu-items/{id}`               | `Content-Type`, `Accept`, `Authorization`, `If-Match`                       | `Content-Type`, `ETag`, `Cache-Control`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Access-Control-Allow-Origin` |
| `POST /menu-items/{id}/availability` | `Content-Type`, `Accept`, `Authorization`                                   | `Content-Type`, `ETag`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Access-Control-Allow-Origin`                  |
| `OPTIONS /menu-items`                | `Origin`, `Access-Control-Request-Method`, `Access-Control-Request-Headers` | `Allow`, `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, `X-Content-Type-Options`, `Strict-Transport-Security`               |

---

# D3 — Eight Answers

## 1. Which HTTP methods are safe?

GET and OPTIONS are safe because they do not modify the resource state.

## 2. Which HTTP methods are idempotent?

GET, PUT, and OPTIONS are idempotent according to HTTP semantics.

POST is not inherently idempotent, but the create operation uses an Idempotency-Key to make retries safe against duplicate creation.

## 3. Why is POST used for the availability action?

Availability is treated as an action on an existing menu item, so the service uses:

`POST /menu-items/{item_id}/availability`

instead of placing an action verb directly in the URL.

## 4. Why are filtering, sorting and pagination query parameters?

They change how the collection is viewed without changing the collection itself, so they are represented as query parameters on a GET request.

## 5. Why is 201 returned after creation?

`201 Created` indicates that a new resource was successfully created. The Location header identifies the newly created resource.

## 6. Why is 412 used with If-Match?

`412 Precondition Failed` prevents lost updates. If the supplied ETag does not match the current resource ETag, the update is rejected.

## 7. Why is Idempotency-Key important for POST?

A network failure can occur after the server processes a POST but before the client receives the response. Retrying without protection could create a duplicate resource.

The Idempotency-Key allows the server to recognize the repeated request and return the original result.

## 8. Why is 304 returned for If-None-Match?

`304 Not Modified` tells the client that the resource has not changed since the ETag it already has. Therefore, the server does not send the resource body again.

---

# Assignment 5 Completion Status

* Part A — HTTP Methods: Completed
* Part B — HTTP Headers and Status Codes: Completed
* Part C — Conditional Requests and Safe Retries: Completed
* Part D1 — Curl Testing: Completed
* Part D2 — Headers Table: Completed
* Part D3 — Eight Answers: Completed

---

# Team Information

**Team ID:** __________________________

**Roll No / Name:** __________________________

**Service:** Catalogue

### Team Members

1. ---
2. ---
3. ---
4. ---

---

# Submission Checklist

* [ ] `openapi.yaml` updated
* [ ] Source code updated
* [ ] Tests completed
* [ ] `NOTES.md` completed
* [ ] D1 curl tests documented
* [ ] D2 headers table added
* [ ] D3 eight answers added
* [ ] Team ID entered
* [ ] All team members' roll numbers and names entered
* [ ] Git changes committed
* [ ] Changes pushed to the team branch/repository
* [ ] Final repository link checked
* [ ] ZIP prepared for submission
