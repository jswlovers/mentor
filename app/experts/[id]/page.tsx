"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/client";

type P = {
  id: string; name: string; bio: string; headline: string | null; available: boolean; categories: string[]; avgResponseMinutes: number | null; reviewCount: number; rating: number | null; consultations: number; answers: number;
  reviews: { asker_name: string; rating: number; comment: string | null; created_at: string }[];
};
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default function ExpertProfile() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<P | null | undefined>(undefined);

  useEffect(() => {
    api<P>(`/api/experts/${id}`).then((r) => setP(r.ok ? (r.data as P) : null));
  }, [id]);

  if (p === undefined) return <p className="p-8 text-center text-sm text-muted">불러오는 중…</p>;
  if (p === null) return <p className="p-8 text-center text-sm text-muted">전문가를 찾을 수 없어요.</p>;

  return (
    <div className="mx-auto max-w-xl space-y-4 px-6 py-8">
      <div>
        <h1 className="text-lg font-bold">{p.name} <span className="rounded bg-rose-500/15 px-1.5 py-0.5 align-middle text-xs font-normal text-rose-300">검증 전문가</span></h1>
        <p className="mt-1 text-sm">
          {p.rating !== null ? <><span className="text-amber-400">★</span> <b>{p.rating.toFixed(1)}</b> <span className="text-muted">(후기 {p.reviewCount})</span></> : <span className="text-muted">아직 후기가 없어요</span>}
        </p>
        {p.headline && <p className="mt-1 text-sm">{p.headline}</p>}
        <p className="mt-1 text-xs text-muted">완료한 상담 {p.consultations}건 · 답변 {p.answers}건{p.avgResponseMinutes !== null && ` · 평균 응답 ${p.avgResponseMinutes}분`} · {p.available ? "응대 가능" : "지금은 쉬는 중"}</p>
        {p.categories.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{p.categories.map((c) => <span key={c} className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-muted">{c}</span>)}</p>}
      </div>
      <p className="whitespace-pre-wrap rounded-lg border border-border bg-surface p-3 text-sm">{p.bio}</p>
      <h2 className="text-sm font-semibold">상담 후기</h2>
      <ul className="space-y-2">
        {p.reviews.map((r, i) => (
          <li key={i} className="rounded-lg border border-border bg-surface p-3 text-sm">
            <p><span className="text-amber-400">{stars(r.rating)}</span> <span className="text-xs text-muted">{r.asker_name} · {timeAgo(r.created_at)}</span></p>
            {r.comment && <p className="mt-1 whitespace-pre-wrap">{r.comment}</p>}
          </li>
        ))}
        {p.reviews.length === 0 && <li className="text-sm text-muted">후기가 없어요</li>}
      </ul>
    </div>
  );
}
