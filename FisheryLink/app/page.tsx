"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, FIELD_GROUPS, fieldName, findField, timeAgo } from "@/lib/client";

type Row = { id: string; asker_name: string; category: string; title: string; status: string; created_at: string; answer_count: number; consult_status: string | null };

export default function Home() {
  const [items, setItems] = useState<Row[] | null>(null);
  const [group, setGroup] = useState<string>("전체");

  useEffect(() => {
    api<Row[]>("/api/questions").then((r) => setItems(r.ok ? (r.data as unknown as Row[]) : []));
  }, []);

  const list = (items ?? []).filter((q) => group === "전체" || findField(q.category)?.group.id === group);

  return (
    <div>
      <section className="bg-gradient-to-br from-blue-700 to-cyan-600 px-4 py-5 text-white">
        <p className="text-xs opacity-80">수협 조합원을 위한 어업 자문</p>
        <h1 className="mt-1 text-xl font-bold leading-snug">양식장·어선·가공·경영 고민,<br />현장 전문가에게 물어보세요</h1>
        <div className="mt-3 flex gap-2 text-sm">
          <Link href="/ask" className="rounded-full bg-white px-3 py-1.5 font-medium text-blue-700">무료 질문하기</Link>
          <Link href="/fields" className="rounded-full border border-white/70 px-3 py-1.5">어업 분야 보기</Link>
        </div>
      </section>
      <div className="flex gap-2 overflow-x-auto border-b px-4 py-3">
        {[{ id: "전체", name: "전체", icon: "" }, ...FIELD_GROUPS].map((g) => (
          <button
            key={g.id}
            onClick={() => setGroup(g.id)}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm ${group === g.id ? "border-blue-600 bg-blue-600 text-white" : "text-neutral-600"}`}
          >
            {g.icon} {g.name}
          </button>
        ))}
      </div>
      <ul className="divide-y">
        {list.map((q) => (
          <li key={q.id}>
            <Link href={`/q/${q.id}`} className="block px-4 py-3 active:bg-neutral-50">
              <div className="mb-1 flex items-center gap-1.5 text-xs">
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-800">{findField(q.category)?.group.icon} {fieldName(q.category)}</span>
                {q.consult_status === "open" && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">1:1 상담 중</span>}
                <span className={q.status === "solved" ? "text-emerald-600" : "text-blue-600"}>{q.status === "solved" ? "해결됨" : "답변 대기"}</span>
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
