import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '@/lib/server/db';
import { getUser,unauthorized,forbidden,limited } from '@/lib/server/http';
import { cafeUploads,cafeError,cafeJson,getCafePost } from '@/lib/server/cafe';
import { boardAccess,transaction } from '@/lib/server/cafeServices';
const types:Record<string,string>={'application/pdf':'.pdf','video/mp4':'.mp4','video/webm':'.webm','text/plain':'.txt','image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'};
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const user=getUser(req);if(!user)return unauthorized();
 if(limited(`cafe-file:${user.id}`,3600000,20))return cafeError('첨부 요청이 너무 많아요',429);
 const {id}=await params,post=getCafePost(Number(id)||0,user.id);if(!post)return cafeError('글을 찾을 수 없어요',404);
 if((post.author_id!==user.id&&!user.isAdmin)||!boardAccess(post.board,user))return forbidden();
 if(Number(req.headers.get('content-length')||0)>52*1024*1024)return cafeError('파일은 50MB 이하로 올려주세요',413);
 const form=await req.formData().catch(()=>null),file=form?.get('file');if(!(file instanceof File)||!file.size||file.size>50*1024*1024||!types[file.type])return cafeError('PDF·TXT·MP4·WEBM 파일, 최대 50MB를 올려주세요');
 const bytes=Buffer.from(await file.arrayBuffer());
 const valid=file.type==='application/pdf'?bytes.subarray(0,5).toString()==='%PDF-':file.type==='video/mp4'?bytes.subarray(4,8).toString()==='ftyp':file.type==='video/webm'?bytes.subarray(0,4).equals(Buffer.from([26,69,223,163])):file.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:file.type==='image/webp'?bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP':!bytes.includes(0);
 if(!valid)return cafeError('파일 내용과 형식이 일치하지 않아요');
 const filename=`ca-${crypto.randomUUID()}${types[file.type]}`;fs.mkdirSync(cafeUploads(),{recursive:true});
 try{const attachmentId=transaction(()=>{const count=db.prepare('SELECT COUNT(*) AS n FROM cafe_attachments WHERE post_id=?').get(post.id) as {n:number};if(count.n>=5)throw new Error('글당 첨부파일은 최대 5개예요');fs.writeFileSync(path.join(cafeUploads(),filename),bytes);return Number(db.prepare('INSERT INTO cafe_attachments(post_id,filename,name,mime) VALUES(?,?,?,?)').run(post.id,filename,file.name.replace(/[\r\n]/g,'').slice(0,150),file.type).lastInsertRowid);});return cafeJson({id:attachmentId},201);}catch(e){fs.rmSync(path.join(cafeUploads(),filename),{force:true});return cafeError((e as Error).message);}
}
