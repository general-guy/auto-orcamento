const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { EventEmitter } = require("node:events");
const { attachNotifyToastRoute, postNotifyToAtlas } = require("./atlas-notify");

test("toast amarelo se o Atlas nao responde em 5s", async () => {
  const server = http.createServer(() => {});
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  process.env.AUTO_ORCAMENTO_NOTIFY_TEST = "1";
  process.env.AUTO_ORCAMENTO_ATLAS_NOTIFY_TOKEN = "teste";
  process.env.AUTO_ORCAMENTO_ATLAS_NOTIFY_URL = `http://127.0.0.1:${port}/api/sync/notify`;
  const chunks = [];
  const req = new EventEmitter();
  const res = {
    writeHead() {},
    write(data) {
      chunks.push(String(data));
      return true;
    },
  };
  attachNotifyToastRoute(req, res);
  const started = Date.now();
  const result = await postNotifyToAtlas(["data/settings.json"]);
  const elapsed = Date.now() - started;
  req.emit("close");
  server.close();
  assert.equal(result.status, "atlas_offline");
  assert.ok(elapsed >= 4500 && elapsed < 8000, String(elapsed));
  const payload = chunks.join("");
  assert.match(payload, /O Atlas não respondeu em 5 segundos/);
  assert.match(payload, /"level":"warn"/);
});
