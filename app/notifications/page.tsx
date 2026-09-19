"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, jsonInit, timeAgo, useMe } from "@/lib/client";

type N = { id: number; body: string; link: string | null; read_at: string | null; created_at: string };

export default function Notifications() {
  const { me } = useMe();
  const [list, setList] = useState<N[] | null>(null);

  useEffect(() => {
    if (!me) return;
    api<N[]>("/api/notifications").then((r) => setList(r.ok ? (r.data as unknown as N[]) : []));
  }, [me]);

  if (me === null) return <p className="p-8 text-center text-sm"><Link href="/login" className="text-rose-600 underline">로그인</Link>이 필요해요.</p>;

  const readAll = async () => {
    await api("/api/notifications", jsonInit("POST", {}));
    setList((l) => l?.map((n) => ({ ...n, read_at: n.read_at ?? "now" })) ?? null);
  };
  const open = (n: N) => { if (!n.read_at) api("/api/notifications", jsonInit("POST", { id: n.id })); };

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">알림</h1>
        <button onClick={readAll} className="text-xs underline">모두 읽음</button>
      </div>
      <ul className="divide-y text-sm">
        {list?.map((n) => {
          const inner = (
            <span className={`block py-3 ${n.read_at ? "text-neutral-400" : "font-medium"}`}>
              {n.body}<br /><span className="text-xs font-normal text-neutral-400">{timeAgo(n.created_at)}</span>
            </span>
          );
          return <li key={n.id}>{n.link ? <Link href={n.link} onClick={() => open(n)}>{inner}</Link> : inner}</li>;
        })}
        {list?.length === 0 && <li className="py-6 text-center text-neutral-400">새 알림이 없어요</li>}
        {!list && <li className="py-6 text-center text-neutral-400">불러오는 중…</li>}
      </ul>
    </div>
  );
}
