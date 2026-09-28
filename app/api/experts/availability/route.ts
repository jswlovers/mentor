import { getAvailability, isHHMM, setAvailableOn, setOffHours } from "@/lib/server/availability";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";

// 전문가 상담 ON/OFF와 상담 불가 시간(한국 시간)
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!user.isExpert) return forbidden("승인된 전문가만 설정할 수 있어요");
  return Response.json(getAvailability(user.id));
}

// { on?: boolean } 헤더 토글 · { offStart: "22:00", offEnd: "09:00" } 불가 시간 저장 · { offStart: null, offEnd: null } 해제
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!user.isExpert) return forbidden("승인된 전문가만 설정할 수 있어요");
  const b = await req.json().catch(() => ({}));
  if ("offStart" in b || "offEnd" in b) {
    const { offStart, offEnd } = b;
    if (offStart === null && offEnd === null) setOffHours(user.id, null, null);
    else if (!isHHMM(offStart) || !isHHMM(offEnd)) return Response.json({ error: "시작·끝 시간을 골라주세요" }, { status: 400 });
    else if (offStart === offEnd) return Response.json({ error: "시작과 끝 시간이 같아요" }, { status: 400 });
    else setOffHours(user.id, offStart, offEnd);
  }
  if (typeof b.on === "boolean") setAvailableOn(user.id, b.on);
  return Response.json(getAvailability(user.id));
}
