import { getUser, unauthorized } from "@/lib/server/http";
import { loadDay, MAX_DIARY_CHARS, removeDay, saveBody, validDate } from "@/lib/server/diary";

type Ctx = { params: Promise<{ date: string }> };
const noStore = { "Cache-Control": "private, no-store" };
const badDate = () => Response.json({ error: "날짜는 YYYY-MM-DD 형식이어야 해요" }, { status: 400 });

export async function GET(req: Request, { params }: Ctx) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { date } = await params;
  if (!validDate(date)) return badDate();
  return Response.json(loadDay(user.id, date), { headers: noStore });
}

// 그날의 본문 저장(전체 교체). 사진은 /photos 로 따로 올린다.
export async function PUT(req: Request, { params }: Ctx) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { date } = await params;
  if (!validDate(date)) return badDate();
  const { body } = await req.json().catch(() => ({}));
  if (typeof body !== "string") return Response.json({ error: "내용을 입력해주세요" }, { status: 400 });
  if ([...body].length > MAX_DIARY_CHARS) return Response.json({ error: `일기는 ${MAX_DIARY_CHARS}자까지 쓸 수 있어요` }, { status: 400 });
  return Response.json(saveBody(user.id, date, body), { headers: noStore });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { date } = await params;
  if (!validDate(date)) return badDate();
  removeDay(user.id, date);
  return Response.json({ ok: true }, { headers: noStore });
}
