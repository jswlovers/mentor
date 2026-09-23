import { db } from "./db";
import type { Consultation } from "./consult";
import { notify } from "./notify";
import { CALL_HOURLY_CAP, CALL_WAVE_SIZE } from "./pricing";

type Candidate = { id: string; name: string };

// 승인·응대 가능·정지 아님·질문자 본인 아님·이번 상담에서 아직 호출 안 함·(담당 분야가 맞거나 분야를 정하지 않음)
// 정렬: 최근 1시간 호출이 적은 전문가 → 평점이 높은 전문가 → 오래된 가입 순 (한 사람에게 몰리지 않게 라운드로빈 성격)
const candidatesStmt = db.prepare(`
  SELECT u.id, u.name,
    (SELECT COUNT(*) FROM expert_calls c WHERE c.user_id = u.id AND c.created_at > datetime('now', '-1 hour')) AS recent,
    (SELECT AVG(rating) FROM reviews r WHERE r.expert_id = u.id) AS rating
  FROM users u
  WHERE u.expert_status = 'approved' AND u.expert_available = 1 AND u.suspended_at IS NULL
    AND u.id != ?
    AND u.id NOT IN (SELECT user_id FROM expert_calls WHERE room_id = ?)
    AND (EXISTS (SELECT 1 FROM expert_categories ec WHERE ec.user_id = u.id AND ec.category = ?)
         OR NOT EXISTS (SELECT 1 FROM expert_categories ec WHERE ec.user_id = u.id))
  ORDER BY recent ASC, COALESCE(rating, 0) DESC, u.created_at ASC
`);
const recentOfStmt = db.prepare(`SELECT COUNT(*) AS n FROM expert_calls WHERE user_id = ? AND created_at > datetime('now', '-1 hour')`);
const preferredStmt = db.prepare(`SELECT id, name FROM users WHERE id = ? AND expert_status = 'approved' AND suspended_at IS NULL AND id != ?`);
const insertCall = db.prepare(`INSERT OR IGNORE INTO expert_calls (room_id, user_id, wave) VALUES (?, ?, ?)`);
const calledCount = db.prepare(`SELECT COUNT(*) AS n FROM expert_calls WHERE room_id = ? AND wave = ?`);

/** 카카오·문자는 야간(23~08시, 한국시간)에는 보내지 않는다. 앱 알림은 항상 남는다. */
const quietHoursKst = () => {
  const h = new Date(Date.now() + 9 * 3600_000).getUTCHours();
  return h >= 23 || h < 8;
};

/**
 * 상담이 열렸을 때 적합한 전문가에게 참여를 요청한다 (인앱 알림 + 카카오 알림톡).
 * wave 1: 지정 전문가(있으면) + 후보 상위 N명, wave 2: 아직 호출하지 않은 다음 N명.
 * 호출한 전문가 수를 돌려준다.
 */
export function callExperts(c: Consultation, category: string, wave: 1 | 2): number {
  const picked: Candidate[] = [];

  if (wave === 1 && c.preferred_expert_id) {
    const p = preferredStmt.get(c.preferred_expert_id, c.asker_id) as Candidate | undefined;
    if (p) picked.push(p);
  }
  for (const cand of candidatesStmt.all(c.asker_id, c.room_id, category) as Candidate[]) {
    if (picked.length >= CALL_WAVE_SIZE) break;
    if (picked.some((p) => p.id === cand.id)) continue;
    if ((recentOfStmt.get(cand.id) as { n: number }).n >= CALL_HOURLY_CAP) continue; // 시간당 한도
    picked.push(cand);
  }

  for (const e of picked) {
    insertCall.run(c.room_id, e.id, wave);
    const preferred = e.id === c.preferred_expert_id;
    notify(
      e.id,
      `${preferred ? "지정 요청 · " : ""}${c.asker_name}님의 ${category} 질문에 1:1 상담이 열렸어요. 참여해보세요`,
      `/chat/${c.room_id}`,
      quietHoursKst() ? undefined : { kind: "consult_request", vars: { asker: c.asker_name, category } },
    );
  }
  return picked.length;
}

export const hasCalledWave = (roomId: string, wave: number) => (calledCount.get(roomId, wave) as { n: number }).n > 0;
