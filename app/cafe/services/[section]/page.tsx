import { notFound, redirect } from 'next/navigation';
import { CAFE_SERVICES } from '@/lib/cafeServices';
import ServiceHub from '../../ServiceHub';
export default async function ServicePage({params}:{params:Promise<{section:string}>}){
 const {section}=await params;
 // 맞춤 채용·인재 찾기는 구인구직 화면으로 합쳤다.
 if(section==='matches')redirect('/cafe/jobs');
 if(section==='resumes')redirect('/cafe/jobs?side=seek');
 const service=CAFE_SERVICES.find(s=>s.slug===section);if(!service)notFound();
 if(service.href)redirect(service.href);
 return <ServiceHub section={service.slug}/>;
}
