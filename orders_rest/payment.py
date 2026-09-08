import os
import random
import time
import requests

RETRYABLE = {408, 429, 500, 502, 503, 504}


def charge(order_id: int, amount: float, idempotency_key: str) -> dict:
    """Call Payments with timeout + exponential backoff + jitter.

    Only transport failures and explicitly retryable 5xx/408/429 responses are retried.
    4xx responses are never retried. The same idempotency key is sent on every attempt.
    """
    base_url = os.environ.get("PAYMENTS_URL")
    if not base_url:
        raise RuntimeError("PAYMENTS_URL is not configured")

    url = base_url.rstrip("/") + "/charges"
    payload = {"order_id": order_id, "amount": amount, "currency": "INR"}
    headers = {"Idempotency-Key": idempotency_key, "Content-Type": "application/json"}

    for attempt in range(3):
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=2.0)
            if 400 <= response.status_code < 500:
                response.raise_for_status()
            if response.status_code in RETRYABLE:
                if attempt == 2:
                    response.raise_for_status()
            else:
                response.raise_for_status()
                return response.json()
        except requests.RequestException:
            if attempt == 2:
                raise

        # Exponential backoff: 0.2, 0.4, ... plus small random jitter.
        time.sleep((0.2 * (2 ** attempt)) + random.uniform(0, 0.1))

    raise RuntimeError("payment call failed")
