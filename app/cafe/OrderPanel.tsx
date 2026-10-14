"use client";
import type { Me } from '@/lib/client';
import { CAFE_ORDER_STATUS } from '@/lib/cafeServices';
import { type Item,type Run,Field,input,button,card,submit } from './service-ui';
export default function OrderPanel({order:i,me,run,busy}:{order:Item;me:Me|null;run:Run;busy:boolean}){
 return <article className={card}>
  <h2 className="font-bold">주문 #{i.id} · {CAFE_ORDER_STATUS[i.status||'']}</h2><p className="mt-2 text-xs text-muted">구매자 {i.buyer_name} · 판매자 {i.seller_name}</p>
  {i.items?.map(p=><p key={p.id} className="mt-2 text-sm">{p.title} × {p.quantity} · {(p.price*p.quantity).toLocaleString()}원</p>)}
  <p className="mt-3 font-bold">총 {i.total?.toLocaleString()}원</p><p className="mt-2 text-sm text-muted">{i.recipient} · {i.phone}<br/>{i.address}</p><p className="mt-2 text-sm">입금 안내: {i.bank}</p>{i.tracking&&<p className="mt-2 text-sm text-rose-300">배송 정보: {i.tracking}</p>}
  <div className="mt-4 flex flex-wrap gap-2">
   {i.buyer_id===me?.id&&<>
    {i.status==='awaiting_payment'&&<><button disabled={busy} onClick={()=>run({action:'order-status',id:i.id,status:'payment_submitted'})} className={button}>입금 확인 요청</button><button disabled={busy} onClick={()=>run({action:'order-status',id:i.id,status:'cancelled'})} className={button}>주문 취소</button></>}
    {i.status==='shipped'&&<button disabled={busy} onClick={()=>run({action:'order-status',id:i.id,status:'completed'})} className={button}>수령·구매 확정</button>}
    {['payment_submitted','paid','shipped','completed'].includes(i.status||'')&&<button disabled={busy} onClick={()=>run({action:'order-status',id:i.id,status:'refund_requested'})} className={button}>환불 요청</button>}
   </>}
   {i.seller_id===me?.id&&<>
    {['awaiting_payment','payment_submitted'].includes(i.status||'')&&<button disabled={busy} onClick={()=>run({action:'order-status',id:i.id,status:'paid'})} className={button}>실제 입금 확인 완료</button>}
    {i.status==='payment_submitted'&&<button disabled={busy} onClick={()=>run({action:'order-status',id:i.id,status:'awaiting_payment'})} className={button}>미입금·확인 요청 반려</button>}
    {i.status==='refund_requested'&&<button disabled={busy} onClick={()=>run({action:'order-status',id:i.id,status:'refunded'})} className={button}>실제 환불 완료 처리</button>}
   </>}
  </div>
  {i.seller_id===me?.id&&i.status==='paid'&&<form className="mt-4 space-y-3" onSubmit={submit(run,'order-status',{id:i.id,status:'shipped'})}><Field name="tracking" label="택배사·송장 번호"/><button disabled={busy} className={button}>발송 처리</button></form>}
  {i.buyer_id===me?.id&&i.status==='completed'&&!i.reviews?.length&&<form className="mt-4 space-y-3" onSubmit={submit(run,'review',{id:i.id})}><label className="block text-sm">별점<select name="rating" className={input}>{[5,4,3,2,1].map(n=><option key={n}>{n}</option>)}</select></label><Field name="body" label="구매 후기" type="textarea"/><button disabled={busy} className={button}>후기 등록</button></form>}
  {i.reviews?.map((r,j)=><p key={j} className="mt-3 text-sm text-muted">★ {r.rating} · {r.body}</p>)}
  <section className="mt-5 space-y-3"><h3 className="font-bold">주문 문의·답변</h3>{i.messages?.map(m=><p key={m.id} className="rounded-xl bg-surface-2 p-3 text-sm"><span className="text-xs text-muted">{m.name}</span><br/>{m.body}</p>)}<form onSubmit={submit(run,'order-message',{id:i.id})} className="space-y-3"><Field name="message" label="주문 문의·답변 내용" type="textarea"/><button disabled={busy} className={button}>보내기</button></form></section>
  <p className="mt-3 text-xs text-muted">계좌 입금과 환불은 당사자가 진행하고, 판매자가 실제 처리 여부를 확인합니다.</p>
 </article>;
}
