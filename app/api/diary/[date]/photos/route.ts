import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getUser, unauthorized } from "@/lib/server/http";
import { addPhoto, DIARY_PHOTO_EXT, loadDay, MAX_DIARY_PHOTOS, MAX_DIARY_PHOTO_BYTES, photoCount, uploadsDir, validDate } from "@/lib/server/diary";

// 일기 사진 추가: 본인만, 하루 최대 5장, 장당 5MB, JPG·PNG·WEBP·GIF.
export async function POST(req: Request, { params }: { params: Promise<{ date: string }> }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { date } = await params;
  if (!validDate(date)) return Response.json({ error: "날짜는 YYYY-MM-DD 형식이어야 해요" }, { status: 400 });
  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("photos") ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return Response.json({ error: "사진을 선택해주세요" }, { status: 400 });
  if (photoCount(user.id, date) + files.length > MAX_DIARY_PHOTOS) {
    return Response.json({ error: `사진은 하루에 최대 ${MAX_DIARY_PHOTOS}장까지 올릴 수 있어요` }, { status: 400 });
  }
  for (const f of files) {
    if (!DIARY_PHOTO_EXT[f.type]) return Response.json({ error: "JPG·PNG·WEBP·GIF 사진만 올릴 수 있어요" }, { status: 400 });
    if (f.size > MAX_DIARY_PHOTO_BYTES) return Response.json({ error: "사진은 장당 5MB 이하만 올릴 수 있어요" }, { status: 400 });
  }
  fs.mkdirSync(uploadsDir(), { recursive: true });
  for (const f of files) {
    const name = `diary-${crypto.randomUUID()}${DIARY_PHOTO_EXT[f.type]}`;
    fs.writeFileSync(path.join(uploadsDir(), name), Buffer.from(await f.arrayBuffer()));
    addPhoto(user.id, date, name);
  }
  return Response.json(loadDay(user.id, date), { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
