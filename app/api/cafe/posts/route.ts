import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/server/db";
import { getUser, limited, unauthorized, forbidden } from "@/lib/server/http";
import { cafeError, cafeJson, cafeUploads, listCafePosts, validateCafePost } from "@/lib/server/cafe";
import { boardAccess, safePost } from "@/lib/server/cafeServices";
import { CAFE_BOARDS } from "@/lib/cafe";

export async function GET(req: Request) {
  const user = getUser(req);
  const sp = new URL(req.url).searchParams;
  if (["mine", "saved"].includes(sp.get("scope") || "") && !user) return unauthorized();
  const excluded=CAFE_BOARDS.filter(b=>!boardAccess(b.slug,user)).map(b=>b.slug);
  if(excluded.includes(sp.get('board') as typeof excluded[number]))return forbidden("해당 게시판은 직급 또는 회원 등급에 맞는 회원만 이용할 수 있어요");
  try { const result=listCafePosts(sp,user?.id,excluded);return cafeJson({...result,items:result.items.map(p=>safePost(p,user))}); } catch (e) { return cafeError((e as Error).message); }
}

const extensions: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
function validImage(bytes: Buffer, type: string) {
  if (type === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/png") return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  return bytes.subarray(0,4).toString() === "RIFF" && bytes.subarray(8,12).toString() === "WEBP";
}
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (limited(`cafe-post:${user.id}`, 3600000, 30)) return cafeError("글 등록이 너무 많아요. 잠시 후 다시 시도해주세요", 429);
  if (Number(req.headers.get("content-length") || 0) > 17 * 1024 * 1024) return cafeError("첨부 용량이 너무 커요", 413);
  const form = await req.formData().catch(() => null);
  if (!form) return cafeError("글 내용을 다시 확인해주세요");
  let post;
  try { post = validateCafePost({ board: form.get("board"), title: form.get("title"), body: form.get("body"), details: JSON.parse(String(form.get("details") || "{}")) }); }
  catch (e) { return cafeError((e as Error).message); }
  if (post.board === "notice" && !user.isAdmin) return forbidden("공지사항은 관리자만 작성할 수 있어요");
  if(!boardAccess(post.board,user))return forbidden("해당 게시판의 이용 권한이 없어요");
  let pollOptions:string[]=[];
  if(post.board==='poll') {
    try { const raw=JSON.parse(String(form.get('pollOptions')||'[]'));if(!Array.isArray(raw))throw new Error();pollOptions=raw.map((v:unknown)=>String(v).trim()); }catch{return cafeError("설문 선택지를 확인해주세요");}
    if(pollOptions.length<2||pollOptions.length>8||pollOptions.some(v=>!v||v.length>100)||new Set(pollOptions).size!==pollOptions.length)return cafeError("서로 다른 선택지 2~8개를 입력해주세요 (각 100자 이하)");
  }
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 3) return cafeError("사진은 최대 3장까지 올릴 수 있어요");
  const uploads: { name: string; bytes: Buffer }[] = [];
  for (const file of files) {
    if (!extensions[file.type] || file.size > 5 * 1024 * 1024) return cafeError("사진은 JPG·PNG·WEBP, 한 장에 5MB 이하로 올려주세요");
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!validImage(bytes, file.type)) return cafeError("사진 파일 형식이 올바르지 않아요");
    uploads.push({ name: `cf-${crypto.randomUUID()}${extensions[file.type]}`, bytes });
  }
  fs.mkdirSync(cafeUploads(), { recursive: true });
  const written: string[] = [];
  try {
    for (const file of uploads) { fs.writeFileSync(path.join(cafeUploads(), file.name), file.bytes); written.push(file.name); }
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = db.prepare("INSERT INTO cafe_posts(board,title,body,author_id,details,pinned) VALUES(?,?,?,?,?,?)").run(post.board,post.title,post.body,user.id,JSON.stringify(post.details), post.board === "notice" ? 1 : 0);
      const id = Number(result.lastInsertRowid);
      for (const file of uploads) db.prepare("INSERT INTO cafe_images(filename,post_id) VALUES(?,?)").run(file.name,id);
      for(const label of pollOptions)db.prepare("INSERT INTO cafe_poll_options(post_id,label) VALUES(?,?)").run(id,label);
      db.exec("COMMIT");
      const followers=db.prepare("SELECT user_id FROM cafe_follows WHERE board=? AND user_id!=?").all(post.board,user.id) as {user_id:string}[];
      const {notify}=await import('@/lib/server/notify');
      for(const follower of followers)notify(follower.user_id,`${post.board==='anonymous'?'익명 회원':user.name}님이 새 글을 올렸어요`, `/cafe/posts/${id}`);
      return cafeJson({ id }, 201);
    } catch (e) { db.exec("ROLLBACK"); throw e; }
  } catch {
    for (const name of written) fs.rmSync(path.join(cafeUploads(),name), { force: true });
    return cafeError("글을 저장하지 못했어요. 다시 시도해주세요", 500);
  }
}
