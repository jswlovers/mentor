import { db } from "@/lib/server/db";
import { getUser, limited, unauthorized } from "@/lib/server/http";
import { CITY_DISTRICTS, JOB_TYPES } from "@/lib/regions";

const listStmt = db.prepare(
  `SELECT id, type, city, district, title, body, author_name, created_at FROM job_posts
   WHERE type = ? AND city = ? AND district = ? ORDER BY created_at DESC, id DESC LIMIT 200`,
);
const insertStmt = db.prepare(
  `INSERT INTO job_posts (type, city, district, title, body, author_id, author_name) VALUES (?, ?, ?, ?, ?, ?, ?)`,
);

function validLocation(type: string, city: string, district: string) {
  if (!(type in JOB_TYPES)) return false;
  return CITY_DISTRICTS[city]?.includes(district) ?? false;
}

// 목록은 질문 게시판과 마찬가지로 누구나 볼 수 있다.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const type = sp.get("type") ?? "";
  const city = sp.get("city") ?? "";
  const district = sp.get("district") ?? "";
  if (!validLocation(type, city, district)) return Response.json({ error: "지역을 선택해주세요" }, { status: 400 });
  return Response.json(listStmt.all(type, city, district));
}

export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (limited(`job-post:${user.id}`, 60 * 60 * 1000, 30)) {
    return Response.json({ error: "게시글 등록이 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }
  const b = await req.json().catch(() => ({}));
  const type = String(b.type ?? "");
  const city = String(b.city ?? "");
  const district = String(b.district ?? "");
  if (!validLocation(type, city, district)) return Response.json({ error: "지역을 선택해주세요" }, { status: 400 });
  const title = String(b.title ?? "").trim().slice(0, 100);
  const body = String(b.body ?? "").trim().slice(0, 3000);
  if (!title || !body) return Response.json({ error: "제목과 내용을 입력해주세요" }, { status: 400 });
  insertStmt.run(type, city, district, title, body, user.id, user.name);
  return Response.json({ ok: true }, { status: 201 });
}
