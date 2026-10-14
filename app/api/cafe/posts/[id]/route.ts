import { db } from "@/lib/server/db";
import { getUser, unauthorized, forbidden } from "@/lib/server/http";
import { cafeError, cafeJson, getCafePost, validId, validateCafePost } from "@/lib/server/cafe";
import { boardAccess, checkJobKind, safePost } from "@/lib/server/cafeServices";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, ctx: Context) {
  const { id } = await ctx.params;
  const post = validId(id) ? getCafePost(Number(id), getUser(req)?.id) : null;
  if (!post) return cafeError("글을 찾을 수 없어요", 404);
  const user=getUser(req);
  if(!boardAccess(post.board,user))return forbidden("해당 게시판의 이용 권한이 없어요");
  db.prepare("UPDATE cafe_posts SET views=views+1 WHERE id=?").run(post.id);
  if(user)db.prepare("INSERT INTO cafe_recent(user_id,post_id) VALUES(?,?) ON CONFLICT(user_id,post_id) DO UPDATE SET viewed_at=datetime('now')").run(user.id,post.id);
  const attachments=db.prepare("SELECT id,name,mime FROM cafe_attachments WHERE post_id=? ORDER BY id").all(post.id).map(a=>({...a,url:`/api/cafe/attachments/${a.id}`}));
  const comments = db.prepare("SELECT c.id,c.author_id,u.name AS author_name,c.body,c.created_at,c.parent_id FROM cafe_comments c JOIN users u ON u.id=c.author_id WHERE c.post_id=? AND c.deleted_at IS NULL ORDER BY c.id LIMIT 500").all(Number(id));
  const poll=db.prepare("SELECT o.id,o.label,(SELECT COUNT(*) FROM cafe_poll_votes v WHERE v.option_id=o.id) AS votes,EXISTS(SELECT 1 FROM cafe_poll_votes v WHERE v.option_id=o.id AND v.user_id=?) AS selected FROM cafe_poll_options o WHERE o.post_id=? ORDER BY o.id").all(user?.id||'',post.id);
  return cafeJson({ post:safePost({...post,attachments,views:(post.views||0)+1},user), comments:comments.map(c=>post.board==='anonymous'&&!user?.isAdmin&&c.author_id!==user?.id?{...c,author_id:'anonymous',author_name:'익명 회원'}:c),poll });
}
export async function PATCH(req: Request, ctx: Context) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const post = validId(id) ? getCafePost(Number(id), user.id) : null;
  if (!post) return cafeError("글을 찾을 수 없어요", 404);
  if (post.author_id !== user.id && !user.isAdmin) return forbidden();
  const value = await req.json().catch(() => null);
  if (!value || typeof value !== "object") return cafeError("변경 내용을 확인해주세요");
  if (value.action === "status") {
    if (!["open","closed"].includes(value.status)) return cafeError("상태가 올바르지 않아요");
    db.prepare("UPDATE cafe_posts SET status=?,updated_at=datetime('now') WHERE id=?").run(value.status, post.id);
  } else if (value.action === "pin") {
    if (!user.isAdmin) return forbidden();
    db.prepare("UPDATE cafe_posts SET pinned=?,updated_at=datetime('now') WHERE id=?").run(value.pinned ? 1 : 0, post.id);
  } else {
    let next;
    try { next = validateCafePost({ ...value, board: post.board }); } catch (e) { return cafeError((e as Error).message); }
    if (next.board === "jobs" && next.details.kind !== post.details.kind) { try { checkJobKind(user, next.details.kind); } catch (e) { return forbidden((e as Error).message); } }
    db.prepare("UPDATE cafe_posts SET title=?,body=?,details=?,updated_at=datetime('now') WHERE id=?").run(next.title,next.body,JSON.stringify(next.details),post.id);
  }
  return cafeJson({ ok: true });
}
export async function DELETE(req: Request, ctx: Context) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const post = validId(id) ? getCafePost(Number(id),user.id) : null;
  if (!post) return cafeError("글을 찾을 수 없어요",404);
  if (post.author_id !== user.id && !user.isAdmin) return forbidden();
  db.prepare("UPDATE cafe_posts SET deleted_at=datetime('now') WHERE id=?").run(post.id);
  return cafeJson({ ok: true });
}
