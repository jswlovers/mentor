import { db } from "@/lib/server/db";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";
import { getMembership } from "@/lib/server/salon";

const findStmt = db.prepare(`SELECT id, salon_id, author_id, member_id FROM salon_events WHERE id = ?`);
const deleteStmt = db.prepare(`DELETE FROM salon_events WHERE id = ?`);

// 일정 삭제: 넣은 사람, 근무·휴무 당사자, 또는 원장
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const m = getMembership(user.id);
  const e = findStmt.get(Number((await params).id)) as { id: number; salon_id: string; author_id: string; member_id: string | null } | undefined;
  if (!m || !e || e.salon_id !== m.salonId) return Response.json({ error: "일정을 찾을 수 없어요" }, { status: 404 });
  if (e.author_id !== user.id && e.member_id !== user.id && m.role !== "owner") return forbidden("넣은 사람이나 원장만 지울 수 있어요");
  deleteStmt.run(e.id);
  return Response.json({ ok: true });
}
