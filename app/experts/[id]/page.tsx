"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/client";
import Avatar from "../../components/Avatar";

type Review = { id: number; asker_name: string; rating: number; comment: string | null; created_at: string; category: string | null };
type P = {
  id: string; name: string; bio: string; headline: string | null; available: boolean; offHours: string | null; salon: string | null; photoUrl: string | null; categories: string[];
  years: number | null; licenseVerified: boolean; medianResponseMinutes: number | null; reviewCount: number; rating: number | null; consultations: number; answers: number;
  portfolio: { id: number; caption: string | null; url: string }[];
  reviewCategories: { category: string; n: number }[];
  reviews: Review[]; reviewsHasMore: boolean;
};
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default function ExpertProfile() {
  const { id } = useParams<{ id: string }>();
  const category = useSearchParams().get("category"); // 전문가 찾기에서 고른 분야
  const [p, setP] = useState<P | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [rcat, setRcat] = useState(""); // 후기 분야 필터
  const [zoom, setZoom] = useState<P["portfolio"][number] | null>(null);

  const loadProfile = useCallback(() => {
    api<P>(`/api/experts/${id}`).then((r) => {
      setFailed(!r.ok && r.status !== 404);
      setP(r.ok ? (r.data as P) : null);
      if (r.ok) { setReviews(r.data.reviews); setHasMore(r.data.reviewsHasMore); }
    }).catch(() => { setFailed(true); setP(null); });
  }, [id]);
  useEffect(() => { loadProfile(); }, [loadProfile]);

  const loadReviews = async (cat: string, before: number) => {
    const sp = new URLSearchParams({ before: String(before) });
    if (cat) sp.set("category", cat);
    const r = await api<{ items: Review[]; hasMore: boolean }>(`/api/experts/${id}/reviews?${sp}`).catch(() => null);
    if (!r?.ok) return;
    setReviews((prev) => (before ? [...prev, ...r.data.items] : r.data.items));
    setHasMore(r.data.hasMore);
  };
  const pickCategory = (c: string) => { setRcat(c); loadReviews(c, 0); };

  if (p === undefined) return <p className="p-8 text-center text-sm text-muted">불러오는 중…</p>;
  if (p === null) return (
    <div className="space-y-2 p-8 text-center text-sm text-muted">
      <p>{failed ? "프로필을 불러오지 못했어요. 인터넷 연결을 확인해 주세요." : "전문가를 찾을 수 없어요."}</p>
      {failed && <button onClick={() => { setP(undefined); loadProfile(); }} className="rounded-lg border border-border px-4 py-1.5 text-foreground hover:border-white/30">다시 시도</button>}
      <p><Link href="/experts" className="text-rose-400 underline">전문가 찾기로 돌아가기</Link></p>
    </div>
  );

  return (
    <div className="mx-auto max-w-xl space-y-4 px-6 py-8">
      <div className="flex items-start gap-4">
      <Avatar name={p.name} url={p.photoUrl} size={88} />
      <div className="min-w-0">
        <h1 className="text-lg font-bold">{p.name} <span className="rounded bg-rose-500/15 px-1.5 py-0.5 align-middle text-xs font-normal text-rose-300">검증 전문가</span>
          {p.licenseVerified && <span className="ml-1 rounded bg-emerald-500/15 px-1.5 py-0.5 align-middle text-xs font-normal text-emerald-300">면허 확인</span>}</h1>
        {(p.salon || p.years != null) && <p className="mt-0.5 text-sm text-foreground/80">{p.years != null && `경력 ${p.years}년`}{p.years != null && p.salon && " · "}{p.salon && `🏢 ${p.salon}`}</p>}
        <p className="mt-1 text-sm">
          {p.rating !== null ? <><span className="text-amber-400">★</span> <b>{p.rating.toFixed(1)}</b> <span className="text-muted">(후기 {p.reviewCount})</span></> : <span className="text-muted">아직 후기가 없어요</span>}
        </p>
        {p.headline && <p className="mt-1 text-sm">{p.headline}</p>}
        <p className="mt-1 text-xs text-muted">완료한 상담 {p.consultations}건 · 답변 {p.answers}건{p.medianResponseMinutes !== null && ` · 보통 ${p.medianResponseMinutes}분 안에 응답`} · {p.available ? "응대 가능" : "지금은 쉬는 중"}{p.offHours && ` · 상담 불가 ${p.offHours}`}</p>
        <p className="mt-1 flex flex-wrap gap-1">
          {p.categories.length > 0
            ? p.categories.map((c) => <span key={c} className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-muted">{c}</span>)
            : <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-muted">전 분야</span>}
        </p>
      </div>
      </div>
      <Link href={`/ask?expert=${p.id}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
        className={`block rounded-lg py-3 text-center font-medium transition ${p.available ? "bg-rose-500 text-white hover:bg-rose-400" : "border border-border text-foreground hover:border-white/30"}`}>
        {p.available ? `${p.name} 전문가에게 질문하기${category ? ` (${category})` : ""}` : "질문 남기기 (지금은 쉬는 중이에요)"}
      </Link>
      <p className="whitespace-pre-wrap rounded-lg border border-border bg-surface p-3 text-sm">{p.bio}</p>

      {p.portfolio.length > 0 && (
        <>
          <h2 className="text-sm font-semibold">작업 사진 <span className="font-normal text-muted">{p.portfolio.length}</span></h2>
          <ul className="grid grid-cols-3 gap-2">
            {p.portfolio.map((ph) => (
              <li key={ph.id}>
                <button onClick={() => setZoom(ph)} className="block w-full" aria-label={ph.caption ?? "작업 사진 크게 보기"}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ph.url} alt={ph.caption ?? "작업 사진"} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
                </button>
                {ph.caption && <p className="mt-0.5 truncate text-[11px] text-muted">{ph.caption}</p>}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="text-sm font-semibold">상담 후기 <span className="font-normal text-muted">{p.reviewCount}</span></h2>
      {p.reviewCategories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {[{ category: "", n: p.reviewCount }, ...p.reviewCategories].map((c) => (
            <button key={c.category || "all"} onClick={() => pickCategory(c.category)} aria-pressed={rcat === c.category}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${rcat === c.category ? "border-rose-500 bg-rose-500 text-white" : "border-border text-muted hover:text-foreground"}`}>
              {c.category || "전체"} {c.n}
            </button>
          ))}
        </div>
      )}
      <ul className="space-y-2">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
            <p><span className="text-amber-400">{stars(r.rating)}</span> <span className="text-xs text-muted">{r.asker_name} · {timeAgo(r.created_at)}</span>
              {r.category && <span className="ml-1 rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-muted">{r.category}</span>}</p>
            {r.comment && <p className="mt-1 whitespace-pre-wrap">{r.comment}</p>}
          </li>
        ))}
        {reviews.length === 0 && <li className="text-sm text-muted">후기가 없어요</li>}
      </ul>
      {hasMore && (
        <button onClick={() => loadReviews(rcat, reviews[reviews.length - 1].id)} className="w-full rounded-lg border border-border py-2 text-sm text-foreground hover:border-white/30">후기 더 보기</button>
      )}

      {zoom && (
        <div role="dialog" aria-modal="true" aria-label="작업 사진" onClick={() => setZoom(null)} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-black/85 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.url} alt={zoom.caption ?? "작업 사진"} className="max-h-[80vh] max-w-full rounded-lg object-contain" />
          {zoom.caption && <p className="text-sm text-white">{zoom.caption}</p>}
          <button className="text-sm text-white/80 underline">닫기</button>
        </div>
      )}
    </div>
  );
}
