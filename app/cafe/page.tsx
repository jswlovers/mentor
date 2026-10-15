import type { Metadata } from 'next';
import Link from 'next/link';
import CafeFeed from './CafeFeed';
import CafeCalendar from './CafeCalendar';
import { CAFE_SERVICES, serviceHref } from '@/lib/cafeServices';
export const metadata:Metadata={title:'라운지 | 미용 SOS',description:'미용인 소통, 기술 교육, 채용, 모델·봉사 모집, 쇼핑과 회원 활동을 한 곳에서.'};
export default async function CafePage({searchParams}:{searchParams:Promise<{board?:string}>}) {
 const {board}=await searchParams;
 return <div className="pb-16">
  <section className="border-b border-border bg-surface px-6 py-10 md:px-10">
   <p className="text-xs font-bold tracking-widest text-rose-400">BEAUTY LOUNGE</p><h1 className="mt-2 text-3xl font-extrabold">라운지</h1>
   <p className="mt-3 text-sm text-muted">이야기와 배움부터 일자리, 쇼핑, 동료와의 만남까지.</p>
   <nav aria-label="라운지 서비스" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
    {CAFE_SERVICES.filter(service=>service.slug!=='recent'&&!service.parent).map((service,i)=><Link key={service.slug} href={serviceHref(service)} className={`rounded-xl border p-3 hover:border-rose-400/50 ${i<2?'border-rose-400/40 bg-rose-500/10':'border-border bg-surface-2'}`}><p className={`text-sm font-bold ${i<2?'text-rose-300':''}`}>{service.name}</p><p className="mt-1 text-[11px] text-muted">{service.description}</p></Link>)}
   </nav>
  </section>
  <div className="space-y-10 px-6 pt-8 md:px-10"><CafeFeed initialBoard={board}/><CafeCalendar/></div>
 </div>;
}
