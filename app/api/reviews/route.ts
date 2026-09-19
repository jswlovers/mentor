import { getConsultation, isValidRoomId } from "@/lib/server/consult";
import { db } from "@/lib/server/db";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";

const existing = db.prepare(`SELECT 1 AS x FROM reviews WHERE room_id = ?`);
const insert = db.prepare(`INSERT INTO reviews (room_id, expert_id, asker_id, asker_name, rating, comment) VALUES (?, ?, ?, ?, ?, ?)`);

// 상담 후기: 종료된 상담을 마친 질문자가 상담당 1건. 전문가가 배정된 상담만.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { roomId, rating, comment } = await req.json().catch(() => ({}));
  if (!isValidRoomId(roomId)) return Response.json({ error: "상담 정보를 확인해주세요" }, { status: 400 });
  const c = getConsultation(roomId);
  if (!c || !c.expert_id) return Response.json({ error: "후기를 남길 수 있는 상담이 아니에요" }, { status: 404 });
  if (c.asker_id !== user.id) return forbidden("상담을 신청한 질문자만 후기를 남길 수 있어요");
  if (c.status !== "ended") return Response.json({ error: "상담이 종료된 뒤에 남길 수 있어요" }, { status: 409 });
  const stars = Math.floor(Number(rating));
  if (!(stars >= 1 && stars <= 5)) return Response.json({ error: "별점은 1~5점으로 선택해주세요" }, { status: 400 });
  if (existing.get(roomId)) return Response.json({ error: "이미 후기를 남겼어요" }, { status: 409 });
  insert.run(roomId, c.expert_id, user.id, user.name, stars, String(comment ?? "").trim().slice(0, 300) || null);
  notify(c.expert_id, `${user.name}님이 별점 ${stars}점 후기를 남겼어요`, `/experts/${c.expert_id}`);
  return Response.json({ ok: true }, { status: 201 });
}
