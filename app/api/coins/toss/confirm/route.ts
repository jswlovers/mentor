import { creditCoins, getBalance } from "@/lib/server/coins";
import { db } from "@/lib/server/db";
import { getUser, unauthorized } from "@/lib/server/http";
import { confirmTossPayment } from "@/lib/server/payment";

type Charge = { id: number; user_id: string; amount_krw: number; coins: number; status: string };
const getByOrder = db.prepare(`SELECT * FROM coin_charges WHERE provider_order_id = ?`);
const markProcessed = db.prepare(
  `UPDATE coin_charges SET status = ?, provider_response = ?, processed_at = datetime('now') WHERE id = ?`,
);

// 토스 결제위젯 완료 후 클라이언트가 호출하는 승인 엔드포인트. TOSS_SECRET_KEY가 없으면 수동승인 안내.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { orderId, paymentKey, amount } = await req.json().catch(() => ({}));
  const charge = (orderId ? getByOrder.get(String(orderId)) : undefined) as Charge | undefined;
  if (!charge || charge.user_id !== user.id) return Response.json({ error: "충전 요청을 찾을 수 없어요" }, { status: 404 });
  if (charge.status !== "pending") return Response.json({ error: "이미 처리된 요청이에요" }, { status: 409 });
  if (Number(amount) !== charge.amount_krw) return Response.json({ error: "결제 금액이 일치하지 않아요" }, { status: 400 });

  const result = await confirmTossPayment({ paymentKey, orderId, amount: charge.amount_krw });
  if (!result.configured) {
    return Response.json({ error: "토스페이먼츠 연동이 아직 설정되지 않았어요. 관리자 수동승인을 이용해주세요" }, { status: 501 });
  }
  if (!result.ok) {
    markProcessed.run("rejected", JSON.stringify(result.response), charge.id);
    return Response.json({ error: "결제 승인에 실패했어요" }, { status: 402 });
  }
  creditCoins(charge.user_id, charge.coins, "purchase", `토스페이먼츠 결제 (주문번호 ${orderId})`);
  markProcessed.run("approved", JSON.stringify(result.response), charge.id);
  return Response.json({ ok: true, coins: getBalance(user.id) });
}
