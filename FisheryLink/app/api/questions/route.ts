import crypto from "node:crypto";
import { db } from "@/lib/server/db";
import { getUser, limited, unauthorized } from "@/lib/server/http";
import { findField, isField } from "@/lib/fisheries";

const SELECT = `
  SELECT q.id, q.asker_id, q.asker_name, q.category, q.title, q.status, q.created_at,
         (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) AS answer_count,
         (SELECT status FROM consultations c WHERE c.room_id = q.id) AS consult_status
  FROM questions q`;
const listStmt = db.prepare(`${SELECT} ORDER BY q.created_at DESC, q.rowid DESC LIMIT 100`);
const byFieldStmt = db.prepare(`${SELECT} WHERE q.category = ? ORDER BY q.created_at DESC, q.rowid DESC LIMIT 100`);
const insertStmt = db.prepare(
  `INSERT INTO questions (id, asker_id, asker_name, category, title, body, farm_info, conditions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
);

// 질문 목록은 누구나 볼 수 있다. ?field=<분야 id>로 한 분야만 볼 수 있다.
export async function GET(req: Request) {
  const field = new URL(req.url).searchParams.get("field");
  return Response.json(field ? byFieldStmt.all(field) : listStmt.all());
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
  if (!isField(b.category)) return Response.json({ error: "어업 분야를 선택해주세요" }, { status: 400 });
  if (!title || !body) return Response.json({ error: "제목과 내용을 입력해주세요" }, { status: 400 });
  const id = `q_${crypto.randomUUID().slice(0, 10)}`;
  insertStmt.run(id, user.id, user.name, findField(b.category)!.id, title, body, String(b.farmInfo || "-").slice(0, 200), String(b.conditions || "-").slice(0, 300));
  return Response.json({ id }, { status: 201 });
}
