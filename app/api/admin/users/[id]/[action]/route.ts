import { db } from "@/lib/server/db";
import crypto from "node:crypto";
import { forbidden, getAdmin, hashPassword } from "@/lib/server/http";

// suspend: 이용 정지(세션 삭제) / unsuspend: 정지 해제
export async function POST(req: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const admin = getAdmin(req);
  if (!admin) return forbidden();
  const { id, action } = await params;
  if (id === admin.id) return Response.json({ error: "본인 계정은 변경할 수 없어요" }, { status: 400 });
  if (action === "suspend") {
    db.prepare(`UPDATE users SET suspended_at = datetime('now'), suspended_reason = '관리자 정지' WHERE id = ? AND role != 'admin'`).run(id);
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(id);
  } else if (action === "unsuspend") {
    db.prepare(`UPDATE users SET suspended_at = NULL, suspended_reason = NULL WHERE id = ?`).run(id);
  } else if (action === "reset-password") {
    // 임시 비밀번호를 발급하고 기존 로그인을 모두 끊는다. 관리자가 본인 확인 후 회원에게 전달한다.
    const temp = crypto.randomBytes(6).toString("hex");
    db.prepare(`UPDATE users SET pw_hash = ? WHERE id = ?`).run(hashPassword(temp), id);
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(id);
    return Response.json({ ok: true, tempPassword: temp });
  } else {
    return Response.json({ error: "알 수 없는 처리예요" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
