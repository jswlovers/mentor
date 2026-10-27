import { db } from "@/lib/server/db";
import { getUser, limited, unauthorized } from "@/lib/server/http";
import { applyAutoModeration } from "@/lib/server/moderation";

const CATEGORIES = new Set(["complaint", "refund", "report", "other"]);
const insert = db.prepare(`INSERT INTO support_tickets (user_id, category, subject, body, target_user_id) VALUES (?, ?, ?, ?, ?)`);
const mine = db.prepare(
  `SELECT id, category, subject, body, status, admin_note, refund_coins, created_at FROM support_tickets WHERE user_id = ? ORDER BY id DESC`,
);
const findUser = db.prepare(`SELECT id, role FROM users WHERE username = ?`);

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  return Response.json(mine.all(user.id));
}

// 문의·환불 요청·회원 신고. 신고(report)는 대상 아이디를 받고, 누적되면 자동 경고/정지된다.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (limited(`ticket:${user.id}`, 60 * 60 * 1000, 10)) {
    return Response.json({ error: "문의가 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }
  const b = await req.json().catch(() => ({}));
  const category = String(b.category ?? "");
  const subject = String(b.subject ?? "").trim().slice(0, 100);
  const body = String(b.body ?? "").trim().slice(0, 2000);
  if (!CATEGORIES.has(category)) return Response.json({ error: "문의 종류를 선택해주세요" }, { status: 400 });
  if (!subject || !body) return Response.json({ error: "제목과 내용을 입력해주세요" }, { status: 400 });

  let targetId: string | null = null;
  if (category === "report") {
    const t = findUser.get(String(b.targetUsername ?? "").trim().toLowerCase()) as { id: string; role: string } | undefined;
    if (!t || t.role === "admin") return Response.json({ error: "신고할 회원의 아이디를 확인해주세요" }, { status: 400 });
    if (t.id === user.id) return Response.json({ error: "본인은 신고할 수 없어요" }, { status: 400 });
    targetId = t.id;
  }
  insert.run(user.id, category, subject, body, targetId);
  if (targetId) applyAutoModeration(targetId);
  return Response.json({ ok: true }, { status: 201 });
}
