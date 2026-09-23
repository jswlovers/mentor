import { db } from "./db";
import { debitCoins, refundFromRevenue, settleToExpert } from "./coins";
import type { User } from "./http";

export type Consultation = {
  room_id: string;
  asker_id: string;
  asker_name: string;
  fee: number;
  expert_id: string | null;
  expert_name: string | null;
  status: "open" | "ended" | "cancelled";
  started_at: string;
  ended_at: string | null;
  claimed_at: string | null;
  preferred_expert_id: string | null;
};

const getStmt = db.prepare(`SELECT * FROM consultations WHERE room_id = ?`);
const claimStmt = db.prepare(
  `UPDATE consultations SET expert_id = ?, expert_name = ?, claimed_at = datetime('now') WHERE room_id = ? AND expert_id IS NULL AND status = 'open'`,
);
const spendStmt = db.prepare(
  `SELECT COALESCE(SUM(amount), 0) AS total FROM coin_ledger WHERE account = ? AND direction = 'debit' AND instr(note, ?) > 0`,
);

export const getConsultation = (roomId: string) => getStmt.get(roomId) as Consultation | undefined;
export const isValidRoomId = (id: unknown): id is string => typeof id === "string" && /^[\w-]{1,64}$/.test(id);

const roomTag = (roomId: string) => `(질문 ${roomId})`;

export type Role = "asker" | "expert" | "viewer";
export function roleOf(c: Consultation, user: User): Role {
  if (c.asker_id === user.id) return "asker";
  if (c.expert_id === user.id) return "expert";
  return "viewer";
}

/** 질문자에게 과금하고, 전문가가 배정돼 있으면 전문가 몫을 정산한다. 트랜잭션 안에서 호출한다. */
export function chargeAsker(c: Consultation, amount: number, type: string, note: string) {
  debitCoins(c.asker_id, amount, type, `${note} ${roomTag(c.room_id)}`);
  if (c.expert_id) settleToExpert(c.expert_id, amount, `${note} ${roomTag(c.room_id)}`);
}

/**
 * 승인된 전문가가 상담에 참여한다. 배정되는 순간, 그때까지 질문자가 낸 금액(시작비·메시지)을
 * 한꺼번에 정산한다. 트랜잭션 안에서 호출한다. 새로 배정됐으면 true.
 */
export function claimExpert(c: Consultation, expert: User) {
  if (c.expert_id || c.status !== "open" || !expert.isExpert || expert.id === c.asker_id) return false;
  const res = claimStmt.run(expert.id, expert.name, c.room_id);
  if (Number(res.changes) === 0) return false;
  const spent = (spendStmt.get(`user:${c.asker_id}`, roomTag(c.room_id)) as { total: number }).total;
  settleToExpert(expert.id, spent, `상담 참여 정산 ${roomTag(c.room_id)}`);
  return true;
}

const cancelStmt = db.prepare(`UPDATE consultations SET status = 'cancelled', ended_at = datetime('now') WHERE room_id = ? AND status = 'open' AND expert_id IS NULL`);

/**
 * 전문가가 배정되지 않은 상담을 취소하고 질문자가 쓴 금액을 전액 환불한다. 트랜잭션 안에서 호출한다.
 * 이미 전문가가 배정됐거나 종료된 상담이면 false.
 */
export function cancelAndRefund(c: Consultation, note: string): boolean {
  const res = cancelStmt.run(c.room_id);
  if (Number(res.changes) === 0) return false;
  const spent = (spendStmt.get(`user:${c.asker_id}`, roomTag(c.room_id)) as { total: number }).total;
  if (spent > 0) refundFromRevenue(c.asker_id, spent, `${note} ${roomTag(c.room_id)}`);
  return true;
}
