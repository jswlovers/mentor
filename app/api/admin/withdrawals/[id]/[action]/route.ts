import { payoutWithdrawal, releaseWithdrawal } from "@/lib/server/coins";
import { db } from "@/lib/server/db";
import { forbidden, getAdmin } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";

type W = { id: number; user_id: string; amount: number; status: string };
const get = db.prepare(`SELECT id, user_id, amount, status FROM withdrawals WHERE id = ?`);
const set = db.prepare(`UPDATE withdrawals SET status = ?, admin_note = ?, processed_at = datetime('now') WHERE id = ?`);

// pay: 이체 완료 처리 / reject: 반려하고 수익으로 되돌림
export async function POST(req: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  if (!getAdmin(req)) return forbidden();
  const { id, action } = await params;
  const w = get.get(Number(id)) as W | undefined;
  if (!w) return Response.json({ error: "출금 신청을 찾을 수 없어요" }, { status: 404 });
  if (w.status !== "pending") return Response.json({ error: "이미 처리된 신청이에요" }, { status: 409 });
  const note = String((await req.json().catch(() => ({}))).note ?? "").trim();

  db.exec("BEGIN");
  try {
    if (action === "pay") {
      payoutWithdrawal(w.user_id, w.amount, `출금 지급 #${w.id}`);
      set.run("paid", note || null, w.id);
    } else if (action === "reject") {
      releaseWithdrawal(w.user_id, w.amount, `출금 반려 #${w.id}`);
      set.run("rejected", note || "사유 미기재", w.id);
    } else {
      db.exec("ROLLBACK");
      return Response.json({ error: "알 수 없는 처리예요" }, { status: 400 });
    }
    db.exec("COMMIT");
    notify(w.user_id, action === "pay" ? `${w.amount.toLocaleString()}원 출금이 지급됐어요` : "출금 신청이 반려돼 수익으로 돌아왔어요", "/expert", action === "pay" ? { kind: "withdraw_paid", vars: { amount: w.amount.toLocaleString() } } : undefined);
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return Response.json({ ok: true });
}
