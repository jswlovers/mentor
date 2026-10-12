import { getExpertProfile, listReviews } from "@/lib/server/experts";

// 전문가 공개 프로필. 승인되고 정지되지 않은 전문가만 조회된다. 후기는 첫 쪽만 싣고 나머지는 /reviews로 이어 받는다.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = getExpertProfile(id);
  if (!p) return Response.json({ error: "전문가를 찾을 수 없어요" }, { status: 404 });
  const first = listReviews(id, "", 0);
  return Response.json({ ...p, reviews: first.items, reviewsHasMore: first.hasMore });
}
