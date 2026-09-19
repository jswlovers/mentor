import { getBalance } from "@/lib/server/coins";
import { getConsultation } from "@/lib/server/consult";
import { db } from "@/lib/server/db";
import { getUser, unauthorized } from "@/lib/server/http";
import { CONTINUE_MIN_COINS, ENTRY_MIN_COINS } from "@/lib/server/pricing";

const endedStmt = db.prepare(`SELECT 1 AS x FROM call_ends WHERE call_url = ?`);

// 통화 시작/참여 가능 여부. 질문자만 잔액 기준이 적용되고, 전문가는 과금이 없으므로 항상 가능.
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const sp = new URL(req.url).searchParams;
  const roomId = sp.get("roomId") ?? "";
  const callUrl = sp.get("url");
  if (callUrl && endedStmt.get(callUrl)) return Response.json({ allowed: false, reason: "이미 종료된 통화예요" });
  const c = getConsultation(roomId);
  if (!c) return Response.json({ allowed: false, reason: "상담이 아직 시작되지 않았어요" });
  if (c.status !== "open") return Response.json({ allowed: false, reason: "종료된 상담이에요" });
  if (c.asker_id !== user.id && c.expert_id !== user.id) return Response.json({ allowed: false, reason: "이 상담의 참여자가 아니에요" });
  const coins = getBalance(user.id);
  const billed = c.asker_id === user.id;
  return Response.json({ allowed: billed ? coins > ENTRY_MIN_COINS : true, billed, coins, entryMin: ENTRY_MIN_COINS, continueMin: CONTINUE_MIN_COINS });
}
