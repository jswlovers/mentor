"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, CATEGORIES, won } from "@/lib/client";
import Avatar from "../components/Avatar";
import { TIER_KEYS, TIERS } from "@/lib/server/pricing";

type E = {
  id: string; name: string; headline: string | null; bio: string; categories: string[]; available: boolean; offHours: string | null; salon: string | null; photoUrl: string | null;
  rating: number | null; reviewCount: number; consultations: number; avgResponseMinutes: number | null;
};
const SORTS = [["rating", "평점순"], ["responses", "상담 많은 순"], ["recent", "신규순"]] as const;

export default function Experts() {
  const [list, setList] = useState<E[] | null>(null);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("rating");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      const sp = new URLSearchParams({ sort });
      if (category) sp.set("category", category);
      if (q.trim()) sp.set("q", q.trim());
      if (onlyAvailable) sp.set("available", "1");
      api<E[]>(`/api/experts?${sp}`).then((r) => setList(r.ok ? (r.data as unknown as E[]) : []));
    }, 200);
    return () => clearTimeout(t);
  }, [category, sort, q, onlyAvailable]);

  return (
    <div>
      <div className="space-y-2 border-b border-border px-6 py-4 md:px-10">
        <h1 className="text-lg font-bold">전문가 찾기</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·직장명·소개로 검색" className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted" />
        <div className="flex gap-2 overflow-x-auto">
          {["", ...CATEGORIES].map((c) => (
            <button key={c || "all"} onClick={() => setCategory(c)} className={`shrink-0 rounded-full border px-3 py-1 text-sm transition ${category === c ? "border-rose-500 bg-rose-500 text-white" : "border-border text-muted hover:text-foreground"}`}>{c || "전체"}</button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2" aria-label="답변 등급 안내">
          {TIER_KEYS.map((k) => (
            <div key={k} className="rounded-xl border border-border px-2 py-1.5 text-center">
              <b className="block text-xs">{TIERS[k].label} <span className="font-normal text-rose-300">{won(TIERS[k].fee)}</span></b>
              <span className="block text-[11px] text-muted">{TIERS[k].media === "video" ? "글·사진 + 🎬 시연 영상" : TIERS[k].media === "photo" ? "글 + 📷 사진·자료" : "✍️ 글 답변"}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted">상담을 신청할 때 답변 등급을 고르면, 등급에 맞는 자료로 답변을 받아요.</p>
        <div className="flex items-center gap-3 text-xs">
          {SORTS.map(([k, label]) => <button key={k} onClick={() => setSort(k)} className={sort === k ? "font-bold text-rose-400" : "text-muted"}>{label}</button>)}
          <label className="ml-auto flex items-center gap-1 text-muted">
            <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} /> 지금 응대 가능만
          </label>
        </div>
      </div>
      <ul className="grid gap-3 px-6 py-4 md:grid-cols-2 md:px-10">
        {list?.map((e) => (
          <li key={e.id} className="overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-white/20">
            <Link href={`/experts/${e.id}${category ? `?category=${encodeURIComponent(category)}` : ""}`} className="flex gap-3 p-4 transition hover:bg-surface-2">
              <Avatar name={e.name} url={e.photoUrl} size={48} />
              <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <b>{e.name}</b>
                <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[11px] text-rose-300">검증 전문가</span>
                <span className={`text-[11px] ${e.available ? "text-emerald-400" : "text-muted"}`}>{e.available ? "● 응대 가능" : "○ 쉬는 중"}</span>
                {e.offHours && <span className="text-[11px] text-muted">🌙 {e.offHours} 불가</span>}
              </div>
              {e.salon && <p className="mt-0.5 text-xs text-foreground/80">🏢 {e.salon}</p>}
              {e.headline && <p className="mt-0.5 text-sm">{e.headline}</p>}
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{e.bio}</p>
              <p className="mt-1 text-xs text-foreground/80">
                {e.rating !== null ? <><span className="text-amber-400">★</span> {e.rating.toFixed(1)} ({e.reviewCount})</> : "후기 없음"}
                {" · "}상담 {e.consultations}건
                {e.avgResponseMinutes !== null && ` · 평균 응답 ${e.avgResponseMinutes}분`}
              </p>
              {e.categories.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{e.categories.map((c) => <span key={c} className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-muted">{c}</span>)}</p>}
              </div>
            </Link>
            <Link href={`/ask?expert=${e.id}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
              className={`block border-t border-border px-4 py-2 text-center text-sm font-medium transition ${e.available ? "text-rose-400 hover:bg-rose-500/10" : "text-muted hover:bg-surface-2"}`}>
              {e.available ? `${e.name} 전문가에게 질문하기${category ? ` (${category})` : ""}` : "질문 남기기 (지금은 쉬는 중)"}
            </Link>
          </li>
        ))}
        {list && list.length === 0 && <li className="p-8 text-center text-sm text-muted md:col-span-2">조건에 맞는 전문가가 없어요.</li>}
        {!list && <li className="p-8 text-center text-sm text-muted md:col-span-2">불러오는 중…</li>}
      </ul>
    </div>
  );
}
