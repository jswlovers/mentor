"use client";
import { useCallback, useEffect, useState } from "react";
import { api, jsonInit, timeAgo } from "@/lib/client";
import type { Salon } from "./types";

type Notice = { id: number; title: string; body: string; created_at: string; author_name: string };
const input = "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted";

// 매장 공지: 원장이 올리면 직원 모두에게 알림이 간다
export default function Notices({ salon }: { salon: Salon }) {
  const [list, setList] = useState<Notice[] | null>(null);
  const [error, setError] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const isOwner = salon.myRole === "owner";

  const load = useCallback(async () => {
    const r = await api<{ notices: Notice[] }>("/api/salon/notices").catch(() => null);
    if (!r?.ok) { setError(true); return; }
    setError(false);
    setList(r.data.notices);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("/api/salon/notices", jsonInit("POST", { title, body }));
    if (!r.ok) return setMsg(r.data.error || "올리지 못했어요");
    setTitle(""); setBody(""); setMsg("공지를 올리고 직원들에게 알렸어요.");
    load();
  };
  const remove = async (id: number) => {
    if (!confirm("이 공지를 지울까요?")) return;
    const r = await api(`/api/salon/notices?id=${id}`, { method: "DELETE" });
    if (r.ok) load(); else alert(r.data.error || "지우지 못했어요");
  };

  return (
    <div className="space-y-4">
      {isOwner && (
        <form onSubmit={submit} className="space-y-2 rounded-xl border border-border bg-surface p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="공지 제목" className={input} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000} placeholder="내용 (선택)" className={`${input} resize-none`} />
          <button disabled={!title.trim()} className="w-full rounded-lg bg-rose-500 py-2 text-sm font-medium text-white hover:bg-rose-400 disabled:opacity-50">공지 올리기 (직원 모두에게 알림)</button>
          {msg && <p className="text-xs text-muted">{msg}</p>}
        </form>
      )}
      {error && <p className="text-center text-sm text-muted">공지를 불러오지 못했어요. <button onClick={load} className="underline">다시 시도</button></p>}
      <ul className="space-y-2">
        {list?.map((n) => (
          <li key={n.id} className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-start gap-2">
              <b className="min-w-0 flex-1 text-sm">📢 {n.title}</b>
              {isOwner && <button onClick={() => remove(n.id)} className="shrink-0 text-xs text-muted hover:text-rose-300">삭제</button>}
            </div>
            {n.body && <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{n.body}</p>}
            <p className="mt-1 text-[11px] text-muted">{n.author_name} · {timeAgo(n.created_at)}</p>
          </li>
        ))}
        {list?.length === 0 && <li className="py-8 text-center text-sm text-muted">{isOwner ? "첫 공지를 올려보세요." : "아직 공지가 없어요."}</li>}
      </ul>
    </div>
  );
}
