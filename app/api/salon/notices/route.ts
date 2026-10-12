import { db } from "@/lib/server/db";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";
import { getMembership, notifySalon } from "@/lib/server/salon";

const listStmt = db.prepare(`
  SELECT n.id, n.title, n.body, n.created_at, u.name AS author_name
  FROM salon_notices n JOIN users u ON u.id = n.author_id WHERE n.salon_id = ? ORDER BY n.id DESC LIMIT 50`);
const insertStmt = db.prepare(`INSERT INTO salon_notices (salon_id, author_id, title, body) VALUES (?, ?, ?, ?)`);
const deleteStmt = db.prepare(`DELETE FROM salon_notices WHERE id = ? AND salon_id = ?`);
const notMember = () => Response.json({ error: "소속된 매장이 없어요" }, { status: 404 });

// 매장 공지(최근 50개)
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const m = getMembership(user.id);
  if (!m) return notMember();
  return Response.json({ notices: listStmt.all(m.salonId) }, { headers: { "Cache-Control": "private, no-store" } });
}

// 원장: 공지 올리기 { title, body } → 직원 모두에게 알림
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const m = getMembership(user.id);
  if (!m) return notMember();
  if (m.role !== "owner") return forbidden("공지는 원장만 올릴 수 있어요");
  const b = await req.json().catch(() => ({}));
  const title = String(b.title ?? "").trim().slice(0, 60);
  const body = String(b.body ?? "").trim().slice(0, 2000);
  if (!title) return Response.json({ error: "공지 제목을 적어주세요" }, { status: 400 });
  const id = Number(insertStmt.run(m.salonId, user.id, title, body).lastInsertRowid);
  notifySalon(m.salonId, user.id, `[매장 공지] ${title}`, "/salon?tab=notices");
  return Response.json({ id }, { status: 201 });
}

// 원장: 공지 삭제 ?id=
export async function DELETE(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const m = getMembership(user.id);
  if (!m) return notMember();
  if (m.role !== "owner") return forbidden("공지는 원장만 지울 수 있어요");
  const res = deleteStmt.run(Number(new URL(req.url).searchParams.get("id")), m.salonId);
  if (Number(res.changes) === 0) return Response.json({ error: "공지를 찾을 수 없어요" }, { status: 404 });
  return Response.json({ ok: true });
}
