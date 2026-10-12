"use client";
import Link from "next/link";
import { useState } from "react";
import { api, jsonInit } from "@/lib/client";

const input = "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted";

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const r = await api(`/api/auth/${mode}`, jsonInit("POST", { username, password, name, agree }));
    if (!r.ok) return setErr(r.data.error || "실패했어요");
    // 헤더의 로그인 상태를 새로 읽기 위해 전체 이동한다.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  };

  if (mode === "reset") return <ResetPassword onDone={() => { setMode("login"); setErr(""); }} />;

  return (
    <div className="mx-auto max-w-sm px-6 py-14">
      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-lg font-bold">{mode === "login" ? "로그인" : "회원가입"}</h1>
        <input className={input} placeholder="아이디 (영문 소문자·숫자·_ 4~20자)" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        {mode === "signup" && <input className={input} placeholder="이름(닉네임)" value={name} onChange={(e) => setName(e.target.value)} />}
        <input className={input} type="password" placeholder="비밀번호 (8자 이상)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        {mode === "signup" && (
          <label className="flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>(필수) <Link href="/terms" target="_blank" className="underline">이용약관</Link>, <Link href="/privacy" target="_blank" className="underline">개인정보 처리방침</Link>, <Link href="/refund-policy" target="_blank" className="underline">환불 규정</Link>을 확인했고 동의합니다.</span>
          </label>
        )}
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <button className="w-full rounded-lg bg-rose-500 py-3 font-medium text-white transition hover:bg-rose-400">{mode === "login" ? "로그인" : "가입하기"}</button>
        <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }} className="w-full text-sm text-muted underline hover:text-foreground">
          {mode === "login" ? "처음이신가요? 회원가입" : "이미 계정이 있어요"}
        </button>
        {mode === "login" && (
          <button type="button" onClick={() => { setMode("reset"); setErr(""); }} className="w-full text-xs text-muted hover:text-foreground">
            비밀번호를 잊으셨나요?
          </button>
        )}
      </form>
    </div>
  );
}

// 비밀번호 찾기: 아이디 + 내 정보에서 인증해 둔 휴대폰 번호 → 문자 인증번호 → 새 비밀번호.
function ResetPassword({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<"request" | "confirm" | "done">("request");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const r = await api<{ message: string; devCode?: string }>("/api/auth/reset/request", jsonInit("POST", { username, phone }));
    if (!r.ok) return setErr(r.data.error || "실패했어요");
    setMsg(r.data.message + (r.data.devCode ? ` (개발용 인증번호: ${r.data.devCode})` : ""));
    setStep("confirm");
  };
  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const r = await api("/api/auth/reset/confirm", jsonInit("POST", { username, code, password }));
    if (!r.ok) return setErr(r.data.error || "실패했어요");
    setStep("done");
  };

  return (
    <div className="mx-auto max-w-sm px-6 py-14">
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-lg font-bold">비밀번호 찾기</h1>
        {step === "request" && (
          <form onSubmit={request} className="space-y-3">
            <p className="text-xs text-muted">내 정보에서 인증해 둔 휴대폰 번호로 인증번호를 보내드려요.</p>
            <input className={input} placeholder="아이디" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            <input className={input} placeholder="휴대폰 번호 (010-1234-5678)" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" />
            {err && <p className="text-sm text-rose-400">{err}</p>}
            <button className="w-full rounded-lg bg-rose-500 py-3 font-medium text-white transition hover:bg-rose-400">인증번호 받기</button>
          </form>
        )}
        {step === "confirm" && (
          <form onSubmit={confirm} className="space-y-3">
            <p className="text-xs text-muted">{msg}</p>
            <input className={input} placeholder="인증번호 6자리" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" />
            <input className={input} type="password" placeholder="새 비밀번호 (8자 이상)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            {err && <p className="text-sm text-rose-400">{err}</p>}
            <button className="w-full rounded-lg bg-rose-500 py-3 font-medium text-white transition hover:bg-rose-400">비밀번호 바꾸기</button>
            <button type="button" onClick={() => { setStep("request"); setErr(""); }} className="w-full text-xs text-muted hover:text-foreground">인증번호 다시 받기</button>
          </form>
        )}
        {step === "done" && (
          <>
            <p className="text-sm">비밀번호를 바꿨어요. 다른 기기의 로그인은 모두 해제됐어요.</p>
            <button onClick={onDone} className="w-full rounded-lg bg-rose-500 py-3 font-medium text-white transition hover:bg-rose-400">로그인하기</button>
          </>
        )}
        {step !== "done" && (
          <>
            <p className="text-[11px] text-muted">휴대폰 인증을 하지 않은 계정은 문자로 찾을 수 없어요. 아이디와 가입 때 쓴 이름을 적어 화면 하단의 고객센터 연락처로 문의해주세요.</p>
            <button type="button" onClick={onDone} className="w-full text-sm text-muted underline hover:text-foreground">로그인으로 돌아가기</button>
          </>
        )}
      </div>
    </div>
  );
}
