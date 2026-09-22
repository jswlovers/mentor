import { db } from "@/lib/server/db";
import { forbidden, getUser, limited, unauthorized, type User } from "@/lib/server/http";
import { POSITIONS } from "@/lib/regions";

const listStmt = db.prepare(
  `SELECT id, title, body, author_name, created_at FROM position_posts WHERE position = ? ORDER BY created_at DESC, id DESC LIMIT 200`,
);
const insertStmt = db.prepare(`INSERT INTO position_posts (position, title, body, author_id, author_name) VALUES (?, ?, ?, ?, ?)`);

// 같은 직급 회원과 관리자만 그 직급 게시판을 보고 쓸 수 있다(원장님은 디자이너 게시판을, 인턴은 원장님 게시판을 볼 수 없음).
function canAccess(user: User | null, position: string) {
  return !!user && (user.isAdmin || user.position === position);
}

export async function GET(req: Request) {
  const user = getUser(req);
  const position = new URL(req.url).searchParams.get("position") ?? "";
  if (!(POSITIONS as readonly string[]).includes(position)) return Response.json({ error: "직급이 올바르지 않아요" }, { status: 400 });
  if (!canAccess(user, position)) return user ? forbidden("해당 직급만 볼 수 있어요") : unauthorized();
  return Response.json(listStmt.all(position));
}

export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (limited(`pos-post:${user.id}`, 60 * 60 * 1000, 30)) {
    return Response.json({ error: "게시글 등록이 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }
  const b = await req.json().catch(() => ({}));
  const position = String(b.position ?? "");
  if (!(POSITIONS as readonly string[]).includes(position)) return Response.json({ error: "직급이 올바르지 않아요" }, { status: 400 });
  if (!canAccess(user, position)) return forbidden("해당 직급만 글을 쓸 수 있어요");
  const title = String(b.title ?? "").trim().slice(0, 100);
  const body = String(b.body ?? "").trim().slice(0, 3000);
  if (!title || !body) return Response.json({ error: "제목과 내용을 입력해주세요" }, { status: 400 });
  insertStmt.run(position, title, body, user.id, user.name);
  return Response.json({ ok: true }, { status: 201 });
}
