"use client";
import { useState } from "react";
import { api, type Availability, jsonInit, notifyMeChanged } from "@/lib/client";

// 00:00 ~ 23:30, 30분 단위
const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
const select = "rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground";

/** 전문가 센터: 상담 ON/OFF와 매일 반복되는 상담 불가 시간(한국 시간) */
export default function ConsultAvailability({ av }: { av: Availability }) {
  const [useOff, setUseOff] = useState(!!(av.offStart && av.offEnd));
  const [start, setStart] = useState(av.offStart ?? "22:00");
  const [end, setEnd] = useState(av.offEnd ?? "09:00");
  const [msg, setMsg] = useState("");

  const post = async (body: unknown, done: string) => {
    const r = await api<Availability>("/api/experts/availability", jsonInit("POST", body));
    setMsg(r.ok ? done : r.data.error || "저장에 실패했어요");
    notifyMeChanged();
  };

  const status = av.availableNow
    ? { text: "상담 ON · 지금 상담 요청을 받고 있어요", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" }
    : av.on && av.offNow
      ? { text: `🌙 상담 불가 시간이에요 (${av.offStart}~${av.offEnd}) · 끝나면 자동으로 다시 받아요`, cls: "border-amber-500/40 bg-amber-500/10 text-amber-300" }
      : { text: "상담 OFF · 호출·목록에서 '쉬는 중'으로 보여요", cls: "border-border bg-surface-2 text-muted" };

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">상담 ON/OFF</h2>
        <button type="button" role="switch" aria-checked={av.on} onClick={() => post({ on: !av.on }, av.on ? "상담을 껐어요" : "상담을 켰어요")}
          className={`relative h-7 w-12 rounded-full transition ${av.on ? "bg-emerald-500" : "bg-white/15"}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${av.on ? "left-6" : "left-1"}`} />
        </button>
      </div>
      <p className={`rounded-lg border px-3 py-2 text-xs ${status.cls}`}>{status.text}</p>

      <div className="space-y-2 border-t border-border pt-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={useOff} onChange={(e) => setUseOff(e.target.checked)} /> 상담 불가 시간 정하기 (매일, 한국 시간)
        </label>
        {useOff && (
          <div className="flex flex-wrap items-center gap-2">
            <select className={select} value={start} onChange={(e) => setStart(e.target.value)}>{TIMES.map((t) => <option key={t}>{t}</option>)}</select>
            부터
            <select className={select} value={end} onChange={(e) => setEnd(e.target.value)}>{TIMES.map((t) => <option key={t}>{t}</option>)}</select>
            까지 상담 불가
          </div>
        )}
        {useOff && start > end && <p className="text-xs text-muted">자정을 넘겨 다음 날 {end}까지 쉬어요.</p>}
        <button type="button" disabled={useOff && start === end}
          onClick={() => useOff ? post({ offStart: start, offEnd: end }, `매일 ${start}~${end}에는 상담 요청을 받지 않아요`) : post({ offStart: null, offEnd: null }, "상담 불가 시간을 해제했어요")}
          className="w-full rounded-lg border border-border bg-surface-2 py-2 text-sm font-medium text-foreground hover:border-white/30 disabled:opacity-40">
          {useOff && start === end ? "시작과 끝 시간이 달라야 해요" : "불가 시간 저장"}
        </button>
        <p className="text-[11px] text-muted">불가 시간에는 ON이어도 자동으로 &apos;쉬는 중&apos;이 되어 호출 알림이 오지 않고, 질문자가 지정할 수도 없어요.</p>
      </div>
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </section>
  );
}
