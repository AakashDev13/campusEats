const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function charge(orderId, amount, idempotencyKey) {
  const baseUrl = process.env.PAYMENTS_URL;
  if (!baseUrl) throw new Error("PAYMENTS_URL is not configured");

  const url = baseUrl.replace(/\/+$/, "") + "/charges";
  const payload = { order_id: orderId, amount, currency: "INR" };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (response.status >= 400 && response.status < 500 && !RETRYABLE.has(response.status)) {
        throw new Error(`Payment service returned ${response.status}`);
      }

      if (RETRYABLE.has(response.status)) {
        if (attempt === 2) {
          throw new Error(`Payment service returned ${response.status}`);
        }
      } else if (!response.ok) {
        throw new Error(`Payment service returned ${response.status}`);
      } else {
        return await response.json();
      }
    } catch (err) {
      if (attempt === 2) throw err;
    } finally {
      clearTimeout(timeout);
    }

    const backoff = 200 * (2 ** attempt) + Math.floor(Math.random() * 100);
    await sleep(backoff);
  }

  throw new Error("payment call failed");
}

module.exports = { charge };
