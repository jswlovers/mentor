import { db } from "@/lib/server/db";
import { getUser, unauthorized } from "@/lib/server/http";
import { EVENT_KINDS, getMembership, isEventKind, isHHMM, listEvents, memberIds, notifySalon, validDate } from "@/lib/server/salon";

const insertStmt = db.prepare(`INSERT INTO salon_events (salon_id, author_id, member_id, kind, date, start_time, end_time, title) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
const notMember = () => Response.json({ error: "소속된 매장이 없어요" }, { status: 404 });

// 매장 공유 일정: ?month=YYYY-MM
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const m = getMembership(user.id);
  if (!m) return notMember();
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return Response.json({ error: "month는 YYYY-MM 형식이어야 해요" }, { status: 400 });
  return Response.json({ events: listEvents(m.salonId, `${month}-01`, `${month}-31`) }, { headers: { "Cache-Control": "private, no-store" } });
}

// 일정 추가: { kind: work|off|edu|event, date, startTime?, endTime?, title?, memberId? }
// 근무·휴무는 대상 직원(기본: 나)을 정하고, 다른 직원 것은 원장만 넣을 수 있다. 교육·매장 일정은 모두에게 알린다.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const m = getMembership(user.id);
  if (!m) return notMember();
  const b = await req.json().catch(() => ({}));
  if (!isEventKind(b.kind)) return Response.json({ error: "일정 종류가 올바르지 않아요" }, { status: 400 });
  if (!validDate(b.date)) return Response.json({ error: "날짜가 올바르지 않아요" }, { status: 400 });
  const start = b.startTime ? String(b.startTime) : null, end = b.endTime ? String(b.endTime) : null;
  if ((start && !isHHMM(start)) || (end && !isHHMM(end))) return Response.json({ error: "시간은 HH:MM 형식이어야 해요" }, { status: 400 });
  if (start && end && end <= start) return Response.json({ error: "끝나는 시간이 시작 시간보다 늦어야 해요" }, { status: 400 });
  const title = String(b.title ?? "").trim().slice(0, 60);
  const personal = b.kind === "work" || b.kind === "off";
  let memberId: string | null = null;
  if (personal) {
    memberId = b.memberId ? String(b.memberId) : user.id;
    if (!memberIds(m.salonId).includes(memberId)) return Response.json({ error: "이 매장 직원이 아니에요" }, { status: 400 });
    if (memberId !== user.id && m.role !== "owner") return Response.json({ error: "다른 직원의 근무·휴무는 원장만 넣을 수 있어요" }, { status: 403 });
  } else if (!title) return Response.json({ error: "일정 제목을 적어주세요" }, { status: 400 });
  const id = Number(insertStmt.run(m.salonId, user.id, memberId, b.kind, b.date, start, end, title).lastInsertRowid);
  if (!personal) notifySalon(m.salonId, user.id, `[${EVENT_KINDS[b.kind as "edu" | "event"]}] ${b.date.slice(5).replace("-", "/")} ${title}`, `/salon?tab=calendar&date=${b.date}`);
  return Response.json({ id }, { status: 201 });
}
