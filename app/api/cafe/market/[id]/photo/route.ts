import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {db} from '@/lib/server/db';
import {getUser,unauthorized,forbidden,limited} from '@/lib/server/http';
import {cafeError,cafeJson,cafeUploads} from '@/lib/server/cafe';
import '@/lib/server/cafeServices';
type Context={params:Promise<{id:string}>};
export async function GET(req:Request,{params}:Context){
 const {id}=await params;const row=db.prepare("SELECT i.*,p.seller_id,p.status FROM cafe_product_images i JOIN cafe_products p ON p.id=i.product_id WHERE p.id=?").get(Number(id)||0) as {filename:string;mime:string;status:string;seller_id:string}|undefined;
 if(!row||(row.status!=='active'&&getUser(req)?.id!==row.seller_id))return new Response(null,{status:404});const file=path.join(cafeUploads(),row.filename);if(!fs.existsSync(file))return new Response(null,{status:404});return new Response(new Uint8Array(fs.readFileSync(file)),{headers:{'Content-Type':row.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}});
}
export async function POST(req:Request,{params}:Context){
 const user=getUser(req);if(!user)return unauthorized();if(limited(`cafe-product-photo:${user.id}`,60000,20))return cafeError('잠시 후 다시 시도해주세요',429);
 const {id}=await params,product=db.prepare('SELECT seller_id FROM cafe_products WHERE id=?').get(Number(id)||0) as {seller_id:string}|undefined;if(!product)return cafeError('상품이 없어요',404);if(product.seller_id!==user.id)return forbidden();
 const form=await req.formData().catch(()=>null),file=form?.get('photo');const types:Record<string,string>={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'};if(!(file instanceof File)||!types[file.type]||!file.size||file.size>5*1024*1024)return cafeError('JPG·PNG·WEBP 사진, 최대 5MB를 올려주세요');
 const bytes=Buffer.from(await file.arrayBuffer());const valid=file.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';if(!valid)return cafeError('사진 형식이 올바르지 않아요');
 const name=`cp-${crypto.randomUUID()}${types[file.type]}`;fs.mkdirSync(cafeUploads(),{recursive:true});fs.writeFileSync(path.join(cafeUploads(),name),bytes);
 try{db.prepare('INSERT INTO cafe_product_images(product_id,filename,mime) VALUES(?,?,?) ON CONFLICT(product_id) DO UPDATE SET filename=excluded.filename,mime=excluded.mime').run(Number(id),name,file.type);}catch{fs.rmSync(path.join(cafeUploads(),name),{force:true});return cafeError('사진을 저장하지 못했어요',500);}return cafeJson({ok:true});
}
