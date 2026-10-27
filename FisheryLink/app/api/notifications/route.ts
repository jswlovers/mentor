import { db } from "@/lib/server/db";
import { getUser, unauthorized } from "@/lib/server/http";

const listStmt = db.prepare(`SELECT id, body, link, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 100`);
const readAll = db.prepare(`UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL`);
const readOne = db.prepare(`UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND id = ? AND read_at IS NULL`);

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  return Response.json(listStmt.all(user.id));
}

// 전체 읽음 처리 또는 { id } 한 건 읽음 처리
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { id } = await req.json().catch(() => ({}));
  if (id) readOne.run(user.id, Number(id));
  else readAll.run(user.id);
  return Response.json({ ok: true });
}
