import { db } from "@/lib/server/db";
import { getUser, limited, unauthorized } from "@/lib/server/http";
import { COIN_PER_KRW, MIN_CHARGE_KRW } from "@/lib/server/pricing";

const insertCharge = db.prepare(
  `INSERT INTO coin_charges (user_id, amount_krw, coins, provider, provider_order_id, depositor) VALUES (?, ?, ?, ?, ?, ?)`,
);
const myCharges = db.prepare(
  `SELECT id, amount_krw, coins, status, provider, provider_order_id, depositor, admin_note, created_at, processed_at FROM coin_charges WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
);

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  return Response.json(myCharges.all(user.id));
}

export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (limited(`charge:${user.id}`, 60 * 60 * 1000, 10)) {
    return Response.json({ error: "충전 요청이 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const amountKrw = Math.floor(Number(body.amountKrw));
  const provider = body.provider === "toss" ? "toss" : "manual";
  if (!Number.isFinite(amountKrw) || amountKrw < MIN_CHARGE_KRW) {
    return Response.json({ error: `최소 ${MIN_CHARGE_KRW.toLocaleString()}원부터 충전할 수 있어요` }, { status: 400 });
  }
  const coins = amountKrw * COIN_PER_KRW;
  const depositor = String(body.depositor ?? "").trim().slice(0, 20) || null;
  if (provider === "manual" && !depositor) return Response.json({ error: "입금자명을 입력해주세요" }, { status: 400 });
  const orderId = `${provider}-${Date.now()}-${user.id}`;
  const info = insertCharge.run(user.id, amountKrw, coins, provider, orderId, depositor);
  return Response.json({ id: Number(info.lastInsertRowid), orderId, amountKrw, coins, status: "pending", provider }, { status: 201 });
}
