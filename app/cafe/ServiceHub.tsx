"use client";
import Link from 'next/link';
import { useCallback,useEffect,useState } from 'react';
import { api,jsonInit,useMe } from '@/lib/client';
import { CAFE_REGIONS } from '@/lib/cafe';
import { CAFE_SERVICES } from '@/lib/cafeServices';
import { type ServiceData,input,button,card } from './service-ui';
import MemberPanels from './MemberPanels';
import MarketPanels from './MarketPanels';
export default function ServiceHub({section}:{section:typeof CAFE_SERVICES[number]['slug']}){
 const {me}=useMe();const service=CAFE_SERVICES.find(s=>s.slug===section)!;
 const [data,setData]=useState<ServiceData|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[q,setQ]=useState(''),[region,setRegion]=useState(''),[category,setCategory]=useState(''),[thread,setThread]=useState<number|null>(null);
 const isMarket=['market','cart','orders','selling','product-inbox'].includes(section);
 const area=section==='market'?'products':section==='activity'?'applications':section==='resumes'?'members':section;
 const load=useCallback(async()=>{
  try{const sp=new URLSearchParams({area,q,region,category,resumes:section==='resumes'?'1':'0'});if(thread)sp.set('id',String(thread));const r=await api<ServiceData>(`/api/cafe/${isMarket?'market':'services'}?${sp}`);if(r.ok){setData(r.data);setError('');}else {setData(null);setError(r.data.error||'내용을 불러오지 못했어요');}}
  catch{setError('연결을 확인하고 다시 시도해주세요');}
 },[area,q,region,category,thread,section,isMarket]);
 useEffect(()=>{const timer=setTimeout(()=>load(),200);return()=>clearTimeout(timer);},[load,me?.id]);
 const run=async(value:Record<string,unknown>)=>{
  setBusy(true);setError('');setNotice('');
  try{const {photo,...payload}=value;const r=await api<{id?:number;ids?:number[]}>(`/api/cafe/${isMarket?'market':'services'}`,jsonInit('POST',payload));if(!r.ok){setError(r.data.error||'처리하지 못했어요');return false;}if(value.action==='product' && photo instanceof File && photo.size){const form=new FormData();form.set('photo',photo);const upload=await api(`/api/cafe/market/${r.data.id||value.id}/photo`,{method:'POST',body:form});if(!upload.ok){setError('상품 정보는 저장됐지만 사진은 저장하지 못했어요. 상품 수정에서 다시 첨부해주세요.');await load();return false;}}setNotice(value.action==='checkout'?`주문 ${r.data.ids?.map(id=>'#'+id).join(', ')} 접수 완료. 주문·배송에서 입금 계좌를 확인해주세요.`:'저장했습니다.');await load();return true;}
  catch{setError('연결을 확인해주세요');return false;}finally{setBusy(false);}
 };
 const publicPage=['members','resumes','market'].includes(section);
 return <div className="space-y-5 px-6 py-8 md:px-10">
  <Link href="/cafe" className="text-sm text-rose-400">← 라운지</Link><h1 className="text-2xl font-bold">{service.name}</h1><p className="text-sm text-muted">{service.description}</p>
  <nav aria-label="라운지 서비스" className="flex gap-2 overflow-x-auto pb-2">{CAFE_SERVICES.map(s=><Link key={s.slug} href={`/cafe/services/${s.slug}`} aria-current={s.slug===section?'page':undefined} className={`${button} shrink-0 ${s.slug===section?'bg-rose-500/15 text-rose-300':''}`}>{s.name}</Link>)}</nav>
  {error&&<p role="alert" className="text-sm text-rose-300">{error}<button onClick={load} className="ml-3 underline">다시 시도</button></p>}{notice&&<p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}
  {!publicPage&&!me?<p className={card}>{me===undefined?'회원 확인 중…':<><Link href="/login" className="text-rose-400 underline">로그인</Link> 후 이용해주세요.</>}</p>:<>
   {['members','resumes','market'].includes(section)&&<div className="flex flex-wrap gap-3"><input aria-label="검색" placeholder={section==='market'?'상품명 검색':'이름·분야 검색'} value={q} onChange={e=>setQ(e.target.value)} className={`${input} flex-1`}/>{section==='market'?<select aria-label="상품 분류" value={category} onChange={e=>setCategory(e.target.value)} className={input+' sm:w-auto'}><option value="">전체 상품</option>{data?.categories?.map(c=><option key={c}>{c}</option>)}</select>:<select aria-label="지역 검색" value={region} onChange={e=>setRegion(e.target.value)} className={input+' sm:w-auto'}><option value="">전체 지역</option>{CAFE_REGIONS.map(r=><option key={r}>{r}</option>)}</select>}</div>}
   {data?(isMarket?<MarketPanels section={section} data={data} me={me||null} run={run} busy={busy}/>:<MemberPanels section={section} data={data} me={me||null} run={run} busy={busy} thread={thread} setThread={setThread} reload={load}/>):!error&&<p className="text-sm text-muted">불러오는 중…</p>}
  </>}
 </div>;
}
