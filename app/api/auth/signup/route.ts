import crypto from "node:crypto";
import { grantSignupBonus } from "@/lib/server/coins";
import { db } from "@/lib/server/db";
import { createSession, hashPassword, limited, sessionCookie } from "@/lib/server/http";
import { consumeVerification, isPhoneTaken, isPhoneVerified, PHONE_RE } from "@/lib/server/phone";
import { POSITIONS } from "@/lib/regions";

const findStmt = db.prepare(`SELECT 1 AS x FROM users WHERE username = ?`);
const insertStmt = db.prepare(`INSERT INTO users (id, username, name, pw_hash, role, phone, position) VALUES (?, ?, ?, ?, ?, ?, ?)`);

export async function POST(req: Request) {
  if (limited(`signup:${req.headers.get("x-forwarded-for") ?? "local"}`, 60 * 60 * 1000, 20)) {
    return Response.json({ error: "가입 요청이 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }
  const { username, password, name, phone, position } = await req.json().catch(() => ({}));
  const u = String(username ?? "").trim().toLowerCase();
  const n = String(name ?? "").trim().slice(0, 20);
  const p = String(phone ?? "").replace(/[^0-9]/g, "");
  const pos = String(position ?? "");
  if (!/^[a-z0-9_]{4,20}$/.test(u)) return Response.json({ error: "아이디는 영문 소문자·숫자·_ 4~20자로 입력해주세요" }, { status: 400 });
  if (String(password ?? "").length < 8) return Response.json({ error: "비밀번호는 8자 이상이어야 해요" }, { status: 400 });
  if (!n) return Response.json({ error: "이름(닉네임)을 입력해주세요" }, { status: 400 });
  if (!(POSITIONS as readonly string[]).includes(pos)) return Response.json({ error: "직급(원장님·디자이너·인턴)을 선택해주세요" }, { status: 400 });
  if (!PHONE_RE.test(p)) return Response.json({ error: "휴대폰 번호 형식이 올바르지 않아요" }, { status: 400 });
  if (!isPhoneVerified(p)) return Response.json({ error: "휴대폰 인증을 먼저 완료해주세요" }, { status: 400 });
  if (findStmt.get(u)) return Response.json({ error: "이미 사용 중인 아이디예요" }, { status: 409 });
  // 인증번호를 받은 뒤에도 그사이 다른 계정이 같은 번호로 먼저 가입했을 수 있어 마지막에 한 번 더 확인한다.
  if (isPhoneTaken(p)) return Response.json({ error: "이미 가입에 사용된 휴대폰 번호예요" }, { status: 409 });

  const id = `u_${crypto.randomUUID().slice(0, 12)}`;
  // 관리자는 가입으로 만들 수 없다. 가입 후 서버에서 `npm run make-admin -- <아이디>` 로 승격한다.
  insertStmt.run(id, u, n, hashPassword(String(password)), "member", p, pos);
  consumeVerification(p);
  grantSignupBonus(id);

  return Response.json({ ok: true }, { status: 201, headers: { "Set-Cookie": sessionCookie(createSession(id)) } });
}
