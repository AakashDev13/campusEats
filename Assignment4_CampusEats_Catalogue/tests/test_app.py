import pytest
from app import app
import store

@pytest.fixture(autouse=True)
def reset_store():
    store._items.clear()
    store._idempotency.clear()
    store._next_id = 1
    app.config["TESTING"] = True
    yield

@pytest.fixture
def client():
    return app.test_client()

def test_create_succeeds_with_location(client, monkeypatch):
    monkeypatch.delenv("PAYMENTS_URL", raising=False)
    response = client.post(
        "/menu-items",
        json={"name": "Masala Dosa", "category": "South Indian", "price": 80},
        headers={"Idempotency-Key": "key-1"},
    )
    assert response.status_code == 201
    assert response.headers["Location"] == "/menu-items/1"
    assert response.json["name"] == "Masala Dosa"
    assert "internal_id" not in response.json

def test_idempotent_repeat_returns_original(client, monkeypatch):
    monkeypatch.delenv("PAYMENTS_URL", raising=False)
    payload = {"name": "Veg Burger", "category": "Burger", "price": 120}
    first = client.post("/menu-items", json=payload,
                        headers={"Idempotency-Key": "same-key"})
    second = client.post("/menu-items", json=payload,
                         headers={"Idempotency-Key": "same-key"})
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json == second.json
    assert len(store._items) == 1

def test_malformed_body_returns_400(client, monkeypatch):
    monkeypatch.delenv("PAYMENTS_URL", raising=False)
    response = client.post(
        "/menu-items",
        json={"name": "Only Name"},
        headers={"Idempotency-Key": "key-2"},
    )
    assert response.status_code == 400
    assert set(response.json) == {"type", "title", "status", "detail"}

def test_unknown_id_returns_404(client):
    response = client.get("/menu-items/999")
    assert response.status_code == 404
    assert set(response.json) == {"type", "title", "status", "detail"}
