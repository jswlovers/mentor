"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, CATEGORIES } from "@/lib/client";

type E = {
  id: string; name: string; headline: string | null; bio: string; categories: string[]; available: boolean;
  rating: number | null; reviewCount: number; consultations: number; avgResponseMinutes: number | null;
};
const SORTS = [["rating", "평점순"], ["responses", "상담 많은 순"], ["recent", "신규순"]] as const;

export default function Experts() {
  const [list, setList] = useState<E[] | null>(null);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("rating");
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      const sp = new URLSearchParams({ sort });
      if (category) sp.set("category", category);
      if (q.trim()) sp.set("q", q.trim());
      api<E[]>(`/api/experts?${sp}`).then((r) => setList(r.ok ? (r.data as unknown as E[]) : []));
    }, 200);
    return () => clearTimeout(t);
  }, [category, sort, q]);

  return (
    <div>
      <div className="space-y-2 border-b border-border px-6 py-4 md:px-10">
        <h1 className="text-lg font-bold">전문가 찾기</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·소개로 검색" className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted" />
        <div className="flex gap-2 overflow-x-auto">
          {["", ...CATEGORIES].map((c) => (
            <button key={c || "all"} onClick={() => setCategory(c)} className={`shrink-0 rounded-full border px-3 py-1 text-sm transition ${category === c ? "border-rose-500 bg-rose-500 text-white" : "border-border text-muted hover:text-foreground"}`}>{c || "전체"}</button>
          ))}
        </div>
        <div className="flex gap-3 text-xs">
          {SORTS.map(([k, label]) => <button key={k} onClick={() => setSort(k)} className={sort === k ? "font-bold text-rose-400" : "text-muted"}>{label}</button>)}
        </div>
      </div>
      <ul className="grid gap-3 px-6 py-4 md:grid-cols-2 md:px-10">
        {list?.map((e) => (
          <li key={e.id}>
            <Link href={`/experts/${e.id}`} className="block rounded-2xl border border-border bg-surface p-4 transition hover:border-white/20 hover:bg-surface-2">
              <div className="flex items-center gap-1.5">
                <b>{e.name}</b>
                <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[11px] text-rose-300">검증 전문가</span>
                <span className={`text-[11px] ${e.available ? "text-emerald-400" : "text-muted"}`}>{e.available ? "● 응대 가능" : "○ 쉬는 중"}</span>
              </div>
              {e.headline && <p className="mt-0.5 text-sm">{e.headline}</p>}
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{e.bio}</p>
              <p className="mt-1 text-xs text-foreground/80">
                {e.rating !== null ? <><span className="text-amber-400">★</span> {e.rating.toFixed(1)} ({e.reviewCount})</> : "후기 없음"}
                {" · "}상담 {e.consultations}건
                {e.avgResponseMinutes !== null && ` · 평균 응답 ${e.avgResponseMinutes}분`}
              </p>
              {e.categories.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{e.categories.map((c) => <span key={c} className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-muted">{c}</span>)}</p>}
            </Link>
          </li>
        ))}
        {list && list.length === 0 && <li className="p-8 text-center text-sm text-muted md:col-span-2">조건에 맞는 전문가가 없어요.</li>}
        {!list && <li className="p-8 text-center text-sm text-muted md:col-span-2">불러오는 중…</li>}
      </ul>
    </div>
  );
}
