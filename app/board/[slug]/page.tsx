"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, jsonInit, timeAgo, useMe } from "@/lib/client";
import { POSITION_MENU_LABEL, SLUG_POSITION } from "@/lib/regions";

type Post = { id: number; title: string; body: string; author_name: string; created_at: string };
const input = "w-full rounded-lg border px-3 py-2 text-sm";

export default function PositionBoard() {
  const { slug } = useParams<{ slug: string }>();
  const position = SLUG_POSITION[slug];
  const { me } = useMe();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");

  const canView = !!me && !!position && (me.isAdmin || me.position === position);

  const load = useCallback(async () => {
    if (!position) return;
    const r = await api<Post[]>(`/api/position-posts?position=${encodeURIComponent(position)}`);
    setPosts(r.ok ? (r.data as unknown as Post[]) : []);
  }, [position]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (canView) load();
  }, [canView, load]);

  if (!position) return <p className="p-8 text-center text-sm text-neutral-500">존재하지 않는 게시판이에요.</p>;
  if (me === null) return <p className="p-8 text-center text-sm"><Link href="/login" className="text-rose-600 underline">로그인</Link>이 필요해요.</p>;
  if (me && !canView) return <p className="p-8 text-center text-sm text-neutral-500">{POSITION_MENU_LABEL[position]} 게시판은 같은 직급 회원만 볼 수 있어요.</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("/api/position-posts", jsonInit("POST", { position, title, body }));
    setMsg(r.ok ? "" : r.data.error || "등록에 실패했어요");
    if (r.ok) { setTitle(""); setBody(""); load(); }
  };

  return (
    <div className="space-y-5 p-4">
      <h1 className="text-lg font-bold">{POSITION_MENU_LABEL[position]} 게시판</h1>
      <form onSubmit={submit} className="space-y-2">
        <input required className={input} placeholder="제목" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea required rows={4} className={input} placeholder="내용" maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white">글쓰기</button>
        {msg && <p className="text-xs text-rose-600">{msg}</p>}
      </form>
      <ul className="space-y-2 text-sm">
        {(posts ?? []).map((p) => (
          <li key={p.id} className="rounded-lg border p-3">
            <p className="font-medium">{p.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-neutral-700">{p.body}</p>
            <p className="mt-1 text-xs text-neutral-500">{p.author_name} · {timeAgo(p.created_at)}</p>
          </li>
        ))}
        {posts && posts.length === 0 && <li className="p-8 text-center text-neutral-400">아직 게시글이 없어요.</li>}
        {!posts && <li className="p-8 text-center text-neutral-400">불러오는 중…</li>}
      </ul>
    </div>
  );
}
