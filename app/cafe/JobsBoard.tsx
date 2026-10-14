"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, timeAgo } from "@/lib/client";
import { type CafePost } from "@/lib/cafe";
import { CITY_DISTRICTS, REGION_TILES } from "@/lib/regions";

type Side = "hire" | "seek";
type Count = { region: string | null; district: string | null; n: number };
const SIDES: { value: Side; label: string; sub: string }[] = [
    { value: "hire", label: "구인", sub: "매장의 채용 공고" },
    { value: "seek", label: "구직", sub: "일자리를 찾는 미용인" },
];
const chip = (active: boolean) => `rounded-full border px-3 py-1.5 text-xs transition ${active ? "border-rose-500 bg-rose-500 font-semibold text-white" : "border-border bg-surface text-muted hover:text-foreground"}`;

// 구인구직: 대분류(구인·구직) → 지도에서 시·도 → 시·군·구 순서로 좁혀 본다.
export default function JobsBoard({ initialSide }: { initialSide: Side }) {
    const [side, setSide] = useState<Side>(initialSide), [region, setRegion] = useState(""), [district, setDistrict] = useState("");
    const [openOnly, setOpenOnly] = useState(true), [page, setPage] = useState(1);
    const [counts, setCounts] = useState<Count[]>([]);
    const [result, setResult] = useState<{ items: CafePost[]; hasMore: boolean } | null>(null), [error, setError] = useState("");
    useEffect(() => {
        let active = true;
        api<{ items: Count[] }>(`/api/cafe/services?area=job-map&side=${side}`).then(r => { if (active && r.ok) setCounts(r.data.items); }).catch(() => {});
        return () => { active = false; };
    }, [side]);
    useEffect(() => {
        let active = true;
        const sp = new URLSearchParams({ board: "jobs", side, page: String(page), open: openOnly ? "1" : "0" });
        if (region) sp.set("region", region);
        if (district) sp.set("district", district);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setResult(null);
        setError("");
        api<{ items: CafePost[]; hasMore: boolean }>(`/api/cafe/posts?${sp}`).then(r => { if (!active) return; if (r.ok) setResult(r.data); else setError(r.data.error || "공고를 불러오지 못했어요"); }).catch(() => { if (active) setError("연결을 확인하고 다시 시도해주세요"); });
        return () => { active = false; };
    }, [side, region, district, openOnly, page]);
    const byRegion = useMemo(() => { const m: Record<string, number> = {}; for (const c of counts) if (c.region) m[c.region] = (m[c.region] ?? 0) + c.n; return m; }, [counts]);
    const byDistrict = useMemo(() => { const m: Record<string, number> = {}; for (const c of counts) if (c.region === region && c.district) m[c.district] = c.n; return m; }, [counts, region]);
    const total = counts.reduce((sum, c) => sum + c.n, 0);
    const pickSide = (next: Side) => { setSide(next); setPage(1); };
    const pickRegion = (next: string) => { setRegion(next === region ? "" : next); setDistrict(""); setPage(1); };
    const place = region ? `${region}${district ? ` ${district}` : " 전체"}` : "전국";
    return <div className="space-y-6">
        <div role="tablist" aria-label="구인구직 분류" className="grid grid-cols-2 gap-2 sm:max-w-md">{SIDES.map(s => <button key={s.value} role="tab" aria-selected={side === s.value} onClick={() => pickSide(s.value)} className={`rounded-2xl border p-4 text-left transition ${side === s.value ? "border-rose-500 bg-rose-500/10" : "border-border bg-surface hover:border-rose-400/40"}`}><p className={`text-lg font-bold ${side === s.value ? "text-rose-300" : ""}`}>{s.label}</p><p className="mt-0.5 text-xs text-muted">{s.sub}</p></button>)}</div>
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <section aria-labelledby="map-title" className="space-y-4 lg:self-start">
                <div className="flex items-center justify-between"><h2 id="map-title" className="font-bold">지역 선택</h2><button onClick={() => pickRegion("")} className={chip(!region)}>전국 {total}</button></div>
                {/* 시·도 타일 지도: 대략적인 지리 위치에 배치했다 */}
                <div className="grid grid-cols-5 gap-1.5 rounded-2xl border border-border bg-surface p-3" style={{ gridTemplateRows: "repeat(6, minmax(52px, auto))" }}>
                    {REGION_TILES.map(t => { const active = region === t.name, n = byRegion[t.name] ?? 0; return <button key={t.name} onClick={() => pickRegion(t.name)} aria-pressed={active} style={{ gridColumn: `${t.col + 1} / span ${t.w ?? 1}`, gridRow: `${t.row + 1} / span ${t.h ?? 1}` }} className={`flex flex-col items-center justify-center rounded-xl border text-sm transition ${active ? "border-rose-500 bg-rose-500 font-bold text-white" : n ? "border-rose-400/30 bg-rose-500/10 hover:border-rose-400" : "border-border bg-surface-2 text-muted hover:border-rose-400/40"}`}><span>{t.name}</span><span className={`text-[11px] ${active ? "text-white/80" : n ? "text-rose-300" : "text-muted"}`}>{n}건</span></button>; })}
                </div>
                {region && <div><p className="mb-2 text-xs font-semibold text-muted">{region} 시·군·구</p><div className="flex flex-wrap gap-1.5"><button onClick={() => { setDistrict(""); setPage(1); }} className={chip(!district)}>{region} 전체</button>{CITY_DISTRICTS[region]?.map(d => <button key={d} onClick={() => { setDistrict(d === district ? "" : d); setPage(1); }} aria-pressed={district === d} className={chip(district === d)}>{d}{byDistrict[d] ? ` ${byDistrict[d]}` : ""}</button>)}</div></div>}
            </section>
            <section aria-labelledby="list-title" className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="list-title" className="font-bold">{place} · {side === "hire" ? "구인 공고" : "구직 글"}</h2><label className="mt-1 flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={openOnly} onChange={e => { setOpenOnly(e.target.checked); setPage(1); }} />마감된 글 제외</label></div><Link href="/cafe/write?board=jobs" className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-bold text-white">{side === "hire" ? "구인 공고 올리기" : "구직 글 올리기"}</Link></div>
                <div aria-live="polite" className="mt-4">{error ? <p role="alert" className="rounded-xl border border-border p-6 text-sm text-rose-300">{error}</p> : !result ? <p className="p-8 text-center text-sm text-muted">불러오는 중…</p> : result.items.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">{place}에 {side === "hire" ? "구인 공고" : "구직 글"}가 아직 없어요.</p> :
                    <ul className="space-y-2">{result.items.map(p => { const d = p.details; const facts = side === "hire" ? [d.salon, d.role, d.price, d.hours] : [d.role, d.career, d.price && `희망 ${d.price}`, d.hours]; return <li key={p.id}><Link href={`/cafe/posts/${p.id}`} className="block rounded-2xl border border-border bg-surface p-4 transition hover:border-rose-400/40">
                        <div className="flex flex-wrap items-center gap-2 text-[11px]"><span className="rounded-full bg-rose-500/15 px-2 py-0.5 font-semibold text-rose-300">{d.kind}</span><span className="text-muted">{d.region} {d.district}</span>{p.status === "closed" && <span className="text-muted">· 마감</span>}{d.deadline && p.status !== "closed" && <span className="text-amber-300">· {d.deadline} 마감</span>}</div>
                        <h3 className="mt-2 break-words font-bold">{p.title}</h3>
                        <p className="mt-1.5 text-sm text-muted">{facts.filter(Boolean).join(" · ")}</p>
                        <p className="mt-2 text-[11px] text-muted">{p.author_name} · {timeAgo(p.created_at)} · 조회 {p.views || 0}</p>
                    </Link></li>; })}</ul>}</div>
                {result && (page > 1 || result.hasMore) && <div className="mt-5 flex items-center justify-center gap-4 text-sm"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-30">이전</button><span>{page} 페이지</span><button disabled={!result.hasMore} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-30">다음</button></div>}
            </section>
        </div>
    </div>;
}
