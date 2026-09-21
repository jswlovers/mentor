"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Intro from "@/app/components/Intro";
import { api, timeAgo } from "@/lib/client";

type Row = { id: string; asker_name: string; category: string; title: string; status: string; created_at: string; answer_count: number; consult_status: string | null };

const MENUS = ['전체', '멘토리스트', '자유게시판', '질문&답', '지역모임', '긴급SOS멘토'];
const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종'];
type Mentor = { id: string; name: string; bio: string | null; reviewCount: number; rating: number | null; consultations: number };
export default function Home() {
  const [items, setItems] = useState<Row[] | null>(null);
  const [region, setRegion] = useState('서울');
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [mentorError, setMentorError] = useState(false);
  const [mentorsLoaded, setMentorsLoaded] = useState(false);
  const [cat, setCat] = useState<string>("전체");

  useEffect(() => {
    api<Mentor[]>("/api/experts").then(r => { if(r.ok) setMentors(r.data); else setMentorError(true); }).catch(()=>setMentorError(true)).finally(()=>setMentorsLoaded(true));
    api<Row[]>("/api/questions").then((r) => setItems(r.ok ? (r.data as unknown as Row[]) : []));
  }, []);

  const list = (items ?? []).filter((q) => cat === '전체' || (cat === '질문&답' && !q.category.startsWith('지역모임 · ') && q.category !== '자유게시판') || (cat === '지역모임' && q.category === '지역모임 · '+region) || q.category === cat);

  return (
    <div>
      <Intro />
      <div className="flex items-center gap-2 overflow-x-auto border-b px-4 py-3">
        {MENUS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            aria-pressed={cat === c}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm ${cat === c ? "border-rose-600 bg-rose-600 text-white" : "text-neutral-600"}`}
          >
            {c}
          </button>
        ))}
        <Link href="/diary" className="shrink-0 rounded-full border-2 border-rose-600 px-5 py-1.5 text-base font-bold text-rose-600">🔒 내 일기장</Link>
      </div>
      {cat ==='지역모임' && <div className="flex flex-wrap gap-2 border-b p-4" aria-label="지역 선택">{REGIONS.map(r=><button key={r} aria-pressed={region===r} onClick={()=>setRegion(r)} className={`rounded-full border px-3 py-1 text-sm ${region===r?'bg-neutral-800 text-white':'text-neutral-600'}`}>{r}</button>)}</div>}
      {cat === '멘토리스트' ? <section className="space-y-4 p-4"><h1 className="text-lg font-bold">멘토리스트</h1><p className="text-sm text-neutral-500">인기순 · 완료 상담 수, 후기 수, 평점 순으로 정렬해요.</p>{!mentorsLoaded?<p>불러오는 중…</p>:mentorError?<p role="alert">멘토 목록을 불러오지 못했어요. 새로고침해 주세요.</p>:mentors.length===0?<p className="py-8 text-center text-neutral-500">아직 등록된 멘토가 없어요.</p>:mentors.map((m,i)=><Link key={m.id} href={`/experts/${m.id}`} className="block rounded-xl border p-4"><h2 className="font-semibold">{i+1}. {m.name}</h2><p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">{m.bio}</p><p className="mt-2 text-xs text-neutral-500">완료 상담 {m.consultations} · 후기 {m.reviewCount} · 평점 {m.rating??'아직 없음'}</p></Link>)}</section>
      : cat === '긴급SOS멘토' ? <section className="space-y-4 p-4"><h1 className="text-lg font-bold">긴급SOS멘토</h1><p>시술 중 필요한 도움을 여러 멘토에게 요청하는 상담입니다.</p><ol className="list-inside list-decimal space-y-2 text-sm"><li>여러 멘토에게 긴급 요청</li><li>5분 안에 수락한 멘토 중 한 명 선택</li><li>선택 후 20분 안에 첫 답변</li></ol><p className="rounded-xl bg-amber-50 p-4 text-sm">긴급 상담은 준비 중입니다. 현재 요청과 결제는 진행되지 않습니다.</p></section>
      : <><div className="flex items-center justify-between p-4"><h1 className="font-semibold">{cat==='지역모임'?region+' 지역모임':cat}</h1><Link href={cat === '자유게시판' ? '/ask?board=free' : cat === '지역모임' ? `/ask?board=region&region=${encodeURIComponent(region)}` : '/ask'} className="text-sm text-rose-600">글 작성</Link></div><ul className="divide-y">
        {list.map((q) => (
          <li key={q.id}>
            <Link href={`/q/${q.id}`} className="block px-4 py-3 active:bg-neutral-50">
              <div className="mb-1 flex items-center gap-1.5 text-xs">
                <span className="rounded bg-neutral-100 px-1.5 py-0.5">{q.category}</span>
                {q.consult_status === "open" && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">1:1 상담 중</span>}
                <span className={q.status === "solved" ? "text-emerald-600" : "text-rose-600"}>{q.status === "solved" ? "해결됨" : "답변 대기"}</span>
              </div>
              <p className="font-medium">{q.title}</p>
              <p className="mt-1 text-xs text-neutral-500">{q.asker_name} · {timeAgo(q.created_at)} · 답변 {q.answer_count}</p>
            </Link>
          </li>
        ))}
        {items && list.length === 0 && <li className="p-8 text-center text-sm text-neutral-500">아직 게시글이 없어요. 첫 글을 올려보세요.</li>}
        {!items && <li className="p-8 text-center text-sm text-neutral-400">불러오는 중…</li>}
      </ul></>}
    </div>
  );
}
