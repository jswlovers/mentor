"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, jsonInit, useMe } from "@/lib/client";

type Ticket = { id: number; category: string; subject: string; body: string; status: string; admin_note: string | null; refund_coins: number | null; created_at: string };
const CAT: Record<string, string> = { complaint: "불만·클레임", refund: "환불 요청", report: "회원 신고", other: "기타" };
const input = "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted";

export default function Support() {
  const { me } = useMe();
  const [category, setCategory] = useState("complaint");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await api<Ticket[]>("/api/support");
    if (r.ok) setTickets(r.data as unknown as Ticket[]);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (me) load();
  }, [me, load]);

  if (me === null) return <p className="p-8 text-center text-sm"><Link href="/login" className="text-rose-400 underline">로그인</Link>이 필요해요.</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("/api/support", jsonInit("POST", { category, subject, body, targetUsername: target }));
    setMsg(r.ok ? "접수했어요. 확인 후 처리해 드려요." : r.data.error || "접수에 실패했어요");
    if (r.ok) { setSubject(""); setBody(""); setTarget(""); load(); }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 px-6 py-8">
      <form onSubmit={submit} className="space-y-2 rounded-xl border border-border bg-surface p-4">
        <h1 className="text-lg font-bold">고객센터</h1>
        <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
          {Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {category === "report" && <input className={input} placeholder="신고할 회원의 아이디" value={target} onChange={(e) => setTarget(e.target.value)} />}
        <input required className={input} placeholder="제목" maxLength={100} value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea required rows={5} className={input} placeholder={category === "refund" ? "환불받고 싶은 상담(질문)과 사유를 적어주세요" : "내용"} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="w-full rounded-lg bg-rose-500 py-2.5 text-sm font-medium text-white hover:bg-rose-400">접수</button>
        {msg && <p className="text-xs text-muted">{msg}</p>}
      </form>
      <section>
        <h2 className="mb-2 text-sm font-semibold">내 문의</h2>
        <ul className="space-y-2 text-sm">
          {tickets.map((t) => (
            <li key={t.id} className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs text-muted">{CAT[t.category]} · {t.created_at} · {t.status === "pending" ? "접수됨" : "처리 완료"}</p>
              <p className="font-medium">{t.subject}</p>
              {t.refund_coins ? <p className="text-xs text-emerald-400">{t.refund_coins.toLocaleString()}코인 환불됨</p> : null}
              {t.admin_note && <p className="mt-1 text-xs text-muted">답변: {t.admin_note}</p>}
            </li>
          ))}
          {tickets.length === 0 && <li className="text-muted">접수한 문의가 없어요</li>}
        </ul>
      </section>
    </div>
  );
}
