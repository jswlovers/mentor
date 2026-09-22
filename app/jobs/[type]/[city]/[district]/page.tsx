"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, jsonInit, timeAgo, useMe } from "@/lib/client";
import { CITY_DISTRICTS, JOB_TYPES, type JobType } from "@/lib/regions";

type Post = { id: number; title: string; body: string; author_name: string; created_at: string };
const input = "w-full rounded-lg border px-3 py-2 text-sm";

export default function JobsList() {
  const raw = useParams<{ type: string; city: string; district: string }>();
  // 이 Next 버전은 동적 세그먼트를 자동으로 디코드해주지 않아서 직접 decodeURIComponent 해야 한다.
  const type = raw.type;
  const city = decodeURIComponent(raw.city);
  const district = decodeURIComponent(raw.district);
  const { me } = useMe();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");

  const valid = type in JOB_TYPES && !!CITY_DISTRICTS[city]?.includes(district);

  const load = useCallback(async () => {
    if (!valid) return;
    const r = await api<Post[]>(`/api/jobs?type=${type}&city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`);
    setPosts(r.ok ? (r.data as unknown as Post[]) : []);
  }, [type, city, district, valid]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (!valid) return <p className="p-8 text-center text-sm text-neutral-500">존재하지 않는 지역이에요.</p>;
  const label = JOB_TYPES[type as JobType];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("/api/jobs", jsonInit("POST", { type, city, district, title, body }));
    setMsg(r.ok ? "" : r.data.error || "등록에 실패했어요");
    if (r.ok) { setTitle(""); setBody(""); load(); }
  };

  return (
    <div className="space-y-5 p-4">
      <p className="text-xs text-neutral-500">
        <Link href="/jobs" className="underline">구인구직</Link> · <Link href={`/jobs/${type}`} className="underline">{label}</Link> · <Link href={`/jobs/${type}/${encodeURIComponent(city)}`} className="underline">{city}</Link>
      </p>
      <h1 className="text-lg font-bold">{label} · {city} {district}</h1>
      {me ? (
        <form onSubmit={submit} className="space-y-2">
          <input required className={input} placeholder="제목" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea required rows={4} className={input} placeholder="내용" maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} />
          <button className="w-full rounded-lg bg-rose-600 py-2.5 text-sm font-medium text-white">글쓰기</button>
          {msg && <p className="text-xs text-rose-600">{msg}</p>}
        </form>
      ) : (
        <p className="text-sm text-neutral-500"><Link href="/login" className="text-rose-600 underline">로그인</Link>하면 글을 쓸 수 있어요.</p>
      )}
      <ul className="space-y-2 text-sm">
        {(posts ?? []).map((p) => (
          <li key={p.id} className="rounded-lg border p-3">
            <p className="font-medium">{p.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-neutral-700">{p.body}</p>
            <p className="mt-1 text-xs text-neutral-500">{p.author_name} · {timeAgo(p.created_at)}</p>
          </li>
        ))}
        {posts && posts.length === 0 && <li className="p-8 text-center text-neutral-400">아직 등록된 글이 없어요.</li>}
        {!posts && <li className="p-8 text-center text-neutral-400">불러오는 중…</li>}
      </ul>
    </div>
  );
}
