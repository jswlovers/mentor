import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { DATA_DIR, db } from "@/lib/server/db";
import { getConsultation, roleOf } from "@/lib/server/consult";
import { forbidden, getUser, unauthorized } from "@/lib/server/http";

const findStmt = db.prepare(`SELECT attachment_name, room_id FROM messages WHERE attachment_url = ?`);
const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp",
  ".pdf": "application/pdf", ".txt": "text/plain",
  ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm",
};

// 같은 출처 세션 쿠키로 인증한다. 영상은 탐색·iOS 재생을 위해 Range 요청(206)을 지원한다.
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
  const size = fs.statSync(filePath).size;
  const headers: Record<string, string> = {
    "Content-Type": MIME[ext] ?? "application/octet-stream",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.attachment_name)}`,
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    // "bytes=a-b", "bytes=a-", "bytes=-n"(끝에서 n바이트)
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const stream = Readable.toWeb(fs.createReadStream(filePath, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  const stream = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(size) } });
}
