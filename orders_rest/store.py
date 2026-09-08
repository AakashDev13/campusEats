from models import Order

_orders: dict[int, Order] = {}
_next_id = 1
_idempotency: dict[str, tuple[int, dict, str]] = {}


def create_order(order: Order):
    global _next_id
    order._id = _next_id
    _next_id += 1
    _orders[order._id] = order
    return order


def get_order(order_id: int):
    return _orders.get(order_id)


def list_orders(status: str | None = None):
    values = list(_orders.values())
    if status:
        values = [o for o in values if o.status == status]
    return values


def save(order: Order):
    _orders[order._id] = order
    return order


def get_idempotent(key: str):
    return _idempotency.get(key)


def save_idempotent(key: str, order_id: int, body: dict, location: str):
    _idempotency[key] = (order_id, body, location)


def reset():
    global _next_id
    _orders.clear()
    _idempotency.clear()
    _next_id = 1
