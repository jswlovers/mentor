"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { api, jsonInit, useMe } from "@/lib/client";
import Calendar from "./Calendar";
import Feed from "./Feed";
import Members from "./Members";
import Notices from "./Notices";
import type { Salon } from "./types";

const TABS = [["feed", "작업물"], ["calendar", "일정"], ["notices", "공지"], ["members", "직원"]] as const;
const input = "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted";

// 내 매장: 같은 매장 직원끼리 작업물·일정·공지를 나눈다. 초대 링크는 /salon?code=초대코드
export default function SalonPage() {
  return <Suspense><SalonView /></Suspense>;
}

function SalonView() {
  const { me } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab")! : "feed";
  const [salon, setSalon] = useState<Salon | null | undefined>(undefined);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const r = await api<{ salon: Salon | null }>("/api/salon").catch(() => null);
    if (!r?.ok) { setError(true); return; }
    setError(false);
    setSalon(r.data.salon);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (me) load();
  }, [me, load]);

  const setTab = (k: string) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("tab", k);
    sp.delete("date");
    router.replace(`${pathname}?${sp}`, { scroll: false });
  };

  if (me === null) return <p className="p-8 text-center text-sm">내 매장은 <Link href="/login" className="text-rose-400 underline">로그인</Link> 후 쓸 수 있어요.</p>;
  if (error) return (
    <div className="space-y-2 p-8 text-center text-sm text-muted">
      <p>매장 정보를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>
      <button onClick={load} className="rounded-lg border border-border px-4 py-1.5 text-foreground hover:border-white/30">다시 시도</button>
    </div>
  );
  if (!me || salon === undefined) return <p className="p-8 text-center text-sm text-muted">불러오는 중…</p>;
  if (salon === null) return <NoSalon code={params.get("code") ?? ""} onDone={load} />;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="space-y-3 border-b border-border px-6 py-4">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="min-w-0 truncate text-lg font-bold">🏠 {salon.name}</h1>
          <span className="shrink-0 text-xs text-muted">{salon.members.find((m) => m.id === me.id)?.roleLabel} · 직원 {salon.members.length}명</span>
        </div>
        <nav className="grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1 text-sm" aria-label="매장 메뉴">
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? "page" : undefined}
              className={`rounded-lg py-1.5 transition ${tab === k ? "bg-rose-500 font-medium text-white" : "text-muted hover:text-foreground"}`}>{label}</button>
          ))}
        </nav>
      </div>
      <div className="px-6 py-4">
        {tab === "feed" && <Feed salon={salon} meId={me.id} isExpert={me.isExpert} />}
        {tab === "calendar" && <Calendar salon={salon} meId={me.id} initialDate={params.get("date")} />}
        {tab === "notices" && <Notices salon={salon} />}
        {tab === "members" && <Members salon={salon} meId={me.id} reload={load} />}
      </div>
    </div>
  );
}

// 소속 매장이 없을 때: 초대 코드로 들어가거나 새 매장을 만든다
function NoSalon({ code: initialCode, onDone }: { code: string; onDone: () => void }) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [preview, setPreview] = useState<{ name: string; memberCount: number } | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // 초대 링크로 들어오면 어느 매장인지 먼저 보여준다
  useEffect(() => {
    if (!initialCode) return;
    api<{ name: string; memberCount: number }>(`/api/salon/join?code=${encodeURIComponent(initialCode)}`).then((r) => {
      if (r.ok) setPreview(r.data); else setMsg(r.data.error || "초대 코드를 확인하지 못했어요");
    });
  }, [initialCode]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await api("/api/salon/join", jsonInit("POST", { code }));
    setBusy(false);
    if (r.ok) onDone(); else setMsg(r.data.error || "들어가지 못했어요");
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await api("/api/salon", jsonInit("POST", { name }));
    setBusy(false);
    if (r.ok) onDone(); else setMsg(r.data.error || "만들지 못했어요");
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 px-6 py-8">
      <div>
        <h1 className="text-lg font-bold">내 매장</h1>
        <p className="mt-1 text-sm text-muted">같은 매장 직원끼리 작업물을 올려 피드백을 주고받고, 근무·휴무·교육 일정과 공지를 함께 봐요. 매장 안 내용은 매장 직원만 볼 수 있어요.</p>
      </div>
      <form onSubmit={join} className="space-y-2 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">초대 코드로 들어가기</h2>
        {preview && <p className="rounded-lg bg-rose-500/10 p-2 text-sm"><b>{preview.name}</b>에서 초대했어요 · 직원 {preview.memberCount}명</p>}
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="원장님께 받은 6자리 코드" className={`${input} font-mono tracking-widest`} />
        <button disabled={busy || code.length !== 6} className="w-full rounded-lg bg-rose-500 py-2.5 text-sm font-medium text-white hover:bg-rose-400 disabled:opacity-50">들어가기</button>
      </form>
      <form onSubmit={create} className="space-y-2 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">새 매장 만들기 <span className="font-normal text-muted">(만든 사람이 원장이 돼요)</span></h2>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="매장 이름 (예: OO헤어 강남점)" className={input} />
        <button disabled={busy || name.trim().length < 2} className="w-full rounded-lg border border-border bg-surface-2 py-2.5 text-sm font-medium text-foreground hover:border-white/30 disabled:opacity-50">매장 만들기</button>
      </form>
      {msg && <p className="text-sm text-rose-300">{msg}</p>}
    </div>
  );
}
