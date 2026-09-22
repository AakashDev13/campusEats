import json
import os
import random
import time
import hashlib
import gzip
import urllib.error
import urllib.request

from flask import Flask, jsonify, request, make_response

from errors import problem
from models import validate_menu_item, validate_availability
import store

app = Flask(__name__)

RATE_LIMIT = 100
_rate_usage = {}


def error_response(title, status, detail):
    response = make_response(
        jsonify(problem(title, status, detail)),
        status
    )
    response.headers["Content-Type"] = "application/json"
    add_common_headers(response)
    return response


def add_common_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Strict-Transport-Security"] = "max-age=31536000"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT)

    client = request.remote_addr or "unknown"
    used = _rate_usage.get(client, 0)

    response.headers["X-RateLimit-Remaining"] = str(
        max(0, RATE_LIMIT - used)
    )

    return response


def check_rate_limit():
    client = request.remote_addr or "unknown"
    used = _rate_usage.get(client, 0)

    if used >= RATE_LIMIT:
        response = error_response(
            "Too Many Requests",
            429,
            "Per-client rate limit exceeded."
        )
        response.headers["Retry-After"] = "60"
        return response

    _rate_usage[client] = used + 1
    return None


def check_authorization():
    token = request.headers.get("Authorization", "")

    if not token.startswith("Bearer ") or not token[7:].strip():
        return error_response(
            "Unauthorized",
            401,
            "Authorization Bearer token is required."
        )

    return None


def check_accept():
    accept = request.headers.get("Accept")

    if not accept:
        return None

    accepted = [
        item.strip().split(";")[0].strip()
        for item in accept.split(",")
    ]

    if "application/json" not in accepted and "*/*" not in accepted:
        return error_response(
            "Not Acceptable",
            406,
            "Only application/json responses are supported."
        )

    return None


def maybe_gzip(response):
    body = response.get_data()

    if len(body) < 500:
        return response

    accept_encoding = request.headers.get("Accept-Encoding", "")

    if "gzip" not in accept_encoding.lower():
        return response

    response.set_data(gzip.compress(body))
    response.headers["Content-Encoding"] = "gzip"
    response.headers["Vary"] = "Accept-Encoding"

    return response


def make_etag(item):
    data = json.dumps(
        item.as_json(),
        sort_keys=True,
        separators=(",", ":")
    ).encode("utf-8")

    digest = hashlib.sha256(data).hexdigest()

    return f'"{digest}"'


def payment_call(payload, idempotency_key):
    data = json.dumps(payload).encode("utf-8")
    url = os.getenv("PAYMENTS_URL")

    if not url:
        return {
            "ok": False,
            "fallback": "payment_dependency_not_configured"
        }

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
                return {
                    "ok": True,
                    "status": response.status
                }

        except urllib.error.HTTPError as exc:

            if 400 <= exc.code < 500:
                return {
                    "ok": False,
                    "status": exc.code,
                    "retryable": False
                }

            if attempt == max_attempts - 1:
                return {
                    "ok": False,
                    "status": exc.code,
                    "retryable": True
                }

        except (urllib.error.URLError, TimeoutError):

            if attempt == max_attempts - 1:
                return {
                    "ok": False,
                    "status": 503,
                    "retryable": True
                }

        delay = (0.2 * (2 ** attempt)) + random.uniform(0, 0.2)
        time.sleep(delay)


@app.before_request
def before_request_checks():

    rate_response = check_rate_limit()

    if rate_response:
        return rate_response

    accept_response = check_accept()

    if accept_response:
        return accept_response


@app.after_request
def after_request_headers(response):

    add_common_headers(response)

    if response.status_code != 204:
        maybe_gzip(response)

    return response


@app.route("/menu-items", methods=["OPTIONS"])
def options_menu_items():

    response = make_response("", 204)

    response.headers["Allow"] = "GET, POST, OPTIONS"

    response.headers["Access-Control-Allow-Origin"] = "*"

    response.headers["Access-Control-Allow-Methods"] = (
        "GET, POST, OPTIONS"
    )

    response.headers["Access-Control-Allow-Headers"] = (
        "Content-Type, Accept, Authorization, "
        "Idempotency-Key, If-Match, If-None-Match, "
        "X-HTTP-Method-Override"
    )

    return response


@app.route("/menu-items/<int:item_id>", methods=["OPTIONS"])
def options_single_menu_item(item_id):

    response = make_response("", 204)

    response.headers["Allow"] = "GET, PUT, OPTIONS"

    response.headers["Access-Control-Allow-Origin"] = "*"

    response.headers["Access-Control-Allow-Methods"] = (
        "GET, PUT, OPTIONS"
    )

    response.headers["Access-Control-Allow-Headers"] = (
        "Content-Type, Accept, Authorization, "
        "If-Match, If-None-Match, X-HTTP-Method-Override"
    )

    return response


@app.route("/menu-items", methods=["POST"])
def create_menu_item():

    auth_response = check_authorization()

    if auth_response:
        return auth_response

    key = request.headers.get("Idempotency-Key")

    if not key:
        return error_response(
            "Bad Request",
            400,
            "Idempotency-Key header is required."
        )

    if not request.is_json:
        return error_response(
            "Bad Request",
            400,
            "Content-Type must be application/json."
        )

    body = request.get_json(silent=True)

    if body is None:
        return error_response(
            "Bad Request",
            400,
            "Malformed JSON request."
        )

    try:
        validate_menu_item(body)

    except ValueError as exc:
        return error_response(
            "Bad Request",
            400,
            str(exc)
        )

    outbound = payment_call(
        {
            "purpose": "catalogue-health-check",
            "amount": 0
        },
        key,
    )

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
            "Conflict",
            409,
            "A menu item with the same name and category already exists."
        )

    response = make_response(
        jsonify(item.as_json()),
        201
    )

    response.headers["Location"] = f"/menu-items/{item.id}"

    return response


@app.get("/menu-items")
def list_menu_items():

    category = request.args.get("category")
    available_raw = request.args.get("available")

    sort_by = request.args.get("sort", "id")
    order = request.args.get("order", "asc")

    page_raw = request.args.get("page", "1")
    limit_raw = request.args.get("limit", "20")

    if available_raw is not None:

        if available_raw.lower() not in {"true", "false"}:
            return error_response(
                "Bad Request",
                400,
                "available must be true or false."
            )

        available = available_raw.lower() == "true"

    else:
        available = None

    if sort_by not in {"id", "name", "category", "price"}:
        return error_response(
            "Bad Request",
            400,
            "sort must be id, name, category, or price."
        )

    if order not in {"asc", "desc"}:
        return error_response(
            "Bad Request",
            400,
            "order must be asc or desc."
        )

    try:
        page = int(page_raw)
        limit = int(limit_raw)

    except ValueError:
        return error_response(
            "Bad Request",
            400,
            "page and limit must be integers."
        )

    if page < 1:
        return error_response(
            "Bad Request",
            400,
            "page must be at least 1."
        )

    if limit < 1 or limit > 100:
        return error_response(
            "Bad Request",
            400,
            "limit must be between 1 and 100."
        )

    items = store.list_items(
        category=category,
        available=available,
        sort_by=sort_by,
        order=order,
        page=page,
        limit=limit
    )

    response = make_response(
        jsonify([x.as_json() for x in items]),
        200
    )

    response.headers["Cache-Control"] = "public, max-age=60"

    return response


@app.get("/menu-items/<int:item_id>")
def get_menu_item(item_id):

    item = store.get_item(item_id)

    if item is None:
        return error_response(
            "Not Found",
            404,
            f"Menu item {item_id} was not found."
        )

    etag = make_etag(item)

    if_none_match = request.headers.get("If-None-Match")

    if if_none_match == etag:

        response = make_response("", 304)

        response.headers["ETag"] = etag
        response.headers["Cache-Control"] = "private, max-age=60"

        return response

    response = make_response(
        jsonify(item.as_json()),
        200
    )

    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "private, max-age=60"

    return response


@app.put("/menu-items/<int:item_id>")
def update_menu_item(item_id):

    auth_response = check_authorization()

    if auth_response:
        return auth_response

    item = store.get_item(item_id)

    if item is None:
        return error_response(
            "Not Found",
            404,
            f"Menu item {item_id} was not found."
        )

    if not request.is_json:
        return error_response(
            "Bad Request",
            400,
            "Content-Type must be application/json."
        )

    body = request.get_json(silent=True)

    if body is None:
        return error_response(
            "Bad Request",
            400,
            "Malformed JSON request."
        )

    current_etag = make_etag(item)

    if_match = request.headers.get("If-Match")

    if not if_match:
        return error_response(
            "Precondition Required",
            428,
            "If-Match header is required for updates."
        )

    if if_match != current_etag:

        response = error_response(
            "Precondition Failed",
            412,
            "The resource has changed since it was read."
        )

        response.headers["ETag"] = current_etag

        return response

    try:
        validate_menu_item(body)

    except ValueError as exc:
        return error_response(
            "Bad Request",
            400,
            str(exc)
        )

    item.name = body["name"].strip()
    item.category = body["category"].strip()
    item.price = float(body["price"])
    item.available = body.get(
        "available",
        item.available
    )

    new_etag = make_etag(item)

    response = make_response(
        jsonify(item.as_json()),
        200
    )

    response.headers["ETag"] = new_etag
    response.headers["Cache-Control"] = "private, max-age=60"

    return response


@app.post("/menu-items/<int:item_id>/availability")
def change_availability(item_id):

    auth_response = check_authorization()

    if auth_response:
        return auth_response

    if not request.is_json:
        return error_response(
            "Bad Request",
            400,
            "Content-Type must be application/json."
        )

    body = request.get_json(silent=True)

    if body is None:
        return error_response(
            "Bad Request",
            400,
            "Malformed JSON request."
        )

    try:
        validate_availability(body)

    except ValueError as exc:
        return error_response(
            "Bad Request",
            400,
            str(exc)
        )

    item = store.get_item(item_id)

    if item is None:
        return error_response(
            "Not Found",
            404,
            f"Menu item {item_id} was not found."
        )

    if item.available == body["available"]:
        return error_response(
            "Unprocessable Entity",
            422,
            "The requested availability is already set."
        )

    item.available = body["available"]

    response = make_response(
        jsonify(item.as_json()),
        200
    )

    response.headers["ETag"] = make_etag(item)

    return response


@app.route(
    "/menu-items/<int:item_id>",
    methods=["POST"]
)
def method_override(item_id):

    override_method = request.headers.get(
        "X-HTTP-Method-Override",
        ""
    ).upper()

    if override_method == "PUT":
        return update_menu_item(item_id)

    return error_response(
        "Method Not Allowed",
        405,
        "Only X-HTTP-Method-Override: PUT is supported on this endpoint."
    )


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )