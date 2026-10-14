import { db } from "./db";
import { notify } from "./notify";
import { type User } from "./http";
import { CAFE_REGIONS, EMPTY_RESUME, RESUME_FIELDS, allowedJobKinds, canHire, jobSide, type JobRights, type Resume } from "../cafe";
import "./cafe";
import "./salon";

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
// 채용 지원: 저장해 둔 이력서를 제출 시점 그대로 지원서에 보관하고, 면접 날짜는 지원서별 대화로 맞춘다.
db.exec(`
 CREATE TABLE IF NOT EXISTS cafe_resumes(user_id TEXT PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT(datetime('now')));
 CREATE TABLE IF NOT EXISTS cafe_application_messages(id INTEGER PRIMARY KEY AUTOINCREMENT,application_id INTEGER NOT NULL,author_id TEXT NOT NULL,body TEXT NOT NULL,interview_at TEXT,accepted_at TEXT,created_at TEXT NOT NULL DEFAULT(datetime('now')));
 CREATE INDEX IF NOT EXISTS idx_cafe_application_messages ON cafe_application_messages(application_id,id);
`);
try{db.exec("ALTER TABLE cafe_applications ADD COLUMN resume TEXT");}catch{}
try{db.exec("ALTER TABLE cafe_applications ADD COLUMN interview_at TEXT");}catch{}
try{db.exec("ALTER TABLE cafe_applications ADD COLUMN viewed_at TEXT");}catch{}
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
// 채용 인증: 매장에 원장·디자이너로 소속돼 있거나 라운지 등업(1 이상)을 받은 회원.
export function jobRights(user:User|null):JobRights {
  if(!user)return {position:null,verified:false,isAdmin:false};
  const salon=db.prepare("SELECT 1 FROM salon_members WHERE user_id=? AND role IN ('owner','designer')").get(user.id);
  const grade=Number((db.prepare("SELECT grade FROM cafe_profiles WHERE user_id=?").get(user.id) as {grade:number}|undefined)?.grade??0);
  return {position:user.position,verified:!!salon||grade>=1,isAdmin:user.isAdmin};
}
export function checkJobKind(user:User,kind:string) {
  must(allowedJobKinds(jobRights(user)).includes(kind),jobSide(kind)==="hire"?"채용 글은 인증된 원장(알바·스페어는 디자이너도)만 쓸 수 있어요. 매장 등록이나 등업 후 이용해주세요":"글 유형을 확인해주세요",403);
}
const kindOf=(details:unknown)=>String((typeof details==="string"?JSON.parse(details):details as {kind?:string}|undefined)?.kind??"");
export const isSeekPost=(post:{board:string;details?:unknown})=>post.board==="jobs"&&jobSide(kindOf(post.details))==="seek";
export function safePost<T extends {board:string;author_id:string;author_name:string;body?:string;details?:unknown}>(post:T,user:User|null):T {
  // 구직 글 본문(자기소개·연락처)은 채용 권한이 있는 회원·작성자·관리자에게만 보여준다.
  if(isSeekPost(post)&&user?.id!==post.author_id&&!canHire(jobRights(user)))return {...post,body:"구직 글 본문은 채용 권한이 있는 회원(인증된 원장·디자이너)에게만 보여요.",...("attachments" in post?{attachments:[]}:{}),...("photos" in post?{photos:[]}:{}),masked:true};
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

// ── 이력서·채용 지원 ──
export function getResume(userId:string):Resume|null {
  const row=db.prepare("SELECT data FROM cafe_resumes WHERE user_id=?").get(userId) as {data:string}|undefined;
  return row?{...EMPTY_RESUME,...JSON.parse(row.data)}:null;
}
export function saveResume(user:User,value:Record<string,unknown>) {
  const resume={...EMPTY_RESUME};
  for(const field of RESUME_FIELDS){
    const text=textField(value[field.key],field.label,field.max,!field.required);
    must(!text||!field.options||field.options.includes(text),`${field.label}을(를) 다시 선택해주세요`);
    resume[field.key]=text;
  }
  must(/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(resume.phone),"연락처를 확인해주세요 (예: 010-1234-5678)");
  const year=new Date().getFullYear();
  if(resume.birth_year)integer(resume.birth_year,year-80,year-14,"출생연도");
  integer(resume.career_years,0,60,"총 경력");
  must(!resume.available_from||/^\d{4}-\d{2}-\d{2}$/.test(resume.available_from),"근무 가능일을 확인해주세요");
  db.prepare("INSERT INTO cafe_resumes(user_id,data) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=datetime('now')").run(user.id,JSON.stringify(resume));
}
export type JobApplication={id:number;post_id:number;user_id:string;status:string;viewed_at:string|null;interview_at:string|null;author_id:string;title:string;board:string;applicant_name:string;owner_name:string};
/** 채용 지원서와 당사자(지원자·공고 작성자) 확인. 관리자는 열람만 한다. */
export function jobApplication(id:unknown,user:User) {
  const r=db.prepare("SELECT a.id,a.post_id,a.user_id,a.status,a.viewed_at,a.interview_at,p.author_id,p.title,p.board,u.name AS applicant_name,o.name AS owner_name FROM cafe_applications a JOIN cafe_posts p ON p.id=a.post_id JOIN users u ON u.id=a.user_id JOIN users o ON o.id=p.author_id WHERE a.id=?").get(integer(id,1,1e10,"지원 번호")) as JobApplication|undefined;
  must(r&&r.board==="jobs","지원 내역을 찾을 수 없어요",404);
  must(r.user_id===user.id||r.author_id===user.id||user.isAdmin,"지원 당사자만 이용할 수 있어요",403);
  return r;
}
export const ACTIVE_APPLICATION=["pending","interview","interview_confirmed"];
// 면접 일시는 한국 시간 'YYYY-MM-DDTHH:MM'으로 받고, 지금 이후여야 한다.
export function interviewTime(value:unknown) {
  const at=String(value??"");
  must(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at)&&Number.isFinite(Date.parse(`${at}:00+09:00`)),"면접 날짜와 시간을 확인해주세요");
  must(Date.parse(`${at}:00+09:00`)>Date.now(),"지난 시간으로는 면접을 잡을 수 없어요");
  return at;
}
export const interviewLabel=(at:string)=>at.replace("T"," ");
