// 커스텀 서버: HTTPS_CERT_PATH / HTTPS_KEY_PATH가 있으면 Node가 직접 HTTPS를 처리한다 (포레스트클럽과 같은 방식).
// 사용: node --env-file=.env.local server.mjs --prod   (사전에 npm run build 필요)
//       node --env-file=.env.local server.mjs          (개발 모드)
import fs from "node:fs";
import http from "node:http";
import https from "node:https";

const prod = process.argv.includes("--prod");
if (prod) process.env.NODE_ENV = "production";

const { default: next } = await import("next");
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: !prod });
const handle = app.getRequestHandler();
await app.prepare();

const onRequest = (req, res) => handle(req, res);
const certPath = process.env.HTTPS_CERT_PATH;
const keyPath = process.env.HTTPS_KEY_PATH;

if (certPath && keyPath) {
  https
    .createServer({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }, onRequest)
    .listen(port, () => console.log(`mentor 실행 중 (HTTPS, ${prod ? "production" : "dev"}): https://localhost:${port}`));
} else {
  http.createServer(onRequest).listen(port, () => console.log(`mentor 실행 중 (HTTP, ${prod ? "production" : "dev"}): http://localhost:${port}`));
}
