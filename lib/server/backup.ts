import fs from "node:fs";
import path from "node:path";
import { db, DATA_DIR } from "./db";

// 백업 위치는 가능하면 다른 디스크로 지정한다(BACKUP_DIR). 기본값은 data/backups.
export const BACKUP_DIR = process.env.BACKUP_DIR || path.join(DATA_DIR, "backups");
const INTERVAL_HOURS = Math.max(1, Number(process.env.BACKUP_INTERVAL_HOURS) || 24);
const KEEP = Math.max(1, Number(process.env.BACKUP_KEEP) || 14);
// 업로드 폴더(사진·첨부·자격증)는 파일이 바뀌지 않으므로 새 파일만 files/ 아래로 복사한다.
const FILE_DIRS = ["uploads", "expert-licenses"];

const DB_FILE = /^mentor-\d{8}-\d{6}\.sqlite$/;

const p2 = (n: number) => String(n).padStart(2, "0");
const stamp = (d = new Date()) =>
  `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;

function dbBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR).filter((f) => DB_FILE.test(f)).sort();
}

/**
 * DB 스냅샷(VACUUM INTO: 쓰는 중에도 일관된 사본) + 업로드 파일 증분 복사 + 오래된 스냅샷 정리.
 * 반환값은 만든 DB 백업 파일 경로.
 */
export function runBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `mentor-${stamp()}.sqlite`);
  if (!fs.existsSync(file)) db.prepare("VACUUM INTO ?").run(file);

  for (const dir of FILE_DIRS) {
    const src = path.join(DATA_DIR, dir);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(BACKUP_DIR, "files", dir), { recursive: true, force: false, errorOnExist: false });
  }

  const all = dbBackups();
  for (const old of all.slice(0, Math.max(0, all.length - KEEP))) fs.rmSync(path.join(BACKUP_DIR, old), { force: true });
  return file;
}

function lastBackupAt() {
  const last = dbBackups().at(-1);
  return last ? fs.statSync(path.join(BACKUP_DIR, last)).mtimeMs : 0;
}

const g = globalThis as unknown as { __mentorBackup?: ReturnType<typeof setInterval> };

function backupIfDue() {
  if (Date.now() - lastBackupAt() < INTERVAL_HOURS * 3600_000) return;
  try {
    console.log(`[backup] 완료: ${runBackup()}`);
  } catch (err) {
    console.error("[backup] 실패", err);
  }
}

/** 서버 시작 시 호출. 마지막 백업이 주기보다 오래됐으면 바로 백업하고, 이후 10분마다 확인한다. */
export function startBackups() {
  if (g.__mentorBackup || process.env.BACKUP_DISABLED === "1") return;
  backupIfDue();
  g.__mentorBackup = setInterval(backupIfDue, 10 * 60_000);
  g.__mentorBackup.unref?.();
  console.log(`[backup] 시작: ${INTERVAL_HOURS}시간마다, 최근 ${KEEP}개 보관 → ${BACKUP_DIR}`);
}
