import { db } from "@/lib/server/db";
import { getUser, unauthorized } from "@/lib/server/http";

const apply = db.prepare(`UPDATE users SET expert_status = 'pending', expert_bio = ? WHERE id = ?`);

// 전문가 신청: 소개(경력·자격·전문 분야)를 적어 제출하면 관리자가 검토해 승인한다.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (user.expertStatus === "approved") return Response.json({ error: "이미 승인된 전문가예요" }, { status: 409 });
  if (user.expertStatus === "pending") return Response.json({ error: "검토 중인 신청이 있어요" }, { status: 409 });
  const bio = String((await req.json().catch(() => ({}))).bio ?? "").trim().slice(0, 1000);
  if (bio.length < 20) return Response.json({ error: "경력·자격·전문 분야를 20자 이상 적어주세요" }, { status: 400 });
  apply.run(bio, user.id);
  return Response.json({ ok: true }, { status: 201 });
}
