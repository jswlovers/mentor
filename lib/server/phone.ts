import crypto from "node:crypto";
import { db } from "./db";

// 휴대폰 인증(중복가입 방지). 실제 SMS 업체 연동 전이라 발급한 인증번호를 호출한 쪽에 그대로 돌려준다(개발/테스트용).
// 나중에 실제 SMS 업체(알리고, NHN Toast 등)를 붙이려면 issueCode()가 반환하는 code를 문자로 보내고,
// 라우트에서 devCode를 응답에 싣지 않도록 바꾸면 된다.
const CODE_TTL_MS = 5 * 60 * 1000; // 5분
const MAX_ATTEMPTS = 5;

export const PHONE_RE = /^01[0-9]\d{7,8}$/;

const upsertStmt = db.prepare(`
  INSERT INTO phone_verifications (phone, code, expires_at, verified, attempts)
  VALUES (?, ?, ?, 0, 0)
  ON CONFLICT(phone) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at, verified = 0, attempts = 0
`);
const getStmt = db.prepare(`SELECT code, expires_at, verified, attempts FROM phone_verifications WHERE phone = ?`);
const markVerifiedStmt = db.prepare(`UPDATE phone_verifications SET verified = 1 WHERE phone = ?`);
const bumpAttemptsStmt = db.prepare(`UPDATE phone_verifications SET attempts = attempts + 1 WHERE phone = ?`);
const deleteStmt = db.prepare(`DELETE FROM phone_verifications WHERE phone = ?`);
const phoneTakenStmt = db.prepare(`SELECT 1 AS x FROM users WHERE phone = ?`);

type VerificationRow = { code: string; expires_at: number; verified: number; attempts: number };

export function issueCode(phone: string) {
  const code = String(crypto.randomInt(100000, 1000000));
  upsertStmt.run(phone, code, Date.now() + CODE_TTL_MS);
  return code;
}

export function checkCode(phone: string, code: string): { ok: true } | { ok: false; error: string } {
  const row = getStmt.get(phone) as VerificationRow | undefined;
  if (!row) return { ok: false, error: "인증번호를 먼저 요청해주세요" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "시도 횟수를 초과했어요. 인증번호를 다시 요청해주세요" };
  if (Date.now() > row.expires_at) return { ok: false, error: "인증번호가 만료됐어요. 다시 요청해주세요" };
  if (row.code !== code) {
    bumpAttemptsStmt.run(phone);
    return { ok: false, error: "인증번호가 일치하지 않아요" };
  }
  markVerifiedStmt.run(phone);
  return { ok: true };
}

export function isPhoneVerified(phone: string) {
  const row = getStmt.get(phone) as VerificationRow | undefined;
  return !!row?.verified;
}

export function isPhoneTaken(phone: string) {
  return !!phoneTakenStmt.get(phone);
}

/** 가입 완료 후 재사용을 막기 위해 인증 기록을 지운다. */
export function consumeVerification(phone: string) {
  deleteStmt.run(phone);
}
