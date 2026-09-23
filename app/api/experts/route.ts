import { db } from "@/lib/server/db";
import { RESPONSE_STAT_MIN_SAMPLES } from "@/lib/server/pricing";

type Row = {
  id: string; name: string; expert_headline: string | null; expert_bio: string | null; expert_available: number; created_at: string;
  rating: number | null; review_count: number; done: number; resp_n: number; resp_avg: number | null;
};

const listStmt = db.prepare(`
  SELECT u.id, u.name, u.expert_headline, u.expert_bio, u.expert_available, u.created_at,
    (SELECT AVG(rating) FROM reviews r WHERE r.expert_id = u.id) AS rating,
    (SELECT COUNT(*) FROM reviews r WHERE r.expert_id = u.id) AS review_count,
    (SELECT COUNT(*) FROM consultations c WHERE c.expert_id = u.id AND c.status = 'ended') AS done,
    (SELECT COUNT(*) FROM consultations c WHERE c.expert_id = u.id AND c.claimed_at IS NOT NULL) AS resp_n,
    (SELECT AVG((julianday(c.claimed_at) - julianday(c.started_at)) * 1440) FROM consultations c WHERE c.expert_id = u.id AND c.claimed_at IS NOT NULL) AS resp_avg
  FROM users u
  WHERE u.expert_status = 'approved' AND u.suspended_at IS NULL
`);
const catStmt = db.prepare(`SELECT user_id, category FROM expert_categories`);

// 전문가 목록(공개): ?category=탈색&sort=rating|responses|recent&q=검색어
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const category = sp.get("category") || "";
  const sort = sp.get("sort") || "rating";
  const q = (sp.get("q") || "").trim().toLowerCase();

  const cats = new Map<string, string[]>();
  for (const r of catStmt.all() as { user_id: string; category: string }[]) {
    cats.set(r.user_id, [...(cats.get(r.user_id) ?? []), r.category]);
  }

  let list = (listStmt.all() as Row[]).map((r) => ({
    id: r.id,
    name: r.name,
    headline: r.expert_headline,
    bio: (r.expert_bio ?? "").slice(0, 120),
    categories: cats.get(r.id) ?? [],
    available: !!r.expert_available,
    rating: r.rating === null ? null : Math.round(r.rating * 10) / 10,
    reviewCount: r.review_count,
    consultations: r.done,
    // 표본이 적으면 평균 응답시간을 숨긴다(오해 방지)
    avgResponseMinutes: r.resp_n >= RESPONSE_STAT_MIN_SAMPLES && r.resp_avg !== null ? Math.round(r.resp_avg) : null,
    joinedAt: r.created_at,
  }));

  // 분야를 정하지 않은 전문가는 모든 분야를 받는 것으로 본다
  if (category) list = list.filter((e) => e.categories.length === 0 || e.categories.includes(category));
  if (q) list = list.filter((e) => `${e.name} ${e.headline ?? ""} ${e.bio}`.toLowerCase().includes(q));

  list.sort((a, b) => {
    if (sort === "responses") return b.consultations - a.consultations;
    if (sort === "recent") return a.joinedAt < b.joinedAt ? 1 : -1;
    return (b.rating ?? -1) - (a.rating ?? -1) || b.reviewCount - a.reviewCount;
  });
  return Response.json(list);
}
