"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { api, timeAgo, useMe } from "@/lib/client";
import { CAFE_BOARDS, CAFE_REGIONS, findCafeBoard, type CafePost } from "@/lib/cafe";
type Attendance = {
    day: string;
    today: boolean;
    streak: number;
    total: number;
    visitors: number;
};
const control = "rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground";
export default function CafeFeed({initialBoard="all"}:{initialBoard?:string}) {
    const { me } = useMe();
    const [board, setBoard] = useState(initialBoard), [sort, setSort] = useState("latest"), [scope, setScope] = useState("all"), [region, setRegion] = useState("");
    const [query, setQuery] = useState(""), [term, setTerm] = useState(""), [open, setOpen] = useState(false), [page, setPage] = useState(1);
    const [result, setResult] = useState<{
        items: CafePost[];
        hasMore: boolean;
    } | null>(null), [error, setError] = useState(""), [retry, setRetry] = useState(0);
    const [attendance, setAttendance] = useState<Attendance | null>(null), [checking, setChecking] = useState(false), [attendanceError, setAttendanceError] = useState("");
    const [view, setView] = useState("cards");
    useEffect(() => { const t = setTimeout(() => { setTerm(query.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [query]);
    useEffect(() => {
        let active = true;
        const sp = new URLSearchParams({ board, sort, scope, region, q: term, page: String(page), open: open ? "1" : "0" });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setResult(null);
        setError("");
        api<{
            items: CafePost[];
            hasMore: boolean;
        }>(`/api/cafe/posts?${sp}`).then(r => { if (active) {
            if (r.ok)
                setResult(r.data);
            else
                setError(r.data.error || "글을 불러오지 못했어요");
        } }).catch(() => { if (active)
            setError("연결을 확인하고 다시 시도해주세요"); });
        return () => { active = false; };
    }, [board, sort, scope, region, term, page, open, retry, me?.id]);
    useEffect(() => { let active = true; if (me)
        api<Attendance>("/api/cafe/attendance").then(r => { if (active && r.ok)
            setAttendance(r.data); }).catch(() => { if (active)
            setAttendanceError("출석 정보를 불러오지 못했어요"); }); return () => { active = false; }; }, [me]);
    const checkIn = async () => { setChecking(true); setAttendanceError(""); try {
        const r = await api<Attendance>("/api/cafe/attendance", { method: "POST" });
        if (r.ok)
            setAttendance(r.data);
        else
            setAttendanceError(r.data.error || "출석하지 못했어요");
    }
    catch {
        setAttendanceError("연결을 확인해주세요");
    }
    finally {
        setChecking(false);
    } };
    const selected = findCafeBoard(board);
    const writeHref = `/cafe/write${board !== "all" ? `?board=${board}` : ""}`;
    return <section id="feed" className="scroll-mt-32" aria-labelledby="feed-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="feed-title" className="text-xl font-bold">라운지 게시판</h2><p className="mt-1 text-sm text-muted">우리의 경험으로 채워가는 미용인 공간</p></div><Link href={writeHref} className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-bold text-white">글쓰기</Link></div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4"><div><p className="text-sm font-bold">오늘도 반가워요 ☕</p><p className="mt-1 text-xs text-muted">{me && attendance ? `${attendance.day} · 연속 ${attendance.streak}일 · 누적 ${attendance.total}일 · 오늘 ${attendance.visitors}명 출석` : "하루 한 번, 동료들과 함께 출석해요. (한국 시간 기준)"}</p>{attendanceError && <p role="alert" className="mt-1 text-xs text-rose-300">{attendanceError}</p>}</div>{me ? <button onClick={checkIn} disabled={checking || attendance?.today} className="rounded-lg border border-rose-500/30 px-4 py-2 text-sm text-rose-300 disabled:opacity-50">{attendance?.today ? "오늘 출석 완료 ✓" : checking ? "출석 중…" : "출석체크"}</button> : <Link href="/login" className="text-sm text-rose-300 underline">로그인하고 출석하기</Link>}</div>
    <div className="mt-5 grid gap-5 md:grid-cols-[180px_1fr]">
      <nav aria-label="라운지 게시판" className="space-y-3 rounded-2xl border border-border bg-surface p-3 md:self-start"><button onClick={() => { setBoard("all"); setPage(1); }} aria-pressed={board === "all"} className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${board === "all" ? "bg-rose-500/15 text-rose-300" : ""}`}>전체글</button>{["소통", "기술·교육", "매장·정보", "모집·거래", "회원 공간"].map(group => <div key={group}><p className="mb-1 px-3 text-[11px] font-bold text-muted">{group}</p><div className="flex flex-wrap gap-1 md:block">{CAFE_BOARDS.filter(b => b.group === group).map(b => <button key={b.slug} onClick={() => { setBoard(b.slug); setPage(1); }} aria-pressed={board === b.slug} className={`rounded-lg px-3 py-2 text-left text-xs md:w-full ${board === b.slug ? "bg-rose-500/15 font-bold text-rose-300" : "text-muted hover:bg-surface-2"}`}>{b.name}</button>)}</div></div>)}</nav>
      <div className="min-w-0"><h3 className="font-bold">{selected?.name || "전체글"}</h3><p className="mt-1 text-xs text-muted">{selected?.description || "새로운 이야기와 정보를 만나보세요"}</p>
        <div className="mt-4 flex flex-wrap gap-2"><input aria-label="라운지 글 검색" type="search" placeholder="제목·내용·작성자 검색" maxLength={100} value={query} onChange={e => setQuery(e.target.value)} className={`${control} min-w-0 flex-1`}/><select aria-label="정렬" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} className={control}><option value="latest">최신순</option><option value="popular">인기순</option></select><select aria-label="지역 필터" value={region} onChange={e => { setRegion(e.target.value); setPage(1); }} className={control}><option value="">전국·전체</option>{CAFE_REGIONS.map(r => <option key={r}>{r}</option>)}</select></div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted"><select aria-label="글 모아보기" value={scope} onChange={e => { setScope(e.target.value); setPage(1); }} className={control}><option value="all">모든 글</option><option value="mine">내가 쓴 글</option><option value="saved">저장한 글</option></select><label className="flex items-center gap-2"><input type="checkbox" checked={open} onChange={e => { setOpen(e.target.checked); setPage(1); }}/>마감 글 제외</label><button aria-pressed={view === "cards"} onClick={() => setView("cards")} className={view === "cards" ? "text-rose-300" : ""}>카드형</button><button aria-pressed={view === "list"} onClick={() => setView("list")} className={view === "list" ? "text-rose-300" : ""}>목록형</button></div>
        <div aria-live="polite" className="mt-4">{error ? <div role="alert" className="rounded-xl border border-border p-6 text-sm text-rose-300">{error}<button onClick={() => setRetry(v => v + 1)} className="ml-2 underline">다시 시도</button>{!me && <Link href="/login" className="ml-3 underline">로그인</Link>}</div> : !result ? <p className="p-8 text-center text-sm text-muted">글을 불러오는 중…</p> : result.items.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center"><p className="text-sm text-muted">{term || region || scope !== "all" || open ? "조건에 맞는 글이 없어요." : "아직 글이 없어요. 첫 이야기를 남겨주세요."}</p><Link href={writeHref} className="mt-3 inline-block text-sm text-rose-400 underline">글쓰기</Link></div> : <ul className={view === "cards" ? "grid gap-3 sm:grid-cols-2" : "space-y-2"}>{result.items.map(post => <li key={post.id}><Link href={`/cafe/posts/${post.id}`} className="block h-full overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-rose-400/40">{view === "cards" && post.photos[0] && <Image unoptimized width={1000} height={1000} src={post.photos[0]} alt={`${post.title} 첨부 사진`} className="h-40 w-full object-cover"/>}<div className="p-4"><div className="flex flex-wrap gap-2 text-[11px]"><span className="text-rose-300">{findCafeBoard(post.board)?.name}</span>{!!post.pinned && <span className="text-amber-300">상단 고정</span>}{post.status === "closed" && <span className="text-muted">마감</span>}{post.details.region && <span className="text-muted">{post.details.region} {post.details.kind}</span>}</div><h4 className="mt-2 break-words text-sm font-bold">{post.title}</h4>{view === "cards" && <p className="mt-2 line-clamp-2 break-words text-xs leading-relaxed text-muted">{post.body}</p>}{post.details.price && <p className="mt-2 text-xs text-rose-300">{post.details.price}</p>}<p className="mt-3 text-[11px] text-muted">{post.author_name} · {timeAgo(post.created_at)} · 조회 {post.views||0} · 추천 {post.like_count} · 댓글 {post.comment_count}{post.saved ? " · 저장됨" : ""}</p></div></Link></li>)}</ul>}</div>
        {result && <div className="mt-5 flex items-center justify-center gap-4 text-sm"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-30">이전</button><span>{page} 페이지</span><button disabled={!result.hasMore} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-30">다음</button></div>}
      </div>
    </div>
  </section>;
}
