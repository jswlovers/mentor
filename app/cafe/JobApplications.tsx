"use client";
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, jsonInit, timeAgo, type Me } from '@/lib/client';
import { RESUME_FIELDS, type Resume } from '@/lib/cafe';
import { JOB_APPLICATION_STATUS } from '@/lib/cafeServices';
import { type Item, type Run, input, button, card } from './service-ui';

// 이력서 작성: 한 번 저장해 두면 채용공고에서 '이력서 제출'로 그대로 보낸다.
export function ResumeForm({resume,name,run,busy}:{resume:Resume|null;name:string;run:Run;busy:boolean}){
 return <form className={card+' space-y-4'} onSubmit={async e=>{e.preventDefault();await run({...Object.fromEntries(new FormData(e.currentTarget)),action:'resume'});}}>
  <div><h2 className="font-bold">내 이력서</h2><p className="mt-1 text-xs text-muted">저장해 두면 채용공고에서 버튼 하나로 제출할 수 있어요. 제출한 이력서와 연락처는 그 공고를 올린 매장만 볼 수 있어요. * 표시는 필수 항목이에요.</p>{resume===null&&<p className="mt-2 text-xs text-amber-300">아직 저장된 이력서가 없어요.</p>}</div>
  <div className="grid gap-4 sm:grid-cols-2">{RESUME_FIELDS.map(f=>{const value=resume?.[f.key]??(f.key==='name'?name:'');const label=`${f.label}${f.required?' *':''}`;const wide=f.type==='textarea';return <label key={f.key} className={`block text-sm ${wide?'sm:col-span-2':''}`}>{label}
   {f.type==='select'?<select name={f.key} required={f.required} defaultValue={value} className={input}><option value="">선택</option>{f.options!.map(o=><option key={o}>{o}</option>)}</select>
   :f.type==='textarea'?<textarea name={f.key} required={f.required} maxLength={f.max} rows={5} defaultValue={value} placeholder={f.placeholder} className={input}/>
   :<input name={f.key} required={f.required} type={f.type} inputMode={f.type==='number'?'numeric':undefined} min={f.type==='number'?0:undefined} maxLength={f.max} defaultValue={value} placeholder={f.placeholder} className={input}/>}</label>;})}</div>
  <button disabled={busy} className={button}>이력서 저장</button>
 </form>;
}

export function ResumeView({resume}:{resume:Resume}){
 return <dl className="grid gap-3 rounded-xl bg-surface-2 p-4 text-sm sm:grid-cols-2">{RESUME_FIELDS.filter(f=>resume[f.key]).map(f=><div key={f.key} className={f.type==='textarea'?'sm:col-span-2':''}><dt className="text-xs text-muted">{f.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{resume[f.key]}{f.key==='career_years'?'년':''}</dd></div>)}</dl>;
}

type Message={id:number;author_id:string;author_name:string;body:string;interview_at:string|null;accepted_at:string|null;created_at:string};
const telHref=(phone:string)=>phone.replace(/[^0-9]/g,'');

// 지원서 하나: 이력서 보기, 연락(문자·전화), 면접 날짜를 맞추는 대화, 합격·불합격 처리.
function JobApplication({a,me,run,busy,reload}:{a:Item;me:Me|null;run:Run;busy:boolean;reload:()=>void}){
 const owner=a.owner_id===me?.id;const active=['pending','interview','interview_confirmed'].includes(a.status||'');
 const [showResume,setShowResume]=useState(false),[chat,setChat]=useState<Message[]|null>(null),[open,setOpen]=useState(false),[error,setError]=useState(''),[sending,setSending]=useState(false);
 const loadChat=useCallback(async()=>{const r=await api<{items:Message[]}>(`/api/cafe/services?area=application-chat&id=${a.id}`);if(r.ok)setChat(r.data.items);else setError(r.data.error||'대화를 불러오지 못했어요');},[a.id]);
 // 대화를 열어 둔 동안 15초마다 새 메시지를 확인한다
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{if(!open)return;let alive=true;loadChat().catch(()=>{if(alive)setError('연결을 확인해주세요');});const t=setInterval(()=>loadChat().catch(()=>{}),15000);return()=>{alive=false;clearInterval(t);};},[open,loadChat]);
 const post=async(value:Record<string,unknown>)=>{setSending(true);setError('');try{const r=await api('/api/cafe/services',jsonInit('POST',value));if(!r.ok){setError(r.data.error||'보내지 못했어요');return false;}await loadChat();reload();return true;}catch{setError('연결을 확인해주세요');return false;}finally{setSending(false);}};
 const toggleResume=()=>{setShowResume(v=>!v);if(owner&&!a.viewed_at)api('/api/cafe/services',jsonInit('POST',{action:'resume-viewed',id:a.id})).catch(()=>{});};
 const phone=a.resume?.phone||'';
 return <article className={card+' space-y-3'}>
  <div className="flex flex-wrap items-start justify-between gap-2"><div><Link href={`/cafe/posts/${a.post_id}`} className="font-bold text-rose-300">{a.title}</Link><p className="mt-1 text-xs text-muted">{owner?`지원자 ${a.applicant_name}`:'내 지원'} · {timeAgo(String(a.created_at||''))}{!owner&&a.viewed_at?' · 매장이 이력서를 확인했어요':''}</p></div>
   <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${a.status==='interview_confirmed'||a.status==='accepted'?'bg-emerald-500/15 text-emerald-300':a.status==='interview'?'bg-amber-500/15 text-amber-300':'bg-surface-2 text-muted'}`}>{JOB_APPLICATION_STATUS[a.status||'']}</span></div>
  {a.interview_at&&<p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">면접 일시: {a.interview_at.replace('T',' ')}</p>}
  {a.message&&<p className="whitespace-pre-wrap text-sm">{a.message}</p>}
  <div className="flex flex-wrap gap-2">
   {a.resume&&<button onClick={toggleResume} className={button}>{showResume?'이력서 접기':owner?'이력서 보기':'제출한 이력서'}</button>}
   {active&&<button onClick={()=>setOpen(v=>!v)} className={button}>{open?'대화 닫기':`면접 일정 대화${a.message_count?` (${a.message_count})`:''}`}</button>}
   {owner&&phone&&<><a href={`sms:${telHref(phone)}`} className={button}>문자 보내기</a><a href={`tel:${telHref(phone)}`} className={button}>전화하기</a></>}
   {owner&&active&&<><button disabled={busy} onClick={()=>run({action:'application-status',id:a.id,status:'accepted'})} className={button}>합격</button><button disabled={busy} onClick={()=>run({action:'application-status',id:a.id,status:'rejected'})} className={button}>불합격</button></>}
   {!owner&&active&&<button disabled={busy} onClick={()=>run({action:'application-status',id:a.id,status:'cancelled'})} className={button}>지원 취소</button>}
  </div>
  {showResume&&a.resume&&<ResumeView resume={a.resume}/>}
  {open&&<div className="space-y-3 rounded-xl border border-border p-3">
   <p className="text-xs text-muted">서로 가능한 날짜를 이야기한 뒤, 한쪽이 날짜를 제안하고 상대가 수락하면 면접이 확정돼요. 새 메시지는 알림·문자로 전해져요.</p>
   {error&&<p role="alert" className="text-sm text-rose-300">{error}</p>}
   <ul className="max-h-80 space-y-2 overflow-y-auto">{chat===null?<li className="text-sm text-muted">불러오는 중…</li>:chat.length===0?<li className="text-sm text-muted">아직 대화가 없어요. 먼저 인사를 건네보세요.</li>:chat.map(m=>{const mine=m.author_id===me?.id;return <li key={m.id} className={`max-w-[85%] rounded-xl p-3 text-sm ${mine?'ml-auto bg-rose-500/15':'bg-surface-2'}`}>
    <p className="text-[11px] text-muted">{m.author_name} · {timeAgo(m.created_at)}</p><p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>
    {m.interview_at&&<div className="mt-2 rounded-lg border border-amber-500/30 p-2 text-xs"><p className="font-semibold text-amber-300">📅 면접 제안 {m.interview_at.replace('T',' ')}</p>{m.accepted_at?<p className="mt-1 text-emerald-300">확정됨</p>:!mine&&active?<button disabled={sending} onClick={()=>post({action:'interview-accept',messageId:m.id})} className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50">이 날짜로 확정</button>:<p className="mt-1 text-muted">{mine?'상대방의 수락을 기다리는 중':''}</p>}</div>}
   </li>;})}</ul>
   {active&&<form className="space-y-2" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const v=Object.fromEntries(new FormData(form));if(await post({action:'application-message',id:a.id,body:v.body,interview_at:v.interview_at||undefined}))form.reset();}}>
    <textarea name="body" rows={2} maxLength={1000} placeholder="예: 다음 주 화·수 오후 가능하세요?" className={input}/>
    <div className="flex flex-wrap items-end gap-2"><label className="text-xs text-muted">면접 날짜 제안 (선택)<input name="interview_at" type="datetime-local" className={input}/></label><button disabled={sending} className={button}>보내기</button></div>
   </form>}
  </div>}
 </article>;
}

export default function JobApplications({items,me,run,busy,reload}:{items:Item[];me:Me|null;run:Run;busy:boolean;reload:()=>void}){
 const received=items.filter(i=>i.owner_id===me?.id),mine=items.filter(i=>i.owner_id!==me?.id);
 return <>
  {received.length>0&&<section className="space-y-3"><h2 className="font-bold">받은 이력서 {received.length}</h2>{received.map(a=><JobApplication key={a.id} a={a} me={me} run={run} busy={busy} reload={reload}/>)}</section>}
  {mine.length>0&&<section className="space-y-3"><h2 className="font-bold">내 지원 {mine.length}</h2>{mine.map(a=><JobApplication key={a.id} a={a} me={me} run={run} busy={busy} reload={reload}/>)}</section>}
 </>;
}
