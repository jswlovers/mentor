"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, jsonInit, useMe } from "@/lib/client";

type Earn = {
  earnings: number; share: number; minWithdraw: number;
  ledger: { id: number; direction: "debit" | "credit"; amount: number; note: string | null; created_at: string }[];
  withdrawals: { id: number; amount: number; bank_info: string; status: string; admin_note: string | null; created_at: string }[];
};
const WSTATUS: Record<string, string> = { pending: "지급 대기", paid: "지급 완료", rejected: "반려" };
const input = "w-full rounded-lg border px-3 py-2 text-sm";

export default function Expert() {
  const { me, refresh } = useMe();
  const [bio, setBio] = useState("");
  const [data, setData] = useState<Earn | null>(null);
  const [amount, setAmount] = useState(10000);
  const [bank, setBank] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await api<Earn>("/api/experts/earnings");
    if (r.ok) setData(r.data as Earn);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (me?.isExpert) load();
  }, [me?.isExpert, load]);

  if (me === null) return <p className="p-8 text-center text-sm"><Link href="/login" className="text-rose-600 underline">로그인</Link>이 필요해요.</p>;
  if (!me) return null;

  if (!me.isExpert) {
    const apply = async (e: React.FormEvent) => {
      e.preventDefault();
      const r = await api("/api/experts/apply", jsonInit("POST", { bio }));
      setMsg(r.ok ? "신청했어요. 관리자가 검토한 뒤 승인해요." : r.data.error || "신청에 실패했어요");
      refresh();
    };
    return (
      <div className="space-y-3 p-4">
        <h1 className="text-lg font-bold">전문가 신청</h1>
        {me.expertStatus === "pending" && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">검토 중이에요. 승인되면 이 화면이 전문가 센터로 바뀌어요.</p>}
        {me.expertStatus === "rejected" && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">이전 신청이 반려됐어요. 내용을 보완해 다시 신청해주세요.</p>}
        {me.expertStatus !== "pending" && (
          <form onSubmit={apply} className="space-y-3">
            <textarea required rows={6} maxLength={1000} className={input} placeholder="경력, 자격(미용사 면허 등), 전문 분야를 20자 이상 적어주세요" value={bio} onChange={(e) => setBio(e.target.value)} />
            <button className="w-full rounded-lg bg-rose-600 py-3 font-medium text-white">전문가 신청</button>
          </form>
        )}
        {msg && <p className="text-sm text-neutral-600">{msg}</p>}
        <p className="text-xs text-neutral-500">승인된 전문가는 1:1 상담에 참여해 질문자가 낸 금액의 일부를 수익으로 받고, 답변에 &apos;검증 전문가&apos; 배지가 붙어요.</p>
      </div>
    );
  }

  const withdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("/api/experts/withdrawals", jsonInit("POST", { amount, bankInfo: bank }));
    setMsg(r.ok ? "출금을 신청했어요. 관리자가 확인 후 이체해요." : r.data.error || "신청에 실패했어요");
    load(); refresh();
  };

  return (
    <div className="space-y-5 p-4">
      <section className="rounded-xl bg-emerald-50 p-4">
        <p className="text-xs text-emerald-700">출금 가능 수익 (코인 = 원)</p>
        <p className="text-3xl font-bold">{data ? data.earnings.toLocaleString() : "…"}</p>
        {data && <p className="mt-1 text-[11px] text-neutral-500">상담에서 질문자가 낸 금액의 {Math.round(data.share * 100)}%가 쌓여요. 최소 출금 {data.minWithdraw.toLocaleString()}코인.</p>}
      </section>
      <form onSubmit={withdraw} className="space-y-2">
        <h2 className="text-sm font-semibold">출금 신청</h2>
        <input type="number" min={10000} step={1000} className={input} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <input className={input} placeholder="은행 · 계좌번호 · 예금주" value={bank} onChange={(e) => setBank(e.target.value)} />
        <button className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white">출금 신청</button>
        {msg && <p className="text-xs text-neutral-600">{msg}</p>}
      </form>
      <section>
        <h2 className="mb-2 text-sm font-semibold">출금 내역</h2>
        <ul className="divide-y text-sm">
          {data?.withdrawals.map((w) => (
            <li key={w.id} className="flex justify-between py-2"><span>{w.amount.toLocaleString()} <span className="text-xs text-neutral-400">{w.bank_info}</span></span><span>{WSTATUS[w.status]}{w.admin_note ? ` (${w.admin_note})` : ""}</span></li>
          ))}
          {data?.withdrawals.length === 0 && <li className="py-2 text-neutral-400">내역이 없어요</li>}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">수익 내역</h2>
        <ul className="divide-y text-sm">
          {data?.ledger.map((l) => (
            <li key={l.id} className="flex justify-between gap-2 py-2"><span className="min-w-0 truncate">{l.note}</span><span className={l.direction === "credit" ? "text-emerald-600" : "text-rose-600"}>{l.direction === "credit" ? "+" : "-"}{l.amount.toLocaleString()}</span></li>
          ))}
          {data?.ledger.length === 0 && <li className="py-2 text-neutral-400">아직 수익이 없어요. 질문 상세에서 상담에 참여해보세요.</li>}
        </ul>
      </section>
    </div>
  );
}
