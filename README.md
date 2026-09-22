# CampusEats

CampusEats is a campus food ordering and management system.

## Team

- Aakash — 20252651001 (Leader)
- Sahil Kumar — 20252651044
- Sonu Jha — 20252651056
- Vedansh Raghuwanshi — 20252651062
- Shanu Singh — 20252651050

## Orders REST Service

The Orders service has been converted from the original Python implementation to **JavaScript with Node.js + Express** and extended for **CS 543 Web Services Assignment 5**.

The service demonstrates:

- REST resource-oriented HTTP methods
- POST sub-resources for non-CRUD actions
- safe and idempotent operations
- query filtering, sorting and pagination
- OPTIONS + Allow
- `X-HTTP-Method-Override`
- JSON content negotiation
- HTTP status codes
- Bearer authorization header handling
- ETag + Cache-Control
- `If-None-Match` → 304
- `If-Match` → 412
- `Idempotency-Key`
- per-client rate limiting
- CORS and OPTIONS preflight
- security headers
- gzip compression for large JSON responses
- hardened outbound Payments call with timeout and retry/backoff
- automated tests
- OpenAPI 3.0.3 contract

## Run the service

```bash
cd orders_rest
npm install
npm run mock-payment
```

In another terminal:

```bash
cd orders_rest
PAYMENTS_URL=http://127.0.0.1:9000 npm start
```

The Orders API is available at:

```text
http://127.0.0.1:8000
```

## Test

```bash
cd orders_rest
npm test
```

## Syntax check

```bash
npm run syntax
```
