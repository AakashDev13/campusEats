#!/bin/bash
set -e

echo "=== CREATE ==="
curl -i -X POST http://localhost:5000/menu-items \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-123' \
  -d '{"name":"Masala Dosa","category":"South Indian","price":80}'

echo
echo "=== IDEMPOTENT REPEAT ==="
curl -i -X POST http://localhost:5000/menu-items \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-123' \
  -d '{"name":"Masala Dosa","category":"South Indian","price":80}'

echo
echo "=== MALFORMED BODY ==="
curl -i -X POST http://localhost:5000/menu-items \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: bad-1' \
  -d '{"name":"Dosa"}'

echo
echo "=== MISSING RESOURCE ==="
curl -i http://localhost:5000/menu-items/999

echo
echo "=== STATE CONFLICT ==="
curl -i -X PATCH http://localhost:5000/menu-items/1/availability \
  -H 'Content-Type: application/json' \
  -d '{"available":true}'
