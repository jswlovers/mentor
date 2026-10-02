import { getExpertProfile, listReviews } from "@/lib/server/experts";

// 전문가 후기 더 보기: ?category=탈색(선택)&before=마지막 후기 id
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getExpertProfile(id)) return Response.json({ error: "전문가를 찾을 수 없어요" }, { status: 404 });
  const sp = new URL(req.url).searchParams;
  return Response.json(listReviews(id, sp.get("category") || "", Math.max(Number(sp.get("before")) || 0, 0)));
}
