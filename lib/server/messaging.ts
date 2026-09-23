import crypto from "node:crypto";
import { db } from "./db";

/**
 * 카카오 알림톡 / 문자 발송 (Solapi 경유, 포레스트클럽 services/kakao.js·sms.js 이식).
 *
 * 발송 규칙
 *  - 휴대폰 인증을 마치고 수신에 동의한 회원에게만 보낸다 (sendToUser).
 *  - 종류(kind)별 알림톡 템플릿 ID가 .env에 있고 채널(KAKAO_PF_ID)·Solapi 키가 모두 있으면 알림톡.
 *    (알림톡이 실패하면 Solapi가 문자로 자동 대체 발송)
 *  - 템플릿이 없고 SMS_PROVIDER=solapi 이면 문자로, 아무것도 없으면 mock(서버 로그에만 출력).
 *  - 모든 발송은 message_log에 기록한다.
 */

const BRAND = "[미용 SOS] ";

type Vars = Record<string, string>;
type Template = { env: string; text: (v: Vars) => string; throttleMinutes?: number };

/**
 * 알림톡 템플릿 정의. 카카오 비즈니스 채널에서 아래 문구 그대로(변수는 #{이름}) 템플릿을 등록·심사받고,
 * 승인된 템플릿 ID를 각 env 변수에 넣으면 해당 종류부터 알림톡으로 전환된다. (docs 기능설계 문서 참고)
 */
export const TEMPLATES = {
  new_message: { env: "KAKAO_TEMPLATE_NEW_MESSAGE", text: (v) => `${v.sender}님이 상담 채팅에 새 메시지를 보냈어요.`, throttleMinutes: 30 },
  consult_request: { env: "KAKAO_TEMPLATE_CONSULT_REQUEST", text: (v) => `${v.asker}님의 ${v.category} 질문에 1:1 상담이 열렸어요. 참여하면 수익이 쌓여요.`, throttleMinutes: 10 },
  consult_expired: { env: "KAKAO_TEMPLATE_CONSULT_EXPIRED", text: () => "전문가가 참여하지 않아 상담이 자동 취소되고 전액 환불됐어요." },
  expert_joined: { env: "KAKAO_TEMPLATE_EXPERT_JOINED", text: (v) => `${v.expert} 전문가가 상담에 참여했어요.` },
  answer_received: { env: "KAKAO_TEMPLATE_ANSWER_RECEIVED", text: (v) => `내 질문에 ${v.name}님이 답변했어요.`, throttleMinutes: 30 },
  charge_approved: { env: "KAKAO_TEMPLATE_CHARGE_APPROVED", text: (v) => `${v.coins}코인이 충전됐어요.` },
  charge_rejected: { env: "KAKAO_TEMPLATE_CHARGE_REJECTED", text: (v) => `충전 신청이 반려됐어요. 사유: ${v.reason}` },
  expert_approved: { env: "KAKAO_TEMPLATE_EXPERT_APPROVED", text: () => "전문가로 승인됐어요. 이제 상담에 참여할 수 있어요." },
  expert_rejected: { env: "KAKAO_TEMPLATE_EXPERT_REJECTED", text: () => "전문가 신청이 반려됐어요. 내용을 보완해 다시 신청해주세요." },
  withdraw_paid: { env: "KAKAO_TEMPLATE_WITHDRAW_PAID", text: (v) => `${v.amount}원 출금이 지급됐어요.` },
  ticket_resolved: { env: "KAKAO_TEMPLATE_TICKET_RESOLVED", text: () => "문의가 처리됐어요. 앱에서 답변을 확인해주세요." },
  // 관리자 안내(서비스 공지·결제 안내). 자유 문구라 템플릿은 #{message} 변수 하나로 등록한다.
  admin_notice: { env: "KAKAO_TEMPLATE_ADMIN_NOTICE", text: (v) => v.message },
} satisfies Record<string, Template>;
export type Kind = keyof typeof TEMPLATES;

export const normalizePhone = (raw: unknown): string | null => {
  const d = String(raw ?? "").replace(/[^0-9]/g, "");
  return /^01[016789]\d{7,8}$/.test(d) ? d : null;
};
export const maskPhone = (p: string | null) => (p ? `${p.slice(0, 3)}-****-${p.slice(-4)}` : null);

type Result = { ok: boolean; mocked: boolean; channel: "kakao" | "sms"; response: unknown };

function solapiAuth(apiKey: string, apiSecret: string) {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto.createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function solapiSend(message: Record<string, unknown>, apiKey: string, apiSecret: string) {
  try {
    const res = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: { Authorization: solapiAuth(apiKey, apiSecret), "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) console.error("[messaging solapi] 발송 실패", res.status, data);
    return { ok: res.ok, response: data as unknown };
  } catch (err) {
    console.error("[messaging solapi] 요청 오류", err);
    return { ok: false, response: { error: String(err) } as unknown };
  }
}

const solapiKeys = () => {
  const { SOLAPI_API_KEY: k, SOLAPI_API_SECRET: s, SOLAPI_SENDER: from } = process.env;
  return k && s && from ? { k, s, from } : null;
};

/** 문자(SMS) 한 통. 인증번호 등에 쓴다. SMS_PROVIDER=solapi + 키가 있을 때만 실제 발송, 아니면 mock. */
export async function sendSms(phone: string, text: string): Promise<Result> {
  const keys = solapiKeys();
  if (process.env.SMS_PROVIDER === "solapi" && keys) {
    const r = await solapiSend({ to: phone, from: keys.from, text }, keys.k, keys.s);
    return { ...r, mocked: false, channel: "sms" };
  }
  console.log(`[SMS mock] -> ${phone}: ${text}`);
  return { ok: true, mocked: true, channel: "sms", response: null };
}

async function sendAlimtalk(phone: string, templateId: string, vars: Vars, text: string): Promise<Result> {
  const keys = solapiKeys();
  const pfId = process.env.KAKAO_PF_ID;
  if (!keys || !pfId) {
    console.log(`[Kakao mock] -> ${phone} (template ${templateId}): ${text}`);
    return { ok: true, mocked: true, channel: "kakao", response: null };
  }
  const variables = Object.fromEntries(Object.entries(vars).map(([k, v]) => [`#{${k}}`, v]));
  const r = await solapiSend(
    { to: phone, from: keys.from, text, kakaoOptions: { pfId, templateId, variables, disableSms: false } },
    keys.k,
    keys.s,
  );
  return { ...r, mocked: false, channel: "kakao" };
}

const logStmt = db.prepare(`INSERT INTO message_log (user_id, phone, channel, kind, text, status, response) VALUES (?, ?, ?, ?, ?, ?, ?)`);
const userStmt = db.prepare(`SELECT phone, phone_verified_at, notify_kakao FROM users WHERE id = ? AND suspended_at IS NULL`);
const recentStmt = db.prepare(`SELECT 1 AS x FROM message_log WHERE user_id = ? AND kind = ? AND status != 'failed' AND created_at > datetime('now', ?) LIMIT 1`);

export type SendOutcome = "sent" | "mock" | "failed" | "skipped";

/** 회원에게 알림을 보낸다. 인증·동의가 없거나 짧은 시간 내 같은 종류를 이미 보냈으면 건너뛴다. */
export async function sendToUser(userId: string, kind: Kind, vars: Vars = {}): Promise<SendOutcome> {
  const u = userStmt.get(userId) as { phone: string | null; phone_verified_at: string | null; notify_kakao: number } | undefined;
  if (!u || !u.phone || !u.phone_verified_at || !u.notify_kakao) return "skipped";

  const tpl: Template = TEMPLATES[kind];
  if (tpl.throttleMinutes && recentStmt.get(userId, kind, `-${tpl.throttleMinutes} minutes`)) return "skipped";

  const text = BRAND + tpl.text(vars);
  const templateId = process.env[tpl.env];
  const result = templateId ? await sendAlimtalk(u.phone, templateId, vars, text) : await sendSms(u.phone, text);
  const status: SendOutcome = result.ok ? (result.mocked ? "mock" : "sent") : "failed";
  logStmt.run(userId, u.phone, result.channel, kind, text, status, JSON.stringify(result.response ?? null));
  return status;
}
