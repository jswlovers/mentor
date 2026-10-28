import { getAdminPending } from "@/lib/server/adminAlerts";
import { getRecentLedger } from "@/lib/server/coins";
import { db } from "@/lib/server/db";
import { forbidden, getAdmin, getUser, unauthorized } from "@/lib/server/http";

const charges = db.prepare(
  `SELECT c.id, c.amount_krw, c.coins, c.status, c.created_at, c.depositor, u.name AS user_name FROM coin_charges c JOIN users u ON u.id = c.user_id ORDER BY (c.status = 'pending') DESC, c.id DESC LIMIT 100`,
);
const experts = db.prepare(
  `SELECT id, username, name, expert_status, expert_bio, expert_years, expert_salon, expert_license_no, (expert_license_file IS NOT NULL) AS has_license, expert_grade,
    (SELECT COUNT(*) FROM consultations c WHERE c.expert_id = users.id AND c.status = 'ended') AS solved,
    (SELECT COUNT(*) FROM reviews r WHERE r.expert_id = users.id) AS review_count,
    (SELECT ROUND(AVG(rating), 2) FROM reviews r WHERE r.expert_id = users.id) AS rating
   FROM users WHERE expert_status IN ('pending','approved','rejected') ORDER BY (expert_status = 'pending') DESC, created_at DESC`,
);
const withdrawals = db.prepare(
  `SELECT w.id, w.amount, w.bank_info, w.status, w.created_at, u.name AS user_name FROM withdrawals w JOIN users u ON u.id = w.user_id ORDER BY (w.status = 'pending') DESC, w.id DESC LIMIT 100`,
);
const tickets = db.prepare(
  `SELECT t.id, t.category, t.subject, t.body, t.status, t.admin_note, t.refund_coins, t.created_at, u.name AS user_name, u.id AS user_id, tu.name AS target_name
   FROM support_tickets t JOIN users u ON u.id = t.user_id LEFT JOIN users tu ON tu.id = t.target_user_id
   ORDER BY (t.status = 'pending') DESC, t.id DESC LIMIT 100`,
);
// 코인 발행 현황. 발행 = 회원 코인 계정(user:)에 들어간 코인 중 환불을 뺀 것(충전·가입 보너스 등),
// 사용 = 회원 코인 계정에서 나간 코인에서 환불을 뺀 순사용. 잔액 = 발행 - 사용. 전문가 수익(earn:)은 출금 가능한
// 별도 계정이라 발행에 넣지 않고 따로 보여준다.
const coinIssuanceStmt = db.prepare(
  `SELECT u.id, u.username, u.name, u.role, u.suspended_at,
     COALESCE(SUM(CASE WHEN l.account = 'user:' || u.id AND l.direction = 'credit' AND l.type != 'refund' THEN l.amount END), 0) AS issued,
     COALESCE(SUM(CASE WHEN l.account = 'user:' || u.id AND l.direction = 'debit' THEN l.amount END), 0)
       - COALESCE(SUM(CASE WHEN l.account = 'user:' || u.id AND l.direction = 'credit' AND l.type = 'refund' THEN l.amount END), 0) AS spent,
     COALESCE(SUM(CASE WHEN l.account = 'earn:' || u.id THEN (CASE WHEN l.direction = 'credit' THEN l.amount ELSE -l.amount END) END), 0) AS earnings
   FROM users u LEFT JOIN coin_ledger l ON l.account IN ('user:' || u.id, 'earn:' || u.id)
   GROUP BY u.id`,
);
type IssuanceRow = { id: string; username: string; name: string; role: string; suspended_at: string | null; issued: number; spent: number; earnings: number };
function coinIssuance() {
  const members = (coinIssuanceStmt.all() as IssuanceRow[])
    .map((m) => ({ ...m, balance: m.issued - m.spent }))
    .sort((a, b) => b.balance - a.balance || b.issued - a.issued);
  const sum = (key: "issued" | "spent" | "balance" | "earnings") => members.reduce((s, m) => s + m[key], 0);
  return {
    summary: { issued: sum("issued"), spent: sum("spent"), balance: sum("balance"), earnings: sum("earnings"),
      holders: members.filter((m) => m.balance > 0).length, members: members.length },
    members,
  };
}
const users = db.prepare(`SELECT id, username, name, role, expert_status, suspended_at FROM users ORDER BY created_at DESC LIMIT 200`);

export async function GET(req: Request) {
  if (!getUser(req)) return unauthorized();
  if (!getAdmin(req)) return forbidden();
  return Response.json({
    charges: charges.all(),
    experts: experts.all(),
    withdrawals: withdrawals.all(),
    tickets: tickets.all(),
    users: users.all(),
    ledger: getRecentLedger(),
    coinIssuance: coinIssuance(),
    pending: getAdminPending(),
  });
}
