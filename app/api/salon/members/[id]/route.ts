import { db } from "@/lib/server/db";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";
import { getMembership, isRole, removeMember, ROLES } from "@/lib/server/salon";

type Ctx = { params: Promise<{ id: string }> };
const setRole = db.prepare(`UPDATE salon_members SET role = ? WHERE salon_id = ? AND user_id = ?`);

/** 원장 본인과, 같은 매장의 대상 직원(본인 제외)을 확인한다. */
async function ownerAndTarget(req: Request, ctx: Ctx) {
  const user = getUser(req);
  if (!user) return { error: unauthorized() };
  const m = getMembership(user.id);
  if (!m || m.role !== "owner") return { error: forbidden("원장만 직원을 관리할 수 있어요") };
  const targetId = (await ctx.params).id;
  const t = getMembership(targetId);
  if (targetId === user.id || !t || t.salonId !== m.salonId) return { error: Response.json({ error: "이 매장 직원이 아니에요" }, { status: 404 }) };
  return { user, m, targetId };
}

// 원장: 직급 바꾸기 { role: designer|intern|owner }. owner로 바꾸면 원장을 넘기고 나는 디자이너가 된다.
export async function PATCH(req: Request, ctx: Ctx) {
  const r = await ownerAndTarget(req, ctx);
  if (r.error) return r.error;
  const role = (await req.json().catch(() => ({}))).role;
  if (!isRole(role)) return Response.json({ error: "직급이 올바르지 않아요" }, { status: 400 });
  db.exec("BEGIN");
  try {
    setRole.run(role, r.m.salonId, r.targetId);
    if (role === "owner") setRole.run("designer", r.m.salonId, r.user.id);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  notify(r.targetId, role === "owner" ? `${r.m.salonName}의 원장이 되었어요` : `${r.m.salonName}에서 직급이 ${ROLES[role]}(으)로 바뀌었어요`, "/salon?tab=members");
  return Response.json({ ok: true });
}

// 원장: 직원 내보내기(그 직원이 올린 작업물은 매장에서 지워진다)
export async function DELETE(req: Request, ctx: Ctx) {
  const r = await ownerAndTarget(req, ctx);
  if (r.error) return r.error;
  removeMember(r.m.salonId, r.targetId);
  notify(r.targetId, `${r.m.salonName}에서 내보내졌어요`, "/salon");
  return Response.json({ ok: true });
}
