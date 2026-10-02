"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api, jsonInit, notifyMeChanged, useMe } from "@/lib/client";
import Avatar from "./Avatar";
import ConsultRequestAlert from "./ConsultRequestAlert";

export default function Header() {
  const { me, refresh } = useMe();
  const router = useRouter();

  // 전문가 상담 ON/OFF 토글. 상담 불가 시간이면 ON이어도 쉬는 중으로 보여준다.
  const av = me?.availability ?? null;
  const toggleConsult = async () => {
    if (!av) return;
    const r = await api("/api/experts/availability", jsonInit("POST", { on: !av.on }));
    if (!r.ok) alert(r.data.error || "변경하지 못했어요");
    notifyMeChanged();
  };
  // 불가 시간이 시작·끝나면 표시가 바뀌도록 전문가는, 새 요청 건수가 보이도록 관리자는 1분마다 다시 불러온다
  const poll = !!av || !!me?.isAdmin;
  useEffect(() => {
    if (!poll) return;
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [poll, refresh]);
  const pending = me?.adminPending?.total ?? 0;

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    await refresh();
    router.push("/");
  };

  return (
    <>
    <header className="sticky top-0 z-10 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight text-rose-400">미용 SOS</Link>
        <div className="flex items-center gap-2 text-sm">
          {me ? (
            <>
              {av && (
                <button onClick={toggleConsult} title={av.offNow ? `상담 불가 시간(${av.offStart}~${av.offEnd})이라 요청을 받지 않아요. 누르면 ${av.on ? "OFF로" : "ON으로"} 바꿔요` : `누르면 상담 ${av.on ? "OFF" : "ON"}`}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${av.availableNow ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : av.on && av.offNow ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-border text-muted"}`}>
                  {av.availableNow ? "● 상담 ON" : av.on && av.offNow ? "🌙 불가 시간" : "○ 상담 OFF"}
                </button>
              )}
              <Link href="/notifications" className="relative rounded-full border border-border px-3 py-1.5 text-foreground/80 transition hover:border-white/25" aria-label="알림">
                🔔{me.unread > 0 && <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-500 px-1 text-center text-[11px] leading-[18px] text-white">{me.unread > 99 ? "99+" : me.unread}</span>}
              </Link>
              <Link href="/coins" className="rounded-full border border-border px-3 py-1.5 text-foreground/80 transition hover:border-white/25">{me.coins.toLocaleString()}코인</Link>
              <Link href="/ask" className="rounded-full bg-rose-500 px-3 py-1.5 font-medium text-white transition hover:bg-rose-400">질문하기</Link>
            </>
          ) : me === null ? (
            <Link href="/login" className="rounded-full bg-rose-500 px-3 py-1.5 font-medium text-white transition hover:bg-rose-400">로그인</Link>
          ) : null}
        </div>
      </div>
      {me && (
        <nav className="mt-3 flex gap-4 overflow-x-auto text-xs text-muted">
          <Link href="/account" className="flex shrink-0 items-center gap-1.5 font-semibold text-foreground"><Avatar name={me.name} url={me.photoUrl} size={18} />{me.name}님</Link>
          <Link href="/ask" className="shrink-0 font-semibold text-foreground transition hover:text-rose-300">질문하기</Link>
          <Link href="/color-ai" className="shrink-0 font-semibold text-rose-400 transition hover:text-rose-300">컬러핏 AI</Link>
          <Link href="/salon" className="shrink-0 font-semibold text-foreground transition hover:text-rose-300">내 매장</Link>
          <Link href="/experts" className="shrink-0 transition hover:text-foreground">전문가 찾기</Link>
          <Link href="/expert" className="shrink-0 transition hover:text-foreground">{me.isExpert ? "전문가 센터" : "전문가 신청"}</Link>
          <Link href="/support" className="shrink-0 transition hover:text-foreground">고객센터</Link>
          {me.isAdmin && (
            <Link href="/admin" className="flex shrink-0 items-center gap-1 transition hover:text-foreground" title={pending ? `처리 대기 ${pending}건` : undefined}>
              관리자{pending > 0 && <span className="min-w-[18px] rounded-full bg-rose-500 px-1 text-center text-[11px] leading-[18px] text-white">{pending > 99 ? "99+" : pending}</span>}
            </Link>
          )}
          <button onClick={logout} className="shrink-0 transition hover:text-foreground">로그아웃</button>
        </nav>
      )}
    </header>
    {/* 온라인인 전문가에게 새 상담 요청을 팝업으로 알린다(헤더의 blur 밖에 둬야 화면 기준으로 고정된다) */}
    <ConsultRequestAlert online={!!av?.availableNow} />
    </>
  );
}
