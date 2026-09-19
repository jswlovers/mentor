"use client";
import Link from "next/link";
import { useState } from "react";
import { api, jsonInit, useMe } from "@/lib/client";

const input = "w-full rounded-lg border px-3 py-2 text-sm";

export default function Account() {
  const { me } = useMe();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");

  if (me === null) return <p className="p-8 text-center text-sm"><Link href="/login" className="text-rose-600 underline">로그인</Link>이 필요해요.</p>;
  if (!me) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("/api/auth/password", jsonInit("POST", { current, next }));
    setMsg(r.ok ? "비밀번호를 바꿨어요. 다른 기기의 로그인은 해제됐어요." : r.data.error || "변경에 실패했어요");
    if (r.ok) { setCurrent(""); setNext(""); }
  };

  return (
    <div className="space-y-5 p-4">
      <section className="rounded-xl border p-4 text-sm">
        <p><b>{me.name}</b> <span className="text-neutral-500">@{me.username}</span></p>
        <p className="mt-1 text-neutral-600">코인 {me.coins.toLocaleString()} · {me.isExpert ? "검증 전문가" : "일반 회원"}{me.isAdmin ? " · 관리자" : ""}</p>
        {me.isExpert && <Link href={`/experts/${me.id}`} className="mt-2 inline-block text-rose-600 underline">내 공개 프로필 보기</Link>}
      </section>
      <form onSubmit={submit} className="space-y-2">
        <h2 className="text-sm font-semibold">비밀번호 변경</h2>
        <input className={input} type="password" placeholder="현재 비밀번호" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        <input className={input} type="password" placeholder="새 비밀번호 (8자 이상)" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        <button className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white">변경</button>
        {msg && <p className="text-xs text-neutral-600">{msg}</p>}
        <p className="text-xs text-neutral-500">비밀번호를 잊었다면 고객센터로 문의하세요. 본인 확인 후 관리자가 임시 비밀번호를 발급해요.</p>
      </form>
    </div>
  );
}
