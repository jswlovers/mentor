import { db } from "@/lib/server/db";
import { forbidden, getAdmin } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";

const setStatus = db.prepare(`UPDATE users SET expert_status = ? WHERE id = ? AND expert_status = 'pending'`);

export async function POST(req: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  if (!getAdmin(req)) return forbidden();
  const { id, action } = await params;
  if (action !== "approve" && action !== "reject") return Response.json({ error: "알 수 없는 처리예요" }, { status: 400 });
  const res = setStatus.run(action === "approve" ? "approved" : "rejected", id);
  if (Number(res.changes) === 0) return Response.json({ error: "검토 대기 중인 신청이 아니에요" }, { status: 409 });
  notify(id, action === "approve" ? "전문가로 승인됐어요. 이제 상담에 참여할 수 있어요" : "전문가 신청이 반려됐어요. 내용을 보완해 다시 신청해주세요", "/expert", { kind: action === "approve" ? "expert_approved" : "expert_rejected" });
  return Response.json({ ok: true });
}
