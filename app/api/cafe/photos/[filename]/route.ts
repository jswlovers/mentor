import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/server/db";
import { cafeUploads } from "@/lib/server/cafe";
import { boardAccess } from "@/lib/server/cafeServices";
import { getUser } from "@/lib/server/http";
export async function GET(req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^cf-[0-9a-f-]{36}\.(jpg|png|webp)$/.test(filename)) return new Response(null,{ status:404 });
  if (!db.prepare("SELECT 1 FROM cafe_images i JOIN cafe_posts p ON p.id=i.post_id WHERE i.filename=? AND p.deleted_at IS NULL").get(filename)) return new Response(null,{ status:404 });
  const post=db.prepare("SELECT p.board FROM cafe_images i JOIN cafe_posts p ON p.id=i.post_id WHERE i.filename=?").get(filename) as {board:string};
  if(!boardAccess(post.board,getUser(req)))return new Response(null,{status:404});
  const file = path.join(cafeUploads(),filename);
  if (!fs.existsSync(file)) return new Response(null,{ status:404 });
  const mime: Record<string,string> = { ".jpg":"image/jpeg", ".png":"image/png", ".webp":"image/webp" };
  return new Response(new Uint8Array(fs.readFileSync(file)), { headers: { "Content-Type":mime[path.extname(filename)], "X-Content-Type-Options":"nosniff", "Cache-Control":"no-store" } });
}
