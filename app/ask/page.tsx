"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, CATEGORIES, jsonInit, useMe } from "@/lib/client";
import Avatar from "../components/Avatar";

const input = "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted";

type Target = { id: string; name: string; salon: string | null; photoUrl: string | null; headline: string | null; available: boolean; categories: string[] };

// ?expert=전문가ID&category=염색 으로 들어오면 그 전문가에게 질문하는 흐름(등록 후 상담 신청 화면에서 그 전문가가 선택돼 있다).
export default function AskPage() {
  return <Suspense><Ask /></Suspense>;
}

function Ask() {
  const router = useRouter();
  const { me } = useMe();
  const sp = useSearchParams();
  const expertId = sp.get("expert");
  const groupParam = sp.get("experts"); // ⚡ 지금 답변 가능한 전문가 찾기로 고른 여러 명(쉼표 구분)
  const presetCategory = sp.get("category");
  const [category, setCategory] = useState<string>(presetCategory && (CATEGORIES as readonly string[]).includes(presetCategory) ? presetCategory : "펌");
  const [target, setTarget] = useState<Target | null>(null);
  const [group, setGroup] = useState<Target[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [hairType, setHairType] = useState("");
  const [product, setProduct] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!expertId) return;
    api<Target>(`/api/experts/${encodeURIComponent(expertId)}`).then((r) => {
      if (!r.ok) return;
      const t = r.data as Target;
      setTarget(t);
      // 분야를 정해 오지 않았으면 전문가의 첫 담당 분야로 맞춘다
      if (!presetCategory && t.categories[0]) setCategory(t.categories[0]);
    });
  }, [expertId, presetCategory]);

  useEffect(() => {
    const ids = (groupParam ?? "").split(",").filter(Boolean).slice(0, 10);
    if (ids.length === 0) return;
    Promise.all(ids.map((id) => api<Target>(`/api/experts/${encodeURIComponent(id)}`))).then((rs) => {
      setGroup(rs.filter((r) => r.ok).map((r) => r.data as Target));
    });
  }, [groupParam]);

  if (me === null) return <p className="p-8 text-center text-sm">질문하려면 <Link href="/login" className="text-rose-400 underline">로그인</Link>이 필요해요.</p>;

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
    // 전문가를 골라서 온 경우 바로 상담 신청 화면으로 이어간다
    router.push(
      group.length ? `/chat/${r.data.id}?experts=${group.map((g) => g.id).join(",")}`
        : target ? `/chat/${r.data.id}?expert=${target.id}`
        : `/q/${r.data.id}`,
    );
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4 px-6 py-8">
      {group.length > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <p>⚡ 지금 온라인인 전문가 <b>{group.length}명</b>에게 질문해요</p>
            <Link href="/ask" className="shrink-0 text-xs text-muted underline">해제</Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.map((g) => (
              <span key={g.id} className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-0.5 pl-0.5 pr-2 text-xs">
                <Avatar name={g.name} url={g.photoUrl} size={22} />{g.name}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">등록하면 바로 상담 신청 화면으로 이어지고, 신청하면 이분들 중 그때도 온라인인 분들에게만 알림이 가요.</p>
        </div>
      )}
      {target && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
          <Avatar name={target.name} url={target.photoUrl} size={48} />
          <div className="min-w-0 flex-1 text-sm">
            <p><b>{target.name}</b> 전문가에게 질문해요</p>
            {target.salon && <p className="text-xs text-foreground/80">🏢 {target.salon}</p>}
            <p className={`text-xs ${target.available ? "text-emerald-400" : "text-muted"}`}>
              {target.available ? "● 지금 응대 가능 · 등록하면 바로 상담 신청 화면으로 이어져요" : "○ 지금은 쉬는 중이에요 · 질문은 남길 수 있고, 상담은 자동 배정으로 신청할 수 있어요"}
            </p>
          </div>
          <Link href="/ask" className="shrink-0 text-xs text-muted underline">해제</Link>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button type="button" key={c} onClick={() => setCategory(c)}
            className={`rounded-full border px-3 py-1 text-sm transition ${category === c ? "border-rose-500 bg-rose-500 text-white" : "border-border text-muted hover:text-foreground"}`}>{c}</button>
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
        {photos.length > 0 && <p className="mt-1 text-xs text-muted">{photos.map((p) => p.name).join(", ")}</p>}
      </div>
      <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-300">사진은 질문과 함께 <b>누구에게나 공개</b>돼요. 고객의 얼굴·이름·연락처가 보이지 않게 가리거나 잘라서 올려주세요.</p>
      {err && <p className="text-sm text-rose-400">{err}</p>}
      <button className="w-full rounded-lg bg-rose-500 py-3 font-medium text-white hover:bg-rose-400">{group.length ? `질문 등록하고 ${group.length}명에게 상담 신청` : target ? `질문 등록하고 ${target.name} 전문가에게 상담 신청` : "질문 등록 (무료)"}</button>
    </form>
  );
}
