import { type AvailabilityRow, isAvailableNow } from "@/lib/server/availability";
import { chargeAsker, getConsultation, isValidRoomId, roleOf } from "@/lib/server/consult";
import { getBalance, InsufficientCoinsError } from "@/lib/server/coins";
import { commissionPct, expertShareOf } from "@/lib/server/commission";
import { db } from "@/lib/server/db";
import { forbidden, getUser, limited, unauthorized } from "@/lib/server/http";
import { callExperts } from "@/lib/server/matching";
import { AUTO_REFUND_MINUTES, DEFAULT_TIER, isTier, TIERS } from "@/lib/server/pricing";

const qStmt = db.prepare(`SELECT asker_id, category FROM questions WHERE id = ?`);
const expertStmt = db.prepare(
  `SELECT expert_available, expert_off_start, expert_off_end FROM users WHERE id = ? AND expert_status = 'approved' AND suspended_at IS NULL`,
);
const setPreferred = db.prepare(`UPDATE consultations SET preferred_expert_id = ? WHERE room_id = ?`);
const reviewedStmt = db.prepare(`SELECT 1 AS x FROM reviews WHERE room_id = ?`);
const insert = db.prepare(`INSERT INTO consultations (room_id, asker_id, asker_name, fee, tier, commission_pct) VALUES (?, ?, ?, ?, ?, ?)`);
const preferredName = db.prepare(`SELECT name FROM users WHERE id = ?`);
const insertTarget = db.prepare(`INSERT OR IGNORE INTO consult_targets (room_id, user_id) VALUES (?, ?)`);
const targetNames = db.prepare(`SELECT u.name FROM consult_targets t JOIN users u ON u.id = t.user_id WHERE t.room_id = ?`);
const MAX_TARGETS = 10;

// 상태 조회: 상담 시작 여부와 내 역할(질문자 / 전문가 / 구경).
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const roomId = new URL(req.url).searchParams.get("roomId");
  if (!isValidRoomId(roomId)) return Response.json({ error: "방 정보를 확인해주세요" }, { status: 400 });
  const q = qStmt.get(roomId) as { asker_id: string; category: string } | undefined;
  if (!q) return Response.json({ error: "질문을 찾을 수 없어요" }, { status: 404 });
  const c = getConsultation(roomId);
  const waiting = !!c && c.status === "open" && !c.expert_id;
  return Response.json({
    started: !!c,
    status: c?.status ?? null,
    role: c ? roleOf(c, user) : q.asker_id === user.id ? "asker" : "viewer",
    canJoin: waiting && user.isExpert && c.asker_id !== user.id,
    isQuestionOwner: q.asker_id === user.id,
    category: q.category,
    expertName: c?.expert_name ?? null,
    expertId: c?.expert_id ?? null,
    reviewed: !!c && !!reviewedStmt.get(roomId),
    askerName: c?.asker_name ?? null,
    tier: c?.tier ?? null,
    fee: c?.fee ?? null,
    expertShare: c ? expertShareOf(c.commission_pct) : null,
    // 전문가 대기 중이면 응답 마감 시각(이때까지 참여가 없으면 자동 취소·전액 환불)
    deadline: waiting ? new Date(Date.parse(`${c.started_at.replace(" ", "T")}Z`) + AUTO_REFUND_MINUTES * 60_000).toISOString() : null,
    // 질문자가 고른 전문가 그룹(있으면)
    targetNames: waiting ? (targetNames.all(roomId) as { name: string }[]).map((r) => r.name) : [],
    preferredName: waiting && c.preferred_expert_id ? ((preferredName.get(c.preferred_expert_id) as { name: string } | undefined)?.name ?? null) : null,
    coins: getBalance(user.id),
  });
}

// 상담 신청: 질문 작성자만, 답변 등급별 시작비를 차감하고 채팅·통화를 연다.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (limited(`consult:${user.id}`, 60 * 60 * 1000, 20)) {
    return Response.json({ error: "상담 신청이 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }
  const { roomId, expertId, expertIds, tier: rawTier } = await req.json().catch(() => ({}));
  if (!isValidRoomId(roomId)) return Response.json({ error: "방 정보를 확인해주세요" }, { status: 400 });
  const tier = rawTier === undefined ? DEFAULT_TIER : rawTier;
  if (!isTier(tier)) return Response.json({ error: "답변 등급을 선택해주세요" }, { status: 400 });
  const { fee, label } = TIERS[tier];
  const q = qStmt.get(roomId) as { asker_id: string; category: string } | undefined;
  if (!q) return Response.json({ error: "질문을 찾을 수 없어요" }, { status: 404 });
  if (q.asker_id !== user.id) return forbidden("질문을 등록한 회원만 상담을 신청할 수 있어요");
  if (getConsultation(roomId)) return Response.json({ error: "이미 상담이 시작된 질문이에요" }, { status: 409 });
  const preferred = expertId ? String(expertId) : null;
  if (preferred) {
    const e = expertStmt.get(preferred) as AvailabilityRow | undefined;
    if (!e || preferred === user.id) return Response.json({ error: "지정할 수 없는 전문가예요" }, { status: 400 });
    if (!isAvailableNow(e)) return Response.json({ error: "지금은 쉬는 중인 전문가예요. 다른 전문가를 골라주세요" }, { status: 400 });
  }
  // "지금 답변 가능한 전문가 찾기"로 고른 여러 명: 신청하는 순간에도 온라인(ON·불가 시간 아님)인 사람만 남긴다
  let targets: string[] = [];
  if (Array.isArray(expertIds) && expertIds.length > 0) {
    const ids = [...new Set(expertIds.map(String))].filter((id) => id !== user.id).slice(0, MAX_TARGETS);
    targets = ids.filter((id) => { const e = expertStmt.get(id) as AvailabilityRow | undefined; return !!e && isAvailableNow(e); });
    if (targets.length === 0) return Response.json({ error: "고른 전문가가 모두 지금은 쉬는 중이에요. 다시 찾거나 자동 배정으로 신청해주세요" }, { status: 400 });
  }

  db.exec("BEGIN");
  try {
    insert.run(roomId, user.id, user.name, fee, tier, commissionPct(tier)); // 지금 수수료율을 이 상담에 고정
    if (preferred) setPreferred.run(preferred, roomId);
    for (const t of targets) insertTarget.run(roomId, t);
    chargeAsker(getConsultation(roomId)!, fee, "consult_start_fee", `상담 시작비(${label})`);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    if (err instanceof InsufficientCoinsError) {
      return Response.json(
        { error: `코인이 부족해요 (${label} 상담 시작비 ${fee.toLocaleString()}코인 필요)`, coins: getBalance(user.id) },
        { status: 402 },
      );
    }
    throw err;
  }
  // 상담이 열렸음을 적합한 전문가에게 알린다(실패해도 상담 시작에는 영향 없음).
  let called = 0;
  try {
    called = callExperts(getConsultation(roomId)!, q.category, 1);
  } catch (err) {
    console.error("[consultations] 전문가 호출 실패", err);
  }
  return Response.json({ ok: true, coins: getBalance(user.id), called }, { status: 201 });
}
