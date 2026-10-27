import { db } from "./db";

// 같은 회원에 대한 '회원 신고'가 누적되면 자동으로 정지한다 (포레스트클럽 moderation.js 이식).
// 경고 알림(SMS)은 아직 없어서, 정지 임계치만 적용한다.
export const SUSPEND_THRESHOLD = 5;

const countStmt = db.prepare(`SELECT COUNT(*) AS c FROM support_tickets WHERE category = 'report' AND target_user_id = ?`);
const suspendStmt = db.prepare(`UPDATE users SET suspended_at = datetime('now'), suspended_reason = ? WHERE id = ? AND suspended_at IS NULL`);
const dropSessions = db.prepare(`DELETE FROM sessions WHERE user_id = ?`);

export function applyAutoModeration(targetUserId: string) {
  const count = (countStmt.get(targetUserId) as { c: number }).c;
  if (count >= SUSPEND_THRESHOLD) {
    suspendStmt.run(`신고 누적(${count}건) 자동 정지`, targetUserId);
    dropSessions.run(targetUserId);
  }
}
