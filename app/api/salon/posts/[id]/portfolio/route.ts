import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/server/db";
import { PORTFOLIO_MAX } from "@/lib/server/experts";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";
import { getMembership, getPost, postFiles, uploadsDir } from "@/lib/server/salon";

const countStmt = db.prepare(`SELECT COUNT(*) AS n FROM expert_portfolio WHERE user_id = ?`);
const insertStmt = db.prepare(`INSERT INTO expert_portfolio (user_id, filename, caption) VALUES (?, ?, ?)`);
const bodyStmt = db.prepare(`SELECT body FROM salon_posts WHERE id = ?`);

// 내가 올린 매장 작업물 사진을 공개 포트폴리오(전문가 프로필)로 복사한다. 매장을 나가도 포트폴리오 사진은 남는다.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!user.isExpert) return forbidden("승인된 전문가만 포트폴리오를 쓸 수 있어요");
  const m = getMembership(user.id);
  const post = getPost(Number((await params).id));
  if (!m || !post || post.salon_id !== m.salonId) return Response.json({ error: "글을 찾을 수 없어요" }, { status: 404 });
  if (post.author_id !== user.id) return forbidden("내가 올린 작업물만 보낼 수 있어요");
  const files = postFiles(post.id);
  if (files.length === 0) return Response.json({ error: "사진이 없는 글이에요" }, { status: 400 });
  const room = PORTFOLIO_MAX - (countStmt.get(user.id) as { n: number }).n;
  if (room <= 0) return Response.json({ error: `포트폴리오가 가득 찼어요(최대 ${PORTFOLIO_MAX}장)` }, { status: 400 });
  const caption = (bodyStmt.get(post.id) as { body: string }).body.split(/\r?\n/)[0].trim().slice(0, 60) || null;
  const copied = files.slice(0, room);
  for (const f of copied) {
    const name = `pf-${crypto.randomUUID()}${path.extname(f)}`;
    fs.copyFileSync(path.join(uploadsDir(), path.basename(f)), path.join(uploadsDir(), name));
    insertStmt.run(user.id, name, caption);
  }
  return Response.json({ copied: copied.length, skipped: files.length - copied.length });
}
