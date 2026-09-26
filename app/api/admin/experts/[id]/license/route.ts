import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/server/db";
import { LICENSE_DIR, LICENSE_MIME } from "@/lib/server/expertLicense";
import { forbidden, getAdmin } from "@/lib/server/http";

const fileStmt = db.prepare(`SELECT expert_license_file FROM users WHERE id = ?`);

// 전문가 신청자의 면허증 사진. 관리자만 볼 수 있고 캐시하지 않는다.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!getAdmin(req)) return forbidden();
  const { id } = await params;
  const name = (fileStmt.get(id) as { expert_license_file: string | null } | undefined)?.expert_license_file;
  if (!name) return new Response(null, { status: 404 });
  const file = path.join(LICENSE_DIR, path.basename(name));
  if (!fs.existsSync(file)) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(file)), {
    headers: { "Content-Type": LICENSE_MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" },
  });
}
