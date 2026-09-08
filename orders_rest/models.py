from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

@dataclass
class Order:
    _id: int
    user_id: int
    items: list[dict[str, Any]]
    total_amount: float
    status: str = "PENDING"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    payment_reference: str | None = None
    idempotency_key: str | None = None

    def as_json(self) -> dict[str, Any]:
        # _id and idempotency_key are internal fields and are never exposed.
        return {
            "id": self._id,
            "user_id": self.user_id,
            "items": self.items,
            "total_amount": self.total_amount,
            "status": self.status,
            "created_at": self.created_at,
            "payment_reference": self.payment_reference,
        }
