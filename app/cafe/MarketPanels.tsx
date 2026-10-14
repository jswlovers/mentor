"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { Me } from '@/lib/client';
import { type Item,type ServiceData,type Run,Field,input,button,card,values,submit } from './service-ui';
import OrderPanel from './OrderPanel';
export default function MarketPanels({section,data,me,run,busy}:{section:string;data:ServiceData;me:Me|null;run:Run;busy:boolean}){
 const items=data.items||[];
 const [inquiry,setInquiry]=useState<number|string|null>(null);
 const [edit,setEdit]=useState<Item|null>(null),[register,setRegister]=useState(false),[requestKey,setRequestKey]=useState('');
 return <>
  {section==='market'&&<div className="grid gap-3 sm:grid-cols-2">{items.map(i=><article key={i.id} className={card}><p className="text-xs text-rose-300">{i.category} · {i.seller_name}</p>{i.has_photo ? <Image unoptimized width={400} height={300} src={`/api/cafe/market/${i.id}/photo`} alt={i.title||"상품 사진"} className="mt-3 h-48 w-full rounded-xl object-cover"/> : null}<h2 className="mt-2 font-bold">{i.title}</h2><p className="mt-3 whitespace-pre-wrap text-sm text-muted">{i.body}</p><p className="mt-3 text-sm">{i.price?.toLocaleString()}원 · 재고 {i.stock}개 · 배송비 {i.shipping?.toLocaleString()}원</p><button disabled={busy||!me||!i.stock||i.seller_id===me?.id} onClick={()=>run({action:'cart',productId:i.id,quantity:1})} className={button+' mt-4'}>장바구니 담기</button><button disabled={busy||!me||i.seller_id===me?.id} onClick={()=>setInquiry(inquiry===i.id?null:i.id)} className={button+" ml-2 mt-3"}>상품 문의</button>{inquiry===i.id&&<form className="mt-3 space-y-3" onSubmit={submit(run,"product-inquiry",{productId:i.id})}><Field name="question" label="비공개 상품 문의" type="textarea"/><button disabled={busy} className={button}>문의 접수</button></form>}{i.reviews?.map((r,j)=><p key={j} className="mt-3 text-xs text-muted">★ {r.rating} · {r.body}</p>)}</article>)}</div>}
  {section==='selling'&&<>
   <button onClick={()=>{setEdit(null);setRegister(!register);}} className={button}>상품 등록</button>
   {(register||edit)&&<form key={edit?.id||'new'} className={card+' space-y-4'} onSubmit={async e=>{e.preventDefault();if(await run({...values(e.currentTarget),action:'product',id:edit?.id})){setEdit(null);setRegister(false);}}}>
    <Field name="title" label="상품명" value={edit?.title}/><Field name="body" label="상품 설명·배송·환불 안내" type="textarea" value={edit?.body}/>
    <label className="block text-sm">분류<select name="category" defaultValue={edit?.category} className={input}>{data.categories?.map(c=><option key={c}>{c}</option>)}</select></label>
    <div className="grid gap-4 sm:grid-cols-3"><Field name="price" label="판매가 (원)" type="number" value={edit?.price||0}/><Field name="stock" label="재고" type="number" value={edit?.stock||0}/><Field name="shipping" label="배송비 (원)" type="number" value={edit?.shipping||0}/></div>
    <label className="block text-sm">상품 사진 (최대 5MB)<input name="photo" type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block max-w-full text-xs"/></label><Field name="bank" label="입금은행·계좌·예금주 (주문 당사자에게만 표시)" value={edit?.bank}/><button disabled={busy} className={button}>상품 저장</button>
   </form>}
   {items.map(i=><article key={i.id} className={card}><h2 className="font-bold">{i.title}</h2><p className="my-2 text-sm text-muted">{i.price?.toLocaleString()}원 · 재고 {i.stock} · {i.status==='active'?'판매 중':'판매 중지'}</p><div className="flex gap-2"><button onClick={()=>{setEdit(i);setRegister(false);}} className={button}>수정</button><button disabled={busy} onClick={()=>run({action:'product-status',id:i.id,status:i.status==='active'?'hidden':'active'})} className={button}>{i.status==='active'?'판매 중지':'판매 재개'}</button></div></article>)}
  </>}
  {section==='cart'&&<>
   {items.map(i=><article key={i.id} className={card}><h2 className="font-bold">{i.title}</h2><p className="mt-2 text-sm">{i.seller_name} · {i.price?.toLocaleString()}원 · 재고 {i.stock}개</p><label className="mt-3 block text-sm">수량<input type="number" aria-label={`${i.title} 수량`} min={1} max={Math.min(100,i.stock||0)} defaultValue={i.quantity} onBlur={e=>{if(Number(e.target.value)!==i.quantity)run({action:'cart',productId:i.id,quantity:Number(e.target.value)});}} className={input}/></label><button disabled={busy} onClick={()=>run({action:'cart',productId:i.id,quantity:0})} className={button+' mt-3'}>장바구니에서 빼기</button></article>)}
   {items.length>0&&<form className={card+' space-y-4'} onSubmit={async e=>{e.preventDefault();const key=requestKey||crypto.randomUUID();setRequestKey(key);if(await run({...values(e.currentTarget),action:'checkout',requestKey:key,quote:items.map(i=>({id:i.id,price:i.price,shipping:i.shipping,quantity:i.quantity}))}))setRequestKey('');}}>
    <h2 className="font-bold">배송지·주문</h2><p className="text-sm font-bold">주문 총액 {(items.reduce((sum,i)=>sum+(i.price||0)*(i.quantity||0),0)+Array.from(new Set(items.map(i=>i.seller_id))).reduce((sum,seller)=>sum+Math.max(...items.filter(i=>i.seller_id===seller).map(i=>i.shipping||0)),0)).toLocaleString()}원 (배송비 포함)</p><p className="text-xs text-muted">같은 판매자의 배송비는 가장 큰 배송비로 한 번 부과됩니다. 주문 후 계좌를 확인하고 입금해주세요.</p>
    <Field name="recipient" label="수령인"/><Field name="phone" label="연락처" type="tel"/><Field name="address" label="배송 주소·상세 주소"/>
    <button disabled={busy} className="rounded-xl bg-rose-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">주문 접수</button><Link href="/cafe/services/orders" className="ml-3 text-sm text-rose-300 underline">주문·배송 보기</Link>
   </form>}
  </>}
  {section==='product-inbox'&&items.map(i=><article key={i.id} className={card}><h2 className="font-bold">{i.title}</h2><p className="mt-3 whitespace-pre-wrap text-sm">{i.question}</p><p className="mt-3 whitespace-pre-wrap text-sm text-rose-300">{i.answer||"답변 대기"}</p>{i.seller_id===me?.id&&<form onSubmit={submit(run,"product-answer",{id:i.id})} className="mt-3 space-y-3"><Field name="answer" label="판매자 답변" value={i.answer} type="textarea"/><button disabled={busy} className={button}>답변 저장</button></form>}</article>)}
  {section==='orders'&&items.map(i=><OrderPanel key={i.id} order={i} me={me} run={run} busy={busy}/>)}
  {items.length===0&&<p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">아직 등록된 내역이 없어요.</p>}
 </>;
}
