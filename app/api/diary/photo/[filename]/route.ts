import fs from "node:fs";
import path from "node:path";
import { getUser, unauthorized } from "@/lib/server/http";
import { DIARY_PHOTO_MIME, photoOwner, removePhoto, uploadsDir } from "@/lib/server/diary";

type Ctx = { params: Promise<{ filename: string }> };

// 일기 사진은 주인만 볼 수 있다. 남의 사진·없는 사진은 구분 없이 404.
export async function GET(req: Request, { params }: Ctx) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const filename = path.basename((await params).filename);
  if (photoOwner(filename) !== user.id) return new Response(null, { status: 404 });
  const file = path.join(uploadsDir(), filename);
  if (!fs.existsSync(file)) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(file)), {
    headers: {
      "Content-Type": DIARY_PHOTO_MIME[path.extname(filename).toLowerCase()] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const filename = path.basename((await params).filename);
  if (!removePhoto(user.id, filename)) return new Response(null, { status: 404 });
  return Response.json({ ok: true });
}
