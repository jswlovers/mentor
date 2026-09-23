import { chargeAsker, getConsultation, isValidRoomId, roleOf } from "@/lib/server/consult";
import { getBalance, InsufficientCoinsError } from "@/lib/server/coins";
import { db } from "@/lib/server/db";
import { forbidden, getUser, limited, unauthorized } from "@/lib/server/http";
import { callExperts } from "@/lib/server/matching";
import { CONSULT_START_FEE } from "@/lib/server/pricing";

const qStmt = db.prepare(`SELECT asker_id, category FROM questions WHERE id = ?`);
const expertOk = db.prepare(`SELECT 1 AS x FROM users WHERE id = ? AND expert_status = 'approved' AND suspended_at IS NULL`);
const setPreferred = db.prepare(`UPDATE consultations SET preferred_expert_id = ? WHERE room_id = ?`);
const reviewedStmt = db.prepare(`SELECT 1 AS x FROM reviews WHERE room_id = ?`);
const insert = db.prepare(`INSERT INTO consultations (room_id, asker_id, asker_name, fee) VALUES (?, ?, ?, ?)`);

// 상태 조회: 상담 시작 여부와 내 역할(질문자 / 전문가 / 구경).
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const roomId = new URL(req.url).searchParams.get("roomId");
  if (!isValidRoomId(roomId)) return Response.json({ error: "방 정보를 확인해주세요" }, { status: 400 });
  const q = qStmt.get(roomId) as { asker_id: string; category: string } | undefined;
  if (!q) return Response.json({ error: "질문을 찾을 수 없어요" }, { status: 404 });
  const c = getConsultation(roomId);
  return Response.json({
    started: !!c,
    status: c?.status ?? null,
    role: c ? roleOf(c, user) : q.asker_id === user.id ? "asker" : "viewer",
    canJoin: !!c && c.status === "open" && !c.expert_id && user.isExpert && c.asker_id !== user.id,
    isQuestionOwner: q.asker_id === user.id,
    category: q.category,
    expertName: c?.expert_name ?? null,
    expertId: c?.expert_id ?? null,
    reviewed: !!c && !!reviewedStmt.get(roomId),
    askerName: c?.asker_name ?? null,
    fee: CONSULT_START_FEE,
    coins: getBalance(user.id),
  });
}

// 상담 신청: 질문 작성자만, 시작비를 차감하고 채팅·통화를 연다.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (limited(`consult:${user.id}`, 60 * 60 * 1000, 20)) {
    return Response.json({ error: "상담 신청이 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }
  const { roomId, expertId } = await req.json().catch(() => ({}));
  if (!isValidRoomId(roomId)) return Response.json({ error: "방 정보를 확인해주세요" }, { status: 400 });
  const q = qStmt.get(roomId) as { asker_id: string; category: string } | undefined;
  if (!q) return Response.json({ error: "질문을 찾을 수 없어요" }, { status: 404 });
  if (q.asker_id !== user.id) return forbidden("질문을 등록한 회원만 상담을 신청할 수 있어요");
  if (getConsultation(roomId)) return Response.json({ error: "이미 상담이 시작된 질문이에요" }, { status: 409 });
  const preferred = expertId ? String(expertId) : null;
  if (preferred && (preferred === user.id || !expertOk.get(preferred))) {
    return Response.json({ error: "지정할 수 없는 전문가예요" }, { status: 400 });
  }

  db.exec("BEGIN");
  try {
    insert.run(roomId, user.id, user.name, CONSULT_START_FEE);
    if (preferred) setPreferred.run(preferred, roomId);
    chargeAsker(getConsultation(roomId)!, CONSULT_START_FEE, "consult_start_fee", "상담 시작비");
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    if (err instanceof InsufficientCoinsError) {
      return Response.json(
        { error: `코인이 부족해요 (상담 시작비 ${CONSULT_START_FEE.toLocaleString()}코인 필요)`, coins: getBalance(user.id) },
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
