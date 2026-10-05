import crypto from "node:crypto";
import { db } from "@/lib/server/db";
import { hashPassword, limited } from "@/lib/server/http";
import { normalizePhone, sendSms } from "@/lib/server/messaging";

// 비밀번호 찾기: 아이디 + 내 정보에서 인증해 둔 휴대폰 번호가 맞으면 그 번호로 인증번호를 보낸다.
// 아이디·번호가 맞는지는 응답으로 알려주지 않는다(가입 여부·번호 추측 방지).
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const findUser = db.prepare(`SELECT id, phone FROM users WHERE username = ? AND phone_verified_at IS NOT NULL AND suspended_at IS NULL`);
const idOf = db.prepare(`SELECT id FROM users WHERE username = ?`);
const upsert = db.prepare(
  `INSERT INTO password_resets (user_id, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0)
   ON CONFLICT(user_id) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0`,
);
const getReset = db.prepare(`SELECT code_hash, expires_at, attempts FROM password_resets WHERE user_id = ?`);
const bump = db.prepare(`UPDATE password_resets SET attempts = attempts + 1 WHERE user_id = ?`);
const drop = db.prepare(`DELETE FROM password_resets WHERE user_id = ?`);
const setHash = db.prepare(`UPDATE users SET pw_hash = ? WHERE id = ?`);
const dropSessions = db.prepare(`DELETE FROM sessions WHERE user_id = ?`);

const hash = (userId: string, code: string) => crypto.createHash("sha256").update(`reset:${userId}:${code}`).digest("hex");
const SENT_MSG = "입력한 아이디와 인증된 휴대폰 번호가 맞으면 인증번호를 문자로 보냈어요";

// request: 인증번호 발송 / confirm: 인증번호 확인 + 새 비밀번호 저장
export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const b = await req.json().catch(() => ({}));
  const username = String(b.username ?? "").trim().toLowerCase();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

  if (action === "request") {
    if (limited(`reset-ip:${ip}`, 60 * 60 * 1000, 10) || limited(`reset-req:${username}`, 10 * 60 * 1000, 3)) {
      return Response.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
    }
    const phone = normalizePhone(b.phone);
    if (!username || !phone) return Response.json({ error: "아이디와 휴대폰 번호를 확인해주세요" }, { status: 400 });
    const u = findUser.get(username) as { id: string; phone: string } | undefined;
    if (!u || u.phone !== phone) return Response.json({ ok: true, message: SENT_MSG });

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    upsert.run(u.id, hash(u.id, code), Date.now() + CODE_TTL_MS);
    const sent = await sendSms(phone, `[미용 SOS] 비밀번호 재설정 인증번호 ${code} (10분 이내 입력)`);
    if (!sent.ok) return Response.json({ error: "인증번호를 보내지 못했어요. 잠시 후 다시 시도해주세요" }, { status: 502 });
    // 개발/테스트에서만(문자 발송이 mock이고 SMS_DEV_ECHO=1) 화면에 번호를 돌려준다.
    const echo = sent.mocked && process.env.SMS_DEV_ECHO === "1" ? { devCode: code } : {};
    return Response.json({ ok: true, message: SENT_MSG, ...echo });
  }

  if (action === "confirm") {
    if (limited(`reset-confirm:${ip}`, 10 * 60 * 1000, 20)) {
      return Response.json({ error: "시도가 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
    }
    const password = String(b.password ?? "");
    if (password.length < 8) return Response.json({ error: "새 비밀번호는 8자 이상이어야 해요" }, { status: 400 });
    const fail = (error: string, status = 400) => Response.json({ error }, { status });
    const u = idOf.get(username) as { id: string } | undefined;
    const row = u && (getReset.get(u.id) as { code_hash: string; expires_at: number; attempts: number } | undefined);
    if (!u || !row || row.expires_at < Date.now()) return fail("인증번호가 만료됐거나 요청 기록이 없어요. 다시 요청해주세요");
    if (row.attempts >= MAX_ATTEMPTS) return fail("시도 횟수를 넘었어요. 인증번호를 다시 요청해주세요", 429);
    const a = Buffer.from(row.code_hash), c = Buffer.from(hash(u.id, String(b.code ?? "").trim()));
    if (a.length !== c.length || !crypto.timingSafeEqual(a, c)) {
      bump.run(u.id);
      return fail("인증번호가 맞지 않아요");
    }
    db.exec("BEGIN");
    try {
      setHash.run(hashPassword(password), u.id);
      dropSessions.run(u.id); // 다른 기기의 로그인은 모두 끊는다
      drop.run(u.id);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
    return Response.json({ ok: true });
  }

  return Response.json({ error: "알 수 없는 요청이에요" }, { status: 400 });
}
