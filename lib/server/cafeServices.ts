import { db } from "./db";
import { notify } from "./notify";
import { type User } from "./http";
import { CAFE_REGIONS } from "../cafe";
import "./cafe";

db.exec(`
 CREATE TABLE IF NOT EXISTS cafe_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id),bio TEXT NOT NULL DEFAULT '',region TEXT NOT NULL DEFAULT '',skills TEXT NOT NULL DEFAULT '',years INTEGER NOT NULL DEFAULT 0,desired_job TEXT NOT NULL DEFAULT '',public_resume INTEGER NOT NULL DEFAULT 0,grade INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS cafe_grade_requests(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT(datetime('now')));
 CREATE UNIQUE INDEX IF NOT EXISTS cafe_grade_pending ON cafe_grade_requests(user_id) WHERE status='pending';
 CREATE TABLE IF NOT EXISTS cafe_applications(id INTEGER PRIMARY KEY AUTOINCREMENT,post_id INTEGER NOT NULL,user_id TEXT NOT NULL,message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL DEFAULT(datetime('now')),UNIQUE(post_id,user_id));
 CREATE TABLE IF NOT EXISTS cafe_threads(id INTEGER PRIMARY KEY AUTOINCREMENT,post_id INTEGER NOT NULL,sender_id TEXT NOT NULL,owner_id TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT(datetime('now')),UNIQUE(post_id,sender_id));
 CREATE TABLE IF NOT EXISTS cafe_thread_messages(id INTEGER PRIMARY KEY AUTOINCREMENT,thread_id INTEGER NOT NULL,author_id TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT(datetime('now')));
 CREATE TABLE IF NOT EXISTS cafe_poll_options(id INTEGER PRIMARY KEY AUTOINCREMENT,post_id INTEGER NOT NULL,label TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS cafe_poll_votes(post_id INTEGER NOT NULL,user_id TEXT NOT NULL,option_id INTEGER NOT NULL,PRIMARY KEY(post_id,user_id));
 CREATE TABLE IF NOT EXISTS cafe_follows(user_id TEXT NOT NULL,board TEXT NOT NULL,PRIMARY KEY(user_id,board));
 CREATE TABLE IF NOT EXISTS cafe_products(id INTEGER PRIMARY KEY AUTOINCREMENT,seller_id TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,category TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>=0),stock INTEGER NOT NULL CHECK(stock>=0),shipping INTEGER NOT NULL DEFAULT 0,bank TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL DEFAULT(datetime('now')));
 CREATE TABLE IF NOT EXISTS cafe_cart(user_id TEXT NOT NULL,product_id INTEGER NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),PRIMARY KEY(user_id,product_id));
 CREATE TABLE IF NOT EXISTS cafe_orders(id INTEGER PRIMARY KEY AUTOINCREMENT,buyer_id TEXT NOT NULL,seller_id TEXT NOT NULL,items TEXT NOT NULL,total INTEGER NOT NULL,recipient TEXT NOT NULL,phone TEXT NOT NULL,address TEXT NOT NULL,bank TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'awaiting_payment',tracking TEXT NOT NULL DEFAULT '',request_key TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT(datetime('now')),UNIQUE(buyer_id,request_key,seller_id));
 CREATE TABLE IF NOT EXISTS cafe_product_reviews(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER NOT NULL,user_id TEXT NOT NULL,body TEXT NOT NULL,rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),UNIQUE(order_id,user_id));
 CREATE TABLE IF NOT EXISTS cafe_product_images(product_id INTEGER PRIMARY KEY,filename TEXT NOT NULL UNIQUE,mime TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS cafe_product_inquiries(id INTEGER PRIMARY KEY AUTOINCREMENT,product_id INTEGER NOT NULL,user_id TEXT NOT NULL,question TEXT NOT NULL,answer TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT(datetime('now')));
 CREATE TABLE IF NOT EXISTS cafe_order_messages(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER NOT NULL,author_id TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT(datetime('now')));
 CREATE TABLE IF NOT EXISTS cafe_ad_requests(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,post_id INTEGER NOT NULL,message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL DEFAULT(datetime('now')));
 CREATE TABLE IF NOT EXISTS cafe_attachments(id INTEGER PRIMARY KEY AUTOINCREMENT,post_id INTEGER NOT NULL,filename TEXT NOT NULL UNIQUE,name TEXT NOT NULL,mime TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS cafe_recent(user_id TEXT NOT NULL,post_id INTEGER NOT NULL,viewed_at TEXT NOT NULL DEFAULT(datetime('now')),PRIMARY KEY(user_id,post_id));
`);
try{db.exec("ALTER TABLE cafe_posts ADD COLUMN views INTEGER NOT NULL DEFAULT 0");}catch{}
try{db.exec("ALTER TABLE cafe_comments ADD COLUMN parent_id INTEGER");}catch{}
try{db.exec("ALTER TABLE cafe_posts ADD COLUMN sponsored_until TEXT");}catch{}
try{db.exec("ALTER TABLE cafe_ad_requests ADD COLUMN coins INTEGER NOT NULL DEFAULT 0");}catch{}
export function promotionFee(){const row=db.prepare("SELECT value FROM settings WHERE key='cafe_promotion_coins'").get() as {value:string}|undefined;const n=Number(row?.value||0);return Number.isSafeInteger(n)&&n>=0&&n<=1000000?n:0;}

export class CafeServiceError extends Error {
  constructor(message: string, public status=400) { super(message); }
}
export function must(value: unknown, message: string, status=400): asserts value { if(!value) throw new CafeServiceError(message,status); }
export function textField(value: unknown, label: string, max=1000, optional=false) {
  const text=String(value??"").trim(); must((optional||text.length>0)&&text.length<=max,`${label}을(를) 확인해주세요`); return text;
}
export function integer(value: unknown,min:number,max:number,label:string) { const n=Number(value); must(Number.isSafeInteger(n)&&n>=min&&n<=max,`${label}을(를) 확인해주세요`);return n; }
export function transaction<T>(work:()=>T):T {db.exec("BEGIN IMMEDIATE");try{const result=work();db.exec("COMMIT");return result;}catch(e){db.exec("ROLLBACK");throw e;}}
export function ensureProfile(id:string) {db.prepare("INSERT OR IGNORE INTO cafe_profiles(user_id) VALUES(?)").run(id);}
export function boardAccess(board:string,user:User|null) {
  if(user?.isAdmin)return true;
  if(board==="staff")return false;
  if(board==="vip")return !!user && Number((db.prepare("SELECT grade FROM cafe_profiles WHERE user_id=?").get(user.id) as {grade:number}|undefined)?.grade??0)>=2;
  const positions:Record<string,string>={owner:"원장",designer:"디자이너",intern:"인턴"};
  if(positions[board])return user?.position===positions[board];
  return true;
}
export function safePost<T extends {board:string;author_id:string;author_name:string}>(post:T,user:User|null):T {
  if(post.board!=="anonymous"||user?.isAdmin||user?.id===post.author_id)return post;
  return {...post,author_id:"anonymous",author_name:"익명 회원"};
}
export function getServicePost(id:number) {
  const post=db.prepare("SELECT * FROM cafe_posts WHERE id=? AND deleted_at IS NULL").get(id) as {id:number;board:string;author_id:string;status:string;details:string;title:string}|undefined;
  must(post,"글을 찾을 수 없어요",404);return post;
}
export function profile(user:User) {
  ensureProfile(user.id);
  const record=db.prepare("SELECT * FROM cafe_profiles WHERE user_id=?").get(user.id);
  const requests=db.prepare("SELECT * FROM cafe_grade_requests WHERE user_id=? ORDER BY id DESC LIMIT 20").all(user.id);
  const count=(table:string)=>Number((db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${table==='cafe_posts'?'author_id=? AND deleted_at IS NULL':'user_id=?'}`).get(user.id) as {n:number}).n);
  return {profile:record,requests,activity:{posts:count('cafe_posts'),attendance:count('cafe_attendance')},follows:db.prepare("SELECT board FROM cafe_follows WHERE user_id=?").all(user.id)};
}
export function saveProfile(user:User,value:Record<string,unknown>) {
  ensureProfile(user.id);
  const region=textField(value.region,"지역",20,true);must(!region||(CAFE_REGIONS as readonly string[]).includes(region),"지역을 확인해주세요");
  db.prepare("UPDATE cafe_profiles SET bio=?,region=?,skills=?,years=?,desired_job=?,public_resume=? WHERE user_id=?").run(textField(value.bio,"소개",2000,true),region,textField(value.skills,"분야",200,true),integer(value.years??0,0,80,"경력"),textField(value.desired_job,"희망 근무",200,true),value.public_resume===true?1:0,user.id);
}
export function matchScore(skills:string, region:string, details:{tags?:string;region?:string}) {
  const keywords=skills.split(/[\s,#·]+/).filter(Boolean);
  return (region&&details.region===region?50:0)+Math.min(50,keywords.filter(k=>(details.tags||"").includes(k)).length*10);
}
export function notifyOwner(id:string,body:string,link="/cafe/services/activity") {notify(id,body,link);}
