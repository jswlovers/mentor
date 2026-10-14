import fs from 'node:fs';
import path from 'node:path';
import { db } from '@/lib/server/db';
import { getUser,unauthorized,forbidden,limited } from '@/lib/server/http';
import { cafeUploads,cafeError,cafeJson } from '@/lib/server/cafe';
import { boardAccess } from '@/lib/server/cafeServices';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const row=db.prepare('SELECT a.*,p.board,p.deleted_at FROM cafe_attachments a JOIN cafe_posts p ON p.id=a.post_id WHERE a.id=?').get(Number(id)||0) as {filename:string;name:string;mime:string;board:string;deleted_at:string|null}|undefined;
 if(!row||row.deleted_at||!boardAccess(row.board,getUser(req)))return new Response(null,{status:404});
 const file=path.join(cafeUploads(),row.filename);if(!fs.existsSync(file))return new Response(null,{status:404});
 return new Response(new Uint8Array(fs.readFileSync(file)),{headers:{'Content-Type':row.mime,'Content-Disposition':`${row.mime.startsWith('video/')?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(row.name)}`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});
}
export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){
 const user=getUser(req);if(!user)return unauthorized();
 if(limited(`cafe-file-delete:${user.id}`,60000,30))return cafeError('잠시 후 다시 시도해주세요',429);
 const {id}=await params;const row=db.prepare('SELECT a.id,p.author_id FROM cafe_attachments a JOIN cafe_posts p ON p.id=a.post_id WHERE a.id=? AND p.deleted_at IS NULL').get(Number(id)||0) as {id:number;author_id:string}|undefined;
 if(!row)return cafeError('첨부파일을 찾을 수 없어요',404);if(row.author_id!==user.id&&!user.isAdmin)return forbidden();
 db.prepare('DELETE FROM cafe_attachments WHERE id=?').run(row.id);return cafeJson({ok:true});
}
