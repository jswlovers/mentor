import { getConsultation, roleOf } from "@/lib/server/consult";
import { db } from "@/lib/server/db";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";
import { deleteCallRoom } from "@/lib/server/videocall";

const callMsg = db.prepare(`SELECT 1 AS x FROM messages WHERE room_id = ? AND attachment_type = 'call' AND attachment_url = ?`);
const insertEnd = db.prepare(`INSERT OR IGNORE INTO call_ends (call_url, room_id, ended_by) VALUES (?, ?, ?)`);
const insertMsg = db.prepare(`INSERT INTO messages (room_id, sender_id, sender_name, body) VALUES (?, ?, ?, ?)`);

// 통화 종료: 한쪽이 끊으면 기록해 두고, 상대 쪽은 tick 응답으로 곧바로 종료된다. Daily 방도 삭제한다.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { roomId, url } = await req.json().catch(() => ({}));
  const c = getConsultation(String(roomId ?? ""));
  if (!c || roleOf(c, user) === "viewer") return forbidden();
  if (!callMsg.get(c.room_id, String(url ?? ""))) return Response.json({ error: "통화 정보를 찾을 수 없어요" }, { status: 404 });

  const res = insertEnd.run(String(url), c.room_id, user.id);
  if (Number(res.changes) > 0) {
    insertMsg.run(c.room_id, user.id, user.name, "📴 통화가 종료됐어요");
    await deleteCallRoom(String(url));
  }
  return Response.json({ ok: true });
}
