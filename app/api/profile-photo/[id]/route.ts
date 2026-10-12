import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, db } from "@/lib/server/db";

const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const stmt = db.prepare(`SELECT photo FROM users WHERE id = ? AND suspended_at IS NULL`);

// 회원 프로필 사진(공개). 주소의 ?v=파일명이 바뀌면 새 사진이므로 오래 캐시해도 된다.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = (stmt.get(id) as { photo: string | null } | undefined)?.photo;
  if (!photo) return new Response(null, { status: 404 });
  const file = path.join(DATA_DIR, "uploads", path.basename(photo));
  if (!fs.existsSync(file)) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(file)), {
    headers: { "Content-Type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream", "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=86400" },
  });
}
