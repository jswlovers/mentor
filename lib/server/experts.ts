import { isAvailableNow } from "./availability";
import { db } from "./db";
import { photoUrl } from "./photo";
import { RESPONSE_STAT_MIN_SAMPLES } from "./pricing";

// 전문가 찾기(목록·공개 프로필)에서 함께 쓰는 집계. 전문가마다 하위 쿼리를 돌리지 않고 테이블별로 한 번씩 묶어 센다.

// 전문가 포트폴리오(작업 사진). 공개 사진이라 프로필 사진처럼 data/uploads에 두고, 주소는 행 id로 연다.
db.exec(`
  CREATE TABLE IF NOT EXISTS expert_portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    filename TEXT NOT NULL UNIQUE,
    caption TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_expert_portfolio_user ON expert_portfolio(user_id, id);
  CREATE INDEX IF NOT EXISTS idx_consult_expert ON consultations(expert_id, status);
`);
export const PORTFOLIO_MAX = 12;
const NEW_DAYS = 30;
export const portfolioUrl = (id: number) => `/api/portfolio-photo/${id}`;

type UserRow = {
  id: string; name: string; expert_headline: string | null; expert_bio: string | null; expert_available: number; expert_off_start: string | null; expert_off_end: string | null;
  expert_salon: string | null; expert_years: number | null; expert_license_file: string | null; photo: string | null; created_at: string;
};
const USER_COLS = `id, name, expert_headline, expert_bio, expert_available, expert_off_start, expert_off_end, expert_salon, expert_years, expert_license_file, photo, created_at`;
const usersStmt = db.prepare(`SELECT ${USER_COLS} FROM users WHERE expert_status = 'approved' AND suspended_at IS NULL`);
const userStmt = db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ? AND expert_status = 'approved' AND suspended_at IS NULL`);
const reviewAggStmt = db.prepare(`SELECT expert_id, COUNT(*) AS n, AVG(rating) AS avg FROM reviews GROUP BY expert_id`);
const doneAggStmt = db.prepare(`SELECT expert_id, COUNT(*) AS n FROM consultations WHERE status = 'ended' AND expert_id IS NOT NULL GROUP BY expert_id`);
const respAllStmt = db.prepare(`SELECT expert_id, (julianday(claimed_at) - julianday(started_at)) * 1440 AS m FROM consultations WHERE expert_id IS NOT NULL AND claimed_at IS NOT NULL`);
const respOneStmt = db.prepare(`SELECT (julianday(claimed_at) - julianday(started_at)) * 1440 AS m FROM consultations WHERE expert_id = ? AND claimed_at IS NOT NULL`);
const catAllStmt = db.prepare(`SELECT user_id, category FROM expert_categories`);
const catOneStmt = db.prepare(`SELECT category FROM expert_categories WHERE user_id = ?`);
const portfolioCountStmt = db.prepare(`SELECT user_id, COUNT(*) AS n FROM expert_portfolio GROUP BY user_id`);

// 후기가 적은 전문가가 점수 한두 개로 위로 튀지 않도록, 4.0점 후기 5개가 미리 있는 것처럼 당긴 점수(베이지안 평균)로 정렬한다.
const PRIOR_RATING = 4;
const PRIOR_WEIGHT = 5;
const rankScore = (avg: number | null, n: number, prior = PRIOR_RATING) => (n === 0 || avg === null ? prior - 0.01 : (prior * PRIOR_WEIGHT + avg * n) / (PRIOR_WEIGHT + n));

// 평균은 한 번 크게 늦은 응답에 끌려가므로 중앙값을 쓴다. 표본이 적으면 숨긴다(오해 방지).
function median(xs: number[]) {
  if (xs.length < RESPONSE_STAT_MIN_SAMPLES) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return Math.max(0, Math.round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2));
}

const toPublic = (u: UserRow, cats: string[], rating: { n: number; avg: number | null }, done: number, resp: number[], portfolioCount: number) => ({
  id: u.id,
  name: u.name,
  headline: u.expert_headline,
  salon: u.expert_salon,
  years: u.expert_years,
  licenseVerified: !!u.expert_license_file, // 면허증 사진을 제출해 관리자 승인을 받은 전문가
  photoUrl: photoUrl(u.id, u.photo),
  categories: cats,
  available: isAvailableNow(u), // ON이고 상담 불가 시간이 아닐 때
  offHours: u.expert_off_start && u.expert_off_end ? `${u.expert_off_start}~${u.expert_off_end}` : null,
  rating: rating.avg === null ? null : Math.round(rating.avg * 10) / 10,
  reviewCount: rating.n,
  consultations: done,
  medianResponseMinutes: median(resp),
  portfolioCount,
  joinedAt: u.created_at,
  isNew: Date.now() - new Date(u.created_at.replace(" ", "T") + "Z").getTime() < NEW_DAYS * 86400_000, // 가입 30일 이내
});
export type PublicExpert = ReturnType<typeof toPublic>;
export type ListedExpert = Omit<PublicExpert, "bio"> & { bio: string; specialist: boolean; score: number };

export const SORTS = ["rating", "responses", "recent"] as const;

/** 목록. 분야를 고르면 그 분야를 직접 고른 전문가(specialist)를 '전 분야' 전문가보다 먼저 보여준다. */
export function listExperts(opts: { category?: string; q?: string; onlyAvailable?: boolean; sort?: string }) {
  const { category = "", onlyAvailable = false, sort = "rating" } = opts;
  const q = (opts.q ?? "").trim().toLowerCase();
  const cats = new Map<string, string[]>();
  for (const r of catAllStmt.all() as { user_id: string; category: string }[]) cats.set(r.user_id, [...(cats.get(r.user_id) ?? []), r.category]);
  const ratings = new Map((reviewAggStmt.all() as { expert_id: string; n: number; avg: number }[]).map((r) => [r.expert_id, r]));
  const done = new Map((doneAggStmt.all() as { expert_id: string; n: number }[]).map((r) => [r.expert_id, r.n]));
  const resp = new Map<string, number[]>();
  for (const r of respAllStmt.all() as { expert_id: string; m: number }[]) resp.set(r.expert_id, [...(resp.get(r.expert_id) ?? []), r.m]);
  const portfolio = new Map((portfolioCountStmt.all() as { user_id: string; n: number }[]).map((r) => [r.user_id, r.n]));

  let list: ListedExpert[] = (usersStmt.all() as UserRow[]).map((u) => {
    const r = ratings.get(u.id) ?? { n: 0, avg: null };
    const c = cats.get(u.id) ?? [];
    return {
      ...toPublic(u, c, r, done.get(u.id) ?? 0, resp.get(u.id) ?? [], portfolio.get(u.id) ?? 0),
      bio: (u.expert_bio ?? "").slice(0, 120),
      specialist: !!category && c.includes(category),
      score: rankScore(r.avg, r.n),
    };
  });

  // 분야를 정하지 않은 전문가는 모든 분야를 받는 것으로 본다(호출 규칙과 같다). 대신 정렬에서 뒤로 보낸다.
  if (category) list = list.filter((e) => e.categories.length === 0 || e.categories.includes(category));
  if (q) list = list.filter((e) => `${e.name} ${e.headline ?? ""} ${e.salon ?? ""} ${e.bio} ${e.categories.join(" ")}`.toLowerCase().includes(q));
  if (onlyAvailable) list = list.filter((e) => e.available);

  list.sort((a, b) => {
    if (a.specialist !== b.specialist) return a.specialist ? -1 : 1;
    if (sort === "responses") return b.consultations - a.consultations || b.score - a.score;
    if (sort === "recent") return a.joinedAt < b.joinedAt ? 1 : a.joinedAt > b.joinedAt ? -1 : 0;
    // 추천순: 지금 응대 가능한 분 먼저, 그다음 보정 평점
    if (a.available !== b.available) return a.available ? -1 : 1;
    return b.score - a.score || b.reviewCount - a.reviewCount;
  });
  return list;
}

const portfolioStmt = db.prepare(`SELECT id, caption FROM expert_portfolio WHERE user_id = ? ORDER BY id DESC`);
const reviewOneStmt = db.prepare(`SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE expert_id = ?`);
const doneOneStmt = db.prepare(`SELECT COUNT(*) AS n FROM consultations WHERE expert_id = ? AND status = 'ended'`);
const ansStmt = db.prepare(`SELECT COUNT(*) AS n FROM answers WHERE author_id = ?`);
const reviewCatStmt = db.prepare(`SELECT q.category AS category, COUNT(*) AS n FROM reviews r JOIN questions q ON q.id = r.room_id WHERE r.expert_id = ? GROUP BY q.category ORDER BY n DESC`);

/** 공개 프로필. 승인되고 정지되지 않은 전문가만. */
export function getExpertProfile(id: string) {
  const u = userStmt.get(id) as UserRow | undefined;
  if (!u) return null;
  const portfolio = (portfolioStmt.all(id) as { id: number; caption: string | null }[]).map((p) => ({ id: p.id, caption: p.caption, url: portfolioUrl(p.id) }));
  const resp = (respOneStmt.all(id) as { m: number }[]).map((r) => r.m);
  return {
    ...toPublic(u, (catOneStmt.all(id) as { category: string }[]).map((r) => r.category), reviewOneStmt.get(id) as { n: number; avg: number | null }, (doneOneStmt.get(id) as { n: number }).n, resp, portfolio.length),
    bio: u.expert_bio ?? "",
    answers: (ansStmt.get(id) as { n: number }).n,
    portfolio,
    reviewCategories: reviewCatStmt.all(id) as { category: string; n: number }[],
  };
}

const REVIEW_PAGE = 10;
const reviewsStmt = db.prepare(`
  SELECT r.id, r.asker_name, r.rating, r.comment, r.created_at, q.category
  FROM reviews r LEFT JOIN questions q ON q.id = r.room_id
  WHERE r.expert_id = ? AND (? = '' OR q.category = ?) AND (? = 0 OR r.id < ?)
  ORDER BY r.id DESC LIMIT ?`);

/** 후기 목록(최신순, 분야별로 거를 수 있고 before로 이어서 불러온다). 질문자 이름은 가운데를 가린다. */
export function listReviews(expertId: string, category: string, before: number) {
  const rows = reviewsStmt.all(expertId, category, category, before, before, REVIEW_PAGE + 1) as { id: number; asker_name: string; rating: number; comment: string | null; created_at: string; category: string | null }[];
  return { items: rows.slice(0, REVIEW_PAGE).map((r) => ({ ...r, asker_name: maskName(r.asker_name) })), hasMore: rows.length > REVIEW_PAGE };
}
const maskName = (n: string) => (n.length <= 1 ? n : n.length === 2 ? `${n[0]}*` : `${n[0]}${"*".repeat(n.length - 2)}${n[n.length - 1]}`);
