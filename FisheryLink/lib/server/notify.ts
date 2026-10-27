import { db } from "./db";

const insertStmt = db.prepare(`INSERT INTO notifications (user_id, body, link) VALUES (?, ?, ?)`);
const unreadSame = db.prepare(`SELECT 1 AS x FROM notifications WHERE user_id = ? AND link = ? AND body = ? AND read_at IS NULL LIMIT 1`);

/**
 * 앱 안 알림을 남긴다. 같은 내용의 읽지 않은 알림이 이미 있으면 중복 생성하지 않는다(채팅 알림 폭주 방지).
 * SMS·알림톡 같은 외부 발송은 아직 없다(발송 업체 키 필요).
 */
export function notify(userId: string | null | undefined, body: string, link?: string) {
  if (!userId) return;
  try {
    if (unreadSame.get(userId, link ?? null, body)) return;
    insertStmt.run(userId, body, link ?? null);
  } catch (err) {
    console.error("[notify] failed", err);
  }
}
