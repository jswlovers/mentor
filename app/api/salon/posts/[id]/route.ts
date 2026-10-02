import { forbidden, getUser, unauthorized } from "@/lib/server/http";
import { deletePost, getMembership, getPost } from "@/lib/server/salon";

// 작업물 삭제: 올린 사람 또는 원장
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const m = getMembership(user.id);
  const post = getPost(Number((await params).id));
  if (!m || !post || post.salon_id !== m.salonId) return Response.json({ error: "글을 찾을 수 없어요" }, { status: 404 });
  if (post.author_id !== user.id && m.role !== "owner") return forbidden("올린 사람이나 원장만 지울 수 있어요");
  deletePost(post.id);
  return Response.json({ ok: true });
}
