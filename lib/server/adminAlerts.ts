import { db } from "./db";
import { notify } from "./notify";

// 관리자가 처리해야 할 대기 건수. 토스 결제 대기는 자동 승인 대상이라 충전 건수에서 뺀다.
const countsStmt = db.prepare(
  `SELECT
     (SELECT COUNT(*) FROM coin_charges WHERE status = 'pending' AND provider = 'manual') AS charges,
     (SELECT COUNT(*) FROM users WHERE expert_status = 'pending') AS experts,
     (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') AS withdrawals,
     (SELECT COUNT(*) FROM support_tickets WHERE status = 'pending') AS tickets`,
);
const adminsStmt = db.prepare(`SELECT id FROM users WHERE role = 'admin' AND suspended_at IS NULL`);

export type AdminPending = { charges: number; experts: number; withdrawals: number; tickets: number; total: number };

export function getAdminPending(): AdminPending {
  const c = countsStmt.get() as Omit<AdminPending, "total">;
  return { ...c, total: c.charges + c.experts + c.withdrawals + c.tickets };
}

/** 새 신청이 들어오면 모든 관리자에게 앱 알림(+ 인증·동의한 관리자는 카카오/문자)을 보낸다. tab은 관리자 페이지 탭 이름. */
export function notifyAdmins(tab: "충전" | "전문가" | "출금" | "문의", detail: string) {
  const body = `[관리자] 새 ${tab} 요청: ${detail}`;
  const link = `/admin?tab=${encodeURIComponent(tab)}`;
  for (const { id } of adminsStmt.all() as { id: string }[]) {
    notify(id, body, link, { kind: "admin_alert", vars: { what: tab, detail } });
  }
}
