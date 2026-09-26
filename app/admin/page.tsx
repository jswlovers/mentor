"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, jsonInit, useMe } from "@/lib/client";

type Overview = {
  charges: { id: number; amount_krw: number; status: string; created_at: string; user_name: string; depositor: string | null }[];
  experts: { id: string; username: string; name: string; expert_status: string; expert_bio: string | null; expert_years: number | null; expert_salon: string | null; expert_license_no: string | null; has_license: number }[];
  withdrawals: { id: number; amount: number; bank_info: string; status: string; created_at: string; user_name: string }[];
  tickets: { id: number; category: string; subject: string; body: string; status: string; user_name: string; target_name: string | null; created_at: string }[];
  users: { id: string; username: string; name: string; role: string; expert_status: string; suspended_at: string | null }[];
  ledger: { id: number; account: string; direction: string; amount: number; type: string; note: string | null; created_at: string }[];
};
const TABS = ["충전", "전문가", "출금", "문의", "회원", "원장", "메시지"] as const;
type MsgData = { stats: { total: number; verified: number; consented: number }; log: { id: number; channel: string; kind: string; text: string; status: string; created_at: string; user_name: string | null; username: string | null }[] };

export default function Admin() {
  const { me } = useMe();
  const [d, setD] = useState<Overview | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("충전");
  const [err, setErr] = useState("");
  const [md, setMd] = useState<MsgData | null>(null);
  const [target, setTarget] = useState("");
  const [text, setText] = useState("");

  const load = useCallback(async () => {
    const r = await api<Overview>("/api/admin/overview");
    if (r.ok) setD(r.data as Overview); else setErr(r.data.error || "불러오지 못했어요");
  }, []);
  const loadMsgs = useCallback(async () => {
    const r = await api<MsgData>("/api/admin/messages");
    if (r.ok) setMd(r.data as MsgData);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (me?.isAdmin) { load(); loadMsgs(); }
  }, [me?.isAdmin, load, loadMsgs]);

  if (me === null) return <p className="p-8 text-center text-sm"><Link href="/login" className="text-rose-400 underline">로그인</Link>이 필요해요.</p>;
  if (me && !me.isAdmin) return <p className="p-8 text-center text-sm text-muted">관리자만 볼 수 있어요.</p>;
  if (!d) return <p className="p-8 text-center text-sm text-muted">{err || "불러오는 중…"}</p>;

  const act = async (path: string, body: unknown = {}) => {
    const r = await api(path, jsonInit("POST", body));
    if (!r.ok) alert(r.data.error || "처리에 실패했어요");
    load();
  };
  const ask = (msg: string) => prompt(msg) ?? undefined;
  const btn = "rounded border border-border px-2 py-0.5 text-xs text-foreground hover:border-white/30";

  return (
    <div className="px-6 py-6 md:px-10">
      <div className="mb-3 flex gap-2 overflow-x-auto">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-full border px-3 py-1 text-sm transition ${tab === t ? "border-rose-500 bg-rose-500 text-white" : "border-border text-muted hover:text-foreground"}`}>{t}</button>)}
      </div>
      <ul className="divide-y divide-border text-sm">
        {tab === "충전" && d.charges.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-2">
            <span>{c.user_name} · {c.amount_krw.toLocaleString()}원 · 입금자 {c.depositor ?? "-"}<br /><span className="text-xs text-muted">{c.created_at} · {c.status}</span></span>
            {c.status === "pending" && <span className="flex gap-1"><button className={btn} onClick={() => act(`/api/admin/charges/${c.id}/approve`)}>승인</button><button className={btn} onClick={() => act(`/api/admin/charges/${c.id}/reject`, { note: ask("반려 사유") })}>반려</button></span>}
          </li>
        ))}
        {tab === "전문가" && d.experts.map((x) => (
          <li key={x.id} className="space-y-1 py-2">
            <div className="flex items-center justify-between"><span>{x.name} <span className="text-xs text-muted">@{x.username} · {x.expert_status}</span></span>
              {x.expert_status === "pending" && <span className="flex gap-1"><button className={btn} onClick={() => act(`/api/admin/experts/${x.id}/approve`)}>승인</button><button className={btn} onClick={() => act(`/api/admin/experts/${x.id}/reject`)}>반려</button></span>}</div>
            <p className="text-xs text-muted">
              경력 {x.expert_years ?? "미입력"}{x.expert_years !== null ? "년" : ""} · 살롱 {x.expert_salon ?? "미입력"} · 면허번호 {x.expert_license_no ?? "미입력"} ·{" "}
              {x.has_license ? <a href={`/api/admin/experts/${x.id}/license`} target="_blank" rel="noreferrer" className="font-semibold text-rose-400 underline">면허증 보기</a> : <span className="text-amber-300">면허증 없음(이전 방식 신청)</span>}
            </p>
            <p className="whitespace-pre-wrap text-xs text-muted">{x.expert_bio}</p>
          </li>
        ))}
        {tab === "출금" && d.withdrawals.map((w) => (
          <li key={w.id} className="flex items-center justify-between gap-2 py-2">
            <span>{w.user_name} · {w.amount.toLocaleString()}<br /><span className="text-xs text-muted">{w.bank_info} · {w.status}</span></span>
            {w.status === "pending" && <span className="flex gap-1"><button className={btn} onClick={() => act(`/api/admin/withdrawals/${w.id}/pay`)}>이체 완료</button><button className={btn} onClick={() => act(`/api/admin/withdrawals/${w.id}/reject`, { note: ask("반려 사유") })}>반려</button></span>}
          </li>
        ))}
        {tab === "문의" && d.tickets.map((t) => (
          <li key={t.id} className="space-y-1 py-2">
            <p className="text-xs text-muted">{t.category}{t.target_name ? ` → ${t.target_name}` : ""} · {t.user_name} · {t.created_at} · {t.status}</p>
            <p className="font-medium">{t.subject}</p><p className="whitespace-pre-wrap text-xs text-muted">{t.body}</p>
            {t.status === "pending" && <span className="flex gap-1">
              <button className={btn} onClick={() => act(`/api/admin/tickets/${t.id}/resolve`, { note: ask("답변") })}>답변·완료</button>
              {t.category === "refund" && <button className={btn} onClick={() => { const c = ask("환불할 코인 수"); if (c) act(`/api/admin/tickets/${t.id}/refund`, { coins: Number(c), note: ask("메모") }); }}>환불</button>}
            </span>}
          </li>
        ))}
        {tab === "회원" && d.users.map((u) => (
          <li key={u.id} className="flex items-center justify-between py-2">
            <span>{u.name} <span className="text-xs text-muted">@{u.username} · {u.role}{u.expert_status !== "none" ? ` · 전문가 ${u.expert_status}` : ""}{u.suspended_at ? " · 정지" : ""}</span></span>
            {u.role !== "admin" && <button className={btn} onClick={async () => { if (!confirm("본인 확인 후 임시 비밀번호를 발급할까요? 기존 로그인은 모두 끊겨요.")) return; const r = await api<{ tempPassword: string }>(`/api/admin/users/${u.id}/reset-password`, jsonInit("POST", {})); alert(r.ok ? `임시 비밀번호: ${r.data.tempPassword}
회원에게 전달하고 변경하도록 안내하세요.` : r.data.error); }}>비밀번호 초기화</button>}
            {u.role !== "admin" && (u.suspended_at
              ? <button className={btn} onClick={() => act(`/api/admin/users/${u.id}/unsuspend`)}>정지 해제</button>
              : <button className={btn} onClick={() => confirm("정지할까요?") && act(`/api/admin/users/${u.id}/suspend`)}>정지</button>)}
          </li>
        ))}
        {tab === "메시지" && (
          <li className="space-y-3 py-2">
            <p className="text-xs text-muted">수신 가능(휴대폰 인증 + 동의) 회원 <b>{md?.stats.consented ?? 0}</b>명 / 인증 {md?.stats.verified ?? 0}명 / 전체 {md?.stats.total ?? 0}명</p>
            <input className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted" placeholder='받는 사람: 회원 아이디, 또는 all (수신 동의 회원 전체)' value={target} onChange={(e) => setTarget(e.target.value)} />
            <textarea className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted" rows={4} maxLength={500} placeholder="서비스 안내 내용 (500자 이내, 광고성 내용 금지)" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="w-full rounded-lg bg-rose-500 py-2 text-sm text-white hover:bg-rose-400" onClick={async () => {
              if (!target.trim() || !text.trim()) return alert("받는 사람과 내용을 입력해주세요");
              if (target.trim() === "all" && !confirm(`수신 동의한 회원 ${md?.stats.consented ?? 0}명 전체에게 보낼까요?`)) return;
              const r = await api<{ targeted: number; sent: number; mock: number; failed: number; skipped: number }>("/api/admin/messages", jsonInit("POST", { target: target.trim(), message: text }));
              alert(r.ok ? `대상 ${r.data.targeted}명 · 발송 ${r.data.sent} · 테스트(mock) ${r.data.mock} · 실패 ${r.data.failed} · 건너뜀 ${r.data.skipped}` : r.data.error);
              if (r.ok) setText("");
              loadMsgs();
            }}>발송</button>
            <p className="text-xs text-muted">건너뜀 = 휴대폰 미인증 또는 수신 미동의 회원</p>
            <ul className="divide-y divide-border">
              {md?.log.map((l) => (
                <li key={l.id} className="py-1.5 text-xs"><span className="text-muted">{l.created_at} · {l.channel} · {l.kind} · <b className={l.status === "failed" ? "text-rose-400" : ""}>{l.status}</b> · {l.user_name ?? "-"}</span><br />{l.text}</li>
              ))}
              {md?.log.length === 0 && <li className="py-2 text-muted">발송 기록이 없어요</li>}
            </ul>
          </li>
        )}
        {tab === "원장" && d.ledger.map((l) => (
          <li key={l.id} className="flex justify-between gap-2 py-1.5 text-xs"><span className="min-w-0 truncate">{l.account} · {l.type} · {l.note}</span><span className={l.direction === "credit" ? "text-emerald-400" : "text-rose-400"}>{l.direction === "credit" ? "+" : "-"}{l.amount.toLocaleString()}</span></li>
        ))}
      </ul>
    </div>
  );
}
