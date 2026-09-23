import crypto from "node:crypto";
import { db } from "@/lib/server/db";
import { getUser, limited, unauthorized } from "@/lib/server/http";
import { normalizePhone, sendSms } from "@/lib/server/messaging";

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const dupStmt = db.prepare(`SELECT 1 AS x FROM users WHERE phone = ? AND phone_verified_at IS NOT NULL AND id != ?`);
const upsertCode = db.prepare(
  `INSERT INTO phone_verifications (user_id, phone, code_hash, expires_at, attempts) VALUES (?, ?, ?, ?, 0)
   ON CONFLICT(user_id) DO UPDATE SET phone = excluded.phone, code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0`,
);
const getCode = db.prepare(`SELECT phone, code_hash, expires_at, attempts FROM phone_verifications WHERE user_id = ?`);
const bumpAttempts = db.prepare(`UPDATE phone_verifications SET attempts = attempts + 1 WHERE user_id = ?`);
const dropCode = db.prepare(`DELETE FROM phone_verifications WHERE user_id = ?`);
const setVerified = db.prepare(`UPDATE users SET phone = ?, phone_verified_at = datetime('now'), notify_kakao = ?, notify_consent_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END WHERE id = ?`);
const setConsent = db.prepare(`UPDATE users SET notify_kakao = ?, notify_consent_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END WHERE id = ? AND phone_verified_at IS NOT NULL`);
const clearPhone = db.prepare(`UPDATE users SET phone = NULL, phone_verified_at = NULL, notify_kakao = 0, notify_consent_at = NULL WHERE id = ?`);
const userPhone = db.prepare(`SELECT phone_verified_at FROM users WHERE id = ?`);

const hash = (userId: string, code: string) => crypto.createHash("sha256").update(`${userId}:${code}`).digest("hex");

// request: 인증번호 발송 / verify: 인증번호 확인(+수신 동의) / consent: 수신 동의 변경 / remove: 번호 삭제
export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { action } = await params;
  const b = await req.json().catch(() => ({}));

  if (action === "request") {
    if (limited(`otp:${user.id}`, 10 * 60 * 1000, 3)) {
      return Response.json({ error: "인증번호 요청이 너무 많아요. 10분 뒤에 다시 시도해주세요" }, { status: 429 });
    }
    const phone = normalizePhone(b.phone);
    if (!phone) return Response.json({ error: "휴대폰 번호를 확인해주세요 (예: 010-1234-5678)" }, { status: 400 });
    if (dupStmt.get(phone, user.id)) return Response.json({ error: "이미 다른 계정에서 인증된 번호예요" }, { status: 409 });

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    upsertCode.run(user.id, phone, hash(user.id, code), Date.now() + CODE_TTL_MS);
    const sent = await sendSms(phone, `[미용 SOS] 인증번호 ${code} (5분 이내 입력)`);
    if (!sent.ok) return Response.json({ error: "인증번호를 보내지 못했어요. 잠시 후 다시 시도해주세요" }, { status: 502 });
    // 개발/테스트에서만(문자 발송이 mock이고 SMS_DEV_ECHO=1) 화면에 번호를 돌려준다. 운영에서는 설정하지 않는다.
    const echo = sent.mocked && process.env.SMS_DEV_ECHO === "1" ? { devCode: code } : {};
    return Response.json({ ok: true, ...echo });
  }

  if (action === "verify") {
    const row = getCode.get(user.id) as { phone: string; code_hash: string; expires_at: number; attempts: number } | undefined;
    if (!row || row.expires_at < Date.now()) return Response.json({ error: "인증번호가 만료됐어요. 다시 요청해주세요" }, { status: 400 });
    if (row.attempts >= MAX_ATTEMPTS) return Response.json({ error: "시도 횟수를 넘었어요. 인증번호를 다시 요청해주세요" }, { status: 429 });
    const a = Buffer.from(row.code_hash), c = Buffer.from(hash(user.id, String(b.code ?? "").trim()));
    if (a.length !== c.length || !crypto.timingSafeEqual(a, c)) {
      bumpAttempts.run(user.id);
      return Response.json({ error: "인증번호가 맞지 않아요" }, { status: 400 });
    }
    if (dupStmt.get(row.phone, user.id)) return Response.json({ error: "이미 다른 계정에서 인증된 번호예요" }, { status: 409 });
    const consent = b.consent ? 1 : 0;
    setVerified.run(row.phone, consent, consent, user.id);
    dropCode.run(user.id);
    return Response.json({ ok: true });
  }

  if (action === "consent") {
    if (!(userPhone.get(user.id) as { phone_verified_at: string | null }).phone_verified_at) {
      return Response.json({ error: "휴대폰 인증을 먼저 해주세요" }, { status: 400 });
    }
    const v = b.consent ? 1 : 0;
    setConsent.run(v, v, user.id);
    return Response.json({ ok: true });
  }

  if (action === "remove") {
    clearPhone.run(user.id);
    dropCode.run(user.id);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "알 수 없는 요청이에요" }, { status: 400 });
}
