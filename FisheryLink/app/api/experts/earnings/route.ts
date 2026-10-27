import { getEarningLedger, getEarnings } from "@/lib/server/coins";
import { db } from "@/lib/server/db";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";
import { EXPERT_SHARE, MIN_WITHDRAW_COINS } from "@/lib/server/pricing";

const wStmt = db.prepare(
  `SELECT id, amount, bank_info, status, admin_note, created_at, processed_at FROM withdrawals WHERE user_id = ? ORDER BY id DESC`,
);

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!user.isExpert) return forbidden("승인된 전문가만 볼 수 있어요");
  return Response.json({
    earnings: getEarnings(user.id),
    share: EXPERT_SHARE,
    minWithdraw: MIN_WITHDRAW_COINS,
    ledger: getEarningLedger(user.id),
    withdrawals: wStmt.all(user.id),
  });
}
