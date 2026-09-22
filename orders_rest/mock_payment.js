const http = require("node:http");

const port = Number(process.env.PAYMENT_PORT || 9000);

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/charges") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      let payload;
      try {
        payload = JSON.parse(body || "{}");
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "invalid JSON" }));
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        provider_reference: `mock-pay-${payload.order_id}`
      }));
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock Payments service listening on http://127.0.0.1:${port}`);
});
