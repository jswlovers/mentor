import { db } from "@/lib/server/db";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";

const CATEGORIES = ["펌", "염색", "염색클리닉", "탈색", "커트", "클리닉", "매장운영"];
const getCats = db.prepare(`SELECT category FROM expert_categories WHERE user_id = ?`);
const getUserRow = db.prepare(`SELECT expert_available, expert_headline FROM users WHERE id = ?`);
const delCats = db.prepare(`DELETE FROM expert_categories WHERE user_id = ?`);
const addCat = db.prepare(`INSERT OR IGNORE INTO expert_categories (user_id, category) VALUES (?, ?)`);
const setUser = db.prepare(`UPDATE users SET expert_available = ?, expert_headline = ? WHERE id = ?`);

// 전문가 설정: 담당 분야(비우면 모든 분야), 응대 가능 여부, 한 줄 소개
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!user.isExpert) return forbidden("승인된 전문가만 설정할 수 있어요");
  const u = getUserRow.get(user.id) as { expert_available: number; expert_headline: string | null };
  return Response.json({
    categories: (getCats.all(user.id) as { category: string }[]).map((r) => r.category),
    available: !!u.expert_available,
    headline: u.expert_headline ?? "",
  });
}

export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!user.isExpert) return forbidden("승인된 전문가만 설정할 수 있어요");
  const b = await req.json().catch(() => ({}));
  const cats: string[] = Array.isArray(b.categories) ? [...new Set<string>(b.categories.map(String))].filter((c) => CATEGORIES.includes(c)) : [];
  const headline = String(b.headline ?? "").trim().slice(0, 40) || null;
  db.exec("BEGIN");
  try {
    delCats.run(user.id);
    for (const c of cats) addCat.run(user.id, c);
    setUser.run(b.available === false ? 0 : 1, headline, user.id);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return Response.json({ ok: true });
}
