import { db } from "@/lib/server/db";
import { createSession, limited, sessionCookie, verifyPassword } from "@/lib/server/http";

const findStmt = db.prepare(`SELECT id, pw_hash, suspended_at FROM users WHERE username = ?`);

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  const u = String(username ?? "").trim().toLowerCase();
  if (limited(`login:${u}`, 10 * 60 * 1000, 10)) {
    return Response.json({ error: "로그인 시도가 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }
  const row = findStmt.get(u) as { id: string; pw_hash: string; suspended_at: string | null } | undefined;
  if (!row || !verifyPassword(String(password ?? ""), row.pw_hash)) {
    return Response.json({ error: "아이디 또는 비밀번호가 올바르지 않아요" }, { status: 401 });
  }
  if (row.suspended_at) return Response.json({ error: "이용이 정지된 계정이에요. 고객센터로 문의해주세요" }, { status: 403 });
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(createSession(row.id)) } });
}
