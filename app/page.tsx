"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, CATEGORIES, timeAgo, useMe } from "@/lib/client";
import AvailableNow from "./components/AvailableNow";

const PAGE = 20;

type Row = { id: string; asker_name: string; category: string; title: string; status: string; created_at: string; answer_count: number; consult_status: string | null };

const ACTIONS = [
  { href: "/ask", icon: "✎", label: "질문하기", sub: "무료로 물어보기" },
  { href: "/color-ai", icon: "◎", label: "컬러핏 AI", sub: "염색 배합 진단" },
  { href: "/experts", icon: "☆", label: "전문가 찾기", sub: "분야별 검색" },
] as const;

export default function Home() {
  const router = useRouter();
  const { me } = useMe();
  const [items, setItems] = useState<Row[] | null>(null);
  const [cat, setCat] = useState<string>("전체");
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // 검색어는 입력이 멈추고 0.3초 뒤에 반영한다
  useEffect(() => {
    const t = setTimeout(() => setTerm(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const fetchPage = useCallback(
    (offset: number) => {
      const sp = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
      if (cat !== "전체") sp.set("category", cat);
      if (term) sp.set("q", term);
      return api<Row[]>(`/api/questions?${sp}`).then((r) => (r.ok ? (r.data as unknown as Row[]) : []));
    },
    [cat, term],
  );

  useEffect(() => {
    let alive = true;
    fetchPage(0).then((rows) => {
      if (!alive) return;
      setItems(rows);
      setHasMore(rows.length === PAGE);
    });
    return () => {
      alive = false;
    };
  }, [fetchPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    const rows = await fetchPage(items?.length ?? 0);
    setItems((prev) => [...(prev ?? []), ...rows.filter((r) => !prev?.some((p) => p.id === r.id))]);
    setHasMore(rows.length === PAGE);
    setLoadingMore(false);
  };

  const list = items ?? [];

  return (
    <div className="pb-16">
      <section className="border-b border-border bg-surface px-6 py-10 md:px-10 md:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-400">Beauty SOS</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
          {me ? `${me.name}님, 오늘도 좋은 헤어 되세요` : "지금, 전문가에게 물어보세요"}
        </h1>
        <p className="mt-2 text-sm text-muted md:text-base">질문·1:1 상담·컬러 진단까지 한 곳에서 해결해요.</p>
        <AvailableNow className="mt-3" />

        <div className="mt-7 grid grid-cols-3 gap-3 md:max-w-xl">
          {ACTIONS.map((a) => (
            <Link key={a.href} href={a.href} className="rounded-2xl border border-border bg-surface-2 px-3 py-5 text-center transition hover:border-white/20 hover:bg-white/5">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-rose-500/15 text-lg text-rose-300">{a.icon}</div>
              <p className="mt-2.5 text-sm font-bold">{a.label}</p>
              <p className="mt-0.5 text-[11px] text-muted">{a.sub}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto border-b border-border px-6 py-4 md:px-10">
        {["전체", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => (c === "염색클리닉" ? router.push("/color-ai") : setCat(c))}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              cat === c ? "border-rose-500 bg-rose-500 text-white shadow-sm shadow-rose-500/20" : "border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="px-6 pt-4 md:px-10">
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="비슷한 고민이 있었는지 검색해보세요 (예: 탈색 끊김, 펌 컬 안 나옴)"
          className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted"
        />
      </div>

      <ul className="mt-5 grid gap-3 px-6 md:grid-cols-2 md:px-10">
        {list.map((q) => (
          <li key={q.id}>
            <Link href={`/q/${q.id}`} className="block h-full rounded-2xl border border-border bg-surface p-4 transition hover:border-white/20 hover:bg-surface-2">
              <div className="mb-2 flex items-center gap-1.5 text-[11px]">
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 font-semibold text-rose-300">{q.category}</span>
                {q.consult_status === "open" && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-300">1:1 상담 중</span>}
                <span className={`ml-auto font-semibold ${q.status === "solved" ? "text-emerald-400" : "text-muted"}`}>
                  {q.status === "solved" ? "해결됨" : "답변 대기"}
                </span>
              </div>
              <p className="font-bold leading-snug">{q.title}</p>
              <p className="mt-1.5 text-xs text-muted">{q.asker_name} · {timeAgo(q.created_at)} · 답변 {q.answer_count}</p>
            </Link>
          </li>
        ))}
        {items && list.length === 0 && term && (
          <li className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted md:col-span-2">
            ‘{term}’에 대한 질문이 아직 없어요.
            <br />
            <Link href="/ask" className="mt-2 inline-block font-semibold text-rose-400 underline">이 내용으로 질문 올리기</Link>
          </li>
        )}
        {items && list.length === 0 && !term && (
          <li className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted md:col-span-2">
            아직 질문이 없어요.
            <br />
            <Link href="/ask" className="mt-2 inline-block font-semibold text-rose-400 underline">첫 질문 올리기</Link>
          </li>
        )}
        {!items && (
          <li className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted md:col-span-2">불러오는 중…</li>
        )}
      </ul>
      {hasMore && (
        <div className="mt-4 px-6 md:px-10">
          <button onClick={loadMore} disabled={loadingMore} className="w-full rounded-xl border border-border bg-surface py-3 text-sm font-medium text-muted transition hover:text-foreground disabled:opacity-50">
            {loadingMore ? "불러오는 중…" : "질문 더 보기"}
          </button>
        </div>
      )}
    </div>
  );
}
