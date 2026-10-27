import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, db } from "@/lib/server/db";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";

const MAX_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
const qStmt = db.prepare(`SELECT asker_id FROM questions WHERE id = ?`);
const countStmt = db.prepare(`SELECT COUNT(*) AS n FROM question_images WHERE question_id = ?`);
const insertStmt = db.prepare(`INSERT INTO question_images (question_id, url) VALUES (?, ?)`);

// 질문 사진 첨부: 질문 작성자만, 최대 3장, 이미지 5MB 이하. 고객 얼굴이 나오지 않게 안내한다(화면).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const q = qStmt.get(id) as { asker_id: string } | undefined;
  if (!q) return Response.json({ error: "질문을 찾을 수 없어요" }, { status: 404 });
  if (q.asker_id !== user.id) return forbidden();
  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("photos") ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return Response.json({ error: "사진을 선택해주세요" }, { status: 400 });
  if ((countStmt.get(id) as { n: number }).n + files.length > MAX_PHOTOS) {
    return Response.json({ error: `사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요` }, { status: 400 });
  }
  for (const f of files) {
    if (!EXT[f.type]) return Response.json({ error: "JPG·PNG·WEBP·GIF 사진만 올릴 수 있어요" }, { status: 400 });
    if (f.size > MAX_BYTES) return Response.json({ error: "사진은 장당 5MB 이하만 올릴 수 있어요" }, { status: 400 });
  }
  const dir = path.join(DATA_DIR, "uploads");
  fs.mkdirSync(dir, { recursive: true });
  for (const f of files) {
    const name = `qp-${crypto.randomUUID()}${EXT[f.type]}`;
    fs.writeFileSync(path.join(dir, name), Buffer.from(await f.arrayBuffer()));
    insertStmt.run(id, `/api/photos/${name}`);
  }
  return Response.json({ ok: true }, { status: 201 });
}
