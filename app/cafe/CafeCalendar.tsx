"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { findCafeBoard } from "@/lib/cafe";
type Event = {
    id: number;
    board: string;
    title: string;
    date: string;
    region: string;
};
export default function CafeCalendar() {
    const [month, setMonth] = useState("");
    const [items, setItems] = useState<Event[] | null>(null);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).formatToParts(new Date());
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMonth(`${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}`);
    }, []);
    useEffect(() => {
        if (!month)
            return;
        let active = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(null);
        setError("");
        api<{
            items: Event[];
        }>(`/api/cafe/calendar?month=${month}`).then(r => { if (active) {
            if (r.ok)
                setItems(r.data.items);
            else
                setError(r.data.error || "일정을 불러오지 못했어요");
        } }).catch(() => { if (active)
            setError("연결을 확인해주세요"); });
        return () => { active = false; };
    }, [month, retry]);
    return <section id="calendar" className="scroll-mt-32" aria-labelledby="calendar-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="calendar-title" className="text-xl font-bold">교육·모집 일정</h2><p className="mt-1 text-sm text-muted">교육·세미나, 모델, 봉사, 이벤트의 진행 중인 일정</p></div><label className="text-xs text-muted">조회 월<input type="month" min="2000-01" max="2099-12" value={month} onChange={e => { if (e.target.value)
        setMonth(e.target.value); }} className="ml-2 rounded-lg border border-border bg-surface-2 p-2 text-sm text-foreground"/></label></div>
    <div className="mt-4" aria-live="polite">{error ? <p role="alert" className="text-sm text-rose-300">{error}<button onClick={() => setRetry(n => n + 1)} className="ml-3 underline">다시 시도</button></p> : !items ? <p className="text-sm text-muted">일정을 불러오는 중…</p> : items.length === 0 ? <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted">이달에 등록된 일정이 없어요. 모집 글에 일정을 입력하면 여기에 표시됩니다.</p> : <ul className="grid gap-3 sm:grid-cols-2">{items.map(item => <li key={item.id}><Link href={`/cafe/posts/${item.id}`} className="flex gap-4 rounded-xl border border-border bg-surface p-4 hover:border-rose-400/40"><time dateTime={item.date} className="shrink-0 text-sm font-bold text-rose-300">{item.date.slice(5).replace("-", "/")}</time><div className="min-w-0"><p className="text-xs text-muted">{findCafeBoard(item.board)?.name} · {item.region}</p><p className="mt-1 break-words text-sm font-bold">{item.title}</p></div></Link></li>)}</ul>}</div>
  </section>;
}
