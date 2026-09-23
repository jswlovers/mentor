"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, jsonInit, useMe } from "@/lib/client";
import { ATTACHMENT_COST, CONSULT_START_FEE, COST_PER_SEC, MAX_MESSAGE_CHARS, MESSAGE_MIN_COST, MESSAGE_PER_CHAR, MIN_CHARGE_KRW } from "@/lib/server/pricing";

type Charge = { id: number; amount_krw: number; coins: number; status: string; provider: string; depositor: string | null; admin_note: string | null; created_at: string };
declare global { interface Window { TossPayments?: (key: string) => { payment: (o: { customerKey: string }) => { requestPayment: (o: Record<string, unknown>) => Promise<void> } } } }
type Ledger = { id: number; direction: "debit" | "credit"; amount: number; type: string; note: string | null; created_at: string };

const STATUS: Record<string, string> = { pending: "입금 확인 대기", approved: "충전 완료", rejected: "반려" };
const won = (n: number) => `${n.toLocaleString()}코인`;

export default function Coins() {
  const { me, refresh } = useMe();
  const [amount, setAmount] = useState(50000);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [msg, setMsg] = useState("");
  const [depositor, setDepositor] = useState("");
  const [info, setInfo] = useState<{ bank: string | null; tossClientKey: string | null }>({ bank: null, tossClientKey: null });

  const load = useCallback(async () => {
    const [c, l] = await Promise.all([api<Charge[]>("/api/coins/charge-requests"), api<Ledger[]>("/api/coins/ledger")]);
    if (c.ok) setCharges(c.data as unknown as Charge[]);
    if (l.ok) setLedger(l.data as unknown as Ledger[]);
    refresh();
  }, [refresh]);

  useEffect(() => {
    api<{ bank: string | null; tossClientKey: string | null }>("/api/coins/bank").then((r) => r.ok && setInfo(r.data));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (me) load();
  }, [me?.id, load]); // eslint-disable-line react-hooks/exhaustive-deps

  if (me === null) return <p className="p-8 text-center text-sm"><Link href="/login" className="text-rose-400 underline">로그인</Link>이 필요해요.</p>;

  const request = async () => {
    const r = await api("/api/coins/charge-requests", jsonInit("POST", { amountKrw: amount, provider: "manual", depositor }));
    setMsg(r.ok ? `${amount.toLocaleString()}원 충전을 신청했어요. 입금 확인 후 관리자가 승인하면 코인이 충전돼요.` : r.data.error || "신청에 실패했어요");
    load();
  };

  // 토스페이먼츠 카드 결제 (TOSS_CLIENT_KEY·TOSS_SECRET_KEY 설정 시). 결제 후 /coins/toss/success 에서 승인 처리.
  const payToss = async () => {
    const order = await api<{ orderId: string }>("/api/coins/charge-requests", jsonInit("POST", { amountKrw: amount, provider: "toss" }));
    if (!order.ok) return setMsg(order.data.error || "결제를 시작하지 못했어요");
    if (!window.TossPayments) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://js.tosspayments.com/v2/standard";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("결제 모듈을 불러오지 못했어요"));
        document.head.appendChild(s);
      }).catch((e) => setMsg(e.message));
    }
    if (!window.TossPayments || !me) return;
    try {
      await window.TossPayments(info.tossClientKey!).payment({ customerKey: me.id }).requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: amount },
        orderId: order.data.orderId,
        orderName: `${amount.toLocaleString()}코인 충전`,
        successUrl: `${window.location.origin}/coins/toss/success`,
        failUrl: `${window.location.origin}/coins`,
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "결제가 취소됐어요");
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 px-6 py-8">
      <section className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
        <p className="text-xs text-rose-300">내 코인 (1코인 = 1원)</p>
        <p className="text-3xl font-bold">{me ? me.coins.toLocaleString() : "…"}</p>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 text-sm">
        <h2 className="mb-2 font-semibold">요금 안내</h2>
        <ul className="space-y-1 text-foreground/80">
          <li>상담 시작비: <b>{won(CONSULT_START_FEE)}</b> (상담 신청 시 1회)</li>
          <li>쪽지: 글자당 {MESSAGE_PER_CHAR}코인, 최소 {won(MESSAGE_MIN_COST)} (1회 {MAX_MESSAGE_CHARS}자 이내, 사진·파일 +{won(ATTACHMENT_COST)})</li>
          <li>보이스톡: 초당 {COST_PER_SEC.voice}코인 (분당 {(COST_PER_SEC.voice * 60).toLocaleString()})</li>
          <li>페이스톡: 초당 {COST_PER_SEC.video}코인 (분당 {(COST_PER_SEC.video * 60).toLocaleString()})</li>
        </ul>
        <p className="mt-2 text-xs text-muted">요금은 상담을 신청한 질문자에게만 부과되고, 전문가는 무료로 답변·통화해요. 전문가가 참여하기 전에는 전액 환불로 취소할 수 있어요.</p>
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">코인 충전 신청</h2>
        <select className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground" value={amount} onChange={(e) => setAmount(Number(e.target.value))}>
          {[MIN_CHARGE_KRW, 10000, 50000, 100000, 300000].map((a) => <option key={a} value={a}>{a.toLocaleString()}원</option>)}
        </select>
        {info.tossClientKey && <button onClick={payToss} className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-400">카드로 바로 충전</button>}
        <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
          <p className="font-medium">무통장입금</p>
          <p className="mt-1 text-foreground/80">{info.bank ?? "입금 계좌가 아직 등록되지 않았어요. 고객센터로 문의해주세요."}</p>
          <input className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted" placeholder="입금자명 (입금 확인에 사용해요)" value={depositor} onChange={(e) => setDepositor(e.target.value)} maxLength={20} />
        </div>
        <button onClick={request} disabled={!info.bank} className="w-full rounded-lg bg-rose-500 py-2.5 text-sm font-medium text-white hover:bg-rose-400 disabled:opacity-40">충전 신청 (무통장입금)</button>
        {msg && <p className="text-xs text-muted">{msg}</p>}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">충전 내역</h2>
        <ul className="divide-y divide-border text-sm">
          {charges.map((c) => (
            <li key={c.id} className="flex justify-between py-2">
              <span>{c.amount_krw.toLocaleString()}원 <span className="text-xs text-muted">{c.provider === "toss" ? "카드" : "무통장"} · {c.created_at}</span></span>
              <span className={c.status === "approved" ? "text-emerald-400" : c.status === "rejected" ? "text-rose-400" : "text-amber-400"}>{STATUS[c.status] ?? c.status}</span>
            </li>
          ))}
          {charges.length === 0 && <li className="py-2 text-muted">내역이 없어요</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">코인 사용 내역</h2>
        <ul className="divide-y divide-border text-sm">
          {ledger.map((l) => (
            <li key={l.id} className="flex justify-between gap-2 py-2">
              <span className="min-w-0 truncate">{l.note || l.type}</span>
              <span className={l.direction === "credit" ? "text-emerald-400" : "text-rose-400"}>{l.direction === "credit" ? "+" : "-"}{l.amount.toLocaleString()}</span>
            </li>
          ))}
          {ledger.length === 0 && <li className="py-2 text-muted">내역이 없어요</li>}
        </ul>
      </section>
    </div>
  );
}
