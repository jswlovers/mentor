import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, db } from "@/lib/server/db";
import { PORTFOLIO_MAX, portfolioUrl } from "@/lib/server/experts";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";

const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const dir = path.join(DATA_DIR, "uploads");
const listStmt = db.prepare(`SELECT id, caption FROM expert_portfolio WHERE user_id = ? ORDER BY id DESC`);
const countStmt = db.prepare(`SELECT COUNT(*) AS n FROM expert_portfolio WHERE user_id = ?`);
const insertStmt = db.prepare(`INSERT INTO expert_portfolio (user_id, filename, caption) VALUES (?, ?, ?)`);
const findStmt = db.prepare(`SELECT filename FROM expert_portfolio WHERE id = ? AND user_id = ?`);
const deleteStmt = db.prepare(`DELETE FROM expert_portfolio WHERE id = ? AND user_id = ?`);

const mine = (userId: string) => (listStmt.all(userId) as { id: number; caption: string | null }[]).map((p) => ({ ...p, url: portfolioUrl(p.id) }));

// 전문가 포트폴리오(작업 사진, 공개). 본인 것만 보고 올리고 지울 수 있다.
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!user.isExpert) return forbidden("승인된 전문가만 쓸 수 있어요");
  return Response.json({ items: mine(user.id), max: PORTFOLIO_MAX });
}

export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!user.isExpert) return forbidden("승인된 전문가만 쓸 수 있어요");
  if ((countStmt.get(user.id) as { n: number }).n >= PORTFOLIO_MAX) return Response.json({ error: `작업 사진은 최대 ${PORTFOLIO_MAX}장까지 올릴 수 있어요` }, { status: 400 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "사진을 선택해주세요" }, { status: 400 });
  if (!EXT[file.type]) return Response.json({ error: "JPG·PNG·WEBP 사진만 올릴 수 있어요" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "사진은 5MB 이하만 올릴 수 있어요" }, { status: 400 });
  const caption = String(form?.get("caption") ?? "").trim().slice(0, 60) || null;
  fs.mkdirSync(dir, { recursive: true });
  const name = `pf-${crypto.randomUUID()}${EXT[file.type]}`;
  fs.writeFileSync(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  insertStmt.run(user.id, name, caption);
  return Response.json({ items: mine(user.id) }, { status: 201 });
}

// ?id=사진 id
export async function DELETE(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const id = Number(new URL(req.url).searchParams.get("id"));
  const row = findStmt.get(id, user.id) as { filename: string } | undefined;
  if (!row) return Response.json({ error: "사진을 찾을 수 없어요" }, { status: 404 });
  deleteStmt.run(id, user.id);
  fs.rmSync(path.join(dir, path.basename(row.filename)), { force: true });
  return Response.json({ items: mine(user.id) });
}
