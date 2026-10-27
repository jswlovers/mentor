"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, FIELD_GROUPS, groupName } from "@/lib/client";

type E = { id: string; name: string; bio: string; fields: string[]; reviewCount: number; rating: number | null; answers: number };

// 승인된 전문가를 전문 분야별로 찾는다.
export default function Experts() {
  const [items, setItems] = useState<E[] | null>(null);
  const [group, setGroup] = useState("전체");

  useEffect(() => {
    api<E[]>("/api/experts").then((r) => setItems(r.ok ? (r.data as unknown as E[]) : []));
  }, []);

  const list = (items ?? []).filter((e) => group === "전체" || e.fields.includes(group));

  return (
    <div>
      <div className="px-4 pt-4">
        <h1 className="text-lg font-bold">전문가 찾기</h1>
        <p className="mt-1 text-xs text-neutral-500">관리자가 경력·자격을 확인한 검증 전문가예요. 질문에 답변하고, 1:1 상담(채팅·보이스톡·페이스톡)에 참여해요.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto border-b px-4 py-3">
        {[{ id: "전체", name: "전체", icon: "" }, ...FIELD_GROUPS].map((g) => (
          <button key={g.id} onClick={() => setGroup(g.id)}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm ${group === g.id ? "border-blue-600 bg-blue-600 text-white" : "text-neutral-600"}`}>{g.icon} {g.name}</button>
        ))}
      </div>
      <ul className="divide-y">
        {list.map((e) => (
          <li key={e.id}>
            <Link href={`/experts/${e.id}`} className="block px-4 py-3 active:bg-neutral-50">
              <p className="font-medium">{e.name} <span className="rounded bg-blue-100 px-1.5 py-0.5 align-middle text-[11px] font-normal text-blue-700">검증 전문가</span></p>
              <p className="mt-0.5 text-xs text-blue-700">{e.fields.map(groupName).join(" · ")}</p>
              <p className="mt-1 line-clamp-2 text-xs text-neutral-600">{e.bio}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {e.rating !== null ? <><span className="text-amber-500">★</span> {e.rating.toFixed(1)} (후기 {e.reviewCount}) · </> : null}답변 {e.answers}
              </p>
            </Link>
          </li>
        ))}
        {items && list.length === 0 && <li className="p-8 text-center text-sm text-neutral-500">이 분야 전문가가 아직 없어요. <Link href="/expert" className="text-blue-600 underline">전문가로 신청</Link>해보세요.</li>}
        {!items && <li className="p-8 text-center text-sm text-neutral-400">불러오는 중…</li>}
      </ul>
    </div>
  );
}
