import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from models import Order
from errors import problem
from payment_client import charge
import store

VALID_STATUSES = {"PENDING", "CONFIRMED", "CANCELLED"}


def validate(data):
    """Validate the complete request body before accessing its fields."""
    if not isinstance(data, dict):
        return "Request body must be a JSON object"
    if not isinstance(data.get("user_id"), int) or isinstance(data.get("user_id"), bool):
        return "user_id must be an integer"
    items = data.get("items")
    if not isinstance(items, list) or not items:
        return "items must be a non-empty array"
    if len(items) > 20:
        return "The order cannot contain more than 20 items"
    for item in items:
        if not isinstance(item, dict):
            return "Each item must be an object"
        if not isinstance(item.get("item_id"), int):
            return "item_id must be an integer"
        if not isinstance(item.get("name"), str) or not item["name"].strip():
            return "item name is required"
        if not isinstance(item.get("unit_price"), (int, float)) or item["unit_price"] <= 0:
            return "unit_price must be positive"
        if not isinstance(item.get("quantity"), int) or item["quantity"] <= 0:
            return "quantity must be a positive integer"
    return None


class Handler(BaseHTTPRequestHandler):
    def _send(self, status, body, headers=None):
        raw = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        if headers:
            for k, v in headers.items():
                self.send_header(k, str(v))
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _body(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            return json.loads(self.rfile.read(length))
        except (ValueError, json.JSONDecodeError):
            return None

    def do_POST(self):
        path = urlparse(self.path).path

        if path == "/orders":
            self.create_order()
            return

        parts = path.strip("/").split("/")
        if len(parts) == 3 and parts[0] == "orders" and parts[2] == "cancellation":
            try:
                order_id = int(parts[1])
            except ValueError:
                self._send(400, problem(400, "Bad Request", "Order id must be an integer"))
                return
            self.cancel_order(order_id)
            return

        self._send(404, problem(404, "Not Found", "The requested resource does not exist"))

    def do_GET(self):
        parsed = urlparse(self.path)
        parts = parsed.path.strip("/").split("/") if parsed.path.strip("/") else []

        if parsed.path == "/orders":
            status = parse_qs(parsed.query).get("status", [None])[0]
            if status and status not in VALID_STATUSES:
                self._send(422, problem(422, "Unprocessable Entity", "Unsupported order status filter"))
                return
            self._send(200, {"orders": [o.as_json() for o in store.list_orders(status)]})
            return

        if len(parts) == 2 and parts[0] == "orders":
            try:
                order_id = int(parts[1])
            except ValueError:
                self._send(400, problem(400, "Bad Request", "Order id must be an integer"))
                return
            order = store.get_order(order_id)
            if not order:
                self._send(404, problem(404, "Not Found", "Order not found"))
                return
            self._send(200, order.as_json())
            return

        self._send(404, problem(404, "Not Found", "The requested resource does not exist"))

    def create_order(self):
        data = self._body()
        error = validate(data)
        if error:
            self._send(400, problem(400, "Bad Request", error))
            return

        key = self.headers.get("Idempotency-Key")
        if not key:
            self._send(400, problem(400, "Bad Request", "Idempotency-Key header is required"))
            return

        previous = store.get_idempotent(key)
        if previous:
            _, body, location = previous
            self._send(201, body, {"Location": location})
            return

        items = data["items"]
        total = round(sum(i["unit_price"] * i["quantity"] for i in items), 2)
        # Use a provisional id for the outbound payment request; the in-process store
        # assigns the durable id immediately after payment succeeds.
        provisional_id = max([o._id for o in store.list_orders()] or [0]) + 1
        try:
            payment = charge(provisional_id, total, key)
        except Exception:
            self._send(503, problem(503, "Service Unavailable", "Payment service is unavailable; order was not created"))
            return

        order = Order(provisional_id, data["user_id"], items, total,
                      status="CONFIRMED", payment_reference=payment.get("provider_reference"),
                      idempotency_key=key)
        store.create_order(order)
        body = order.as_json()
        location = f"/orders/{order._id}"
        store.save_idempotent(key, order._id, body, location)
        self._send(201, body, {"Location": location})

    def cancel_order(self, order_id):
        order = store.get_order(order_id)
        if not order:
            self._send(404, problem(404, "Not Found", "Order not found"))
            return
        if order.status == "CANCELLED":
            self._send(409, problem(409, "Conflict", "Order is already cancelled"))
            return
        if order.status == "DELIVERED":
            self._send(409, problem(409, "Conflict", "Delivered orders cannot be cancelled"))
            return
        order.status = "CANCELLED"
        store.save(order)
        self._send(200, order.as_json())


def run(host="127.0.0.1", port=8000):
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Orders REST service listening on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
