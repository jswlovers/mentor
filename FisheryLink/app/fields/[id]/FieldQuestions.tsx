"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/client";

type Row = { id: string; asker_name: string; title: string; status: string; created_at: string; answer_count: number };

export default function FieldQuestions({ field }: { field: string }) {
  const [items, setItems] = useState<Row[] | null>(null);

  useEffect(() => {
    api<Row[]>(`/api/questions?field=${encodeURIComponent(field)}`).then((r) => setItems(r.ok ? (r.data as unknown as Row[]) : []));
  }, [field]);

  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold">이 분야 질문 {items ? items.length : ""}</h2>
      <ul className="divide-y rounded-lg border">
        {items?.map((q) => (
          <li key={q.id}>
            <Link href={`/q/${q.id}`} className="block px-3 py-2.5 active:bg-neutral-50">
              <p className="text-sm font-medium">{q.title}</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                <span className={q.status === "solved" ? "text-emerald-600" : "text-blue-600"}>{q.status === "solved" ? "해결됨" : "답변 대기"}</span> · {q.asker_name} · {timeAgo(q.created_at)} · 답변 {q.answer_count}
              </p>
            </Link>
          </li>
        ))}
        {items && items.length === 0 && <li className="p-4 text-center text-xs text-neutral-500">아직 질문이 없어요. 첫 질문을 남겨보세요.</li>}
        {!items && <li className="p-4 text-center text-xs text-neutral-400">불러오는 중…</li>}
      </ul>
    </section>
  );
}
