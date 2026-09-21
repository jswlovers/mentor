import { getUser, unauthorized } from "@/lib/server/http";
import { monthSummary, validMonth } from "@/lib/server/diary";

// 본인 일기 중 해당 월에 기록이 있는 날짜 목록. 항상 로그인한 본인 것만 돌려준다.
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!validMonth(month)) return Response.json({ error: "month는 YYYY-MM 형식이어야 해요" }, { status: 400 });
  return Response.json({ days: monthSummary(user.id, month) }, { headers: { "Cache-Control": "private, no-store" } });
}
