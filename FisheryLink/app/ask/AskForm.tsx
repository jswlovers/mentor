"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, FIELD_GROUPS, findField, jsonInit, useMe } from "@/lib/client";

const input = "w-full rounded-lg border px-3 py-2 text-sm";

export default function AskForm({ initialField }: { initialField: string }) {
  const router = useRouter();
  const { me } = useMe();
  const [category, setCategory] = useState(initialField);
  const [group, setGroup] = useState(findField(initialField)?.group.id ?? FIELD_GROUPS[0].id);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [farmInfo, setFarmInfo] = useState("");
  const [conditions, setConditions] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [err, setErr] = useState("");

  if (me === null) return <p className="p-8 text-center text-sm">질문하려면 <Link href="/login" className="text-blue-600 underline">로그인</Link>이 필요해요.</p>;

  const field = findField(category);
  const items = FIELD_GROUPS.find((g) => g.id === group)?.items ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!field) return setErr("어업 분야(품목)를 선택해주세요");
    const r = await api<{ id: string }>("/api/questions", jsonInit("POST", { category, title, body, farmInfo, conditions }));
    if (!r.ok) return setErr(r.data.error || "등록에 실패했어요");
    if (photos.length > 0) {
      const f = new FormData();
      photos.forEach((p) => f.append("photos", p));
      const up = await api(`/api/questions/${r.data.id}/photos`, { method: "POST", body: f });
      if (!up.ok) alert(`질문은 등록됐지만 사진 업로드에 실패했어요: ${up.data.error}`);
    }
    router.push(`/q/${r.data.id}`);
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-4">
      <div>
        <label className="block text-sm font-medium">어업 분야</label>
        <select className={`${input} mt-1`} value={group} onChange={(e) => { setGroup(e.target.value); setCategory(""); }}>
          {FIELD_GROUPS.map((g) => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
        </select>
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((i) => (
            <button type="button" key={i.id} onClick={() => setCategory(i.id)}
              className={`rounded-full border px-3 py-1 text-sm ${category === i.id ? "border-blue-600 bg-blue-600 text-white" : ""}`}>{i.name}</button>
          ))}
        </div>
        {field && <p className="mt-2 text-xs text-neutral-500">자주 묻는 주제: {field.topics.join(" · ")}</p>}
      </div>
      <input required maxLength={100} className={input} placeholder="제목 (예: 수온 27도 넘으면서 우럭이 떠올라요)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea required maxLength={3000} rows={5} className={input} placeholder="언제부터, 어떤 증상이, 얼마나 생겼는지 자세히 적어주세요" value={body} onChange={(e) => setBody(e.target.value)} />
      <input maxLength={200} className={input} placeholder="양식장·어장 정보 (선택: 지역, 규모, 방식, 어선 톤수 등)" value={farmInfo} onChange={(e) => setFarmInfo(e.target.value)} />
      <input maxLength={300} className={input} placeholder="현재 상태 (선택: 수온·염분·사료·투약 이력 등)" value={conditions} onChange={(e) => setConditions(e.target.value)} />
      <div>
        <label className="block text-sm font-medium">사진 (선택, 최대 3장 · 장당 5MB)</label>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="mt-1 text-sm"
          onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 3))} />
        {photos.length > 0 && <p className="mt-1 text-xs text-neutral-500">{photos.map((p) => p.name).join(", ")}</p>}
      </div>
      <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">사진은 질문과 함께 <b>누구에게나 공개</b>돼요. 어장 위치를 특정할 수 있는 간판·선명(船名)·연락처는 가리고 올려주세요.</p>
      <p className="rounded-lg bg-neutral-50 p-2 text-xs text-neutral-600">대량폐사·법정 전염병이 의심되면 답변을 기다리지 말고 먼저 시·군 수산부서나 국립수산과학원 수산생물질병센터에 신고하세요.</p>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white">질문 등록 (무료)</button>
    </form>
  );
}
