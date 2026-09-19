import { creditCoins } from "@/lib/server/coins";
import { getAdmin } from "@/lib/server/http";

// 환불 처리: 회원 코인 계정에 다시 적립한다 (forest tickets/refund 대응). 고객센터 티켓은 아직 없음.
export async function POST(req: Request) {
  if (!getAdmin(req)) return Response.json({ error: "권한이 없어요" }, { status: 403 });
  const { userId, coins, note } = await req.json().catch(() => ({}));
  const amount = Math.floor(Number(coins));
  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "회원과 환불할 코인 수를 확인해주세요" }, { status: 400 });
  }
  creditCoins(String(userId), amount, "refund", note || "환불 처리");
  return Response.json({ ok: true });
}
