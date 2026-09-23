import { db } from "./db";
import { sendToUser, type Kind } from "./messaging";

const insertStmt = db.prepare(`INSERT INTO notifications (user_id, body, link) VALUES (?, ?, ?)`);
const unreadSame = db.prepare(`SELECT 1 AS x FROM notifications WHERE user_id = ? AND link = ? AND body = ? AND read_at IS NULL LIMIT 1`);

/**
 * 앱 안 알림을 남긴다. 같은 내용의 읽지 않은 알림이 이미 있으면 중복 생성하지 않는다(채팅 알림 폭주 방지).
 * external을 주면 카카오 알림톡/문자도 함께 보낸다(lib/server/messaging.ts).
 */
export function notify(userId: string | null | undefined, body: string, link?: string, external?: { kind: Kind; vars?: Record<string, string> }) {
  if (!userId) return;
  try {
    if (unreadSame.get(userId, link ?? null, body)) return;
    insertStmt.run(userId, body, link ?? null);
  } catch (err) {
    console.error("[notify] failed", err);
  }
  // 카카오 알림톡/문자: 인증·동의한 회원에게만 비동기로 보낸다(실패해도 요청 흐름에 영향 없음).
  if (external) sendToUser(userId, external.kind, external.vars).catch((err) => console.error("[notify] external failed", err));
}
