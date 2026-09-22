from dataclasses import dataclass

@dataclass
class MenuItem:
    id: int
    name: str
    category: str
    price: float
    available: bool = True
    internal_id: str = ""

    def as_json(self):
        # Representation deliberately differs from the stored record:
        # internal_id is never published.
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "price": self.price,
            "available": self.available,
        }

def validate_menu_item(body):
    if not isinstance(body, dict):
        raise ValueError("Request body must be a JSON object.")

    required = {"name", "category", "price"}
    if not required.issubset(body):
        missing = ", ".join(sorted(required - set(body)))
        raise ValueError(f"Missing required field(s): {missing}")

    if set(body) - {"name", "category", "price", "available"}:
        raise ValueError("Request contains an unknown field.")

    if not isinstance(body["name"], str) or not body["name"].strip():
        raise ValueError("name must be a non-empty string.")

    if not isinstance(body["category"], str) or not body["category"].strip():
        raise ValueError("category must be a non-empty string.")

    if isinstance(body["price"], bool) or not isinstance(body["price"], (int, float)):
        raise ValueError("price must be a number.")

    if body["price"] < 0:
        raise ValueError("price must be non-negative.")

    if "available" in body and not isinstance(body["available"], bool):
        raise ValueError("available must be boolean.")

def validate_availability(body):
    if not isinstance(body, dict):
        raise ValueError("Request body must be a JSON object.")
    if set(body) != {"available"}:
        raise ValueError("Body must contain only the available field.")
    if not isinstance(body["available"], bool):
        raise ValueError("available must be boolean.")
