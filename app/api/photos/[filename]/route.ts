import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, db } from "@/lib/server/db";

const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };
const findStmt = db.prepare(`SELECT 1 AS x FROM question_images WHERE url = ?`);

// 질문 사진은 질문과 같이 공개된다(질문 목록이 공개이므로).
export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const filename = path.basename((await params).filename);
  if (!findStmt.get(`/api/photos/${filename}`)) return new Response(null, { status: 404 });
  const file = path.join(DATA_DIR, "uploads", filename);
  if (!fs.existsSync(file)) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(file)), {
    headers: { "Content-Type": MIME[path.extname(filename).toLowerCase()] ?? "application/octet-stream", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=3600" },
  });
}
