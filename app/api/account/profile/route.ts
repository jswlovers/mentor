import { db } from "@/lib/server/db";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";

const setSalon = db.prepare(`UPDATE users SET expert_salon = ? WHERE id = ?`);

// 프로필 수정: 전문가의 직장명(근무 살롱). 전문가 목록·프로필에 공개된다.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!user.isExpert) return forbidden("직장명은 승인된 전문가만 표시할 수 있어요");
  const b = await req.json().catch(() => ({}));
  const salon = String(b.salon ?? "").trim().slice(0, 60);
  if (salon.length < 2) return Response.json({ error: "직장명을 2자 이상 적어주세요" }, { status: 400 });
  setSalon.run(salon, user.id);
  return Response.json({ ok: true, salon });
}
