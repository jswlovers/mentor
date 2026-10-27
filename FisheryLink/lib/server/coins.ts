import crypto from "node:crypto";
import { db } from "./db";
import { EXPERT_SHARE } from "./pricing";

export class InsufficientCoinsError extends Error {
  constructor() {
    super("코인이 부족해요");
    this.name = "InsufficientCoinsError";
  }
}

type Entry = { account: string; direction: "debit" | "credit"; amount: number; userId?: string; type: string; note?: string };

const insertEntry = db.prepare(
  `INSERT INTO coin_ledger (transaction_group, account, direction, amount, user_id, type, note) VALUES (?, ?, ?, ?, ?, ?, ?)`,
);
const balanceStmt = db.prepare(
  `SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0) AS balance FROM coin_ledger WHERE account = ?`,
);
const ledgerStmt = db.prepare(
  `SELECT id, transaction_group, direction, amount, type, note, created_at FROM coin_ledger WHERE account = ? ORDER BY id DESC LIMIT 200`,
);
const recentStmt = db.prepare(
  `SELECT id, account, direction, amount, type, note, created_at FROM coin_ledger ORDER BY id DESC LIMIT 200`,
);

const acct = (userId: string) => `user:${userId}`;
const earnAcct = (userId: string) => `earn:${userId}`;

/** 대차가 맞지 않으면 기록하지 않는다. */
export function post(entries: Entry[]) {
  const sum = (d: string) => entries.filter((e) => e.direction === d).reduce((s, e) => s + e.amount, 0);
  if (sum("debit") !== sum("credit") || sum("debit") <= 0) throw new Error("원장 항목의 차변/대변 합이 일치하지 않아요");
  const group = crypto.randomUUID();
  for (const e of entries) insertEntry.run(group, e.account, e.direction, e.amount, e.userId ?? null, e.type, e.note ?? null);
  return group;
}

const balanceOf = (account: string) => (balanceStmt.get(account) as { balance: number }).balance;

export const getBalance = (userId: string) => balanceOf(acct(userId));
export const getEarnings = (userId: string) => balanceOf(earnAcct(userId));
export const getUserLedger = (userId: string) => ledgerStmt.all(acct(userId));
export const getEarningLedger = (userId: string) => ledgerStmt.all(earnAcct(userId));
export const getRecentLedger = () => recentStmt.all();

/** 충전 승인/환불: 플랫폼 현금 차변, 회원 코인 대변. */
export function creditCoins(userId: string, amount: number, type: string, note?: string) {
  return post([
    { account: "platform:cash", direction: "debit", amount, type, note },
    { account: acct(userId), direction: "credit", amount, userId, type, note },
  ]);
}

/** 코인 사용: 회원 코인 차변, 플랫폼 매출 대변. 잔액이 부족하면 예외. */
export function debitCoins(userId: string, amount: number, type: string, note?: string) {
  if (getBalance(userId) < amount) throw new InsufficientCoinsError();
  return post([
    { account: acct(userId), direction: "debit", amount, userId, type, note },
    { account: "platform:revenue", direction: "credit", amount, type, note },
  ]);
}

/** 상담 취소 환불: 플랫폼 매출 차변, 회원 코인 대변. */
export function refundFromRevenue(userId: string, amount: number, note?: string) {
  return post([
    { account: "platform:revenue", direction: "debit", amount, type: "refund", note },
    { account: acct(userId), direction: "credit", amount, userId, type: "refund", note },
  ]);
}

/** 전문가 몫 정산: 질문자가 낸 금액(amount)의 EXPERT_SHARE 비율을 플랫폼 매출에서 전문가 수익 계정으로 옮긴다. */
export function settleToExpert(expertId: string, amount: number, note?: string) {
  const share = Math.floor(amount * EXPERT_SHARE);
  if (share <= 0) return;
  post([
    { account: "platform:revenue", direction: "debit", amount: share, type: "expert_earning", note },
    { account: earnAcct(expertId), direction: "credit", amount: share, userId: expertId, type: "expert_earning", note },
  ]);
}

/** 출금 신청: 전문가 수익 → 보류 계정. 잔액이 부족하면 예외. */
export function holdWithdrawal(userId: string, amount: number, note?: string) {
  if (getEarnings(userId) < amount) throw new InsufficientCoinsError();
  post([
    { account: earnAcct(userId), direction: "debit", amount, userId, type: "withdraw_request", note },
    { account: "platform:withdraw_hold", direction: "credit", amount, type: "withdraw_request", note },
  ]);
}

export function payoutWithdrawal(userId: string, amount: number, note?: string) {
  post([
    { account: "platform:withdraw_hold", direction: "debit", amount, type: "withdraw_paid", note },
    { account: "platform:payout", direction: "credit", amount, userId, type: "withdraw_paid", note },
  ]);
}

export function releaseWithdrawal(userId: string, amount: number, note?: string) {
  post([
    { account: "platform:withdraw_hold", direction: "debit", amount, type: "withdraw_rejected", note },
    { account: earnAcct(userId), direction: "credit", amount, userId, type: "withdraw_rejected", note },
  ]);
}

/** 데모용 가입 보너스: DEMO_SIGNUP_COINS(.env.local)가 있으면 가입 시 1회 지급. 운영에서는 설정하지 않는다. */
export function grantSignupBonus(userId: string) {
  const bonus = Number(process.env.DEMO_SIGNUP_COINS || 0);
  if (bonus > 0) {
    post([
      { account: "platform:promo", direction: "debit", amount: bonus, type: "signup_bonus", note: "데모 가입 보너스" },
      { account: acct(userId), direction: "credit", amount: bonus, userId, type: "signup_bonus", note: "데모 가입 보너스" },
    ]);
  }
}
