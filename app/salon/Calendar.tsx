"use client";
import { useCallback, useEffect, useState } from "react";
import { api, jsonInit } from "@/lib/client";
import type { Salon } from "./types";

type Kind = "work" | "off" | "edu" | "event";
type Ev = { id: number; kind: Kind; date: string; start_time: string | null; end_time: string | null; title: string; author_id: string; member_id: string | null; member_name: string | null };
const KINDS: Record<Kind, { label: string; dot: string; chip: string }> = {
  work: { label: "근무", dot: "bg-emerald-400", chip: "bg-emerald-500/15 text-emerald-300" },
  off: { label: "휴무", dot: "bg-slate-400", chip: "bg-white/10 text-foreground/80" },
  edu: { label: "교육", dot: "bg-sky-400", chip: "bg-sky-500/15 text-sky-300" },
  event: { label: "매장 일정", dot: "bg-rose-400", chip: "bg-rose-500/15 text-rose-300" },
};
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`;
const input = "rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground";

// 매장 공유 일정: 근무·휴무(직원별)와 교육·매장 일정(모두). 손님 예약은 다루지 않는다.
export default function Calendar({ salon, meId, initialDate }: { salon: Salon; meId: string; initialDate: string | null }) {
  // 오늘 날짜는 브라우저 기준이라 마운트 후에 정한다
  const [today, setToday] = useState<string | null>(null);
  const [view, setView] = useState<{ y: number; m0: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [error, setError] = useState(false);
  const isOwner = salon.myRole === "owner";

  useEffect(() => {
    const t = new Date();
    const now = ymd(t.getFullYear(), t.getMonth(), t.getDate());
    const start = initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : now;
    const [y, m] = start.split("-").map(Number);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(now);
    setView({ y, m0: m - 1 });
    setSelected(start);
  }, [initialDate]);

  const load = useCallback(async () => {
    if (!view) return;
    const r = await api<{ events: Ev[] }>(`/api/salon/events?month=${view.y}-${pad(view.m0 + 1)}`).catch(() => null);
    if (!r?.ok) { setError(true); return; }
    setError(false);
    setEvents(r.data.events);
  }, [view]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  if (!view || !today || !selected) return <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>;
  const first = new Date(view.y, view.m0, 1).getDay();
  const dim = new Date(view.y, view.m0 + 1, 0).getDate();
  const byDate = new Map<string, Ev[]>();
  for (const e of events) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  const move = (d: number) => { const t = new Date(view.y, view.m0 + d, 1); setView({ y: t.getFullYear(), m0: t.getMonth() }); };
  const dayEvents = byDate.get(selected) ?? [];
  const offToday = (byDate.get(today) ?? []).filter((e) => e.kind === "off").map((e) => e.member_name);

  const remove = async (id: number) => {
    if (!confirm("이 일정을 지울까요?")) return;
    const r = await api(`/api/salon/events/${id}`, { method: "DELETE" });
    if (r.ok) load(); else alert(r.data.error || "지우지 못했어요");
  };

  return (
    <div className="space-y-4">
      {offToday.length > 0 && <p className="rounded-lg bg-white/5 px-3 py-2 text-xs">오늘 휴무: <b>{offToday.join(", ")}</b></p>}
      <div className="flex items-center justify-between">
        <button onClick={() => move(-1)} className="rounded-lg px-3 py-1 text-muted hover:text-foreground" aria-label="이전 달">‹</button>
        <b>{view.y}년 {view.m0 + 1}월</b>
        <button onClick={() => move(1)} className="rounded-lg px-3 py-1 text-muted hover:text-foreground" aria-label="다음 달">›</button>
      </div>
      {error && <p className="text-center text-xs text-muted">일정을 불러오지 못했어요. <button onClick={load} className="underline">다시 시도</button></p>}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEK.map((w, i) => <span key={w} className={`py-1 ${i === 0 ? "text-rose-300" : "text-muted"}`}>{w}</span>)}
        {Array.from({ length: first }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: dim }, (_, i) => {
          const d = ymd(view.y, view.m0, i + 1);
          const evs = byDate.get(d) ?? [];
          return (
            <button key={d} onClick={() => setSelected(d)} aria-pressed={selected === d} aria-label={`${view.m0 + 1}월 ${i + 1}일 일정 ${evs.length}개`}
              className={`flex h-14 flex-col items-center rounded-lg border pt-1 transition ${selected === d ? "border-rose-500 bg-rose-500/10" : "border-transparent hover:bg-white/5"}`}>
              <span className={d === today ? "rounded-full bg-rose-500 px-1.5 font-bold text-white" : ""}>{i + 1}</span>
              <span className="mt-1 flex flex-wrap justify-center gap-0.5">
                {evs.slice(0, 4).map((e) => <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${KINDS[e.kind].dot}`} />)}
              </span>
            </button>
          );
        })}
      </div>
      <p className="flex flex-wrap gap-3 text-[11px] text-muted">{(Object.keys(KINDS) as Kind[]).map((k) => <span key={k} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${KINDS[k].dot}`} />{KINDS[k].label}</span>)}</p>

      <section className="space-y-2 rounded-xl border border-border bg-surface p-3">
        <h2 className="text-sm font-semibold">{Number(selected.slice(5, 7))}월 {Number(selected.slice(8))}일 일정</h2>
        <ul className="space-y-1.5">
          {dayEvents.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-sm">
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] ${KINDS[e.kind].chip}`}>{KINDS[e.kind].label}</span>
              <span className="min-w-0 flex-1 truncate">
                {e.member_name && <b>{e.member_name} </b>}{e.title}
                {e.start_time && <span className="text-xs text-muted"> {e.start_time}{e.end_time && `~${e.end_time}`}</span>}
              </span>
              {(e.author_id === meId || e.member_id === meId || isOwner) && <button onClick={() => remove(e.id)} className="shrink-0 text-xs text-muted hover:text-rose-300">삭제</button>}
            </li>
          ))}
          {dayEvents.length === 0 && <li className="text-xs text-muted">일정이 없어요</li>}
        </ul>
        <AddEvent salon={salon} meId={meId} date={selected} onAdded={load} />
      </section>
    </div>
  );
}

function AddEvent({ salon, meId, date, onAdded }: { salon: Salon; meId: string; date: string; onAdded: () => void }) {
  const [kind, setKind] = useState<Kind>("off");
  const [memberId, setMemberId] = useState(meId);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [msg, setMsg] = useState("");
  const personal = kind === "work" || kind === "off";
  const isOwner = salon.myRole === "owner";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("/api/salon/events", jsonInit("POST", { kind, date, title, startTime: start || null, endTime: end || null, memberId: personal ? memberId : null }));
    if (!r.ok) return setMsg(r.data.error || "추가하지 못했어요");
    setTitle(""); setStart(""); setEnd(""); setMsg("");
    onAdded();
  };

  return (
    <form onSubmit={submit} className="space-y-2 border-t border-border pt-3">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(KINDS) as Kind[]).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
            className={`rounded-full border px-3 py-1 text-xs ${kind === k ? "border-rose-500 bg-rose-500 text-white" : "border-border text-muted"}`}>{KINDS[k].label}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {personal && isOwner && (
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className={input} aria-label="대상 직원">
            {salon.members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.id === meId ? " (나)" : ""}</option>)}
          </select>
        )}
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={personal ? "메모 (선택)" : "제목 (예: 탈색 교육)"} className={`${input} min-w-0 flex-1`} />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={input} aria-label="시작 시간" /> ~
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={input} aria-label="끝 시간" />
        <span>(선택)</span>
        <button className="ml-auto rounded-lg bg-rose-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-400">추가</button>
      </div>
      {!personal && <p className="text-[11px] text-muted">교육·매장 일정은 직원 모두에게 알림이 가요.</p>}
      {msg && <p className="text-xs text-rose-300">{msg}</p>}
    </form>
  );
}
