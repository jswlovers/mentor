import type { Metadata } from "next";
import Link from "next/link";
import JobsBoard from "../JobsBoard";
import CafeServiceNav from "../CafeServiceNav";
export const metadata: Metadata = { title: "구인구직 | 미용 SOS 라운지", description: "미용실 구인 공고와 구직 글을 지역 지도로 찾아보세요." };
export default async function JobsPage({ searchParams }: { searchParams: Promise<{ side?: string }> }) {
    const { side } = await searchParams;
    return <div className="space-y-5 px-6 py-8 md:px-10">
        <Link href="/cafe" className="text-sm text-rose-400">← 라운지</Link>
        <div><h1 className="text-2xl font-bold">구인구직</h1><p className="mt-1 text-sm text-muted">구인·구직을 고르고 지도에서 지역을 눌러 가까운 일자리와 인재를 찾아보세요. 공고에는 저장해 둔 이력서로 바로 지원할 수 있어요.</p></div>
        <CafeServiceNav current="jobs" />
        <JobsBoard initialSide={side === "seek" ? "seek" : "hire"} />
    </div>;
}
