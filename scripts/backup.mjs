// 지금 바로 백업한다: npm run backup  (서버의 자동 백업 lib/server/backup.ts 와 같은 방식·같은 위치)
// 복구: 서버를 멈추고 백업 파일을 data/mentor.sqlite 로 복사(기존 -wal/-shm 파일은 삭제), files/ 아래 폴더를 data/ 로 복사한 뒤 서버를 다시 켠다.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(DATA_DIR, "backups");
const KEEP = Math.max(1, Number(process.env.BACKUP_KEEP) || 14);
const DB_FILE = /^mentor-\d{8}-\d{6}\.sqlite$/;

const db = new DatabaseSync(path.join(DATA_DIR, "mentor.sqlite"));
db.exec("PRAGMA busy_timeout = 10000");

fs.mkdirSync(BACKUP_DIR, { recursive: true });
const d = new Date();
const p2 = (n) => String(n).padStart(2, "0");
const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
const file = path.join(BACKUP_DIR, `mentor-${stamp}.sqlite`);
if (!fs.existsSync(file)) db.prepare("VACUUM INTO ?").run(file);

for (const dir of ["uploads", "expert-licenses"]) {
  const src = path.join(DATA_DIR, dir);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(BACKUP_DIR, "files", dir), { recursive: true, force: false, errorOnExist: false });
}

const all = fs.readdirSync(BACKUP_DIR).filter((f) => DB_FILE.test(f)).sort();
for (const old of all.slice(0, Math.max(0, all.length - KEEP))) fs.rmSync(path.join(BACKUP_DIR, old), { force: true });

console.log(`백업 완료: ${file}`);
