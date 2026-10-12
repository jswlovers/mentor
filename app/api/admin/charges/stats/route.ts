import { db } from "@/lib/server/db";
import { forbidden, getAdmin, getUser, unauthorized } from "@/lib/server/http";

// 승인된 충전을 승인일(한국시간) 기준으로 일별 합산한다. processed_at은 UTC로 저장된다.
const daily = db.prepare(
  `SELECT date(processed_at, '+9 hours') AS day, SUM(amount_krw) AS amount, SUM(coins) AS coins, COUNT(*) AS count
   FROM coin_charges
   WHERE status = 'approved' AND processed_at IS NOT NULL AND date(processed_at, '+9 hours') BETWEEN ? AND ?
   GROUP BY day ORDER BY day`,
);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  if (!getUser(req)) return unauthorized();
  if (!getAdmin(req)) return forbidden();
  const q = new URL(req.url).searchParams;
  const from = q.get("from") || "";
  const to = q.get("to") || "";
  if (!DAY.test(from) || !DAY.test(to)) return Response.json({ error: "기간을 YYYY-MM-DD로 지정해주세요" }, { status: 400 });
  return Response.json(daily.all(from, to));
}
