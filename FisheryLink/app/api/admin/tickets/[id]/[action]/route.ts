import { creditCoins } from "@/lib/server/coins";
import { db } from "@/lib/server/db";
import { forbidden, getAdmin } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";

type T = { id: number; user_id: string; category: string; status: string };
const get = db.prepare(`SELECT id, user_id, category, status FROM support_tickets WHERE id = ?`);
const resolve = db.prepare(`UPDATE support_tickets SET status = 'resolved', admin_note = ?, refund_coins = ?, processed_at = datetime('now') WHERE id = ?`);

// resolve: 답변만 남기고 처리 완료 / refund: 환불 요청 건에 코인을 돌려주고 처리 완료
export async function POST(req: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  if (!getAdmin(req)) return forbidden();
  const { id, action } = await params;
  const t = get.get(Number(id)) as T | undefined;
  if (!t) return Response.json({ error: "문의를 찾을 수 없어요" }, { status: 404 });
  if (t.status !== "pending") return Response.json({ error: "이미 처리된 문의예요" }, { status: 409 });
  const b = await req.json().catch(() => ({}));
  const note = String(b.note ?? "").trim().slice(0, 500) || null;

  if (action === "resolve") {
    resolve.run(note, null, t.id);
  } else if (action === "refund") {
    if (t.category !== "refund") return Response.json({ error: "환불 요청 건이 아니에요" }, { status: 400 });
    const coins = Math.floor(Number(b.coins));
    if (!Number.isFinite(coins) || coins <= 0) return Response.json({ error: "환불할 코인 수를 확인해주세요" }, { status: 400 });
    db.exec("BEGIN");
    try {
      creditCoins(t.user_id, coins, "refund", note || `환불 처리 (문의 #${t.id})`);
      resolve.run(note, coins, t.id);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  } else {
    return Response.json({ error: "알 수 없는 처리예요" }, { status: 400 });
  }
  notify(t.user_id, "문의가 처리됐어요", "/support");
  return Response.json({ ok: true });
}
