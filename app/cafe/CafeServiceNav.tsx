import Link from 'next/link';
import { CAFE_SERVICES, serviceHref } from '@/lib/cafeServices';
import { button } from './service-ui';
// 라운지 서비스 상단 메뉴. 하위 메뉴가 있는 카테고리는 그 아래에 탭을 함께 보여준다.
export default function CafeServiceNav({current}:{current:string}){
 const service=CAFE_SERVICES.find(s=>s.slug===current)!;
 const top=service.parent??service.slug,parent=CAFE_SERVICES.find(s=>s.slug===top)!,subTabs=CAFE_SERVICES.filter(s=>s.slug===top||s.parent===top);
 return <>
  <nav aria-label="라운지 서비스" className="flex gap-2 overflow-x-auto pb-2">{CAFE_SERVICES.filter(s=>!s.parent).map(s=><Link key={s.slug} href={serviceHref(s)} aria-current={s.slug===top?'page':undefined} className={`${button} shrink-0 ${s.slug===top?'bg-rose-500/15 text-rose-300':''}`}>{s.name}</Link>)}</nav>
  {subTabs.length>1&&<nav aria-label={`${parent.name} 메뉴`} className="flex gap-2 overflow-x-auto border-b border-border">{subTabs.map(s=><Link key={s.slug} href={serviceHref(s)} aria-current={s.slug===current?'page':undefined} className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-bold ${s.slug===current?'border-rose-400 text-rose-300':'border-transparent text-muted hover:text-foreground'}`}>{s.tab??s.name}</Link>)}</nav>}
 </>;
}
