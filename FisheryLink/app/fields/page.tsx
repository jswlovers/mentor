"use client";
import Link from "next/link";
import { useState } from "react";
import { ALL_FIELDS, FIELD_GROUPS } from "@/lib/client";

// 어업 분야 도감: 모든 분야 그룹과 품목·업종을 한눈에 보고, 검색해서 해당 분야 질문으로 들어간다.
export default function Fields() {
  const [q, setQ] = useState("");
  const term = q.trim();
  const hit = (s: string) => s.includes(term);
  const groups = FIELD_GROUPS.map((g) => ({
    ...g,
    items: term ? g.items.filter((i) => [i.name, i.alias ?? "", i.regions, i.method, i.desc, ...i.topics].some(hit)) : g.items,
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-lg font-bold">어업 분야 도감</h1>
        <p className="mt-1 text-xs text-neutral-500">{FIELD_GROUPS.length}개 분야 · {ALL_FIELDS.length}개 품목·업종. 품목을 누르면 특징과 자주 묻는 주제, 관련 질문을 볼 수 있어요.</p>
      </div>
      <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="품목·지역·주제 검색 (예: 멍게, 완도, 고수온)" value={q} onChange={(e) => setQ(e.target.value)} />
      <nav className="flex flex-wrap gap-1.5 text-xs">
        {groups.map((g) => <a key={g.id} href={`#${g.id}`} className="rounded-full bg-neutral-100 px-2.5 py-1">{g.icon} {g.name}</a>)}
      </nav>
      {groups.map((g) => (
        <section key={g.id} id={g.id} className="scroll-mt-28">
          <h2 className="text-base font-bold">{g.icon} {g.name} <span className="text-xs font-normal text-neutral-400">{g.items.length}</span></h2>
          <p className="mb-2 text-xs text-neutral-500">{g.desc}</p>
          <ul className="grid grid-cols-2 gap-2">
            {g.items.map((i) => (
              <li key={i.id}>
                <Link href={`/fields/${i.id}`} className="block h-full rounded-lg border p-2.5 active:bg-neutral-50">
                  <p className="text-sm font-semibold">{i.name}</p>
                  {i.alias && <p className="text-[11px] text-neutral-500">{i.alias}</p>}
                  <p className="mt-1 line-clamp-2 text-[11px] text-neutral-600">{i.regions}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groups.length === 0 && <p className="p-8 text-center text-sm text-neutral-500">찾는 분야가 없어요. <Link href="/ask" className="text-blue-600 underline">질문으로 남겨주세요.</Link></p>}
    </div>
  );
}
