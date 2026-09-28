// 코인 과금 정책. 1코인 = 1원. 서버와 프론트가 같은 값을 쓴다.
// 과금 대상은 상담을 시작한 질문자(asker)뿐이고, 전문가의 답변·통화는 과금하지 않는다.
//
// 상담 시작비는 답변 등급별로 다르고(기본 5천 · 상세 1만2천 · 프리미엄 2만2천원), 나머지 단가는 포레스트클럽의 값을 기본으로 두었다.
// 사업 판단에 따라 이 파일에서만 바꾸면 전체에 반영된다.
export const COIN_PER_KRW = 1;
export const MIN_CHARGE_KRW = 1000;

/**
 * 1. 상담 시작비: 상담을 신청(시작)할 때 1회 차감. 질문자가 고른 답변 등급에 따라 금액이 다르다.
 *    등급은 답변에 담을 수 있는 자료로 구분한다(media): text = 글만, photo = 사진·파일 첨부, video = 시연 영상까지.
 *    질문자는 등급과 상관없이 사진·파일을 보낼 수 있고, 영상은 영상 등급 상담에서만 양쪽 모두 보낼 수 있다.
 */
export const TIERS = {
  basic: { label: "기본 답변", fee: 5_000, media: "text", desc: "채팅으로 원인과 해결 방법을 글로 정리해 드려요" },
  detail: { label: "상세 답변", fee: 12_000, media: "photo", desc: "글 + 참고 사진·도식·자료 파일로 자세히 설명해 드려요" },
  premium: { label: "프리미엄 답변", fee: 22_000, media: "video", desc: "글·사진 + 전문가가 직접 찍은 시연 영상으로 보여드려요" },
} as const;
export type Tier = keyof typeof TIERS;
export const TIER_KEYS = Object.keys(TIERS) as Tier[];
export const DEFAULT_TIER: Tier = "detail";
export const isTier = (v: unknown): v is Tier => typeof v === "string" && Object.hasOwn(TIERS, v);
export const CONSULT_FEE_MIN = Math.min(...TIER_KEYS.map((t) => TIERS[t].fee));
export const CONSULT_FEE_MAX = Math.max(...TIER_KEYS.map((t) => TIERS[t].fee));
/** 영상 첨부 최대 크기(영상 등급 상담 전용) */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/** 2. 쪽지(채팅) 과금: 글자당 단가, 최소 요금. (공백 포함 글자 수, 사진/파일은 첨부 요금 추가) */
export const MESSAGE_PER_CHAR = 10;
export const MESSAGE_MIN_COST = 500; // 50자까지는 500코인 (포레스트클럽 메시지 단가와 동일)
export const ATTACHMENT_COST = 500;
export const MAX_MESSAGE_CHARS = 200; // 한 메시지는 200자 이내 (최대 2,000코인)

/** 3. 통화 과금: 초당 단가. 보이스톡 10코인/초(분당 600), 페이스톡 100코인/초(분당 6,000) */
export const COST_PER_SEC = { voice: 10, video: 100 } as const;
export const ENTRY_MIN_COINS = 3000; // 이 이하면 통화 시작/참여 불가
export const CONTINUE_MIN_COINS = 1500; // 통화 중 이 이하로 떨어지면 강제 종료

/** 정산 기본값: 질문자가 낸 금액 중 전문가에게 돌아가는 비율. 실제 수수료율은 관리자 페이지에서 등급별로 정한다(lib/server/commission.ts). */
export const EXPERT_SHARE = 0.7;
export const MIN_WITHDRAW_COINS = 10_000;

/**
 * 무응답 자동 환불 / 전문가 호출 정책. 값은 코드에서 바꾸고, 테스트 서버에서만 환경변수로 줄여 쓴다.
 * - 실시간 상담은 20분 안에 응답을 약속한다. 전문가가 이 시간(분) 안에 참여하지 않으면 상담을 자동 취소하고 질문자에게 전액 환불한다.
 * - 상담이 열리면 한 번에 CALL_WAVE_SIZE명에게 알리고, WAVE2_MINUTES 뒤에도 미참여면 다음 CALL_WAVE_SIZE명에게 알린다.
 *   질문자가 전문가를 골랐으면 첫 WAVE2_MINUTES 동안은 그 전문가에게만 알린다.
 * - 전문가 1명에게는 시간당 CALL_HOURLY_CAP건까지만 알린다. 야간(23~08시 KST)에는 카카오·문자를 보내지 않는다(앱 알림은 유지).
 */
const tune = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};
export const AUTO_REFUND_MINUTES = tune("AUTO_REFUND_MINUTES", 20);
export const WAVE2_MINUTES = tune("WAVE2_MINUTES", 5);
export const CALL_WAVE_SIZE = tune("CALL_WAVE_SIZE", 5);
export const CALL_HOURLY_CAP = tune("CALL_HOURLY_CAP", 3);
export const SWEEP_INTERVAL_SECONDS = tune("SWEEP_INTERVAL_SECONDS", 60);
export const RESPONSE_STAT_MIN_SAMPLES = 3; // 평균 응답시간은 표본이 이만큼 쌓인 뒤에 공개

export const MAX_ROOM_MESSAGES = 500; // 방당 최대 보관 메시지 수

export function messageCost(body: string, hasAttachment: boolean) {
  const chars = [...body.trim()].length;
  return Math.max(MESSAGE_MIN_COST, chars * MESSAGE_PER_CHAR) + (hasAttachment ? ATTACHMENT_COST : 0);
}
