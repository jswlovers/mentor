import { cancelAndRefund, claimExpert, getConsultation, roleOf } from "@/lib/server/consult";
import { getBalance } from "@/lib/server/coins";
import { db } from "@/lib/server/db";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";

const endStmt = db.prepare(`UPDATE consultations SET status = ?, ended_at = datetime('now') WHERE room_id = ? AND status = 'open'`);

// join: 승인된 전문가가 상담에 참여 / end: 상담 종료 / cancel: 전문가 배정 전 취소(전액 환불)
export async function POST(req: Request, { params }: { params: Promise<{ roomId: string; action: string }> }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { roomId, action } = await params;
  const c = getConsultation(roomId);
  if (!c) return Response.json({ error: "상담을 찾을 수 없어요" }, { status: 404 });
  if (c.status !== "open") return Response.json({ error: "이미 종료된 상담이에요" }, { status: 409 });

  if (action === "join") {
    if (!user.isExpert) return forbidden("승인된 전문가만 참여할 수 있어요");
    db.exec("BEGIN");
    try {
      if (!claimExpert(c, user)) {
        db.exec("ROLLBACK");
        return Response.json({ error: "이미 다른 전문가가 참여 중이에요" }, { status: 409 });
      }
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
    notify(c.asker_id, `${user.name} 전문가가 상담에 참여했어요`, `/chat/${roomId}`, { kind: "expert_joined", vars: { expert: user.name } });
    return Response.json({ ok: true });
  }

  if (action === "end") {
    if (roleOf(c, user) === "viewer") return forbidden();
    endStmt.run("ended", roomId);
    notify(user.id === c.asker_id ? c.expert_id : c.asker_id, `${user.name}님이 상담을 종료했어요`, `/chat/${roomId}`);
    return Response.json({ ok: true });
  }

  if (action === "cancel") {
    if (c.asker_id !== user.id) return forbidden("상담을 신청한 질문자만 취소할 수 있어요");
    if (c.expert_id) return Response.json({ error: "전문가가 참여한 상담은 취소할 수 없어요. 문제가 있으면 고객센터로 문의해주세요" }, { status: 409 });
    db.exec("BEGIN");
    try {
      cancelAndRefund(c, "상담 취소 환불");
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
    return Response.json({ ok: true, coins: getBalance(user.id) });
  }

  return Response.json({ error: "알 수 없는 요청이에요" }, { status: 400 });
}
