import { notFound } from 'next/navigation';
import { CAFE_SERVICES } from '@/lib/cafeServices';
import ServiceHub from '../../ServiceHub';
export default async function ServicePage({params}:{params:Promise<{section:string}>}){
 const {section}=await params;const service=CAFE_SERVICES.find(s=>s.slug===section);if(!service)notFound();
 return <ServiceHub section={service.slug}/>;
}
