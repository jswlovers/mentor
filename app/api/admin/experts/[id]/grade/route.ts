import { setGrade } from "@/lib/server/grades";
import { forbidden, getAdmin } from "@/lib/server/http";
import { isGrade } from "@/lib/server/pricing";

// 관리자가 전문가 등급을 직접 정한다(초기 세팅·조정). 이후에는 실적에 따라 자동으로 오르기만 한다.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!getAdmin(req)) return forbidden();
  const { id } = await params;
  const { grade } = await req.json().catch(() => ({}));
  if (!isGrade(grade)) return Response.json({ error: "등급을 선택해주세요" }, { status: 400 });
  if (!setGrade(id, grade)) return Response.json({ error: "전문가를 찾을 수 없어요" }, { status: 404 });
  return Response.json({ ok: true });
}
