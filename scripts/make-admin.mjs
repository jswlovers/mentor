// 기존 회원을 관리자로 승격한다: npm run make-admin -- <아이디>
// (관리자 자동 승격은 공개 서비스에서 위험해서, 가입 후 서버에서 직접 실행하는 방식만 둔다.)
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const username = (process.argv[2] || "").trim().toLowerCase();
if (!username) {
  console.error("사용법: npm run make-admin -- <아이디>");
  process.exit(1);
}
const db = new DatabaseSync(path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "mentor.sqlite"));
db.exec("PRAGMA busy_timeout = 10000");
const res = db.prepare(`UPDATE users SET role = 'admin' WHERE username = ?`).run(username);
if (Number(res.changes) === 0) {
  console.error(`'${username}' 회원을 찾을 수 없어요. 먼저 가입해주세요.`);
  process.exit(1);
}
console.log(`'${username}' 을(를) 관리자로 지정했어요.`);
