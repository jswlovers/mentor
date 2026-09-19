import { db } from "@/lib/server/db";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";

const qStmt = db.prepare(`SELECT asker_id FROM questions WHERE id = ?`);
const aStmt = db.prepare(`SELECT id FROM answers WHERE id = ? AND question_id = ?`);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const q = qStmt.get(id) as { asker_id: string } | undefined;
  if (!q) return Response.json({ error: "질문을 찾을 수 없어요" }, { status: 404 });
  if (q.asker_id !== user.id) return forbidden("질문자만 답변을 채택할 수 있어요");
  const { answerId } = await req.json().catch(() => ({}));
  if (!aStmt.get(Number(answerId), id)) return Response.json({ error: "답변을 찾을 수 없어요" }, { status: 404 });
  db.prepare(`UPDATE answers SET accepted = (id = ?) WHERE question_id = ?`).run(Number(answerId), id);
  db.prepare(`UPDATE questions SET status = 'solved' WHERE id = ?`).run(id);
  return Response.json({ ok: true });
}
