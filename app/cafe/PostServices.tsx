"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useState,useEffect } from 'react';
import { api,jsonInit,useMe,notifyMeChanged } from '@/lib/client';
import { jobSide, type CafePost } from '@/lib/cafe';
import { Field,button,card,values } from './service-ui';
type Option={id:number;label:string;votes:number;selected:number};
export default function PostServices({post,poll=[],reload}:{post:CafePost;poll?:Option[];reload:()=>Promise<void>}){
 const {me}=useMe();const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [fee,setFee]=useState<number|null>(null);
 useEffect(()=>{let active=true;api<{coins:number}>('/api/cafe/services?area=promotion').then(r=>{if(active&&r.ok)setFee(r.data.coins);}).catch(()=>{});return()=>{active=false;};},[]);
 const send=async(value:Record<string,unknown>)=>{setBusy(true);setError('');try{const r=await api('/api/cafe/services',jsonInit('POST',{...value,postId:post.id}));if(!r.ok){setError(r.data.error||'처리하지 못했어요');return;}setNotice(value.action==='vote'?'투표를 저장했습니다.':'접수했습니다. 내 신청 관리·문의함에서 확인해주세요.');notifyMeChanged();await reload();}catch{setError('연결을 확인해주세요');}finally{setBusy(false);}};
 const isOwner=me?.id===post.author_id;
 const seek=post.board==='jobs'&&jobSide(post.details.kind)==='seek';
 const apply=!seek&&['jobs','education','model','volunteer','event'].includes(post.board);
 return <div className={card+' space-y-4'}>
  {error&&<p role="alert" className="text-sm text-rose-300">{error}</p>}{notice&&<p role="status" className="text-sm text-emerald-300">{notice}</p>}
  {!!post.attachments?.length&&<section><h2 className="font-bold">첨부 자료·동영상</h2><div className="mt-3 space-y-4">{post.attachments.map(file=><div key={file.id}>{file.mime.startsWith('video/')?<video controls preload="metadata" src={file.url} className="max-h-[600px] w-full rounded-xl"><track kind="captions"/></video>:file.mime.startsWith('image/')?<Image unoptimized width={1000} height={1000} src={file.url} alt={file.name} className="max-h-[600px] w-full rounded-xl object-contain"/>:<a href={file.url} className="text-sm text-rose-300 underline">자료 다운로드: {file.name}</a>}</div>)}</div></section>}
  {me&&(isOwner||me.isAdmin)&&<form className="space-y-3" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const r=await api(`/api/cafe/posts/${post.id}/attachments`,{method:'POST',body:new FormData(e.currentTarget)});if(!r.ok)setError(r.data.error||'첨부하지 못했어요');else {setNotice('첨부 자료를 저장했습니다.');await reload();}}catch{setError('연결을 확인해주세요');}finally{setBusy(false);}}}><label className="block text-sm">사진·영상·교육 자료 추가<input name="file" required type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,video/mp4,video/webm" className="mt-2 block max-w-full text-xs"/></label><p className="text-xs text-muted">글당 최대 5개, 파일당 최대 50MB. PDF·TXT·MP4·WEBM·JPG·PNG·WEBP.</p><button disabled={busy} className={button}>자료 첨부</button></form>}
  {poll.length>0&&<section><h2 className="font-bold">설문 투표</h2><div className="mt-3 flex flex-wrap gap-2">{poll.map(o=><button key={o.id} disabled={busy||!me||post.status==='closed'} aria-pressed={!!o.selected} onClick={()=>send({action:'vote',optionId:o.id})} className={`${button} ${o.selected?'text-rose-300':''}`}>{o.label} · {o.votes}표</button>)}</div><p className="mt-2 text-xs text-muted">회원당 한 표. 마감 전에는 선택을 바꿀 수 있어요.</p></section>}
  {me&&!isOwner&&apply&&post.status==='open'&&<form onSubmit={e=>{e.preventDefault();send({...values(e.currentTarget),action:'apply'});}} className="space-y-3"><h2 className="font-bold">{post.board==='education'?'수강·모임 신청':'모집 신청'}</h2><Field name="message" label="자기소개·신청 내용" type="textarea"/><button disabled={busy} className={button}>신청하기</button></form>}
  {me&&!isOwner&&post.board!=='anonymous'&&<form onSubmit={e=>{e.preventDefault();send({...values(e.currentTarget),action:'inquiry'});}} className="space-y-3"><h2 className="font-bold">{seek?'구직자에게 채용 제안':'작성자에게 비공개 문의'}</h2>{seek&&<p className="text-xs text-muted">채용 권한이 있는 회원(인증된 원장·디자이너)만 보낼 수 있어요.</p>}<Field name="message" label={seek?'제안 내용 (매장·급여·근무 조건)':'문의 내용'} type="textarea"/><button disabled={busy} className={button}>문의 보내기</button></form>}
  {me&&isOwner&&post.board!=='anonymous'&&<form onSubmit={e=>{e.preventDefault();const v=values(e.currentTarget);send({...v,action:'ad-request',coins:fee,acceptFee:v.acceptFee==='on'});}} className="space-y-3"><h2 className="font-bold">광고·추천 노출 신청</h2><p className="text-xs text-muted">승인되면 7일간 추천 노출됩니다. 심사비 {fee===null?'확인 중':fee.toLocaleString()+'코인'}, 반려 시 전액 코인 환불.</p><Field name="message" label="노출 신청 설명" type="textarea"/>{!!fee&&<label className="flex gap-2 text-sm"><input type="checkbox" name="acceptFee" required/>신청 시 {fee.toLocaleString()}코인 사용에 동의합니다.</label>}<button disabled={busy||fee===null} className={button}>운영진에 신청</button></form>}
  {!me&&<Link href="/login" className="text-sm text-rose-300 underline">로그인하고 신청·문의·설문 참여</Link>}
  <div className="flex flex-wrap gap-3 text-sm"><Link href="/cafe/services/activity" className="text-rose-300 underline">신청 관리</Link><Link href="/cafe/services/inbox" className="text-rose-300 underline">문의함</Link></div>
 </div>;
}
