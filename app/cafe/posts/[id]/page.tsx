"use client";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, jsonInit, timeAgo, useMe } from "@/lib/client";
import { detailLabel, findCafeBoard, type CafePost, type CafeComment, type CafeDetails } from "@/lib/cafe";
import CafeEditor from "../../CafeEditor";
import PostServices from "../../PostServices";
const button = "rounded-xl border border-border px-4 py-2 text-sm transition hover:border-rose-400/40 disabled:opacity-40";
export default function CafePostPage() {
    const [replyTo,setReplyTo] = useState<number|null>(null);
    const { id } = useParams<{
        id: string;
    }>();
    const router = useRouter();
    const { me } = useMe();
    const [data, setData] = useState<{
        post: CafePost;
        comments: CafeComment[]; poll?: {id:number;label:string;votes:number;selected:number}[];
    } | null>(null), [error, setError] = useState(""), [loadError, setLoadError] = useState("");
    const [busy, setBusy] = useState(false), [comment, setComment] = useState(""), [editing, setEditing] = useState(false), [reporting, setReporting] = useState(false), [reason, setReason] = useState(""), [reported, setReported] = useState(false), [deleting, setDeleting] = useState(false), [deletingComment, setDeletingComment] = useState<number | null>(null);
    const load = useCallback(async () => { setLoadError(""); try {
        const r = await api<{
            post: CafePost;
            comments: CafeComment[];
        }>(`/api/cafe/posts/${id}`);
        if (r.ok)
            setData(r.data);
        else {
            setData(null);
            setLoadError(r.data.error || "글을 불러오지 못했어요");
        }
    }
    catch {
        setLoadError("연결을 확인하고 다시 시도해주세요");
    } }, [id]);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load, me?.id]);
    const mutate = async (method: string, value?: unknown, suffix = "/actions") => { setBusy(true); setError(""); try {
        const r = await api(`/api/cafe/posts/${id}${suffix}`, jsonInit(method, value));
        if (!r.ok) {
            setError(r.data.error || "요청을 처리하지 못했어요");
            return false;
        }
        await load();
        return true;
    }
    catch {
        setError("연결을 확인하고 다시 시도해주세요");
        return false;
    }
    finally {
        setBusy(false);
    } };
    if (loadError && !data)
        return <div className="p-8"><p role="alert" className="text-rose-300">{loadError}</p><button onClick={load} className="mt-4 mr-4 underline">다시 시도</button><Link href="/cafe" className="text-rose-400 underline">라운지로 돌아가기</Link></div>;
    if (!data)
        return <p className="p-8 text-muted">글을 불러오는 중…</p>;
    const { post, comments } = data;
    const board = findCafeBoard(post.board);
    const canEdit = me && (me.id === post.author_id || me.isAdmin);
    return <div className="space-y-5 px-6 py-8 md:px-10"><Link href="/cafe#feed" className="text-sm text-rose-400">← 라운지 게시판</Link>
    {editing ? <><h1 className="text-2xl font-bold">글 수정</h1><CafeEditor post={post} onSaved={() => { setEditing(false); load(); }}/></> : <>
      <article className="rounded-2xl border border-border bg-surface p-5 md:p-8">
        <div className="flex gap-2 text-xs text-rose-300"><span>{board?.name}</span>{!!post.pinned && <span>· 상단 고정</span>}{(board?.listing || post.board === "poll") && <span className={post.status === "closed" ? "text-muted" : "text-emerald-300"}>· {post.status === "closed" ? "마감" : "진행 중"}</span>}</div>
        <h1 className="mt-3 break-words text-2xl font-bold">{post.title}</h1><p className="mt-3 text-xs text-muted">{post.author_name} · {timeAgo(post.created_at)} · 조회 {post.views||0}{post.updated_at !== post.created_at ? " · 수정됨" : ""}</p>
        {Object.entries(post.details).some(([key,value]) => key !== "url" && Boolean(value)) && <dl className="mt-5 grid gap-3 rounded-xl bg-surface-2 p-4 text-sm sm:grid-cols-2">{(Object.entries(post.details) as [
            keyof CafeDetails,
            string
        ][]).filter(([key, v]) => key !== "url" && v).map(([key, value]) => <div key={key} className={key === "formula" || key === "url" ? "sm:col-span-2" : ""}><dt className="text-xs text-muted">{detailLabel(key, post.details.kind)}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>}
        <p className={`mt-6 whitespace-pre-wrap break-words text-sm leading-7 ${post.masked ? "rounded-xl border border-dashed border-border p-4 text-muted" : ""}`}>{post.body}</p><div className="mt-5 space-y-3">{post.photos.map((url, i) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={`첨부 사진 ${i + 1} 원본 보기 (새 탭)`}><Image unoptimized width={1000} height={1000} src={url} alt={`${post.title} 첨부 사진 ${i + 1}`} className="mb-3 max-h-[650px] w-full rounded-xl object-contain"/></a>)}</div>
        <div className="mt-6 flex flex-wrap gap-2"><button disabled={!me || busy} aria-pressed={post.liked} onClick={() => mutate("POST", { action: "like", enabled: !post.liked })} className={`${button} ${post.liked ? "text-rose-300" : ""}`}>♡ 추천 {post.like_count}</button><button disabled={!me || busy} aria-pressed={post.saved} onClick={() => mutate("POST", { action: "save", enabled: !post.saved })} className={`${button} ${post.saved ? "text-rose-300" : ""}`}>{post.saved ? "★ 저장됨" : "☆ 글 저장"}</button>{me && me.id !== post.author_id && <button onClick={() => setReporting(!reporting)} className={button}>신고</button>}</div>
        {!me && <p className="mt-3 text-xs text-muted"><Link href="/login" className="text-rose-400 underline">로그인</Link>하면 댓글·추천·저장을 이용할 수 있어요.</p>}
        {canEdit && <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4"><button onClick={() => setEditing(true)} disabled={busy} className={button}>수정</button>{board?.listing && <button disabled={busy} onClick={() => mutate("PATCH", { action: "status", status: post.status === "open" ? "closed" : "open" }, "")} className={button}>{post.status === "open" ? "마감하기" : "다시 열기"}</button>}{me?.isAdmin && <button disabled={busy} onClick={() => mutate("PATCH", { action: "pin", pinned: !post.pinned }, "")} className={button}>{post.pinned ? "고정 해제" : "상단 고정"}</button>}<button onClick={() => setDeleting(true)} disabled={busy} className={`${button} text-rose-300`}>삭제</button></div>}
        {deleting && <div role="alert" className="mt-4 rounded-xl border border-border p-4 text-sm"><p>이 글을 삭제할까요? 게시판에서 글과 사진이 숨겨집니다.</p><div className="mt-3 flex gap-2"><button disabled={busy} className={`${button} text-rose-300`} onClick={async () => { setBusy(true); try {
            const r = await api(`/api/cafe/posts/${id}`, { method: "DELETE" });
            if (r.ok)
                router.push("/cafe");
            else
                setError(r.data.error || "삭제하지 못했어요");
        }
        catch {
            setError("연결을 확인해주세요");
        }
        finally {
            setBusy(false);
        } }}>삭제하기</button><button onClick={() => setDeleting(false)} className={button}>취소</button></div></div>}
      </article>
      <PostServices post={post} poll={data.poll} reload={load}/>
      {reporting && <form onSubmit={async (e) => { e.preventDefault(); if (await mutate("POST", { action: "report", reason })) {
            setReporting(false);
            setReported(true);
        } }} className="space-y-3 rounded-2xl border border-border bg-surface p-5"><label className="block text-sm font-semibold">신고 사유<textarea required minLength={5} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-surface-2 p-3 text-sm" rows={3}/></label><p className="text-xs text-muted">접수한 내용은 고객센터의 관리자 검토 대상으로 전달됩니다.</p><button disabled={busy} className={button}>신고 접수</button></form>}
      {reported && <p role="status" className="text-sm text-emerald-300">신고가 접수됐어요. 관리자가 검토합니다.</p>}{(error || loadError) && <p role="alert" className="text-sm text-rose-300">{error || loadError}</p>}
      <section className="rounded-2xl border border-border bg-surface p-5 md:p-8" aria-labelledby="comments-title"><h2 id="comments-title" className="font-bold">댓글 {post.comment_count}</h2><ul className="mt-4 divide-y divide-border">{comments.map(c => <li key={c.id} className={`py-4 ${c.parent_id ? "ml-5 border-l border-border pl-4" : ""}`}><div className="flex items-center justify-between gap-2"><p className="text-xs text-muted">{c.author_name} · {timeAgo(c.created_at)}</p>{me && (me.id === c.author_id || me.isAdmin) && <button disabled={busy} onClick={() => setDeletingComment(c.id)} className="text-xs text-muted underline">댓글 삭제</button>}</div><p className="mt-2 whitespace-pre-wrap break-words text-sm">{c.parent_id ? `↳ #${c.parent_id} 답글: ` : ""}{c.body}</p>{me && <button onClick={()=>setReplyTo(c.id)} className="mt-2 text-xs text-rose-300 underline">답글</button>}{deletingComment === c.id && <div className="mt-3 flex flex-wrap items-center gap-3 text-xs"><span>이 댓글을 삭제할까요?</span><button disabled={busy} onClick={async () => { if (await mutate("POST", { action: "delete-comment", commentId: c.id }))
            setDeletingComment(null); }} className="text-rose-300 underline">삭제</button><button onClick={() => setDeletingComment(null)} className="underline">취소</button></div>}</li>)}</ul>{comments.length === 0 && <p className="py-5 text-sm text-muted">첫 댓글을 남겨주세요.</p>}{post.comment_count > comments.length && <p className="text-xs text-muted">처음 500개의 댓글을 표시합니다.</p>}
        {me ? <form onSubmit={async (e) => { e.preventDefault(); if (await mutate("POST", { action: "comment", body: comment, parentId:replyTo }))
            {setComment("");setReplyTo(null);} }} className="mt-4 space-y-3"><label className="block text-sm">{replyTo ? `#${replyTo} 댓글에 답글 작성` : "댓글 작성"}{replyTo && <button type="button" onClick={()=>setReplyTo(null)} className="ml-3 text-xs underline">답글 취소</button>}<textarea required maxLength={1000} rows={3} value={comment} onChange={e => setComment(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-surface-2 p-3"/></label><button disabled={busy} className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">댓글 등록</button></form> : <Link href="/login" className="text-sm text-rose-400 underline">로그인하고 댓글 달기</Link>}
      </section>
    </>}
  </div>;
}
