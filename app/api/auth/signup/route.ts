import crypto from "node:crypto";
import { grantSignupBonus } from "@/lib/server/coins";
import { db } from "@/lib/server/db";
import { createSession, hashPassword, limited, sessionCookie } from "@/lib/server/http";
import { TERMS_VERSION } from "@/lib/server/terms";

const findStmt = db.prepare(`SELECT 1 AS x FROM users WHERE username = ?`);
const insertStmt = db.prepare(`INSERT INTO users (id, username, name, pw_hash, role, terms_version, terms_agreed_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`);

export async function POST(req: Request) {
  if (limited(`signup:${req.headers.get("x-forwarded-for") ?? "local"}`, 60 * 60 * 1000, Number(process.env.SIGNUP_LIMIT_PER_HOUR) || 20)) {
    return Response.json({ error: "가입 요청이 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }
  const { username, password, name, agree } = await req.json().catch(() => ({}));
  if (agree !== true) return Response.json({ error: "이용약관과 개인정보 처리방침에 동의해주세요" }, { status: 400 });
  const u = String(username ?? "").trim().toLowerCase();
  const n = String(name ?? "").trim().slice(0, 20);
  if (!/^[a-z0-9_]{4,20}$/.test(u)) return Response.json({ error: "아이디는 영문 소문자·숫자·_ 4~20자로 입력해주세요" }, { status: 400 });
  if (String(password ?? "").length < 8) return Response.json({ error: "비밀번호는 8자 이상이어야 해요" }, { status: 400 });
  if (!n) return Response.json({ error: "이름(닉네임)을 입력해주세요" }, { status: 400 });
  if (findStmt.get(u)) return Response.json({ error: "이미 사용 중인 아이디예요" }, { status: 409 });

  const id = `u_${crypto.randomUUID().slice(0, 12)}`;
  // 관리자는 가입으로 만들 수 없다. 가입 후 서버에서 `npm run make-admin -- <아이디>` 로 승격한다.
  insertStmt.run(id, u, n, hashPassword(String(password)), "member", TERMS_VERSION);
  grantSignupBonus(id);

  return Response.json({ ok: true }, { status: 201, headers: { "Set-Cookie": sessionCookie(createSession(id)) } });
}
