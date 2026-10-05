"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

// "지금 응대 가능한 전문가 N명" 표시. 분야를 주면 그 분야 기준. 1분마다 갱신한다.
// 숫자는 전문가 목록 API의 X-Total-Count(응대 가능만 필터)를 쓴다.
export default function AvailableNow({ category, className = "" }: { category?: string; className?: string }) {
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const sp = new URLSearchParams({ available: "1", limit: "1" });
    if (category) sp.set("category", category);
    const load = () =>
      fetch(`/api/experts?${sp}`)
        .then((r) => (r.ok ? Number(r.headers.get("X-Total-Count")) : null))
        .then((v) => alive && setN(Number.isFinite(v) ? v : null))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [category]);

  if (n === null) return null;
  const href = `/experts?available=1${category ? `&category=${encodeURIComponent(category)}` : ""}`;
  return (
    <Link href={href} className={`inline-flex items-center gap-1.5 text-xs font-medium hover:underline ${n > 0 ? "text-emerald-400" : "text-muted"} ${className}`}>
      <span className={`h-2 w-2 rounded-full ${n > 0 ? "animate-pulse bg-emerald-400" : "bg-white/20"}`} />
      {n > 0
        ? `지금 ${category ? `${category} ` : ""}응대 가능한 전문가 ${n}명`
        : `지금 ${category ? `${category} ` : ""}응대 가능한 전문가가 없어요 · 질문을 남기면 돌아오는 대로 알려드려요`}
    </Link>
  );
}
