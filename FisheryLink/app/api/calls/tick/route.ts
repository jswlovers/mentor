import { getBalance, InsufficientCoinsError } from "@/lib/server/coins";
import { chargeAsker, getConsultation } from "@/lib/server/consult";
import { db } from "@/lib/server/db";
import { getUser, limited, unauthorized } from "@/lib/server/http";
import { CONTINUE_MIN_COINS, COST_PER_SEC } from "@/lib/server/pricing";

const endedStmt = db.prepare(`SELECT 1 AS x FROM call_ends WHERE call_url = ?`);

// 통화 중 클라이언트가 1초마다 호출한다. 질문자만 1초분 요금이 차감되고, 전문가 호출은 무과금.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (limited(`tick:${user.id}`, 60 * 1000, 90)) {
    return Response.json({ error: "요청이 너무 많아요" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const callType = body.callType === "video" ? "video" : "voice";
  const c = getConsultation(String(body.roomId ?? ""));
  if (!c) return Response.json({ error: "상담이 아직 시작되지 않았어요" }, { status: 400 });
  if (c.expert_id !== user.id && c.asker_id !== user.id) return Response.json({ error: "참여자가 아니에요" }, { status: 403 });
  // 상대가 이미 통화를 종료했으면 요금을 더 받지 않고 함께 종료시킨다.
  const url = String(body.url ?? "");
  if (url && endedStmt.get(url)) return Response.json({ coins: getBalance(user.id), shouldEnd: true, endedByPeer: true, billed: false });
  if (c.asker_id !== user.id) return Response.json({ coins: getBalance(user.id), shouldEnd: c.status !== "open", billed: false });

  if (c.status !== "open") return Response.json({ coins: getBalance(user.id), shouldEnd: true });
  try {
    chargeAsker(
      c,
      COST_PER_SEC[callType],
      callType === "video" ? "call_video_spend" : "call_voice_spend",
      `${callType === "video" ? "페이스톡" : "보이스톡"} 1초 이용`,
    );
    const coins = getBalance(user.id);
    return Response.json({ coins, shouldEnd: coins <= CONTINUE_MIN_COINS, continueMin: CONTINUE_MIN_COINS, billed: true });
  } catch (err) {
    if (err instanceof InsufficientCoinsError) {
      return Response.json({ error: "코인이 부족해요", coins: getBalance(user.id) }, { status: 402 });
    }
    throw err;
  }
}
