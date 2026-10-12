import fs from "node:fs";
import path from "node:path";
import { getUser, unauthorized } from "@/lib/server/http";
import { getMembership, photoSalon, PHOTO_MIME, uploadsDir } from "@/lib/server/salon";

// 매장 작업물 사진은 같은 매장 사람만 볼 수 있다. 다른 매장 사진·없는 사진은 구분 없이 404.
export async function GET(req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const filename = path.basename((await params).filename);
  const salonId = photoSalon(filename);
  if (!salonId || getMembership(user.id)?.salonId !== salonId) return new Response(null, { status: 404 });
  const file = path.join(uploadsDir(), filename);
  if (!fs.existsSync(file)) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(file)), {
    headers: { "Content-Type": PHOTO_MIME[path.extname(filename).toLowerCase()] ?? "application/octet-stream", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=300" },
  });
}
