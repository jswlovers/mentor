"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, jsonInit, timeAgo } from "@/lib/client";
import Avatar from "../components/Avatar";
import type { Salon } from "./types";

type Comment = { id: number; author_id: string; author_name: string; body: string; created_at: string };
type Post = { id: number; author_id: string; author_name: string; body: string; created_at: string; photos: string[]; comments: Comment[] };
const MAX_PHOTOS = 5;

// 매장 작업물 피드: 사진·글을 올리고 서로 댓글로 피드백을 준다(매장 직원만 보임)
export default function Feed({ salon, meId, isExpert }: { salon: Salon; meId: string; isExpert: boolean }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const isOwner = salon.myRole === "owner";
  const photoOf = useMemo(() => new Map(salon.members.map((m) => [m.id, m.photoUrl])), [salon.members]);

  const load = useCallback(async (before = 0) => {
    const r = await api<{ items: Post[]; hasMore: boolean }>(`/api/salon/posts?before=${before}`).catch(() => null);
    if (!r?.ok) { setError(true); return; }
    setError(false);
    setPosts((prev) => (before && prev ? [...prev, ...r.data.items] : r.data.items));
    setHasMore(r.data.hasMore);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const remove = async (id: number) => {
    if (!confirm("이 작업물을 지울까요?")) return;
    const r = await api(`/api/salon/posts/${id}`, { method: "DELETE" });
    if (r.ok) setPosts((p) => p?.filter((x) => x.id !== id) ?? null); else alert(r.data.error || "지우지 못했어요");
  };
  const toPortfolio = async (id: number) => {
    const r = await api<{ copied: number; skipped: number }>(`/api/salon/posts/${id}/portfolio`, { method: "POST" });
    alert(r.ok ? `내 포트폴리오에 사진 ${r.data.copied}장을 넣었어요${r.data.skipped ? ` (자리가 없어 ${r.data.skipped}장은 빠졌어요)` : ""}` : r.data.error || "보내지 못했어요");
  };

  return (
    <div className="space-y-4">
      <Composer onPosted={() => load()} />
      {error && <p className="text-center text-sm text-muted">피드를 불러오지 못했어요. <button onClick={() => load()} className="underline">다시 시도</button></p>}
      {posts?.length === 0 && <p className="py-8 text-center text-sm text-muted">아직 올라온 작업물이 없어요. 오늘 한 시술 사진을 첫 번째로 올려보세요!</p>}
      {!posts && !error && <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>}
      <ul className="space-y-4">
        {posts?.map((p) => (
          <li key={p.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <Avatar name={p.author_name} url={photoOf.get(p.author_id) ?? null} size={32} />
              <div className="min-w-0 flex-1 text-sm"><b>{p.author_name}</b> <span className="text-xs text-muted">{timeAgo(p.created_at)}</span></div>
              {p.author_id === meId && isExpert && p.photos.length > 0 && (
                <button onClick={() => toPortfolio(p.id)} className="text-xs text-muted hover:text-foreground" title="공개 전문가 프로필의 작업 사진으로 복사해요">내 포트폴리오로</button>
              )}
              {(p.author_id === meId || isOwner) && <button onClick={() => remove(p.id)} className="text-xs text-muted hover:text-rose-300">삭제</button>}
            </div>
            {p.body && <p className="mt-2 whitespace-pre-wrap text-sm">{p.body}</p>}
            {p.photos.length > 0 && (
              <div className={`mt-2 grid gap-1.5 ${p.photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {p.photos.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="작업물 사진" loading="lazy" className={`w-full rounded-lg object-cover ${p.photos.length === 1 ? "max-h-96" : "aspect-square"}`} />
                  </a>
                ))}
              </div>
            )}
            <Comments post={p} meId={meId} isOwner={isOwner} onChange={(comments) => setPosts((all) => all?.map((x) => (x.id === p.id ? { ...x, comments } : x)) ?? null)} />
          </li>
        ))}
      </ul>
      {hasMore && posts && <button onClick={() => load(posts[posts.length - 1].id)} className="w-full rounded-lg border border-border py-2 text-sm hover:border-white/30">더 보기</button>}
    </div>
  );
}

function Composer({ onPosted }: { onPosted: () => void }) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const add = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    if (picked.some((f) => f.size > 5 * 1024 * 1024)) return setMsg("사진은 한 장에 5MB 이하만 올릴 수 있어요");
    const next = [...files, ...picked].slice(0, MAX_PHOTOS);
    if (files.length + picked.length > MAX_PHOTOS) setMsg(`사진은 최대 ${MAX_PHOTOS}장까지예요`); else setMsg("");
    setFiles(next);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = new FormData();
    f.set("body", body);
    files.forEach((x) => f.append("photos", x));
    setBusy(true);
    const r = await api("/api/salon/posts", { method: "POST", body: f });
    setBusy(false);
    if (!r.ok) return setMsg(r.data.error || "올리지 못했어요");
    setBody(""); setFiles([]); setMsg("");
    onPosted();
  };

  return (
    <form onSubmit={submit} className="space-y-2 rounded-2xl border border-border bg-surface p-3">
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={1000} placeholder="오늘 한 시술을 공유해요 (레시피·포인트·피드백 받고 싶은 점)"
        className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted" />
      {previews.length > 0 && (
        <ul className="flex gap-2 overflow-x-auto">
          {previews.map((u, i) => (
            <li key={u} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <button type="button" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} aria-label="사진 빼기" className="absolute right-0.5 top-0.5 rounded-full bg-black/60 px-1 text-[10px] text-white">✕</button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <label className={`cursor-pointer rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:border-white/30 ${files.length >= MAX_PHOTOS ? "pointer-events-none opacity-50" : ""}`}>
          📷 사진 ({files.length}/{MAX_PHOTOS})
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        </label>
        <span className="min-w-0 flex-1 truncate text-xs text-rose-300">{msg}</span>
        <button disabled={busy || (!body.trim() && files.length === 0)} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400 disabled:opacity-50">{busy ? "올리는 중…" : "올리기"}</button>
      </div>
    </form>
  );
}

function Comments({ post, meId, isOwner, onChange }: { post: Post; meId: string; isOwner: boolean; onChange: (c: Comment[]) => void }) {
  const [text, setText] = useState("");
  const reload = async () => {
    const r = await api<{ items: Post[] }>(`/api/salon/posts?before=${post.id + 1}`);
    const fresh = r.ok ? r.data.items.find((x) => x.id === post.id) : null;
    if (fresh) onChange(fresh.comments);
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api(`/api/salon/posts/${post.id}/comments`, jsonInit("POST", { body: text }));
    if (!r.ok) return alert(r.data.error || "댓글을 남기지 못했어요");
    setText("");
    reload();
  };
  const remove = async (id: number) => {
    const r = await api(`/api/salon/posts/${post.id}/comments?commentId=${id}`, { method: "DELETE" });
    if (r.ok) onChange(post.comments.filter((c) => c.id !== id));
  };
  return (
    <div className="mt-3 space-y-1.5 border-t border-border pt-2">
      {post.comments.map((c) => (
        <p key={c.id} className="text-sm">
          <b className="text-xs">{c.author_name}</b> <span className="whitespace-pre-wrap">{c.body}</span> <span className="text-[11px] text-muted">{timeAgo(c.created_at)}</span>
          {(c.author_id === meId || isOwner) && <button onClick={() => remove(c.id)} className="ml-1 text-[11px] text-muted hover:text-rose-300">삭제</button>}
        </p>
      ))}
      <form onSubmit={send} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="피드백 남기기" className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground placeholder:text-muted" />
        <button disabled={!text.trim()} className="rounded-lg border border-border px-3 text-xs hover:border-white/30 disabled:opacity-50">등록</button>
      </form>
    </div>
  );
}
