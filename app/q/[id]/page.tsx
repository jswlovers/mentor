"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, jsonInit, timeAgo, useMe } from "@/lib/client";

type Q = { id: string; asker_id: string; asker_name: string; category: string; title: string; body: string; hair_type: string; product: string; status: string; created_at: string };
type A = { id: number; author_id: string; author_name: string; is_expert: number; body: string; accepted: number; created_at: string };

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const { me } = useMe();
  const [data, setData] = useState<{ question: Q; answers: A[]; images: { url: string }[]; consultStatus: string | null } | null | undefined>(undefined);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await api<{ question: Q; answers: A[]; images: { url: string }[]; consultStatus: string | null }>(`/api/questions/${id}`);
    setData(r.ok ? (r.data as never) : null);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (data === undefined) return <p className="p-8 text-center text-sm text-neutral-400">불러오는 중…</p>;
  if (data === null) return <p className="p-8 text-center text-sm text-neutral-500">질문을 찾을 수 없어요.</p>;
  const { question: q, answers, images, consultStatus } = data;
  const isOwner = me?.id === q.asker_id;

  const answer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const r = await api(`/api/questions/${id}/answers`, jsonInit("POST", { body: text }));
    if (!r.ok) return setErr(r.data.error || "답변 등록에 실패했어요");
    setText(""); setErr("");
    load();
  };
  const accept = async (answerId: number) => {
    await api(`/api/questions/${id}/accept`, jsonInit("POST", { answerId }));
    load();
  };

  const chatLabel = isOwner
    ? consultStatus === "open" ? "상담 채팅방 들어가기" : "전문가와 1:1 상담 신청 (채팅·보이스톡·페이스톡)"
    : me?.isExpert && consultStatus === "open" ? "상담 참여하기 (전문가)" : null;

  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="mb-1 flex gap-1.5 text-xs">
          <span className="rounded bg-neutral-100 px-1.5 py-0.5">{q.category}</span>
          <span className={q.status === "solved" ? "text-emerald-600" : "text-rose-600"}>{q.status === "solved" ? "해결됨" : "답변 대기"}</span>
        </div>
        <h1 className="text-lg font-bold">{q.title}</h1>
        <p className="mt-2 whitespace-pre-wrap text-sm">{q.body}</p>
        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((im) => (
              <a key={im.url} href={im.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt="질문 사진" className="h-28 w-28 rounded-lg object-cover" />
              </a>
            ))}
          </div>
        )}
        <dl className="mt-3 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
          <div>모질: {q.hair_type}</div>
          <div>시술 조건: {q.product}</div>
          <div>{q.asker_name} · {timeAgo(q.created_at)}</div>
        </dl>
      </div>
      {chatLabel && (
        <Link href={`/chat/${q.id}`} className="block rounded-lg border border-rose-600 py-2.5 text-center text-sm font-medium text-rose-600">{chatLabel}</Link>
      )}
      <h2 className="text-sm font-semibold">답변 {answers.length}</h2>
      <ul className="space-y-3">
        {answers.map((a) => (
          <li key={a.id} className={`rounded-lg border p-3 ${a.accepted ? "border-emerald-500 bg-emerald-50" : ""}`}>
            <div className="mb-1 flex items-center gap-1.5 text-xs">
              {a.is_expert ? <Link href={`/experts/${a.author_id}`} className="font-bold underline">{a.author_name}</Link> : <b>{a.author_name}</b>}
              {a.is_expert ? <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-700">검증 전문가</span> : null}
              {a.accepted ? <span className="text-emerald-600">채택됨</span> : null}
              <span className="text-neutral-400">{timeAgo(a.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{a.body}</p>
            {isOwner && q.status === "open" && <button onClick={() => accept(a.id)} className="mt-2 text-xs text-emerald-700 underline">채택하기</button>}
          </li>
        ))}
      </ul>
      {me ? (
        <form onSubmit={answer} className="space-y-2">
          <textarea rows={3} maxLength={3000} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="무료 답변 작성" value={text} onChange={(e) => setText(e.target.value)} />
          {err && <p className="text-xs text-rose-600">{err}</p>}
          <button className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white">답변 등록</button>
        </form>
      ) : me === null ? (
        <p className="text-center text-sm text-neutral-500"><Link href="/login" className="text-rose-600 underline">로그인</Link> 후 답변할 수 있어요.</p>
      ) : null}
    </div>
  );
}
