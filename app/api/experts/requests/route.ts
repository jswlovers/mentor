import { db } from "@/lib/server/db";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";
import { AUTO_REFUND_MINUTES, TIERS, type Tier } from "@/lib/server/pricing";

// 나에게 알림이 간(expert_calls) 상담 중 아직 아무도 참여하지 않은 것. 화면 팝업으로 바로 참여할 수 있게 한다.
const stmt = db.prepare(`
  SELECT c.room_id, c.asker_name, c.tier, c.started_at, q.title, q.category,
    (c.preferred_expert_id = ? OR EXISTS (SELECT 1 FROM consult_targets t WHERE t.room_id = c.room_id AND t.user_id = ?)) AS picked
  FROM expert_calls ec
  JOIN consultations c ON c.room_id = ec.room_id
  JOIN questions q ON q.id = c.room_id
  WHERE ec.user_id = ? AND c.status = 'open' AND c.expert_id IS NULL AND c.asker_id != ?
    AND c.started_at > datetime('now', ?)
  ORDER BY c.started_at DESC LIMIT 5
`);

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!user.isExpert) return forbidden();
  const rows = stmt.all(user.id, user.id, user.id, user.id, `-${AUTO_REFUND_MINUTES * 60} seconds`) as {
    room_id: string; asker_name: string; tier: Tier; started_at: string; title: string; category: string; picked: number;
  }[];
  return Response.json(rows.map((r) => ({
    roomId: r.room_id,
    askerName: r.asker_name,
    title: r.title,
    category: r.category,
    tierLabel: TIERS[r.tier]?.label ?? r.tier,
    picked: !!r.picked, // 질문자가 나를 직접 골랐는지
    deadline: new Date(Date.parse(`${r.started_at.replace(" ", "T")}Z`) + AUTO_REFUND_MINUTES * 60_000).toISOString(),
  })));
}
