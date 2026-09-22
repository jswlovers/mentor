"use client";
import { useState } from "react";
import { api, jsonInit } from "@/lib/client";
import { POSITIONS, type Position } from "@/lib/regions";

const input = "w-full rounded-lg border px-3 py-2 text-sm";

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState<Position>(POSITIONS[1]);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState("");
  const [err, setErr] = useState("");

  const sendCode = async () => {
    setPhoneMsg("");
    const r = await api<{ devCode?: string }>("/api/auth/phone/send", jsonInit("POST", { phone }));
    if (!r.ok) return setPhoneMsg(r.data.error || "인증번호 요청에 실패했어요");
    setPhoneVerified(false);
    setPhoneMsg(`인증번호를 보냈어요. (테스트용 인증번호: ${r.data.devCode})`);
  };

  const verifyCode = async () => {
    const r = await api("/api/auth/phone/verify", jsonInit("POST", { phone, code }));
    if (!r.ok) return setPhoneMsg(r.data.error || "인증에 실패했어요");
    setPhoneVerified(true);
    setPhoneMsg("휴대폰 인증이 완료됐어요.");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const r = await api(`/api/auth/${mode}`, jsonInit("POST", { username, password, name, phone, position }));
    if (!r.ok) return setErr(r.data.error || "실패했어요");
    // 헤더의 로그인 상태를 새로 읽기 위해 전체 이동한다.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3 p-4 py-10">
      <h1 className="text-lg font-bold">{mode === "login" ? "로그인" : "회원가입"}</h1>
      <input className={input} placeholder="아이디 (영문 소문자·숫자·_ 4~20자)" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
      {mode === "signup" && (
        <>
          <input className={input} placeholder="이름(닉네임)" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <p className="mb-1 text-xs text-neutral-500">직급</p>
            <select className={input} value={position} onChange={(e) => setPosition(e.target.value as Position)}>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input className={input} placeholder="휴대폰 번호 (숫자만, 예: 01012345678)" value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneVerified(false); }} autoComplete="tel" />
            <button type="button" onClick={sendCode} className="shrink-0 rounded-lg border px-3 py-2 text-sm">인증번호 받기</button>
          </div>
          <div className="flex gap-2">
            <input className={input} placeholder="인증번호 6자리" value={code} onChange={(e) => setCode(e.target.value)} disabled={phoneVerified} />
            <button type="button" onClick={verifyCode} disabled={phoneVerified} className="shrink-0 rounded-lg border px-3 py-2 text-sm disabled:opacity-50">
              {phoneVerified ? "인증완료" : "확인"}
            </button>
          </div>
          {phoneMsg && <p className="text-xs text-neutral-600">{phoneMsg}</p>}
        </>
      )}
      <input className={input} type="password" placeholder="비밀번호 (8자 이상)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
      {err && <p className="text-sm text-rose-600">{err}</p>}
      <button className="w-full rounded-lg bg-rose-600 py-3 font-medium text-white">{mode === "login" ? "로그인" : "가입하기"}</button>
      <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }} className="w-full text-sm text-neutral-600 underline">
        {mode === "login" ? "처음이신가요? 회원가입" : "이미 계정이 있어요"}
      </button>
    </form>
  );
}
