"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, jsonInit } from "@/lib/client";

// 토스 결제창이 성공 후 돌려보내는 주소: ?paymentKey=&orderId=&amount= 로 서버 승인 API를 호출한다.
export default function TossSuccess() {
  const [msg, setMsg] = useState("결제를 확인하는 중…");
  const [ok, setOk] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const q = new URLSearchParams(window.location.search);
    api<{ coins: number }>("/api/coins/toss/confirm", jsonInit("POST", {
      paymentKey: q.get("paymentKey"), orderId: q.get("orderId"), amount: Number(q.get("amount")),
    })).then((r) => {
      setOk(r.ok);
      setMsg(r.ok ? `충전이 완료됐어요. 현재 ${r.data.coins.toLocaleString()}코인` : r.data.error || "결제 승인에 실패했어요");
    });
  }, []);

  return (
    <div className="space-y-4 p-8 text-center">
      <p className={ok ? "text-emerald-700" : "text-neutral-700"}>{msg}</p>
      <Link href="/coins" className="inline-block rounded-lg border px-4 py-2 text-sm">코인 화면으로</Link>
    </div>
  );
}
