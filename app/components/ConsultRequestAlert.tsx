"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Req = { roomId: string; askerName: string; title: string; category: string; tierLabel: string; picked: boolean; deadline: string };

/**
 * 온라인(상담 ON·불가 시간 아님)인 전문가에게 새 상담 요청을 화면 팝업으로 띄운다.
 * 15초마다 확인하고, 닫은 요청은 다시 띄우지 않는다. 누르면 상담 화면으로 가서 바로 참여할 수 있다.
 */
export default function ConsultRequestAlert({ online }: { online: boolean }) {
  const pathname = usePathname();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [closed, setClosed] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!online) return;
    let stop = false;
    const load = () => api<Req[]>("/api/experts/requests").then((r) => {
      if (!stop && r.ok && Array.isArray(r.data)) setReqs(r.data as Req[]);
    });
    load();
    const poll = setInterval(load, 15_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { stop = true; clearInterval(poll); clearInterval(tick); };
  }, [online]);

  const shown = online
    ? reqs.filter((r) => !closed.includes(r.roomId) && pathname !== `/chat/${r.roomId}` && Date.parse(r.deadline) > now)
    : [];
  if (shown.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-30 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" role="alert" aria-live="assertive">
      {shown.map((r) => {
        const left = Math.max(0, Math.round((Date.parse(r.deadline) - now) / 1000));
        return (
          <div key={r.roomId} className="rounded-2xl border border-rose-500/50 bg-surface p-3 text-sm shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-rose-300">🔔 {r.picked ? "나를 골라 요청한 상담" : "새 상담 요청"}</p>
              <button onClick={() => setClosed((c) => [...c, r.roomId])} className="text-xs text-muted hover:text-foreground" aria-label="닫기">✕</button>
            </div>
            <p className="mt-1 line-clamp-2">{r.title}</p>
            <p className="mt-0.5 text-xs text-muted">
              {r.askerName} · {r.category} · {r.tierLabel} · 남은 시간 <b className="tabular-nums text-foreground">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</b>
            </p>
            <Link href={`/chat/${r.roomId}`} onClick={() => setClosed((c) => [...c, r.roomId])}
              className="mt-2 block rounded-lg bg-rose-500 py-2 text-center font-medium text-white hover:bg-rose-400">참여하기</Link>
          </div>
        );
      })}
    </div>
  );
}
