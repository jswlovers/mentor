import { db } from "@/lib/server/db";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";
import { photoUrl } from "@/lib/server/photo";
import { createSalon, deleteSalon, getMembership, listMembers, newInviteCode, ROLES } from "@/lib/server/salon";

const renameStmt = db.prepare(`UPDATE salons SET name = ? WHERE id = ?`);
const codeStmt = db.prepare(`UPDATE salons SET invite_code = ? WHERE id = ?`);
const cleanName = (v: unknown) => String(v ?? "").trim().slice(0, 40);

// 내 매장: 소속이 없으면 { salon: null }. 초대 코드는 원장에게만 보여준다.
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const m = getMembership(user.id);
  if (!m) return Response.json({ salon: null });
  return Response.json({
    salon: {
      id: m.salonId,
      name: m.salonName,
      myRole: m.role,
      inviteCode: m.role === "owner" ? m.inviteCode : null,
      members: listMembers(m.salonId).map((x) => ({ id: x.id, name: x.name, role: x.role, roleLabel: ROLES[x.role], isExpert: x.expert_status === "approved", photoUrl: photoUrl(x.id, x.photo), joinedAt: x.joined_at })),
    },
  });
}

// 매장 만들기: 만든 사람이 원장이 된다
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (getMembership(user.id)) return Response.json({ error: "이미 소속된 매장이 있어요. 먼저 매장에서 나가주세요" }, { status: 409 });
  const name = cleanName((await req.json().catch(() => ({}))).name);
  if (name.length < 2) return Response.json({ error: "매장 이름을 2자 이상 적어주세요" }, { status: 400 });
  return Response.json({ id: createSalon(user.id, name) }, { status: 201 });
}

// 원장: 이름 바꾸기 { name } / 초대 코드 새로 만들기 { regenerateCode: true } (이전 코드는 더 이상 못 쓴다)
export async function PATCH(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const m = getMembership(user.id);
  if (!m) return Response.json({ error: "소속된 매장이 없어요" }, { status: 404 });
  if (m.role !== "owner") return forbidden("원장만 바꿀 수 있어요");
  const b = await req.json().catch(() => ({}));
  if (b.name !== undefined) {
    const name = cleanName(b.name);
    if (name.length < 2) return Response.json({ error: "매장 이름을 2자 이상 적어주세요" }, { status: 400 });
    renameStmt.run(name, m.salonId);
  }
  if (b.regenerateCode) codeStmt.run(newInviteCode(), m.salonId);
  return Response.json({ ok: true });
}

// 원장: 매장 삭제(피드·일정·공지 모두 삭제)
export async function DELETE(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const m = getMembership(user.id);
  if (!m) return Response.json({ error: "소속된 매장이 없어요" }, { status: 404 });
  if (m.role !== "owner") return forbidden("원장만 매장을 삭제할 수 있어요");
  deleteSalon(m.salonId);
  return Response.json({ ok: true });
}
