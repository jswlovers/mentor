import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, db } from "@/lib/server/db";
import "@/lib/server/experts"; // expert_portfolio 테이블 생성

const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const stmt = db.prepare(`
  SELECT p.filename FROM expert_portfolio p JOIN users u ON u.id = p.user_id
  WHERE p.id = ? AND u.expert_status = 'approved' AND u.suspended_at IS NULL`);

// 전문가 작업 사진(공개). 승인되고 정지되지 않은 전문가 것만 내보낸다. 사진은 지우면 id가 다시 쓰이지 않으므로 오래 캐시해도 된다.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const row = stmt.get(Number((await params).id)) as { filename: string } | undefined;
  if (!row) return new Response(null, { status: 404 });
  const file = path.join(DATA_DIR, "uploads", path.basename(row.filename));
  if (!fs.existsSync(file)) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(file)), {
    headers: { "Content-Type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream", "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=86400" },
  });
}
