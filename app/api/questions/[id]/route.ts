import { db } from "@/lib/server/db";

const qStmt = db.prepare(
  `SELECT id, asker_id, asker_name, category, title, body, hair_type, product, status, created_at FROM questions WHERE id = ?`,
);
const aStmt = db.prepare(
  `SELECT id, author_id, author_name, is_expert, body, accepted, created_at FROM answers WHERE question_id = ? ORDER BY id ASC`,
);
const imgStmt = db.prepare(`SELECT url FROM question_images WHERE question_id = ? ORDER BY id`);
const cStmt = db.prepare(`SELECT status FROM consultations WHERE room_id = ?`);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const question = qStmt.get(id);
  if (!question) return Response.json({ error: "질문을 찾을 수 없어요" }, { status: 404 });
  const consult = cStmt.get(id) as { status: string } | undefined;
  return Response.json({ question, answers: aStmt.all(id), images: imgStmt.all(id), consultStatus: consult?.status ?? null });
}
