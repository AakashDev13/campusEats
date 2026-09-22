const { app } = require("./app");

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 8000);

app.listen(port, host, () => {
  console.log(`Orders REST service listening on http://${host}:${port}`);
});
