import os
import sys
import threading

import pytest
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import store
import app


@pytest.fixture()
def server():
    store.reset()
    app.charge = lambda order_id, amount, key: {"provider_reference": "pay-test-001"}
    from http.server import ThreadingHTTPServer
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{httpd.server_port}"
    httpd.shutdown()
    thread.join(timeout=2)
    store.reset()


def payload():
    return {
        "user_id": 7,
        "items": [{"item_id": 1, "name": "Thali", "unit_price": 80, "quantity": 2}],
    }


def test_create_succeeds_with_201_and_location(server):
    r = requests.post(server + "/orders", json=payload(), headers={"Idempotency-Key": "create-001"})
    assert r.status_code == 201
    assert r.headers["Location"] == "/orders/1"
    assert r.json()["status"] == "CONFIRMED"


def test_idempotent_repeat_returns_original(server):
    headers = {"Idempotency-Key": "repeat-001"}
    first = requests.post(server + "/orders", json=payload(), headers=headers)
    second = requests.post(server + "/orders", json=payload(), headers=headers)
    assert first.status_code == 201
    assert second.status_code == 201
    assert second.headers["Location"] == first.headers["Location"]
    assert second.json() == first.json()
    assert len(store.list_orders()) == 1


def test_failure_path_returns_400_problem(server):
    r = requests.post(
        server + "/orders",
        json={"user_id": "seven", "items": []},
        headers={"Idempotency-Key": "bad-001"},
    )
    assert r.status_code == 400
    assert set(["type", "title", "status", "detail"]).issubset(r.json())


def test_unknown_id_returns_404_problem(server):
    r = requests.get(server + "/orders/99999")
    assert r.status_code == 404
    assert r.json()["status"] == 404
