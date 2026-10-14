import type { Metadata } from "next";
import Link from "next/link";
import CafeEditor from "../CafeEditor";
export const metadata: Metadata = { title: "미용카페 글쓰기 | 미용 SOS" };
export default async function WritePage({ searchParams }: {
    searchParams: Promise<{
        board?: string;
    }>;
}) { const { board } = await searchParams; return <div className="space-y-5 px-6 py-8 md:px-10"><Link href="/cafe" className="text-sm text-rose-400">← 미용카페</Link><h1 className="text-2xl font-bold">새 이야기 남기기</h1><CafeEditor initialBoard={board}/></div>; }
