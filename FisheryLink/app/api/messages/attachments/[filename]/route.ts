import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, db } from "@/lib/server/db";
import { getConsultation, roleOf } from "@/lib/server/consult";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";

const findStmt = db.prepare(`SELECT attachment_name, room_id FROM messages WHERE attachment_url = ?`);
const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp",
  ".pdf": "application/pdf", ".txt": "text/plain",
};

// 헤더 인증이 필요하므로 <img src>로 직접 못 쓰고, 클라이언트가 fetch → blob 으로 불러온다.
export async function GET(req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const filename = path.basename((await params).filename);
  const row = findStmt.get(`/api/messages/attachments/${filename}`) as { attachment_name: string; room_id: string } | undefined;
  const c = row && getConsultation(row.room_id);
  if (c && roleOf(c, user) === "viewer" && !user.isAdmin) return forbidden();
  const filePath = path.join(DATA_DIR, "uploads", filename);
  if (!row || !fs.existsSync(filePath)) return new Response(null, { status: 404 });
  const ext = path.extname(filename).toLowerCase();
  return new Response(new Uint8Array(fs.readFileSync(filePath)), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.attachment_name)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
