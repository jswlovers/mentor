"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, jsonInit, useMe } from "@/lib/client";

type Overview = {
  charges: { id: number; amount_krw: number; status: string; created_at: string; user_name: string; depositor: string | null }[];
  experts: { id: string; username: string; name: string; expert_status: string; expert_bio: string | null }[];
  withdrawals: { id: number; amount: number; bank_info: string; status: string; created_at: string; user_name: string }[];
  tickets: { id: number; category: string; subject: string; body: string; status: string; user_name: string; target_name: string | null; created_at: string }[];
  users: { id: string; username: string; name: string; role: string; expert_status: string; suspended_at: string | null }[];
  ledger: { id: number; account: string; direction: string; amount: number; type: string; note: string | null; created_at: string }[];
};
const TABS = ["충전", "전문가", "출금", "문의", "회원", "원장"] as const;

export default function Admin() {
  const { me } = useMe();
  const [d, setD] = useState<Overview | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("충전");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await api<Overview>("/api/admin/overview");
    if (r.ok) setD(r.data as Overview); else setErr(r.data.error || "불러오지 못했어요");
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (me?.isAdmin) load();
  }, [me?.isAdmin, load]);

  if (me === null) return <p className="p-8 text-center text-sm"><Link href="/login" className="text-rose-600 underline">로그인</Link>이 필요해요.</p>;
  if (me && !me.isAdmin) return <p className="p-8 text-center text-sm text-neutral-500">관리자만 볼 수 있어요.</p>;
  if (!d) return <p className="p-8 text-center text-sm text-neutral-400">{err || "불러오는 중…"}</p>;

  const act = async (path: string, body: unknown = {}) => {
    const r = await api(path, jsonInit("POST", body));
    if (!r.ok) alert(r.data.error || "처리에 실패했어요");
    load();
  };
  const ask = (msg: string) => prompt(msg) ?? undefined;
  const btn = "rounded border px-2 py-0.5 text-xs";

  return (
    <div className="p-4">
      <div className="mb-3 flex gap-2 overflow-x-auto">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-full border px-3 py-1 text-sm ${tab === t ? "bg-neutral-900 text-white" : ""}`}>{t}</button>)}
      </div>
      <ul className="divide-y text-sm">
        {tab === "충전" && d.charges.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-2">
            <span>{c.user_name} · {c.amount_krw.toLocaleString()}원 · 입금자 {c.depositor ?? "-"}<br /><span className="text-xs text-neutral-400">{c.created_at} · {c.status}</span></span>
            {c.status === "pending" && <span className="flex gap-1"><button className={btn} onClick={() => act(`/api/admin/charges/${c.id}/approve`)}>승인</button><button className={btn} onClick={() => act(`/api/admin/charges/${c.id}/reject`, { note: ask("반려 사유") })}>반려</button></span>}
          </li>
        ))}
        {tab === "전문가" && d.experts.map((x) => (
          <li key={x.id} className="space-y-1 py-2">
            <div className="flex items-center justify-between"><span>{x.name} <span className="text-xs text-neutral-400">@{x.username} · {x.expert_status}</span></span>
              {x.expert_status === "pending" && <span className="flex gap-1"><button className={btn} onClick={() => act(`/api/admin/experts/${x.id}/approve`)}>승인</button><button className={btn} onClick={() => act(`/api/admin/experts/${x.id}/reject`)}>반려</button></span>}</div>
            <p className="whitespace-pre-wrap text-xs text-neutral-600">{x.expert_bio}</p>
          </li>
        ))}
        {tab === "출금" && d.withdrawals.map((w) => (
          <li key={w.id} className="flex items-center justify-between gap-2 py-2">
            <span>{w.user_name} · {w.amount.toLocaleString()}<br /><span className="text-xs text-neutral-400">{w.bank_info} · {w.status}</span></span>
            {w.status === "pending" && <span className="flex gap-1"><button className={btn} onClick={() => act(`/api/admin/withdrawals/${w.id}/pay`)}>이체 완료</button><button className={btn} onClick={() => act(`/api/admin/withdrawals/${w.id}/reject`, { note: ask("반려 사유") })}>반려</button></span>}
          </li>
        ))}
        {tab === "문의" && d.tickets.map((t) => (
          <li key={t.id} className="space-y-1 py-2">
            <p className="text-xs text-neutral-400">{t.category}{t.target_name ? ` → ${t.target_name}` : ""} · {t.user_name} · {t.created_at} · {t.status}</p>
            <p className="font-medium">{t.subject}</p><p className="whitespace-pre-wrap text-xs text-neutral-600">{t.body}</p>
            {t.status === "pending" && <span className="flex gap-1">
              <button className={btn} onClick={() => act(`/api/admin/tickets/${t.id}/resolve`, { note: ask("답변") })}>답변·완료</button>
              {t.category === "refund" && <button className={btn} onClick={() => { const c = ask("환불할 코인 수"); if (c) act(`/api/admin/tickets/${t.id}/refund`, { coins: Number(c), note: ask("메모") }); }}>환불</button>}
            </span>}
          </li>
        ))}
        {tab === "회원" && d.users.map((u) => (
          <li key={u.id} className="flex items-center justify-between py-2">
            <span>{u.name} <span className="text-xs text-neutral-400">@{u.username} · {u.role}{u.expert_status !== "none" ? ` · 전문가 ${u.expert_status}` : ""}{u.suspended_at ? " · 정지" : ""}</span></span>
            {u.role !== "admin" && <button className={btn} onClick={async () => { if (!confirm("본인 확인 후 임시 비밀번호를 발급할까요? 기존 로그인은 모두 끊겨요.")) return; const r = await api<{ tempPassword: string }>(`/api/admin/users/${u.id}/reset-password`, jsonInit("POST", {})); alert(r.ok ? `임시 비밀번호: ${r.data.tempPassword}
회원에게 전달하고 변경하도록 안내하세요.` : r.data.error); }}>비밀번호 초기화</button>}
            {u.role !== "admin" && (u.suspended_at
              ? <button className={btn} onClick={() => act(`/api/admin/users/${u.id}/unsuspend`)}>정지 해제</button>
              : <button className={btn} onClick={() => confirm("정지할까요?") && act(`/api/admin/users/${u.id}/suspend`)}>정지</button>)}
          </li>
        ))}
        {tab === "원장" && d.ledger.map((l) => (
          <li key={l.id} className="flex justify-between gap-2 py-1.5 text-xs"><span className="min-w-0 truncate">{l.account} · {l.type} · {l.note}</span><span className={l.direction === "credit" ? "text-emerald-600" : "text-rose-600"}>{l.direction === "credit" ? "+" : "-"}{l.amount.toLocaleString()}</span></li>
        ))}
      </ul>
    </div>
  );
}
