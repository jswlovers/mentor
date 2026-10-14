import { db } from "@/lib/server/db";
import { getUser, unauthorized, forbidden, limited } from "@/lib/server/http";
import { cafeJson, cafeError, getCafePost, validId } from "@/lib/server/cafe";
import { notify } from "@/lib/server/notify";
import { boardAccess } from "@/lib/server/cafeServices";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const post = validId(id) ? getCafePost(Number(id),user.id) : null;
  if (!post) return cafeError("글을 찾을 수 없어요",404);
  if(!boardAccess(post.board,user))return forbidden("해당 게시판의 이용 권한이 없어요");
  if (limited(`cafe-action:${user.id}`,60000,60)) return cafeError("잠시 후 다시 시도해주세요",429);
  const value = await req.json().catch(() => ({}));
  if (!value || typeof value !== "object") return cafeError("요청 내용을 확인해주세요");
  if (["like", "save"].includes(value.action)) {
    if (typeof value.enabled !== "boolean") return cafeError("변경할 상태를 확인해주세요");
    if (value.enabled) db.prepare("INSERT OR IGNORE INTO cafe_reactions(post_id,user_id,kind) VALUES(?,?,?)").run(post.id,user.id,value.action);
    else db.prepare("DELETE FROM cafe_reactions WHERE post_id=? AND user_id=? AND kind=?").run(post.id,user.id,value.action);
  } else if (value.action === "comment") {
    const body = String(value.body || "").trim();
    if (!body || body.length > 1000) return cafeError("댓글은 1~1,000자로 입력해주세요");
    if (limited(`cafe-comment:${user.id}`,3600000,60)) return cafeError("댓글 등록이 너무 많아요",429);
    const parentId=value.parentId?Number(value.parentId):null;
    if(parentId&&!db.prepare("SELECT 1 FROM cafe_comments WHERE id=? AND post_id=? AND deleted_at IS NULL").get(parentId,post.id))return cafeError("답글 대상 댓글을 확인해주세요");
    db.prepare("INSERT INTO cafe_comments(post_id,author_id,body,parent_id) VALUES(?,?,?,?)").run(post.id,user.id,body,parentId);
    if (post.author_id !== user.id) notify(post.author_id,`${post.board==='anonymous'?'익명 회원':user.name}님이 ‘${post.title}’에 댓글을 남겼어요`, `/cafe/posts/${post.id}`);
  } else if (value.action === "delete-comment") {
    const comment = db.prepare("SELECT author_id FROM cafe_comments WHERE id=? AND post_id=? AND deleted_at IS NULL").get(Number(value.commentId) || 0, post.id) as { author_id: string } | undefined;
    if (!comment) return cafeError("댓글을 찾을 수 없어요",404);
    if (comment.author_id !== user.id && !user.isAdmin) return forbidden();
    db.prepare("UPDATE cafe_comments SET deleted_at=datetime('now') WHERE id=?").run(Number(value.commentId));
  } else if (value.action === "report") {
    const reason = String(value.reason || "").trim();
    if (reason.length < 5 || reason.length > 1000) return cafeError("신고 사유는 5~1,000자로 입력해주세요");
    if (post.author_id === user.id) return cafeError("본인 글은 신고할 수 없어요");
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = db.prepare("INSERT OR IGNORE INTO cafe_reports(post_id,user_id,reason) VALUES(?,?,?)").run(post.id,user.id,reason);
      if (!result.changes) { db.exec("ROLLBACK"); return cafeError("이미 신고한 글이에요",409); }
      db.prepare("INSERT INTO support_tickets(user_id,category,subject,body) VALUES(?,'other',?,?)").run(user.id,`라운지 글 #${post.id} 신고`,`글 #${post.id}: ${post.title}\n/cafe/posts/${post.id}\n사유: ${reason}`);
      db.exec("COMMIT");
    } catch { db.exec("ROLLBACK"); return cafeError("신고 접수에 실패했어요",500); }
  } else return cafeError("지원하지 않는 요청이에요");
  return cafeJson({ ok: true });
}
