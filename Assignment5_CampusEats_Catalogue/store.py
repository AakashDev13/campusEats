from models import MenuItem

_items = {}
_idempotency = {}
_next_id = 1


def create_item(name, category, price, available, idempotency_key):
    global _next_id

    if idempotency_key in _idempotency:
        return _idempotency[idempotency_key]

    for item in _items.values():
        if item.name.lower() == name.lower() and item.category.lower() == category.lower():
            return None

    item = MenuItem(
        id=_next_id,
        name=name.strip(),
        category=category.strip(),
        price=float(price),
        available=available,
        internal_id=f"CAT-{_next_id:06d}",
    )

    _items[_next_id] = item
    _next_id += 1
    _idempotency[idempotency_key] = item

    return item


def get_item(item_id):
    return _items.get(item_id)


def list_items(
    category=None,
    available=None,
    sort_by="id",
    order="asc",
    page=1,
    limit=20,
):
    result = list(_items.values())

    if category is not None:
        result = [
            x for x in result
            if x.category.lower() == category.lower()
        ]

    if available is not None:
        result = [
            x for x in result
            if x.available == available
        ]

    if sort_by == "name":
        result.sort(key=lambda x: x.name.lower())
    elif sort_by == "price":
        result.sort(key=lambda x: x.price)
    elif sort_by == "category":
        result.sort(key=lambda x: x.category.lower())
    else:
        result.sort(key=lambda x: x.id)

    if order == "desc":
        result.reverse()

    start = (page - 1) * limit
    end = start + limit

    return result[start:end]