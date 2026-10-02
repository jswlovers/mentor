"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIES, won } from "@/lib/client";
import Avatar from "../components/Avatar";
import { TIER_KEYS, TIERS } from "@/lib/server/pricing";

type E = {
  id: string; name: string; headline: string | null; bio: string; categories: string[]; specialist: boolean; available: boolean; offHours: string | null; salon: string | null; photoUrl: string | null;
  years: number | null; licenseVerified: boolean; portfolioCount: number; isNew: boolean;
  rating: number | null; reviewCount: number; consultations: number; medianResponseMinutes: number | null;
};
const SORTS = [["rating", "추천순"], ["responses", "상담 많은 순"], ["recent", "신규순"]] as const;
const SORT_HINT: Record<string, string> = {
  rating: "지금 응대 가능한 분 먼저, 그다음 후기 수까지 반영한 평점 순이에요.",
  responses: "완료한 상담이 많은 순이에요.",
  recent: "최근에 승인된 전문가 순이에요.",
};
const PAGE = 20;
const NOW_MAX = 10, NOW_NEWCOMERS = 3; // ⚡ 최대 10명 중 후기 없는 신규 전문가 몫(있을 때만)

// 전문가 찾기. 분야·정렬·검색어·응대 가능만은 주소(?category=&sort=&q=&available=1)에 남겨, 프로필을 보고 돌아와도 그대로다.
export default function ExpertsPage() {
  return <Suspense><Experts /></Suspense>;
}

async function fetchExperts(sp: URLSearchParams) {
  try {
    const res = await fetch(`/api/experts?${sp}`, { cache: "no-store" });
    if (!res.ok) return null;
    return { items: (await res.json()) as E[], total: Number(res.headers.get("X-Total-Count") ?? 0) };
  } catch {
    return null;
  }
}

function Experts() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const category = (CATEGORIES as readonly string[]).includes(params.get("category") ?? "") ? params.get("category")! : "";
  const sort = SORTS.some(([k]) => k === params.get("sort")) ? params.get("sort")! : "rating";
  const onlyAvailable = params.get("available") === "1";
  const qParam = params.get("q") ?? "";
  const [q, setQ] = useState(qParam);

  const setParam = useCallback((patch: Record<string, string>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) { if (v) sp.set(k, v); else sp.delete(k); }
    if (sp.get("sort") === "rating") sp.delete("sort");
    const s = sp.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  // 검색어는 입력이 멈춘 뒤 주소에 반영한다
  useEffect(() => {
    if (q.trim() === qParam) return;
    const t = setTimeout(() => setParam({ q: q.trim() }), 300);
    return () => clearTimeout(t);
  }, [q, qParam, setParam]);

  const [list, setList] = useState<E[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const baseQuery = useCallback((offset: number) => {
    const sp = new URLSearchParams({ sort, limit: String(PAGE), offset: String(offset) });
    if (category) sp.set("category", category);
    if (qParam) sp.set("q", qParam);
    if (onlyAvailable) sp.set("available", "1");
    return sp;
  }, [category, sort, qParam, onlyAvailable]);

  useEffect(() => {
    let stale = false;
    fetchExperts(baseQuery(0)).then((r) => {
      if (stale) return;
      setError(!r);
      setList(r ? r.items : []);
      setTotal(r ? r.total : 0);
    });
    return () => { stale = true; };
  }, [baseQuery, reloadKey]);

  const loadMore = async () => {
    if (!list) return;
    setLoadingMore(true);
    const r = await fetchExperts(baseQuery(list.length));
    setLoadingMore(false);
    if (!r) return setError(true);
    setList([...list, ...r.items.filter((e) => !list.some((x) => x.id === e.id))]);
    setTotal(r.total);
  };

  // ⚡ 지금 바로 답변 가능한(온라인) 전문가를 찾아 모두 선택해 둔다(최대 10명, 신규 전문가 몫 포함).
  // 열려 있는 동안 30초마다 다시 확인해 오프라인이 된 분은 빼고, 새로 온라인이 된 분은 선택해 넣는다(직접 뺀 분은 그대로 둔다).
  const [now, setNow] = useState<E[] | null>(null);
  const [nowError, setNowError] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const removed = useRef(new Set<string>());
  const findNow = useCallback(async (fresh: boolean) => {
    const sp = new URLSearchParams({ available: "1", sort: "rating" });
    if (category) sp.set("category", category);
    const r = await fetchExperts(sp);
    if (!r) { setNowError(true); if (fresh) setNow([]); return; }
    setNowError(false);
    const top = r.items.slice(0, NOW_MAX);
    const newcomers = r.items.filter((e) => e.reviewCount === 0 && !top.includes(e)).slice(0, NOW_NEWCOMERS);
    const found = newcomers.length ? [...top.slice(0, NOW_MAX - newcomers.length), ...newcomers] : top;
    if (fresh) removed.current.clear();
    setNow(found);
    setSel(found.map((e) => e.id).filter((id) => !removed.current.has(id)));
  }, [category]);
  const nowOpen = now !== null;
  useEffect(() => {
    if (!nowOpen) return;
    const t = setInterval(() => findNow(false), 30_000);
    return () => clearInterval(t);
  }, [nowOpen, findNow]);
  // 분야를 바꾸면 이전 분야로 찾은 결과는 닫는다
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setNow(null); }, [category]);
  const toggle = (id: string) => setSel((s) => {
    if (s.includes(id)) { removed.current.add(id); return s.filter((x) => x !== id); }
    removed.current.delete(id);
    return [...s, id];
  });

  return (
    <div>
      <div className="space-y-2 border-b border-border px-6 py-4 md:px-10">
        <h1 className="text-lg font-bold">전문가 찾기</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·직장명·소개·분야로 검색" className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted" />
        <div className="flex gap-2 overflow-x-auto">
          {["", ...CATEGORIES].map((c) => (
            <button key={c || "all"} onClick={() => setParam({ category: c })} aria-pressed={category === c} className={`shrink-0 rounded-full border px-3 py-1 text-sm transition ${category === c ? "border-rose-500 bg-rose-500 text-white" : "border-border text-muted hover:text-foreground"}`}>{c || "전체"}</button>
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
        <button onClick={() => findNow(true)} className="w-full rounded-lg bg-rose-500 py-2.5 text-sm font-medium text-white hover:bg-rose-400">
          ⚡ 지금 바로 답변 가능한 전문가 찾기{category ? ` (${category})` : ""}
        </button>
        {now && (
          <section className="space-y-2 rounded-xl border border-rose-500/40 bg-rose-500/5 p-3 text-sm" aria-label="지금 답변 가능한 전문가" aria-live="polite">
            <div className="flex items-center justify-between">
              <b>지금 온라인인 전문가 {now.length}명{category ? ` · ${category}` : ""}</b>
              <span className="flex items-center gap-3">
                <button onClick={() => findNow(false)} className="text-xs text-muted hover:text-foreground">↻ 새로고침</button>
                <button onClick={() => setNow(null)} className="text-xs text-muted hover:text-foreground">닫기</button>
              </span>
            </div>
            {nowError && <p className="text-xs text-amber-300">온라인 상태를 다시 확인하지 못했어요. 잠시 후 새로고침해 주세요.</p>}
            {now.length === 0 ? (
              !nowError && <p className="text-xs text-muted">지금 상담을 켜 둔 전문가가 없어요. 잠시 후 다시 찾거나, 질문을 남기고 자동 배정으로 상담을 신청해보세요.</p>
            ) : (
              <>
                <p className="text-xs text-muted">모두 자동으로 선택했어요(30초마다 온라인 상태를 다시 확인해요). 빼고 싶은 분은 체크를 풀어주세요. 상담을 신청하면 <b>선택한 분 중 그때도 온라인인 분들에게만</b> 알림이 가요.</p>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {now.map((e) => (
                    <li key={e.id}>
                      <label className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 ${sel.includes(e.id) ? "border-rose-500 bg-rose-500/10" : "border-border"}`}>
                        <input type="checkbox" checked={sel.includes(e.id)} onChange={() => toggle(e.id)} />
                        <Avatar name={e.name} url={e.photoUrl} size={32} />
                        <span className="min-w-0 text-xs">
                          <b className="text-sm">{e.name}</b> <span className="text-emerald-400">● 온라인</span>
                          {e.reviewCount === 0 && <span className="ml-1 rounded bg-sky-500/15 px-1 text-[10px] text-sky-300">신규</span>}
                          <span className="block truncate text-muted">
                            {e.rating !== null ? `★ ${e.rating.toFixed(1)} (${e.reviewCount})` : "후기 없음"}{e.years != null && ` · 경력 ${e.years}년`}{e.salon && ` · 🏢 ${e.salon}`}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <Link href={sel.length ? `/ask?experts=${sel.join(",")}${category ? `&category=${encodeURIComponent(category)}` : ""}` : "#"}
                  aria-disabled={sel.length === 0} onClick={(ev) => { if (sel.length === 0) ev.preventDefault(); }}
                  className={`block rounded-lg py-2.5 text-center font-medium ${sel.length ? "bg-rose-500 text-white hover:bg-rose-400" : "cursor-not-allowed bg-white/10 text-muted"}`}>
                  {sel.length ? `선택한 ${sel.length}명에게 질문하기` : "전문가를 한 명 이상 골라주세요"}
                </Link>
              </>
            )}
          </section>
        )}
        <div className="flex items-center gap-3 text-xs">
          {SORTS.map(([k, label]) => <button key={k} onClick={() => setParam({ sort: k })} aria-pressed={sort === k} className={sort === k ? "font-bold text-rose-400" : "text-muted"}>{label}</button>)}
          <label className="ml-auto flex items-center gap-1 text-muted">
            <input type="checkbox" checked={onlyAvailable} onChange={(e) => setParam({ available: e.target.checked ? "1" : "" })} /> 지금 응대 가능만
          </label>
        </div>
        <p className="text-[11px] text-muted">{SORT_HINT[sort]}{category && ` '${category}'을(를) 담당 분야로 고른 전문가가 먼저 나와요.`}</p>
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
                {e.licenseVerified && <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-300">면허 확인</span>}
                {e.isNew && <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[11px] text-sky-300">신규</span>}
                <span className={`text-[11px] ${e.available ? "text-emerald-400" : "text-muted"}`}>{e.available ? "● 응대 가능" : "○ 쉬는 중"}</span>
                {e.offHours && <span className="text-[11px] text-muted">🌙 {e.offHours} 불가</span>}
              </div>
              {(e.salon || e.years != null) && <p className="mt-0.5 text-xs text-foreground/80">{e.years != null && `경력 ${e.years}년`}{e.years != null && e.salon && " · "}{e.salon && `🏢 ${e.salon}`}</p>}
              {e.headline && <p className="mt-0.5 text-sm">{e.headline}</p>}
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{e.bio}</p>
              <p className="mt-1 text-xs text-foreground/80">
                {e.rating !== null ? <><span className="text-amber-400">★</span> {e.rating.toFixed(1)} ({e.reviewCount})</> : "후기 없음"}
                {" · "}상담 {e.consultations}건
                {e.medianResponseMinutes !== null && ` · 보통 ${e.medianResponseMinutes}분 안에 응답`}
                {e.portfolioCount > 0 && ` · 📷 작업 사진 ${e.portfolioCount}`}
              </p>
              <p className="mt-1 flex flex-wrap gap-1">
                {e.categories.length > 0
                  ? e.categories.map((c) => <span key={c} className={`rounded px-1.5 py-0.5 text-[11px] ${c === category ? "bg-rose-500/15 text-rose-300" : "bg-white/5 text-muted"}`}>{c}</span>)
                  : <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-muted">전 분야</span>}
              </p>
              </div>
            </Link>
            <Link href={`/ask?expert=${e.id}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
              className={`block border-t border-border px-4 py-2 text-center text-sm font-medium transition ${e.available ? "text-rose-400 hover:bg-rose-500/10" : "text-muted hover:bg-surface-2"}`}>
              {e.available ? `${e.name} 전문가에게 질문하기${category ? ` (${category})` : ""}` : "질문 남기기 (지금은 쉬는 중)"}
            </Link>
          </li>
        ))}
        {error && (
          <li className="space-y-2 p-8 text-center text-sm text-muted md:col-span-2">
            <p>전문가 목록을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>
            <button onClick={() => { setError(false); setList(null); setReloadKey((k) => k + 1); }} className="rounded-lg border border-border px-4 py-1.5 text-foreground hover:border-white/30">다시 시도</button>
          </li>
        )}
        {!error && list && list.length === 0 && <li className="p-8 text-center text-sm text-muted md:col-span-2">조건에 맞는 전문가가 없어요.</li>}
        {!error && !list && <li className="p-8 text-center text-sm text-muted md:col-span-2">불러오는 중…</li>}
        {!error && list && list.length < total && (
          <li className="md:col-span-2">
            <button onClick={loadMore} disabled={loadingMore} className="w-full rounded-lg border border-border py-2.5 text-sm text-foreground hover:border-white/30 disabled:opacity-60">
              {loadingMore ? "불러오는 중…" : `더 보기 (${list.length}/${total})`}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
