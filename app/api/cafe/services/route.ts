import { db } from "@/lib/server/db";
import { getUser, limited, unauthorized } from "@/lib/server/http";
import { cafeJson, cafeError } from "@/lib/server/cafe";
import { canHire, findCafeBoard, jobSide } from "@/lib/cafe";
import { CafeServiceError, boardAccess, ensureProfile, isSeekPost, jobRights, getServicePost, integer, matchScore, must, notifyOwner, profile, promotionFee, saveProfile, textField, transaction } from "@/lib/server/cafeServices";
import { debitCoins,refundFromRevenue,InsufficientCoinsError } from '@/lib/server/coins';

export async function GET(req:Request) {
 const user=getUser(req), sp=new URL(req.url).searchParams, area=sp.get("area")||"members";
 try {
  if(area==='promotion')return cafeJson({coins:promotionFee(),days:7});
  if(area==="members") {
   const q=(sp.get("q")||"").slice(0,100),region=sp.get("region")||"";
   const items=db.prepare(`SELECT u.id,u.name,u.position,p.bio,p.region,p.skills,p.years,p.desired_job,p.grade,
    (SELECT COUNT(*) FROM cafe_posts cp WHERE cp.author_id=u.id AND cp.deleted_at IS NULL AND cp.board NOT IN ('anonymous','owner','designer','intern','vip','staff')) AS posts,
    (SELECT COUNT(*) FROM cafe_attendance ca WHERE ca.user_id=u.id) AS attendance
    FROM users u LEFT JOIN cafe_profiles p ON p.user_id=u.id WHERE u.suspended_at IS NULL
    AND (?='' OR instr(u.name,?)>0 OR (p.public_resume=1 AND instr(p.skills,?)>0))
    AND (?='' OR (p.public_resume=1 AND p.region=?)) AND (?=0 OR p.public_resume=1) ORDER BY posts DESC,attendance DESC,u.id LIMIT 100`).all(q,q,q,region,region,sp.get("resumes")==="1"?1:0) as Record<string,unknown>[];
   // Only explicitly published resumes expose career details.
   return cafeJson({items:items.map(item=>{const publicResume=db.prepare("SELECT public_resume FROM cafe_profiles WHERE user_id=?").get(String(item.id)) as {public_resume:number}|undefined;return publicResume?.public_resume?item:{id:item.id,name:item.name,position:item.position,grade:item.grade,posts:item.posts,attendance:item.attendance};})});
  }
  if(!user)return unauthorized();
  if(area==="profile")return cafeJson(profile(user));
  if(area==="job-rights")return cafeJson(jobRights(user));
  if(area==='recent'){const items=db.prepare("SELECT p.id,p.title,p.board FROM cafe_recent r JOIN cafe_posts p ON p.id=r.post_id WHERE r.user_id=? AND p.deleted_at IS NULL ORDER BY r.viewed_at DESC LIMIT 100").all(user.id) as {id:number;title:string;board:string}[];return cafeJson({items:items.filter(p=>boardAccess(p.board,user))});}
  if(area==="matches") {
   ensureProfile(user.id);const p=db.prepare("SELECT skills,region FROM cafe_profiles WHERE user_id=?").get(user.id) as {skills:string;region:string};
   const rows=db.prepare("SELECT id,title,details FROM cafe_posts WHERE board='jobs' AND status='open' AND deleted_at IS NULL ORDER BY id DESC LIMIT 200").all() as {id:number;title:string;details:string}[];
   return cafeJson({items:rows.filter(r=>jobSide(JSON.parse(r.details).kind)==="hire").map(r=>({...r,details:JSON.parse(r.details),score:matchScore(p.skills,p.region,JSON.parse(r.details))})).sort((a,b)=>b.score-a.score).slice(0,30)});
  }
  if(area==="applications")return cafeJson({items:db.prepare(`SELECT a.*,p.title,p.author_id AS owner_id,p.board,u.name AS applicant_name FROM cafe_applications a JOIN cafe_posts p ON p.id=a.post_id JOIN users u ON u.id=a.user_id WHERE a.user_id=? OR p.author_id=? ORDER BY a.id DESC LIMIT 200`).all(user.id,user.id)});
  if(area==="inbox") {
   const id=Number(sp.get("id"));
   if(id){const thread=db.prepare("SELECT * FROM cafe_threads WHERE id=? AND (sender_id=? OR owner_id=?)").get(id,user.id,user.id);must(thread,"문의를 찾을 수 없어요",404);return cafeJson({thread,items:db.prepare("SELECT m.*,u.name AS author_name FROM cafe_thread_messages m JOIN users u ON u.id=m.author_id WHERE thread_id=? ORDER BY m.id LIMIT 500").all(id)});}
   return cafeJson({items:db.prepare(`SELECT t.*,p.title,u.name AS sender_name,v.name AS owner_name,(SELECT body FROM cafe_thread_messages m WHERE m.thread_id=t.id ORDER BY id DESC LIMIT 1) AS preview FROM cafe_threads t JOIN cafe_posts p ON p.id=t.post_id JOIN users u ON u.id=t.sender_id JOIN users v ON v.id=t.owner_id WHERE t.sender_id=? OR t.owner_id=? ORDER BY t.id DESC LIMIT 200`).all(user.id,user.id)});
  }
  if(area==="admin") {
   must(user.isAdmin,"관리자만 이용할 수 있어요",403);
   return cafeJson({grades:db.prepare("SELECT g.*,u.name FROM cafe_grade_requests g JOIN users u ON u.id=g.user_id WHERE status='pending' ORDER BY id").all(),ads:db.prepare("SELECT a.*,p.title,u.name FROM cafe_ad_requests a JOIN cafe_posts p ON p.id=a.post_id JOIN users u ON u.id=a.user_id WHERE a.status='pending' ORDER BY a.id").all(),reports:db.prepare("SELECT r.*,p.title FROM cafe_reports r JOIN cafe_posts p ON p.id=r.post_id WHERE p.deleted_at IS NULL ORDER BY r.created_at DESC LIMIT 100").all()});
  }
  return cafeError("존재하지 않는 메뉴예요",404);
 }catch(e){return cafeError((e as Error).message,e instanceof CafeServiceError?e.status:500);}
}

export async function POST(req:Request) {
 const user=getUser(req);if(!user)return unauthorized();
 if(limited(`cafe-service:${user.id}`,60000,60))return cafeError("잠시 후 다시 시도해주세요",429);
 try {
  const value=await req.json();must(value&&typeof value==='object',"요청 내용을 확인해주세요");
  if(value.action==="profile")saveProfile(user,value);
  else if(value.action==="grade-request") {
   ensureProfile(user.id);must(!db.prepare("SELECT 1 FROM cafe_grade_requests WHERE user_id=? AND status='pending'").get(user.id),"등업 심사 중인 요청이 있어요",409);
   db.prepare("INSERT INTO cafe_grade_requests(user_id,reason) VALUES(?,?)").run(user.id,textField(value.reason,"신청 사유"));
  } else if(value.action==="grade-review") {
   must(user.isAdmin,"관리자만 이용할 수 있어요",403);
   transaction(()=>{const r=db.prepare("SELECT * FROM cafe_grade_requests WHERE id=? AND status='pending'").get(integer(value.id,1,1e10,"요청 번호")) as {id:number;user_id:string}|undefined;must(r,"심사할 요청을 찾을 수 없어요",409);const approved=value.approved===true;ensureProfile(r.user_id);if(approved)db.prepare("UPDATE cafe_profiles SET grade=? WHERE user_id=?").run(integer(value.grade??2,1,2,"회원 등급"),r.user_id);db.prepare("UPDATE cafe_grade_requests SET status=?,note=? WHERE id=?").run(approved?'approved':'rejected',textField(value.note,"심사 안내",500,true),r.id);notifyOwner(r.user_id,approved?"라운지 등업이 승인됐어요":"라운지 등업 심사 결과를 확인해주세요","/cafe/services/profile");});
  } else if(value.action==="follow") {
   must(findCafeBoard(value.board),"게시판을 확인해주세요");must(boardAccess(value.board,user),"해당 게시판의 이용 권한이 없어요",403);
   if(value.enabled===true)db.prepare("INSERT OR IGNORE INTO cafe_follows(user_id,board) VALUES(?,?)").run(user.id,value.board);else db.prepare("DELETE FROM cafe_follows WHERE user_id=? AND board=?").run(user.id,value.board);
  } else if(value.action==="apply") {
   transaction(()=>{
    const post=getServicePost(integer(value.postId,1,1e10,"글 번호"));must(["jobs","education","model","volunteer","event"].includes(post.board),"신청할 수 없는 글이에요");must(post.status==='open',"마감된 모집이에요",409);must(post.author_id!==user.id,"본인 모집글에는 신청할 수 없어요");must(!isSeekPost(post),"구직 글에는 신청 대신 비공개 문의로 채용을 제안해주세요");
    const details=JSON.parse(post.details);const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());must(!details.deadline||details.deadline>=today,"신청 기간이 끝났어요",409);
    const existing=db.prepare("SELECT id,status FROM cafe_applications WHERE post_id=? AND user_id=?").get(post.id,user.id) as {id:number;status:string}|undefined;
    must(!existing||existing.status==='cancelled',"이미 신청한 모집이에요",409);
    if(existing)db.prepare("UPDATE cafe_applications SET status='pending',message=? WHERE id=?").run(textField(value.message,"신청 내용",2000),existing.id);
    else db.prepare("INSERT INTO cafe_applications(post_id,user_id,message) VALUES(?,?,?)").run(post.id,user.id,textField(value.message,"신청 내용",2000));
    notifyOwner(post.author_id,`${user.name}님이 ‘${post.title}’에 신청했어요`);
   });
  } else if(value.action==="application-status") {
   transaction(()=>{const r=db.prepare("SELECT a.*,p.author_id,p.details,p.status AS post_status FROM cafe_applications a JOIN cafe_posts p ON p.id=a.post_id WHERE a.id=?").get(integer(value.id,1,1e10,"신청 번호")) as {id:number;user_id:string;author_id:string;details:string;status:string;post_id:number;post_status:string}|undefined;must(r,"신청 내역이 없어요",404);
    const status=String(value.status);must(['accepted','rejected','cancelled'].includes(status),"처리 상태를 확인해주세요");
    if(status==='cancelled')must(r.user_id===user.id,"신청자만 취소할 수 있어요",403);else must(r.author_id===user.id,"모집 작성자만 처리할 수 있어요",403);
    must(['pending','accepted'].includes(r.status),"이미 처리된 신청이에요",409);
    if(status==='accepted'){must(r.status==='pending'&&r.post_status==='open',"승인할 수 없는 신청이에요",409);const cap=Number(JSON.parse(r.details).capacity||0);const used=(db.prepare("SELECT COUNT(*) AS n FROM cafe_applications WHERE post_id=? AND status='accepted'").get(r.post_id) as {n:number}).n;must(!cap||used<cap,"모집 정원이 찼어요",409);}
    db.prepare("UPDATE cafe_applications SET status=? WHERE id=?").run(status,r.id);notifyOwner(status==='cancelled'?r.author_id:r.user_id,"모집 신청 상태가 변경됐어요");
   });
  } else if(value.action==="inquiry") {
   const post=getServicePost(integer(value.postId,1,1e10,"글 번호"));must(boardAccess(post.board,user),"이용 권한이 없어요",403);must(post.board!=='anonymous',"익명 게시판에서는 문의할 수 없어요");must(post.author_id!==user.id,"본인 글에는 문의할 수 없어요");must(!isSeekPost(post)||canHire(jobRights(user)),"구직자에게는 채용 권한이 있는 회원(인증된 원장·디자이너)만 연락할 수 있어요",403);
   const id=transaction(()=>{db.prepare("INSERT OR IGNORE INTO cafe_threads(post_id,sender_id,owner_id) VALUES(?,?,?)").run(post.id,user.id,post.author_id);const t=db.prepare("SELECT id FROM cafe_threads WHERE post_id=? AND sender_id=?").get(post.id,user.id) as {id:number};db.prepare("INSERT INTO cafe_thread_messages(thread_id,author_id,body) VALUES(?,?,?)").run(t.id,user.id,textField(value.message,"문의 내용",2000));return t.id;});
   notifyOwner(post.author_id,`${user.name}님에게 새 문의가 왔어요`,"/cafe/services/inbox");return cafeJson({id});
  } else if(value.action==="message") {
   const t=db.prepare("SELECT * FROM cafe_threads WHERE id=? AND (sender_id=? OR owner_id=?)").get(integer(value.id,1,1e10,"문의 번호"),user.id,user.id) as {id:number;sender_id:string;owner_id:string}|undefined;must(t,"문의를 찾을 수 없어요",404);
   db.prepare("INSERT INTO cafe_thread_messages(thread_id,author_id,body) VALUES(?,?,?)").run(t.id,user.id,textField(value.message,"답변",2000));notifyOwner(t.sender_id===user.id?t.owner_id:t.sender_id,"문의에 새 답변이 왔어요","/cafe/services/inbox");
  } else if(value.action==="vote") {
   const post=getServicePost(integer(value.postId,1,1e10,"설문 번호"));must(post.board==='poll'&&post.status==='open',"진행 중인 설문이 아니에요",409);must(db.prepare("SELECT 1 FROM cafe_poll_options WHERE id=? AND post_id=?").get(integer(value.optionId,1,1e10,"선택지"),post.id),"설문 선택지를 확인해주세요");db.prepare("INSERT INTO cafe_poll_votes(post_id,user_id,option_id) VALUES(?,?,?) ON CONFLICT(post_id,user_id) DO UPDATE SET option_id=excluded.option_id").run(post.id,user.id,value.optionId);
  } else if(value.action==="ad-settings") {
   must(user.isAdmin,"관리자만 변경할 수 있어요",403);const fee=integer(value.coins,0,1000000,"노출 심사 코인");db.prepare("INSERT INTO settings(key,value,updated_by) VALUES('cafe_promotion_coins',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=datetime('now')").run(String(fee),user.id);
  } else if(value.action==="ad-request") {
   transaction(()=>{const post=getServicePost(integer(value.postId,1,1e10,"글 번호"));must(post.author_id===user.id,"본인 글만 노출 신청할 수 있어요",403);must(post.board!=='anonymous',"익명글은 노출 신청할 수 없어요");must(!db.prepare("SELECT 1 FROM cafe_ad_requests WHERE post_id=? AND status='pending'").get(post.id),"심사 중인 신청이 있어요",409);const fee=promotionFee();must(Number(value.coins)===fee,"심사비가 변경됐어요. 다시 확인해주세요",409);must(!fee||value.acceptFee===true,"코인 사용에 동의해주세요");const message=textField(value.message,"노출 신청 설명");if(fee)debitCoins(user.id,fee,'cafe_promotion',`라운지 글 #${post.id} 노출 신청`);db.prepare("INSERT INTO cafe_ad_requests(user_id,post_id,message,coins) VALUES(?,?,?,?)").run(user.id,post.id,message,fee);});
  } else if(value.action==="ad-review") {
   must(user.isAdmin,"관리자만 이용할 수 있어요",403);transaction(()=>{const r=db.prepare("SELECT * FROM cafe_ad_requests WHERE id=? AND status='pending'").get(integer(value.id,1,1e10,"신청 번호")) as {id:number;post_id:number;user_id:string;coins:number}|undefined;must(r,"심사할 신청이 없어요",409);db.prepare("UPDATE cafe_ad_requests SET status=? WHERE id=?").run(value.approved===true?'approved':'rejected',r.id);if(value.approved===true){getServicePost(r.post_id);db.prepare("UPDATE cafe_posts SET sponsored_until=datetime('now','+7 days') WHERE id=?").run(r.post_id);}else if(r.coins)refundFromRevenue(r.user_id,r.coins,`라운지 노출 신청 #${r.id} 반려 환불`);notifyOwner(r.user_id,"게시글 노출 신청 결과를 확인해주세요");});
  } else return cafeError("지원하지 않는 요청이에요");
  return cafeJson({ok:true});
 }catch(e){return cafeError(e instanceof CafeServiceError||e instanceof InsufficientCoinsError?e.message:"처리하지 못했어요. 입력 내용을 확인해주세요",e instanceof CafeServiceError?e.status:400);}
}
