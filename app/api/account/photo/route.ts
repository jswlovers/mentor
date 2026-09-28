import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, db } from "@/lib/server/db";
import { getUser, unauthorized } from "@/lib/server/http";
import { photoUrl } from "@/lib/server/photo";

const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const getStmt = db.prepare(`SELECT photo FROM users WHERE id = ?`);
const setStmt = db.prepare(`UPDATE users SET photo = ? WHERE id = ?`);
const dir = path.join(DATA_DIR, "uploads");

const removeOld = (userId: string) => {
  const prev = (getStmt.get(userId) as { photo: string | null } | undefined)?.photo;
  if (prev) fs.rmSync(path.join(dir, path.basename(prev)), { force: true });
};

// 프로필 사진 올리기(교체). 공개되는 사진이라 화면에서 본인 사진만 쓰도록 안내한다.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "사진을 선택해주세요" }, { status: 400 });
  if (!EXT[file.type]) return Response.json({ error: "JPG·PNG·WEBP 사진만 올릴 수 있어요" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "사진은 5MB 이하만 올릴 수 있어요" }, { status: 400 });
  fs.mkdirSync(dir, { recursive: true });
  const name = `pp-${crypto.randomUUID()}${EXT[file.type]}`;
  fs.writeFileSync(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  removeOld(user.id);
  setStmt.run(name, user.id);
  return Response.json({ ok: true, photoUrl: photoUrl(user.id, name) }, { status: 201 });
}

// 프로필 사진 삭제
export async function DELETE(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  removeOld(user.id);
  setStmt.run(null, user.id);
  return Response.json({ ok: true });
}
