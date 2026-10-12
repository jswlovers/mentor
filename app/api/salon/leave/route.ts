import { getUser, unauthorized } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";
import { deleteSalon, getMembership, memberIds, removeMember, salonOwner } from "@/lib/server/salon";

// 매장에서 나가기. 내가 올린 작업물은 매장에서 지워진다.
// 원장은 다른 직원이 있으면 먼저 원장을 넘겨야 하고, 혼자 남았으면 나가는 순간 매장이 삭제된다.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const m = getMembership(user.id);
  if (!m) return Response.json({ error: "소속된 매장이 없어요" }, { status: 404 });
  if (m.role === "owner") {
    if (memberIds(m.salonId).length > 1) return Response.json({ error: "다른 직원에게 원장을 넘긴 뒤 나갈 수 있어요" }, { status: 409 });
    deleteSalon(m.salonId);
    return Response.json({ ok: true, deleted: true });
  }
  removeMember(m.salonId, user.id);
  notify(salonOwner(m.salonId), `${user.name}님이 ${m.salonName}에서 나갔어요`, "/salon?tab=members");
  return Response.json({ ok: true });
}
