/**
 * 토스페이먼츠 결제 승인 어댑터 (포레스트클럽 services/payment.js 이식).
 * TOSS_SECRET_KEY가 없으면 configured:false → 관리자 수동승인 흐름을 이용한다.
 */
export async function confirmTossPayment(p: { paymentKey: string; orderId: string; amount: number }) {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) return { ok: false, configured: false, response: null as unknown };
  const auth = Buffer.from(`${secretKey}:`).toString("base64");
  try {
    const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) console.error("[payment toss] 결제 승인 실패", res.status, data);
    return { ok: res.ok, configured: true, response: data as unknown };
  } catch (err) {
    console.error("[payment toss] 요청 오류", err);
    return { ok: false, configured: true, response: { error: String(err) } as unknown };
  }
}
