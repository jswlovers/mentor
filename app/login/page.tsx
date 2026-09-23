"use client";
import Link from "next/link";
import { useState } from "react";
import { api, jsonInit } from "@/lib/client";

const input = "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted";

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
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
      </form>
    </div>
  );
}
