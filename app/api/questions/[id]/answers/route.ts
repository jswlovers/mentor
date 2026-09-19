import { db } from "@/lib/server/db";
import { getUser, limited, unauthorized } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";

const qStmt = db.prepare(`SELECT id, asker_id FROM questions WHERE id = ?`);
const insertStmt = db.prepare(
  `INSERT INTO answers (question_id, author_id, author_name, is_expert, body) VALUES (?, ?, ?, ?, ?)`,
);

// 무료 답변(커뮤니티). 승인된 전문가가 쓰면 '검증 전문가' 배지가 붙는다.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (limited(`ans:${user.id}`, 60 * 60 * 1000, 60)) {
    return Response.json({ error: "답변 등록이 너무 많아요" }, { status: 429 });
  }
  const { id } = await params;
  const q = qStmt.get(id) as { id: string; asker_id: string } | undefined;
  if (!q) return Response.json({ error: "질문을 찾을 수 없어요" }, { status: 404 });
  const body = String((await req.json().catch(() => ({}))).body ?? "").trim().slice(0, 3000);
  if (!body) return Response.json({ error: "답변 내용을 입력해주세요" }, { status: 400 });
  insertStmt.run(id, user.id, user.name, user.isExpert ? 1 : 0, body);
  if (q.asker_id !== user.id) notify(q.asker_id, `내 질문에 ${user.name}님이 답변했어요`, `/q/${id}`);
  return Response.json({ ok: true }, { status: 201 });
}
