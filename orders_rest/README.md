# CampusEats Orders REST Service

Sibling service folder for the CampusEats REST assignment. The service implements Orders using resources, OpenAPI, HTTP status codes, a single problem error shape, idempotent order creation, and a hardened outbound Payments call.

## Run

```bash
export PAYMENTS_URL=http://localhost:9000
python app.py
```

## Tests

```bash
pytest -q
```

## Contract validation

```bash
openapi-spec-validator openapi.yaml
```
