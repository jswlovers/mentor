import { getRecentLedger } from "@/lib/server/coins";
import { db } from "@/lib/server/db";
import { forbidden, getAdmin, getUser, unauthorized } from "@/lib/server/http";

const charges = db.prepare(
  `SELECT c.id, c.amount_krw, c.coins, c.status, c.created_at, c.depositor, u.name AS user_name FROM coin_charges c JOIN users u ON u.id = c.user_id ORDER BY (c.status = 'pending') DESC, c.id DESC LIMIT 100`,
);
const experts = db.prepare(
  `SELECT id, username, name, expert_status, expert_bio FROM users WHERE expert_status IN ('pending','approved','rejected') ORDER BY (expert_status = 'pending') DESC, created_at DESC`,
);
const withdrawals = db.prepare(
  `SELECT w.id, w.amount, w.bank_info, w.status, w.created_at, u.name AS user_name FROM withdrawals w JOIN users u ON u.id = w.user_id ORDER BY (w.status = 'pending') DESC, w.id DESC LIMIT 100`,
);
const tickets = db.prepare(
  `SELECT t.id, t.category, t.subject, t.body, t.status, t.admin_note, t.refund_coins, t.created_at, u.name AS user_name, u.id AS user_id, tu.name AS target_name
   FROM support_tickets t JOIN users u ON u.id = t.user_id LEFT JOIN users tu ON tu.id = t.target_user_id
   ORDER BY (t.status = 'pending') DESC, t.id DESC LIMIT 100`,
);
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
  });
}
