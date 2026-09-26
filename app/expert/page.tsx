"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, CATEGORIES, jsonInit, useMe } from "@/lib/client";

type Earn = {
  earnings: number; share: number; minWithdraw: number;
  ledger: { id: number; direction: "debit" | "credit"; amount: number; note: string | null; created_at: string }[];
  withdrawals: { id: number; amount: number; bank_info: string; status: string; admin_note: string | null; created_at: string }[];
};
const WSTATUS: Record<string, string> = { pending: "지급 대기", paid: "지급 완료", rejected: "반려" };
const input = "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted";

export default function Expert() {
  const { me, refresh } = useMe();
  const [bio, setBio] = useState("");
  const [years, setYears] = useState("");
  const [salon, setSalon] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [license, setLicense] = useState<File | null>(null);
  const [data, setData] = useState<Earn | null>(null);
  const [amount, setAmount] = useState(10000);
  const [bank, setBank] = useState("");
  const [msg, setMsg] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [available, setAvailable] = useState(true);
  const [headline, setHeadline] = useState("");
  const [smsg, setSmsg] = useState("");

  const load = useCallback(async () => {
    const r = await api<Earn>("/api/experts/earnings");
    if (r.ok) setData(r.data as Earn);
  }, []);

  useEffect(() => {
    if (me?.isExpert) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      load();
      api<{ categories: string[]; available: boolean; headline: string }>("/api/experts/settings").then((r) => {
        if (r.ok) { setCats(r.data.categories); setAvailable(r.data.available); setHeadline(r.data.headline); }
      });
    }
  }, [me?.isExpert, load]);

  if (me === null) return <p className="p-8 text-center text-sm"><Link href="/login" className="text-rose-400 underline">로그인</Link>이 필요해요.</p>;
  if (!me) return null;

  if (!me.isExpert) {
    const apply = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!license) return setMsg("미용사 면허증(또는 자격증) 사진을 첨부해주세요");
      const f = new FormData();
      f.append("bio", bio);
      f.append("years", years);
      f.append("salon", salon);
      f.append("licenseNo", licenseNo);
      f.append("license", license);
      const r = await api("/api/experts/apply", { method: "POST", body: f });
      setMsg(r.ok ? "신청했어요. 관리자가 검토한 뒤 승인해요." : r.data.error || "신청에 실패했어요");
      refresh();
    };
    return (
      <div className="mx-auto max-w-xl space-y-3 px-6 py-8">
        <h1 className="text-lg font-bold">전문가 신청</h1>
        {me.expertStatus === "pending" && <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">검토 중이에요. 승인되면 이 화면이 전문가 센터로 바뀌어요.</p>}
        {me.expertStatus === "rejected" && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">이전 신청이 반려됐어요. 내용을 보완해 다시 신청해주세요.</p>}
        {me.expertStatus !== "pending" && (
          <form onSubmit={apply} className="space-y-3">
            <div className="rounded-lg border border-border bg-surface p-3 text-xs leading-5 text-muted">
              <p className="font-semibold text-foreground">신청 조건</p>
              <ul className="mt-1 list-disc pl-4">
                <li>미용사 면허증(또는 미용 관련 국가자격증) 사진 첨부</li>
                <li>경력 연수와 근무 중인(또는 최근) 살롱 입력</li>
                <li>경력·자격·전문 분야 소개 20자 이상</li>
              </ul>
              <p className="mt-1">관리자가 면허증과 경력을 확인한 뒤 승인해요. 면허증 사진은 심사에만 쓰고 공개되지 않아요.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-muted">경력 연수(년)
                <input required type="number" min={0} max={60} inputMode="numeric" className={`${input} mt-1`} placeholder="예: 7" value={years} onChange={(e) => setYears(e.target.value)} />
              </label>
              <label className="text-xs font-semibold text-muted">근무 살롱
                <input required maxLength={60} className={`${input} mt-1`} placeholder="예: OO헤어 강남점" value={salon} onChange={(e) => setSalon(e.target.value)} />
              </label>
            </div>
            <label className="block text-xs font-semibold text-muted">미용사 면허번호 (선택)
              <input maxLength={30} className={`${input} mt-1`} placeholder="면허증에 적힌 번호" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} />
            </label>
            <label className="block text-xs font-semibold text-muted">면허증·자격증 사진 (필수, JPG·PNG·WEBP 5MB 이하)
              <input required type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm text-foreground" onChange={(e) => setLicense(e.target.files?.[0] ?? null)} />
            </label>
            <textarea required rows={6} maxLength={1000} className={input} placeholder="경력, 자격(미용사 면허 등), 전문 분야를 20자 이상 적어주세요" value={bio} onChange={(e) => setBio(e.target.value)} />
            <button className="w-full rounded-lg bg-rose-500 py-3 font-medium text-white hover:bg-rose-400">전문가 신청</button>
          </form>
        )}
        {msg && <p className="text-sm text-muted">{msg}</p>}
        <p className="text-xs text-muted">승인된 전문가는 1:1 상담에 참여해 질문자가 낸 금액의 일부를 수익으로 받고, 답변에 &apos;검증 전문가&apos; 배지가 붙어요.</p>
      </div>
    );
  }

  const withdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("/api/experts/withdrawals", jsonInit("POST", { amount, bankInfo: bank }));
    setMsg(r.ok ? "출금을 신청했어요. 관리자가 확인 후 이체해요." : r.data.error || "신청에 실패했어요");
    load(); refresh();
  };

  const saveSettings = async () => {
    const r = await api("/api/experts/settings", jsonInit("POST", { categories: cats, available, headline }));
    setSmsg(r.ok ? "저장했어요." : r.data.error || "저장에 실패했어요");
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 px-6 py-8">
      <section className="space-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
        <h2 className="font-semibold">상담 호출 설정</h2>
        <p className="text-xs text-muted">질문자가 상담을 열면 담당 분야와 맞는 전문가에게 알림이 가요. 분야를 하나도 고르지 않으면 모든 분야 요청을 받아요. (시간당 최대 3건, 카카오톡은 08~23시에만)</p>
        <label className="flex items-center gap-2"><input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /> 지금 상담 요청 받기 (끄면 호출·목록에서 &apos;쉬는 중&apos;)</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))} className={`rounded-full border px-3 py-1 text-xs transition ${cats.includes(c) ? "border-rose-500 bg-rose-500 text-white" : "border-border text-muted hover:text-foreground"}`}>{c}</button>
          ))}
        </div>
        <input className={input} maxLength={40} placeholder="한 줄 소개 (예: 탈색·염색 손상모 케어 15년)" value={headline} onChange={(e) => setHeadline(e.target.value)} />
        <button onClick={saveSettings} className="w-full rounded-lg border border-border bg-surface-2 py-2 text-sm font-medium text-foreground hover:border-white/30">저장</button>
        {smsg && <p className="text-xs text-muted">{smsg}</p>}
      </section>
      <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
        <p className="text-xs text-emerald-300">출금 가능 수익 (코인 = 원)</p>
        <p className="text-3xl font-bold">{data ? data.earnings.toLocaleString() : "…"}</p>
        {data && <p className="mt-1 text-[11px] text-muted">상담에서 질문자가 낸 금액의 {Math.round(data.share * 100)}%가 쌓여요. 최소 출금 {data.minWithdraw.toLocaleString()}코인.</p>}
      </section>
      <form onSubmit={withdraw} className="space-y-2 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">출금 신청</h2>
        <input type="number" min={10000} step={1000} className={input} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <input className={input} placeholder="은행 · 계좌번호 · 예금주" value={bank} onChange={(e) => setBank(e.target.value)} />
        <button className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-white hover:bg-emerald-400">출금 신청</button>
        {msg && <p className="text-xs text-muted">{msg}</p>}
      </form>
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">출금 내역</h2>
        <ul className="divide-y divide-border text-sm">
          {data?.withdrawals.map((w) => (
            <li key={w.id} className="flex justify-between py-2"><span>{w.amount.toLocaleString()} <span className="text-xs text-muted">{w.bank_info}</span></span><span>{WSTATUS[w.status]}{w.admin_note ? ` (${w.admin_note})` : ""}</span></li>
          ))}
          {data?.withdrawals.length === 0 && <li className="py-2 text-muted">내역이 없어요</li>}
        </ul>
      </section>
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">수익 내역</h2>
        <ul className="divide-y divide-border text-sm">
          {data?.ledger.map((l) => (
            <li key={l.id} className="flex justify-between gap-2 py-2"><span className="min-w-0 truncate">{l.note}</span><span className={l.direction === "credit" ? "text-emerald-400" : "text-rose-400"}>{l.direction === "credit" ? "+" : "-"}{l.amount.toLocaleString()}</span></li>
          ))}
          {data?.ledger.length === 0 && <li className="py-2 text-muted">아직 수익이 없어요. 질문 상세에서 상담에 참여해보세요.</li>}
        </ul>
      </section>
    </div>
  );
}
