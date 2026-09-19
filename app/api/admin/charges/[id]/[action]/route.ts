import { creditCoins } from "@/lib/server/coins";
import { db } from "@/lib/server/db";
import { getAdmin } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";

type Charge = { id: number; user_id: string; amount_krw: number; coins: number; status: string };
const getCharge = db.prepare(`SELECT * FROM coin_charges WHERE id = ?`);
const setStatus = db.prepare(
  `UPDATE coin_charges SET status = ?, admin_note = ?, processed_at = datetime('now') WHERE id = ?`,
);

// 관리자 수동 승인/반려 (입금 확인). x-admin-key 헤더 = ADMIN_KEY 환경변수.
export async function POST(req: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  if (!getAdmin(req)) return Response.json({ error: "권한이 없어요" }, { status: 403 });
  const { id, action } = await params;
  const charge = getCharge.get(Number(id)) as Charge | undefined;
  if (!charge) return Response.json({ error: "충전 요청을 찾을 수 없어요" }, { status: 404 });
  if (charge.status !== "pending") return Response.json({ error: "이미 처리된 요청이에요" }, { status: 409 });
  const note = String((await req.json().catch(() => ({}))).note || "").trim();

  if (action === "approve") {
    db.exec("BEGIN");
    try {
      creditCoins(charge.user_id, charge.coins, "purchase", note || `관리자 수동 승인 (${charge.amount_krw.toLocaleString()}원 입금 확인)`);
      setStatus.run("approved", note || null, charge.id);
      db.exec("COMMIT");
      notify(charge.user_id, `${charge.coins.toLocaleString()}코인이 충전됐어요`, "/coins");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  } else if (action === "reject") {
    setStatus.run("rejected", note || "사유 미기재", charge.id);
    notify(charge.user_id, `충전 신청이 반려됐어요 (${note || "사유 미기재"})`, "/coins");
  } else {
    return Response.json({ error: "알 수 없는 처리예요" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
