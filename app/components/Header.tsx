"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useMe } from "@/lib/client";

export default function Header() {
  const { me, refresh } = useMe();
  const router = useRouter();

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    await refresh();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-rose-600">미용 SOS</Link>
        <div className="flex items-center gap-2 text-sm">
          {me ? (
            <>
              <Link href="/notifications" className="relative rounded-full border px-3 py-1.5" aria-label="알림">
                🔔{me.unread > 0 && <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-600 px-1 text-center text-[11px] leading-[18px] text-white">{me.unread > 99 ? "99+" : me.unread}</span>}
              </Link>
              <Link href="/coins" className="rounded-full border px-3 py-1.5">{me.coins.toLocaleString()}코인</Link>
              <Link href="/ask" className="rounded-full bg-rose-600 px-3 py-1.5 font-medium text-white">질문하기</Link>
            </>
          ) : me === null ? (
            <Link href="/login" className="rounded-full bg-rose-600 px-3 py-1.5 font-medium text-white">로그인</Link>
          ) : null}
        </div>
      </div>
      {me && (
        <nav className="mt-2 flex gap-3 overflow-x-auto text-xs text-neutral-600">
          <Link href="/account" className="shrink-0 font-semibold text-neutral-900">{me.name}님</Link>
          <Link href="/expert" className="shrink-0 underline">{me.isExpert ? "전문가 센터" : "전문가 신청"}</Link>
          <Link href="/support" className="shrink-0 underline">고객센터</Link>
          {me.isAdmin && <Link href="/admin" className="shrink-0 underline">관리자</Link>}
          <button onClick={logout} className="shrink-0 underline">로그아웃</button>
        </nav>
      )}
    </header>
  );
}
