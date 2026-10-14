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
const GROUPS = ["소통", "기술·교육", "매장·정보", "모집·거래", "회원 공간"] as const;
// 나만의 모아보기: 게시판과 상관없이 내 기록으로 글을 모은다(로그인 필요).
const SCOPES = [{ value: "recent", label: "최근 본 글" }, { value: "saved", label: "저장한 글" }, { value: "mine", label: "내가 쓴 글" }] as const;
export default function CafeFeed({initialBoard="all"}:{initialBoard?:string}) {
    const { me } = useMe();
    const [board, setBoard] = useState(initialBoard), [sort, setSort] = useState("latest"), [scope, setScope] = useState("all"), [region, setRegion] = useState("");
    const [group, setGroup] = useState(() => findCafeBoard(initialBoard)?.group ?? ""), [expanded, setExpanded] = useState(() => findCafeBoard(initialBoard)?.group ?? "");
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
        if (group && board === "all") sp.set("group", group);
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
    }, [board, sort, scope, region, group, term, page, open, retry, me?.id]);
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
    const pick = (next: { board?: string; scope?: string; group?: string }) => { setBoard(next.board ?? "all"); setScope(next.scope ?? "all"); setGroup(next.group ?? ""); setPage(1); };
    const scopeLabel = SCOPES.find(x => x.value === scope)?.label;
    const item = (active: boolean, strong = false) => `w-full rounded-lg px-3 py-2 text-left ${strong ? "text-sm font-bold" : "text-xs"} ${active ? "bg-rose-500/15 font-bold text-rose-300" : strong ? "" : "text-muted hover:bg-surface-2"}`;
    const writeHref = `/cafe/write${board !== "all" ? `?board=${board}` : ""}`;
    return <section id="feed" className="scroll-mt-32" aria-labelledby="feed-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="feed-title" className="text-xl font-bold">라운지 게시판</h2><p className="mt-1 text-sm text-muted">우리의 경험으로 채워가는 미용인 공간</p></div><Link href={writeHref} className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-bold text-white">글쓰기</Link></div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4"><div><p className="text-sm font-bold">오늘도 반가워요 ☕</p><p className="mt-1 text-xs text-muted">{me && attendance ? `${attendance.day} · 연속 ${attendance.streak}일 · 누적 ${attendance.total}일 · 오늘 ${attendance.visitors}명 출석` : "하루 한 번, 동료들과 함께 출석해요. (한국 시간 기준)"}</p>{attendanceError && <p role="alert" className="mt-1 text-xs text-rose-300">{attendanceError}</p>}</div>{me ? <button onClick={checkIn} disabled={checking || attendance?.today} className="rounded-lg border border-rose-500/30 px-4 py-2 text-sm text-rose-300 disabled:opacity-50">{attendance?.today ? "오늘 출석 완료 ✓" : checking ? "출석 중…" : "출석체크"}</button> : <Link href="/login" className="text-sm text-rose-300 underline">로그인하고 출석하기</Link>}</div>
    <div className="mt-5 grid gap-5 md:grid-cols-[180px_1fr]">
      <nav aria-label="라운지 카테고리" className="space-y-3 rounded-2xl border border-border bg-surface p-3 md:self-start">
        <div className="flex flex-wrap gap-1 md:block"><button onClick={() => pick({})} aria-pressed={board === "all" && scope === "all" && !group} className={item(board === "all" && scope === "all" && !group, true)}>전체글</button>
          {me && SCOPES.map(x => <button key={x.value} onClick={() => pick({ scope: x.value })} aria-pressed={scope === x.value} className={`${item(scope === x.value, true)} md:w-full w-auto`}>{x.label}</button>)}</div>
        <div className="border-t border-border pt-2">{GROUPS.map(g => { const open = expanded === g; return <div key={g}>
          <div className="flex items-center"><button onClick={() => { pick({ group: g }); setExpanded(g); }} aria-pressed={group === g && board === "all" && scope === "all"} className={item(group === g && board === "all" && scope === "all", true)}>{g}</button><button onClick={() => setExpanded(open ? "" : g)} aria-expanded={open} aria-label={`${g} 세부 게시판 ${open ? "접기" : "펼치기"}`} className="px-2 py-2 text-xs text-muted">{open ? "▾" : "▸"}</button></div>
          {open && <div className="mb-2 ml-2 flex flex-wrap gap-1 border-l border-border pl-1 md:block">{CAFE_BOARDS.filter(b => b.group === g).map(b => <button key={b.slug} onClick={() => pick({ board: b.slug, group: g })} aria-pressed={board === b.slug} className={`${item(board === b.slug)} md:w-full w-auto`}>{b.name}</button>)}</div>}
        </div>; })}</div>
      </nav>
      <div className="min-w-0"><h3 className="font-bold">{scopeLabel || selected?.name || (group ? `${group} 전체` : "전체글")}</h3><p className="mt-1 text-xs text-muted">{scope === "recent" ? "최근에 읽은 순서대로 모았어요" : scopeLabel ? "게시판과 상관없이 모아 보여드려요" : selected?.description || (group ? `${group} 분류의 모든 게시판 글` : "새로운 이야기와 정보를 만나보세요")}</p>
        <div className="mt-4 flex flex-wrap gap-2"><input aria-label="라운지 글 검색" type="search" placeholder="제목·내용·작성자 검색" maxLength={100} value={query} onChange={e => setQuery(e.target.value)} className={`${control} min-w-0 flex-1`}/><select aria-label="정렬" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} className={control}><option value="latest">최신순</option><option value="popular">인기순</option></select><select aria-label="지역 필터" value={region} onChange={e => { setRegion(e.target.value); setPage(1); }} className={control}><option value="">전국·전체</option>{CAFE_REGIONS.map(r => <option key={r}>{r}</option>)}</select></div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted"><label className="flex items-center gap-2"><input type="checkbox" checked={open} onChange={e => { setOpen(e.target.checked); setPage(1); }}/>마감 글 제외</label><button aria-pressed={view === "cards"} onClick={() => setView("cards")} className={view === "cards" ? "text-rose-300" : ""}>카드형</button><button aria-pressed={view === "list"} onClick={() => setView("list")} className={view === "list" ? "text-rose-300" : ""}>목록형</button></div>
        <div aria-live="polite" className="mt-4">{error ? <div role="alert" className="rounded-xl border border-border p-6 text-sm text-rose-300">{error}<button onClick={() => setRetry(v => v + 1)} className="ml-2 underline">다시 시도</button>{!me && <Link href="/login" className="ml-3 underline">로그인</Link>}</div> : !result ? <p className="p-8 text-center text-sm text-muted">글을 불러오는 중…</p> : result.items.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center"><p className="text-sm text-muted">{term || region || scope !== "all" || open ? "조건에 맞는 글이 없어요." : "아직 글이 없어요. 첫 이야기를 남겨주세요."}</p><Link href={writeHref} className="mt-3 inline-block text-sm text-rose-400 underline">글쓰기</Link></div> : <ul className={view === "cards" ? "grid gap-3 sm:grid-cols-2" : "space-y-2"}>{result.items.map(post => <li key={post.id}><Link href={`/cafe/posts/${post.id}`} className="block h-full overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-rose-400/40">{view === "cards" && post.photos[0] && <Image unoptimized width={1000} height={1000} src={post.photos[0]} alt={`${post.title} 첨부 사진`} className="h-40 w-full object-cover"/>}<div className="p-4"><div className="flex flex-wrap gap-2 text-[11px]"><span className="text-rose-300">{findCafeBoard(post.board)?.name}</span>{!!post.pinned && <span className="text-amber-300">상단 고정</span>}{post.status === "closed" && <span className="text-muted">마감</span>}{post.details.region && <span className="text-muted">{post.details.region}{post.details.district ? ` ${post.details.district}` : ""} {post.details.kind}</span>}</div><h4 className="mt-2 break-words text-sm font-bold">{post.title}</h4>{view === "cards" && <p className="mt-2 line-clamp-2 break-words text-xs leading-relaxed text-muted">{post.body}</p>}{post.details.price && <p className="mt-2 text-xs text-rose-300">{post.details.price}</p>}<p className="mt-3 text-[11px] text-muted">{post.author_name} · {timeAgo(post.created_at)} · 조회 {post.views||0} · 추천 {post.like_count} · 댓글 {post.comment_count}{post.saved ? " · 저장됨" : ""}</p></div></Link></li>)}</ul>}</div>
        {result && <div className="mt-5 flex items-center justify-center gap-4 text-sm"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-30">이전</button><span>{page} 페이지</span><button disabled={!result.hasMore} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-30">다음</button></div>}
      </div>
    </div>
  </section>;
}
