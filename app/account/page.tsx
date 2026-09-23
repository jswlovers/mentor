"use client";
import Link from "next/link";
import { useState } from "react";
import { api, jsonInit, useMe } from "@/lib/client";

const input = "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted";

export default function Account() {
  const { me, refresh } = useMe();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [pmsg, setPmsg] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");

  if (me === null) return <p className="p-8 text-center text-sm"><Link href="/login" className="text-rose-400 underline">로그인</Link>이 필요해요.</p>;
  if (!me) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("/api/auth/password", jsonInit("POST", { current, next }));
    setMsg(r.ok ? "비밀번호를 바꿨어요. 다른 기기의 로그인은 해제됐어요." : r.data.error || "변경에 실패했어요");
    if (r.ok) { setCurrent(""); setNext(""); }
  };

  const phoneAction = async (action: string, body: unknown = {}) => {
    const r = await api<{ devCode?: string }>(`/api/auth/phone/${action}`, jsonInit("POST", body));
    if (!r.ok) { setPmsg(r.data.error || "요청에 실패했어요"); return false; }
    await refresh();
    return r.data;
  };
  const requestCode = async () => {
    const r = await phoneAction("request", { phone });
    if (r) { setSent(true); setPmsg(`인증번호를 보냈어요. 5분 안에 입력해주세요.${r.devCode ? ` (개발용: ${r.devCode})` : ""}`); }
  };
  const verify = async () => {
    if (await phoneAction("verify", { code, consent })) { setSent(false); setCode(""); setPhone(""); setPmsg("휴대폰 인증을 마쳤어요."); }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 px-6 py-8">
      <section className="rounded-xl border border-border bg-surface p-4 text-sm">
        <p><b>{me.name}</b> <span className="text-muted">@{me.username}</span></p>
        <p className="mt-1 text-muted">코인 {me.coins.toLocaleString()} · {me.isExpert ? "검증 전문가" : "일반 회원"}{me.isAdmin ? " · 관리자" : ""}</p>
        {me.isExpert && <Link href={`/experts/${me.id}`} className="mt-2 inline-block text-rose-400 underline">내 공개 프로필 보기</Link>}
      </section>
      <section className="space-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
        <h2 className="font-semibold">카카오톡 알림</h2>
        <p className="text-xs text-muted">새 메시지·전문가 참여·충전·출금 등 <b>서비스 이용 알림</b>을 카카오톡(알림톡)으로 받아요. 휴대폰 인증과 수신 동의를 모두 마친 분께만 보내며, 광고성 내용은 보내지 않아요.</p>
        {me.phoneVerified ? (
          <>
            <p>인증된 번호: <b>{me.phone}</b></p>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={me.notifyKakao} onChange={async (e) => { await phoneAction("consent", { consent: e.target.checked }); setPmsg(e.target.checked ? "알림 수신에 동의했어요." : "알림 수신을 껐어요."); }} />
              카카오톡 알림 수신 동의
            </label>
            <button onClick={async () => { if (confirm("휴대폰 번호를 삭제할까요? 알림도 더 이상 오지 않아요.") && (await phoneAction("remove"))) setPmsg("번호를 삭제했어요."); }} className="text-xs text-muted underline hover:text-foreground">번호 삭제</button>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <input className={input} inputMode="numeric" placeholder="휴대폰 번호 (010-1234-5678)" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <button onClick={requestCode} className="shrink-0 rounded-lg border border-border px-3 text-sm text-foreground hover:border-white/30">인증번호 받기</button>
            </div>
            {sent && (
              <>
                <div className="flex gap-2">
                  <input className={input} inputMode="numeric" maxLength={6} placeholder="인증번호 6자리" value={code} onChange={(e) => setCode(e.target.value)} />
                  <button onClick={verify} className="shrink-0 rounded-lg bg-rose-500 px-3 text-sm text-white hover:bg-rose-400">확인</button>
                </div>
                <label className="flex items-start gap-2 text-xs text-muted"><input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />카카오톡(알림톡)·문자로 서비스 이용 알림을 받는 것에 동의해요. (언제든 여기서 끌 수 있어요)</label>
              </>
            )}
          </>
        )}
        {pmsg && <p className="text-xs text-muted">{pmsg}</p>}
      </section>
      <form onSubmit={submit} className="space-y-2 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">비밀번호 변경</h2>
        <input className={input} type="password" placeholder="현재 비밀번호" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        <input className={input} type="password" placeholder="새 비밀번호 (8자 이상)" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        <button className="w-full rounded-lg bg-rose-500 py-2.5 text-sm font-medium text-white hover:bg-rose-400">변경</button>
        {msg && <p className="text-xs text-muted">{msg}</p>}
        <p className="text-xs text-muted">비밀번호를 잊었다면 고객센터로 문의하세요. 본인 확인 후 관리자가 임시 비밀번호를 발급해요.</p>
      </form>
    </div>
  );
}
