"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, CATEGORIES, jsonInit, useMe } from "@/lib/client";

const input = "w-full rounded-lg border px-3 py-2 text-sm";

export default function Ask() {
  const router = useRouter();
  const { me } = useMe();
  const [category, setCategory] = useState<string>("펌");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [hairType, setHairType] = useState("");
  const [product, setProduct] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [err, setErr] = useState("");

  if (me === null) return <p className="p-8 text-center text-sm">질문하려면 <Link href="/login" className="text-rose-600 underline">로그인</Link>이 필요해요.</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api<{ id: string }>("/api/questions", jsonInit("POST", { category, title, body, hairType, product }));
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
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button type="button" key={c} onClick={() => setCategory(c)}
            className={`rounded-full border px-3 py-1 text-sm ${category === c ? "border-rose-600 bg-rose-600 text-white" : ""}`}>{c}</button>
        ))}
      </div>
      <input required maxLength={100} className={input} placeholder="제목 (예: 2회 탈색 후 모발 끝이 끊어져요)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea required maxLength={3000} rows={5} className={input} placeholder="상황을 자세히 적어주세요" value={body} onChange={(e) => setBody(e.target.value)} />
      <input className={input} placeholder="모질 / 손상 이력 (선택)" value={hairType} onChange={(e) => setHairType(e.target.value)} />
      <input className={input} placeholder="약제·시간·온도 (선택)" value={product} onChange={(e) => setProduct(e.target.value)} />
      <div>
        <label className="block text-sm font-medium">사진 (선택, 최대 3장 · 장당 5MB)</label>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="mt-1 text-sm"
          onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 3))} />
        {photos.length > 0 && <p className="mt-1 text-xs text-neutral-500">{photos.map((p) => p.name).join(", ")}</p>}
      </div>
      <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">사진은 질문과 함께 <b>누구에게나 공개</b>돼요. 고객의 얼굴·이름·연락처가 보이지 않게 가리거나 잘라서 올려주세요.</p>
      {err && <p className="text-sm text-rose-600">{err}</p>}
      <button className="w-full rounded-lg bg-rose-600 py-3 font-medium text-white">질문 등록 (무료)</button>
    </form>
  );
}
