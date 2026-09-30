"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Day = { day: string; amount: number; coins: number; count: number };
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");
// Date를 UTC 자정으로만 다뤄서 기기 시간대와 무관하게 날짜 문자열을 만든다.
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const won = (n: number) => `${n.toLocaleString()}원`;

function kstToday() {
  const now = new Date(Date.now() + 9 * 3600_000);
  return { y: now.getUTCFullYear(), m: now.getUTCMonth(), today: ymd(now) };
}

// 승인된 충전 금액 달력 (승인일 기준, 한국시간). 주 합계는 행 전체(일~토), 월 합계는 해당 월만.
export default function ChargeCalendar({ refreshKey }: { refreshKey?: unknown }) {
  const [{ y, m }, setYm] = useState(() => { const t = kstToday(); return { y: t.y, m: t.m }; });
  const [data, setData] = useState<Record<string, Day>>({});
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const first = new Date(Date.UTC(y, m, 1));
  const start = new Date(Date.UTC(y, m, 1 - first.getUTCDay()));
  const last = new Date(Date.UTC(y, m + 1, 0));
  const end = new Date(Date.UTC(y, m + 1, 6 - last.getUTCDay()));
  const from = ymd(start), to = ymd(end);

  useEffect(() => {
    let alive = true;
    api<Day[]>(`/api/admin/charges/stats?from=${from}&to=${to}`).then((r) => {
      if (!alive) return;
      if (r.ok && Array.isArray(r.data)) { setData(Object.fromEntries((r.data as Day[]).map((d) => [d.day, d]))); setErr(""); }
      else setErr((r.data as { error?: string }).error || "불러오지 못했어요");
    });
    return () => { alive = false; };
  }, [from, to, refreshKey]);

  const weeks: string[][] = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 7 * 86400_000)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => ymd(new Date(d.getTime() + i * 86400_000))));
  }
  const monthKey = `${y}-${pad(m + 1)}`;
  const sum = (days: string[]) => days.reduce((a, k) => ({ amount: a.amount + (data[k]?.amount ?? 0), count: a.count + (data[k]?.count ?? 0) }), { amount: 0, count: 0 });
  const month = sum(weeks.flat().filter((k) => k.startsWith(monthKey)));
  const { today } = kstToday();
  const move = (delta: number) => { const d = new Date(Date.UTC(y, m + delta, 1)); setYm({ y: d.getUTCFullYear(), m: d.getUTCMonth() }); setSel(null); };
  const nav = "rounded border border-border px-2 py-0.5 text-xs text-foreground hover:border-white/30";

  return (
    <div className="mb-4 rounded-lg border border-border p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button className={nav} onClick={() => move(-1)} aria-label="이전 달">‹</button>
          <b>{y}년 {m + 1}월</b>
          <button className={nav} onClick={() => move(1)} aria-label="다음 달">›</button>
          <button className={nav} onClick={() => { const t = kstToday(); setYm({ y: t.y, m: t.m }); setSel(null); }}>이번 달</button>
        </div>
        <span className="text-sm">월 합계 <b className="text-emerald-400">{won(month.amount)}</b> <span className="text-xs text-muted">({month.count}건)</span></span>
      </div>
      {err && <p className="mb-2 text-xs text-rose-400">{err}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-xs">
          <thead>
            <tr className="text-muted">
              {WEEK.map((w, i) => <th key={w} className={`py-1 font-normal ${i === 0 ? "text-rose-400" : i === 6 ? "text-sky-400" : ""}`}>{w}</th>)}
              <th className="py-1 font-normal">주 합계</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => {
              const w = sum(week);
              return (
                <tr key={week[0]}>
                  {week.map((k) => {
                    const d = data[k];
                    const inMonth = k.startsWith(monthKey);
                    return (
                      <td key={k} className="border border-border p-0 align-top">
                        <button onClick={() => setSel(sel === k ? null : k)} className={`h-16 w-full p-1 text-left transition hover:bg-white/5 ${inMonth ? "" : "opacity-40"} ${sel === k ? "bg-white/10" : ""}`}>
                          <span className={`block ${k === today ? "font-bold text-rose-400" : "text-muted"}`}>{Number(k.slice(8))}</span>
                          {d && <><span className="block truncate font-semibold text-emerald-400">{d.amount.toLocaleString()}</span><span className="block text-muted">{d.count}건</span></>}
                        </button>
                      </td>
                    );
                  })}
                  <td className="border border-border bg-white/5 p-1 text-right align-middle">
                    <span className="block font-semibold">{w.amount.toLocaleString()}</span>
                    <span className="block text-muted">{w.count}건</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sel && <p className="mt-2 text-xs">{sel} · 충전 {won(data[sel]?.amount ?? 0)} · {(data[sel]?.coins ?? 0).toLocaleString()}코인 · {data[sel]?.count ?? 0}건</p>}
      <p className="mt-2 text-xs text-muted">승인된 충전만, 승인일(한국시간) 기준이에요. 주 합계는 그 주 일~토 전체, 월 합계는 이번 달 날짜만 더해요.</p>
    </div>
  );
}
