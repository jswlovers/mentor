import crypto from "node:crypto";
import { db } from "@/lib/server/db";
import { getUser, limited, unauthorized } from "@/lib/server/http";

const CATEGORIES = new Set(["펌", "염색", "염색클리닉", "탈색", "커트", "클리닉", "매장운영"]);

const listStmt = db.prepare(`
  SELECT q.id, q.asker_id, q.asker_name, q.category, q.title, q.status, q.created_at,
         (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) AS answer_count,
         (SELECT status FROM consultations c WHERE c.room_id = q.id) AS consult_status
  FROM questions q ORDER BY q.created_at DESC, q.rowid DESC LIMIT 100
`);
const insertStmt = db.prepare(
  `INSERT INTO questions (id, asker_id, asker_name, category, title, body, hair_type, product) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
);

// 질문 목록은 누구나 볼 수 있다.
export async function GET() {
  return Response.json(listStmt.all());
}

export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (limited(`q:${user.id}`, 60 * 60 * 1000, 30)) {
    return Response.json({ error: "질문 등록이 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }
  const b = await req.json().catch(() => ({}));
  const title = String(b.title ?? "").trim().slice(0, 100);
  const body = String(b.body ?? "").trim().slice(0, 3000);
  if (!CATEGORIES.has(b.category)) return Response.json({ error: "카테고리를 선택해주세요" }, { status: 400 });
  if (!title || !body) return Response.json({ error: "제목과 내용을 입력해주세요" }, { status: 400 });
  const id = `q_${crypto.randomUUID().slice(0, 10)}`;
  insertStmt.run(id, user.id, user.name, b.category, title, body, String(b.hairType || "-").slice(0, 100), String(b.product || "-").slice(0, 200));
  return Response.json({ id }, { status: 201 });
}
