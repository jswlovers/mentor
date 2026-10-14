"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, jsonInit, useMe } from "@/lib/client";
import { CAFE_BOARDS, CAFE_REGIONS, CAFE_KINDS, EMPTY_CAFE_DETAILS, JOB_FIELDS, JOB_REQUIRED, JOB_ROLES, JOB_RULE_TEXT, allowedJobKinds, canHire, detailLabel, findCafeBoard, jobSide, type CafeDetails, type CafePost, type JobRights } from "@/lib/cafe";
const input = "mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground";
export default function CafeEditor({ initialBoard = "talk", post, onSaved }: {
    initialBoard?: string;
    post?: CafePost;
    onSaved?: () => void;
}) {
    const { me } = useMe();
    const router = useRouter();
    const [board, setBoard] = useState(post?.board || (findCafeBoard(initialBoard)?.slug ?? "talk")), [title, setTitle] = useState(post?.title || ""), [body, setBody] = useState(post?.body || "");
    const [details, setDetails] = useState<CafeDetails>(post ? { ...post.details, url: "" } : { ...EMPTY_CAFE_DETAILS }), [files, setFiles] = useState<File[]>([]), [previews, setPreviews] = useState<string[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState("");
    useEffect(() => {
        const urls = files.map(f => URL.createObjectURL(f));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPreviews(urls);
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, [files]);
    const [pollOptions,setPollOptions]=useState("");
    const [rights, setRights] = useState<JobRights | null>(null);
    useEffect(() => {
        if (board !== "jobs" || !me) return;
        let active = true;
        api<JobRights>("/api/cafe/services?area=job-rights").then(r => { if (active && r.ok) setRights(r.data); }).catch(() => {});
        return () => { active = false; };
    }, [board, me]);
    const selected = findCafeBoard(board)!;
    // 채용·구직 게시판은 직급·인증에 따라 고를 수 있는 유형이 다르다(수정 중인 글의 기존 유형은 유지).
    const jobKinds = rights ? allowedJobKinds(rights).filter(k => k !== post?.details.kind).concat(post?.details.kind ? [post.details.kind] : []) : [];
    const kinds = board === "jobs" ? jobKinds : CAFE_KINDS[board];
    const side = board === "jobs" ? jobSide(details.kind) : null;
    const update = (key: keyof CafeDetails, value: string) => setDetails(d => ({ ...d, [key]: value }));
    const fields: (keyof CafeDetails)[] = board === "jobs" ? (side ? JOB_FIELDS[side] : []) : selected.listing ? ["region", "place", "date", "deadline", "capacity", "fee", "price", "tags", ...(board === "salon-sale" ? ["deposit", "rent", "area"] as const : [])] : board === "recipe" ? ["product", "formula"] : ["tags"];
    const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setError(""); try {
        if (post) {
            const r = await api(`/api/cafe/posts/${post.id}`, jsonInit("PATCH", { title, body, details }));
            if (!r.ok) {
                setError(r.data.error || "저장하지 못했어요");
                return;
            }
            onSaved?.();
        }
        else {
            const form = new FormData();
            form.set("board", board);
            form.set("title", title);
            form.set("body", body);
            if(board === "poll") form.set("pollOptions",JSON.stringify(pollOptions.split("\n").map(v=>v.trim()).filter(Boolean)));
            form.set("details", JSON.stringify(details));
            files.forEach(f => form.append("photos", f));
            const r = await api<{
                id: number;
            }>("/api/cafe/posts", { method: "POST", body: form });
            if (!r.ok) {
                setError(r.data.error || "저장하지 못했어요");
                return;
            }
            router.push(`/cafe/posts/${r.data.id}`);
        }
    }
    catch {
        setError("연결을 확인하고 다시 시도해주세요");
    }
    finally {
        setBusy(false);
    } };
    if (me === undefined)
        return <p className="p-8 text-muted">회원 정보를 확인하는 중…</p>;
    if (!me)
        return <div className="p-8 text-center"><p>로그인하면 글을 작성할 수 있어요.</p><Link href="/login" className="mt-3 inline-block text-rose-400 underline">로그인하기</Link></div>;
    if (post && post.author_id !== me.id && !me.isAdmin)
        return <p className="p-8 text-muted">수정 권한이 없어요.</p>;
    if (board === "notice" && !me.isAdmin)
        return <div className="p-8 text-muted">공지사항은 관리자만 작성할 수 있어요. <Link href="/cafe/write" className="text-rose-300 underline">다른 게시판에 글쓰기</Link></div>;
    return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-surface p-5 md:p-7">
    <label className="block text-sm font-semibold">게시판<select disabled={!!post} value={board} onChange={e => { setBoard(e.target.value as typeof board); setDetails({ ...EMPTY_CAFE_DETAILS }); }} className={input}>{CAFE_BOARDS.filter(b => b.slug !== "notice" || me.isAdmin).map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}</select></label><p className="text-xs text-muted">{selected.description}</p>
    <label className="block text-sm font-semibold">제목<input required maxLength={100} value={title} onChange={e => setTitle(e.target.value)} className={input}/></label>
    {board === "poll" && !post && <label className="block text-sm font-semibold">설문 선택지 (한 줄에 하나, 2~8개)<textarea required rows={5} value={pollOptions} onChange={e=>setPollOptions(e.target.value)} className={input}/></label>}
    {kinds && <label className="block text-sm font-semibold">유형<select required value={details.kind} onChange={e => { const kind = e.target.value; setDetails(d => board === "jobs" && jobSide(kind) !== jobSide(d.kind) ? { ...EMPTY_CAFE_DETAILS, region: d.region, kind } : { ...d, kind }); }} className={input}><option value="">선택해주세요</option>{kinds.map(kind => <option key={kind}>{kind}</option>)}</select></label>}
    {board === "jobs" && <p className="text-xs leading-5 text-muted">{JOB_RULE_TEXT}{rights && !canHire(rights) && <> 지금은 구직 글만 쓸 수 있어요. <Link href="/cafe/services/profile" className="text-rose-300 underline">등업 신청</Link> · <Link href="/salon" className="text-rose-300 underline">매장 등록</Link></>}</p>}
    <div className="grid gap-4 sm:grid-cols-2">{fields.map(key => <label key={key} className={`block text-sm font-semibold ${key === "formula" || key === "url" ? "sm:col-span-2" : ""}`}>{detailLabel(key, details.kind)}{side && JOB_REQUIRED[side].includes(key) ? " *" : ""}{key === "role" ? <select required value={details.role} onChange={e => update(key, e.target.value)} className={input}><option value="">직급 선택</option>{JOB_ROLES.map(r => <option key={r}>{r}</option>)}</select> : key === "region" ? <select required value={details.region} onChange={e => update(key, e.target.value)} className={input}><option value="">지역 선택</option>{CAFE_REGIONS.map(r => <option key={r}>{r}</option>)}</select> : key === "formula" ? <textarea rows={3} maxLength={500} value={details[key]} onChange={e => update(key, e.target.value)} className={input} placeholder="배합비, 방치 시간, 모발 상태 등을 적어주세요"/> : <input type={(key === "date" || key === "deadline") ? "date" : key === "url" ? "url" : "text"} maxLength={key === "url" ? 1000 : 150} value={details[key]} onChange={e => update(key, e.target.value)} className={input} required={!!side && JOB_REQUIRED[side].includes(key)} placeholder={key === "price" ? (side === "hire" ? "예: 월 300만원 + 인센티브 / 일급 13만원" : side === "seek" ? "예: 월 280만원 이상 / 협의" : "예: 일급 13만원 / 참가비 무료 / 5만원") : key === "hours" ? "예: 주 5일 10:00~20:00 / 주말만" : key === "career" ? "예: 디자이너 5년, 염색 전문" : key === "salon" ? "예: 미용SOS 강남점" : key === "url" ? "https://… (교육 영상·신청 페이지 등)" : ""}/>}</label>)}</div>
    <label className="block text-sm font-semibold">내용<textarea required rows={10} maxLength={6000} value={body} onChange={e => setBody(e.target.value)} className={input} placeholder="경험, 시술 순서 또는 모집·거래 조건을 자세히 적어주세요."/><span className="mt-1 block text-right text-xs font-normal text-muted">{body.length.toLocaleString()} / 6,000</span></label>
    {!post && <div><label className="block text-sm font-semibold">사진 첨부 (최대 3장)<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e => { const next = Array.from(e.target.files || []); if (next.length > 3 || next.some(f => f.size > 5 * 1024 * 1024)) {
        setError("사진은 최대 3장, 한 장에 5MB 이하로 선택해주세요");
        e.target.value = "";
        setFiles([]);
        return;
    } setError(""); setFiles(next); }} className={`${input} font-normal`}/></label><p className="mt-2 text-xs text-muted">JPG·PNG·WEBP / 장당 5MB. 공개 게시판에 게시할 수 있는 사진을 올려주세요.</p><div className="mt-3 flex gap-2">{previews.map((url, i) => <Image unoptimized width={96} height={96} key={url} src={url} alt={`첨부 사진 ${i + 1} 미리보기`} className="h-24 w-24 rounded-xl object-cover"/>)}</div></div>}
    {post && post.photos.length > 0 && <p className="text-xs text-muted">첨부 사진 {post.photos.length}장은 그대로 유지됩니다.</p>}{error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    <div className="flex gap-3"><button disabled={busy} className="flex-1 rounded-xl bg-rose-500 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "저장 중…" : post ? "수정 완료" : "글 등록"}</button>{post ? <button type="button" onClick={onSaved} className="rounded-xl border border-border px-5 py-3 text-sm">취소</button> : <Link href="/cafe" className="rounded-xl border border-border px-5 py-3 text-sm">취소</Link>}</div>
  </form>;
}
