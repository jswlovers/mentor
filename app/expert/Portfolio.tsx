"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Item = { id: number; caption: string | null; url: string };

// 전문가 센터: 작업 사진(포트폴리오). 공개 프로필에 그대로 보인다.
export default function Portfolio() {
  const [items, setItems] = useState<Item[]>([]);
  const [max, setMax] = useState(12);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api<{ items: Item[]; max: number }>("/api/experts/portfolio").then((r) => {
      if (r.ok) { setItems(r.data.items); setMax(r.data.max); }
    });
  }, []);

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return setMsg("사진은 5MB 이하만 올릴 수 있어요");
    const f = new FormData();
    f.append("photo", file);
    f.append("caption", caption);
    setBusy(true);
    const r = await api<{ items: Item[] }>("/api/experts/portfolio", { method: "POST", body: f });
    setBusy(false);
    if (r.ok) { setItems(r.data.items); setCaption(""); setMsg("올렸어요."); } else setMsg(r.data.error || "올리지 못했어요");
  };

  const remove = async (id: number) => {
    if (!confirm("이 사진을 지울까요?")) return;
    const r = await api<{ items: Item[] }>(`/api/experts/portfolio?id=${id}`, { method: "DELETE" });
    if (r.ok) setItems(r.data.items); else setMsg(r.data.error || "지우지 못했어요");
  };

  return (
    <section className="space-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
      <h2 className="font-semibold">작업 사진 <span className="text-xs font-normal text-muted">{items.length}/{max}</span></h2>
      <p className="text-xs text-muted">시술 전후·작업 결과 사진을 올리면 공개 프로필에 보여요. 손님 얼굴이 나온 사진은 동의를 받은 것만 올려주세요.</p>
      {items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {items.map((p) => (
            <li key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption ?? "작업 사진"} className="aspect-square w-full rounded-lg object-cover" />
              {p.caption && <p className="mt-0.5 truncate text-[11px] text-muted">{p.caption}</p>}
              <button onClick={() => remove(p.id)} aria-label="사진 삭제" className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white hover:bg-rose-500">✕</button>
            </li>
          ))}
        </ul>
      )}
      {items.length < max && (
        <div className="space-y-2">
          <input maxLength={60} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="사진 설명 (선택, 예: 손상모 탈색 후 애쉬그레이)" className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted" />
          <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface-2 p-3 text-xs transition hover:border-rose-400 ${busy ? "pointer-events-none opacity-60" : ""}`}>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
            <span className="text-lg">📷</span>
            <span className="font-semibold text-foreground">{busy ? "올리는 중…" : "여기를 눌러 작업 사진 올리기"}</span>
            <span className="text-muted">JPG·PNG·WEBP 5MB 이하</span>
          </label>
        </div>
      )}
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </section>
  );
}
