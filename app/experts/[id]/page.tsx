"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/client";

type P = {
  id: string; name: string; bio: string; reviewCount: number; rating: number | null; consultations: number; answers: number;
  reviews: { asker_name: string; rating: number; comment: string | null; created_at: string }[];
};
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default function ExpertProfile() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<P | null | undefined>(undefined);

  useEffect(() => {
    api<P>(`/api/experts/${id}`).then((r) => setP(r.ok ? (r.data as P) : null));
  }, [id]);

  if (p === undefined) return <p className="p-8 text-center text-sm text-neutral-400">불러오는 중…</p>;
  if (p === null) return <p className="p-8 text-center text-sm text-neutral-500">전문가를 찾을 수 없어요.</p>;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-lg font-bold">{p.name} <span className="rounded bg-rose-100 px-1.5 py-0.5 align-middle text-xs font-normal text-rose-700">검증 전문가</span></h1>
        <p className="mt-1 text-sm">
          {p.rating !== null ? <><span className="text-amber-500">★</span> <b>{p.rating.toFixed(1)}</b> <span className="text-neutral-500">(후기 {p.reviewCount})</span></> : <span className="text-neutral-400">아직 후기가 없어요</span>}
        </p>
        <p className="mt-1 text-xs text-neutral-500">완료한 상담 {p.consultations}건 · 답변 {p.answers}건</p>
      </div>
      <p className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 text-sm">{p.bio}</p>
      <h2 className="text-sm font-semibold">상담 후기</h2>
      <ul className="space-y-2">
        {p.reviews.map((r, i) => (
          <li key={i} className="rounded-lg border p-3 text-sm">
            <p><span className="text-amber-500">{stars(r.rating)}</span> <span className="text-xs text-neutral-500">{r.asker_name} · {timeAgo(r.created_at)}</span></p>
            {r.comment && <p className="mt-1 whitespace-pre-wrap">{r.comment}</p>}
          </li>
        ))}
        {p.reviews.length === 0 && <li className="text-sm text-neutral-400">후기가 없어요</li>}
      </ul>
    </div>
  );
}
