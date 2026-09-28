import { isAvailableNow } from "@/lib/server/availability";
import { db } from "@/lib/server/db";
import { photoUrl } from "@/lib/server/photo";
import { RESPONSE_STAT_MIN_SAMPLES } from "@/lib/server/pricing";

const catStmt = db.prepare(`SELECT category FROM expert_categories WHERE user_id = ?`);
const respStmt = db.prepare(`SELECT COUNT(*) AS n, AVG((julianday(claimed_at) - julianday(started_at)) * 1440) AS avg FROM consultations WHERE expert_id = ? AND claimed_at IS NOT NULL`);
const userStmt = db.prepare(`SELECT id, name, expert_bio, expert_headline, expert_available, expert_off_start, expert_off_end, expert_salon, photo, created_at FROM users WHERE id = ? AND expert_status = 'approved'`);
const statStmt = db.prepare(`SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE expert_id = ?`);
const reviewsStmt = db.prepare(`SELECT asker_name, rating, comment, created_at FROM reviews WHERE expert_id = ? ORDER BY id DESC LIMIT 30`);
const doneStmt = db.prepare(`SELECT COUNT(*) AS n FROM consultations WHERE expert_id = ? AND status = 'ended'`);
const ansStmt = db.prepare(`SELECT COUNT(*) AS n FROM answers WHERE author_id = ?`);

// 전문가 공개 프로필. 승인된 전문가만 조회된다.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = userStmt.get(id) as { id: string; name: string; expert_bio: string; expert_headline: string | null; expert_available: number; expert_off_start: string | null; expert_off_end: string | null; expert_salon: string | null; photo: string | null; created_at: string } | undefined;
  if (!u) return Response.json({ error: "전문가를 찾을 수 없어요" }, { status: 404 });
  const s = statStmt.get(id) as { n: number; avg: number | null };
  const resp = respStmt.get(id) as { n: number; avg: number | null };
  return Response.json({
    id: u.id,
    name: u.name,
    bio: u.expert_bio,
    headline: u.expert_headline,
    salon: u.expert_salon,
    photoUrl: photoUrl(u.id, u.photo),
    available: isAvailableNow(u),
    offHours: u.expert_off_start && u.expert_off_end ? `${u.expert_off_start}~${u.expert_off_end}` : null,
    categories: (catStmt.all(id) as { category: string }[]).map((r) => r.category),
    avgResponseMinutes: resp.n >= RESPONSE_STAT_MIN_SAMPLES && resp.avg !== null ? Math.round(resp.avg) : null,
    joinedAt: u.created_at,
    reviewCount: s.n,
    rating: s.avg === null ? null : Math.round(s.avg * 10) / 10,
    consultations: (doneStmt.get(id) as { n: number }).n,
    answers: (ansStmt.get(id) as { n: number }).n,
    reviews: reviewsStmt.all(id),
  });
}
