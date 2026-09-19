"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, CATEGORIES, timeAgo } from "@/lib/client";

type Row = { id: string; asker_name: string; category: string; title: string; status: string; created_at: string; answer_count: number; consult_status: string | null };

export default function Home() {
  const [items, setItems] = useState<Row[] | null>(null);
  const [cat, setCat] = useState<string>("전체");

  useEffect(() => {
    api<Row[]>("/api/questions").then((r) => setItems(r.ok ? (r.data as unknown as Row[]) : []));
  }, []);

  const list = (items ?? []).filter((q) => cat === "전체" || q.category === cat);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto border-b px-4 py-3">
        {["전체", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm ${cat === c ? "border-rose-600 bg-rose-600 text-white" : "text-neutral-600"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <ul className="divide-y">
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
        {items && list.length === 0 && <li className="p-8 text-center text-sm text-neutral-500">아직 질문이 없어요. 첫 질문을 올려보세요.</li>}
        {!items && <li className="p-8 text-center text-sm text-neutral-400">불러오는 중…</li>}
      </ul>
    </div>
  );
}
