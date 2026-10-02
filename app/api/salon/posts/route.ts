import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getUser, unauthorized } from "@/lib/server/http";
import { createPost, getMembership, listPosts, MAX_PHOTO_BYTES, MAX_POST_PHOTOS, notifySalon, PHOTO_EXT, uploadsDir } from "@/lib/server/salon";

const notMember = () => Response.json({ error: "소속된 매장이 없어요" }, { status: 404 });

// 매장 작업물 피드(같은 매장 사람만): ?before=마지막 글 id
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const m = getMembership(user.id);
  if (!m) return notMember();
  const before = Math.max(Number(new URL(req.url).searchParams.get("before")) || 0, 0);
  return Response.json(listPosts(m.salonId, before), { headers: { "Cache-Control": "private, no-store" } });
}

// 작업물 올리기: FormData { body, photos(여러 장, 최대 5장) }. 글이나 사진 중 하나는 있어야 한다.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const m = getMembership(user.id);
  if (!m) return notMember();
  const form = await req.formData().catch(() => null);
  const body = String(form?.get("body") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 1000); // FormData는 줄바꿈을 \r\n으로 보낸다
  const files = (form?.getAll("photos") ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  if (!body && files.length === 0) return Response.json({ error: "사진이나 글을 넣어주세요" }, { status: 400 });
  if (files.length > MAX_POST_PHOTOS) return Response.json({ error: `사진은 최대 ${MAX_POST_PHOTOS}장까지 올릴 수 있어요` }, { status: 400 });
  for (const f of files) {
    if (!PHOTO_EXT[f.type]) return Response.json({ error: "JPG·PNG·WEBP 사진만 올릴 수 있어요" }, { status: 400 });
    if (f.size > MAX_PHOTO_BYTES) return Response.json({ error: "사진은 한 장에 5MB 이하만 올릴 수 있어요" }, { status: 400 });
  }
  fs.mkdirSync(uploadsDir(), { recursive: true });
  const names: string[] = [];
  for (const f of files) {
    const name = `sp-${crypto.randomUUID()}${PHOTO_EXT[f.type]}`;
    fs.writeFileSync(path.join(uploadsDir(), name), Buffer.from(await f.arrayBuffer()));
    names.push(name);
  }
  const id = createPost(m.salonId, user.id, body, names);
  notifySalon(m.salonId, user.id, `${user.name}님이 매장 피드에 작업물을 올렸어요`, "/salon");
  return Response.json({ id }, { status: 201 });
}
