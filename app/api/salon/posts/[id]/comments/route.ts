import { db } from "@/lib/server/db";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";
import { getMembership, getPost } from "@/lib/server/salon";

type Ctx = { params: Promise<{ id: string }> };
const insertStmt = db.prepare(`INSERT INTO salon_comments (post_id, author_id, body) VALUES (?, ?, ?)`);
const findStmt = db.prepare(`SELECT id, author_id FROM salon_comments WHERE id = ? AND post_id = ?`);
const deleteStmt = db.prepare(`DELETE FROM salon_comments WHERE id = ?`);

async function load(req: Request, ctx: Ctx) {
  const user = getUser(req);
  if (!user) return { error: unauthorized() };
  const m = getMembership(user.id);
  const post = getPost(Number((await ctx.params).id));
  if (!m || !post || post.salon_id !== m.salonId) return { error: Response.json({ error: "글을 찾을 수 없어요" }, { status: 404 }) };
  return { user, m, post };
}

// 댓글(피드백) 달기: { body }. 글쓴이에게 알린다.
export async function POST(req: Request, ctx: Ctx) {
  const r = await load(req, ctx);
  if (r.error) return r.error;
  const body = String((await req.json().catch(() => ({}))).body ?? "").trim().slice(0, 300);
  if (!body) return Response.json({ error: "댓글을 적어주세요" }, { status: 400 });
  insertStmt.run(r.post.id, r.user.id, body);
  if (r.post.author_id !== r.user.id) notify(r.post.author_id, `${r.user.name}님이 내 작업물에 댓글을 남겼어요`, "/salon");
  return Response.json({ ok: true }, { status: 201 });
}

// 댓글 삭제: ?commentId= (쓴 사람 또는 원장)
export async function DELETE(req: Request, ctx: Ctx) {
  const r = await load(req, ctx);
  if (r.error) return r.error;
  const c = findStmt.get(Number(new URL(req.url).searchParams.get("commentId")), r.post.id) as { id: number; author_id: string } | undefined;
  if (!c) return Response.json({ error: "댓글을 찾을 수 없어요" }, { status: 404 });
  if (c.author_id !== r.user.id && r.m.role !== "owner") return forbidden("쓴 사람이나 원장만 지울 수 있어요");
  deleteStmt.run(c.id);
  return Response.json({ ok: true });
}
