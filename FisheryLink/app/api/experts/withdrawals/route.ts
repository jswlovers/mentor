import { getEarnings, holdWithdrawal, InsufficientCoinsError } from "@/lib/server/coins";
import { db } from "@/lib/server/db";
import { forbidden, getUser, limited, unauthorized } from "@/lib/server/http";
import { MIN_WITHDRAW_COINS } from "@/lib/server/pricing";

const insertStmt = db.prepare(`INSERT INTO withdrawals (user_id, amount, bank_info) VALUES (?, ?, ?)`);

// 출금 신청: 수익을 보류 계정으로 옮기고, 관리자가 이체 후 '지급 완료'로 처리한다.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!user.isExpert) return forbidden("승인된 전문가만 출금할 수 있어요");
  if (limited(`wd:${user.id}`, 60 * 60 * 1000, 5)) {
    return Response.json({ error: "출금 신청이 너무 많아요" }, { status: 429 });
  }
  const b = await req.json().catch(() => ({}));
  const amount = Math.floor(Number(b.amount));
  const bank = String(b.bankInfo ?? "").trim().slice(0, 100);
  if (!Number.isFinite(amount) || amount < MIN_WITHDRAW_COINS) {
    return Response.json({ error: `최소 ${MIN_WITHDRAW_COINS.toLocaleString()}코인부터 출금할 수 있어요` }, { status: 400 });
  }
  if (!bank) return Response.json({ error: "은행·계좌번호·예금주를 입력해주세요" }, { status: 400 });

  db.exec("BEGIN");
  try {
    holdWithdrawal(user.id, amount, "출금 신청");
    insertStmt.run(user.id, amount, bank);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    if (err instanceof InsufficientCoinsError) {
      return Response.json({ error: "출금 가능 수익이 부족해요", earnings: getEarnings(user.id) }, { status: 402 });
    }
    throw err;
  }
  return Response.json({ ok: true, earnings: getEarnings(user.id) }, { status: 201 });
}
