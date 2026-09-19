"use client";
import { useState } from "react";
import { api, jsonInit } from "@/lib/client";

const input = "w-full rounded-lg border px-3 py-2 text-sm";

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const r = await api(`/api/auth/${mode}`, jsonInit("POST", { username, password, name }));
    if (!r.ok) return setErr(r.data.error || "실패했어요");
    // 헤더의 로그인 상태를 새로 읽기 위해 전체 이동한다.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  };

  return (
    <form onSubmit={submit} className="space-y-3 p-4">
      <h1 className="text-lg font-bold">{mode === "login" ? "로그인" : "회원가입"}</h1>
      <input className={input} placeholder="아이디 (영문 소문자·숫자·_ 4~20자)" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
      {mode === "signup" && <input className={input} placeholder="이름(닉네임)" value={name} onChange={(e) => setName(e.target.value)} />}
      <input className={input} type="password" placeholder="비밀번호 (8자 이상)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
      {err && <p className="text-sm text-rose-600">{err}</p>}
      <button className="w-full rounded-lg bg-rose-600 py-3 font-medium text-white">{mode === "login" ? "로그인" : "가입하기"}</button>
      <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }} className="w-full text-sm text-neutral-600 underline">
        {mode === "login" ? "처음이신가요? 회원가입" : "이미 계정이 있어요"}
      </button>
    </form>
  );
}
