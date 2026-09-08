import json
import os
import random
import time
import urllib.error
import urllib.request
from flask import Flask, jsonify, request, make_response

from errors import problem
from models import validate_menu_item, validate_availability
import store

app = Flask(__name__)

PAYMENTS_URL = os.getenv("PAYMENTS_URL", "http://localhost:6000/charge")

def error_response(title, status, detail):
    return jsonify(problem(title, status, detail)), status

def payment_call(payload, idempotency_key):
    """Hardened outbound call: timeout + exponential backoff + jitter.
    4xx responses are never retried. The payload carries the idempotency key.
    """
    data = json.dumps(payload).encode("utf-8")
    url = os.getenv("PAYMENTS_URL")
    if not url:
        return {"ok": False, "fallback": "payment_dependency_not_configured"}

    max_attempts = 3
    for attempt in range(max_attempts):
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Idempotency-Key": idempotency_key,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=2.0) as response:
                return {"ok": True, "status": response.status}
        except urllib.error.HTTPError as exc:
            # Never retry client errors.
            if 400 <= exc.code < 500:
                return {"ok": False, "status": exc.code, "retryable": False}
            if attempt == max_attempts - 1:
                return {"ok": False, "status": exc.code, "retryable": True}
        except (urllib.error.URLError, TimeoutError):
            if attempt == max_attempts - 1:
                return {"ok": False, "status": 503, "retryable": True}

        delay = (0.2 * (2 ** attempt)) + random.uniform(0, 0.2)
        time.sleep(delay)

@app.post("/menu-items")
def create_menu_item():
    key = request.headers.get("Idempotency-Key")
    if not key:
        return error_response("Bad Request", 400, "Idempotency-Key header is required.")

    if not request.is_json:
        return error_response("Bad Request", 400, "Content-Type must be application/json.")

    body = request.get_json(silent=True)
    try:
        validate_menu_item(body)
    except ValueError as exc:
        return error_response("Bad Request", 400, str(exc))

    # Demonstrate a hardened cross-service call. Catalogue does not expose
    # payment/provider credentials or internal ids.
    outbound = payment_call(
        {"purpose": "catalogue-health-check", "amount": 0},
        key,
    )

    # If a configured dependency is unreachable, fail closed instead of
    # pretending that the dependent operation succeeded.
    if os.getenv("PAYMENTS_URL") and not outbound.get("ok"):
        return error_response(
            "Service Unavailable",
            503,
            "Required CampusEats dependency is unavailable."
        )

    item = store.create_item(
        body["name"],
        body["category"],
        body["price"],
        body.get("available", True),
        key,
    )
    if item is None:
        return error_response(
            "Conflict", 409,
            "A menu item with the same name and category already exists."
        )

    response = make_response(jsonify(item.as_json()), 201)
    response.headers["Location"] = f"/menu-items/{item.id}"
    return response

@app.get("/menu-items/<int:item_id>")
def get_menu_item(item_id):
    item = store.get_item(item_id)
    if item is None:
        return error_response("Not Found", 404, f"Menu item {item_id} was not found.")
    return jsonify(item.as_json()), 200

@app.get("/menu-items")
def list_menu_items():
    category = request.args.get("category")
    available_raw = request.args.get("available")

    available = None
    if available_raw is not None:
        if available_raw.lower() not in {"true", "false"}:
            return error_response(
                "Bad Request", 400,
                "available must be true or false."
            )
        available = available_raw.lower() == "true"

    items = store.list_items(category=category, available=available)
    return jsonify([x.as_json() for x in items]), 200

@app.patch("/menu-items/<int:item_id>/availability")
def change_availability(item_id):
    if not request.is_json:
        return error_response("Bad Request", 400, "Content-Type must be application/json.")

    body = request.get_json(silent=True)
    try:
        validate_availability(body)
    except ValueError as exc:
        return error_response("Bad Request", 400, str(exc))

    item = store.get_item(item_id)
    if item is None:
        return error_response("Not Found", 404, f"Menu item {item_id} was not found.")

    if item.available == body["available"]:
        return error_response(
            "Conflict", 409,
            "Menu item is already in the requested availability state."
        )

    item.available = body["available"]
    return jsonify(item.as_json()), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
