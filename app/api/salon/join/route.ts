import { getUser, limited, unauthorized } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";
import { addMember, getMembership, memberIds, salonByCode, salonOwner } from "@/lib/server/salon";

// 코드 맞히기 시도를 막는다(1분에 20번)
const tooMany = (userId: string) => limited(`salon-code:${userId}`, 60_000, 20);

// 초대 코드 확인(들어가기 전에 매장 이름을 보여준다): ?code=ABC234
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (tooMany(user.id)) return Response.json({ error: "잠시 후 다시 시도해주세요" }, { status: 429 });
  const s = salonByCode(new URL(req.url).searchParams.get("code") ?? "");
  if (!s) return Response.json({ error: "초대 코드가 맞지 않아요" }, { status: 404 });
  return Response.json({ name: s.name, memberCount: memberIds(s.id).length });
}

// 초대 코드로 들어가기: { code }. 회원 직급이 인턴이면 인턴, 아니면 디자이너로 들어가고 원장이 바꿀 수 있다.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (tooMany(user.id)) return Response.json({ error: "잠시 후 다시 시도해주세요" }, { status: 429 });
  if (getMembership(user.id)) return Response.json({ error: "이미 소속된 매장이 있어요. 먼저 매장에서 나가주세요" }, { status: 409 });
  const s = salonByCode(String((await req.json().catch(() => ({}))).code ?? ""));
  if (!s) return Response.json({ error: "초대 코드가 맞지 않아요" }, { status: 404 });
  addMember(s.id, user.id, user.position === "인턴" ? "intern" : "designer");
  notify(salonOwner(s.id), `${user.name}님이 ${s.name}에 들어왔어요`, "/salon?tab=members");
  return Response.json({ ok: true, name: s.name }, { status: 201 });
}
