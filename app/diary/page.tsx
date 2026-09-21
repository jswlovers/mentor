"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, jsonInit, useMe } from "@/lib/client";

type Mark = { date: string; preview: string; photos: number };
type Photo = { id: number; filename: string; url: string };
type Day = { date: string; body: string; updatedAt: string | null; photos: Photo[] };

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_CHARS = 5000;
const MAX_PHOTOS = 5;

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`;
function todayStr() {
  const t = new Date();
  return ymd(t.getFullYear(), t.getMonth(), t.getDate());
}
function longDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일 (${WEEK[new Date(y, m - 1, d).getDay()]})`;
}

export default function Diary() {
  const { me } = useMe();
  // 오늘 날짜는 브라우저에서만 알 수 있어서(서버 시간대와 다를 수 있음) 마운트 후에 정한다.
  const [today, setToday] = useState<string | null>(null);
  const [view, setView] = useState<{ y: number; m0: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [day, setDay] = useState<Day | null>(null);
  const [draft, setDraft] = useState("");
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const t = todayStr();
    const [y, m] = t.split("-").map(Number);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(t);
    setView({ y, m0: m - 1 });
    setSelected(t);
  }, []);

  useEffect(() => {
    if (!me || !view) return;
    let off = false;
    api<{ days: Mark[] }>(`/api/diary?month=${view.y}-${pad(view.m0 + 1)}`).then((r) => {
      if (!off && r.ok) setMarks(Object.fromEntries(r.data.days.map((d) => [d.date, d])));
    });
    return () => { off = true; };
  }, [me, view, tick]);

  useEffect(() => {
    if (!me || !selected) return;
    let off = false;
    api<Day>(`/api/diary/${selected}`).then((r) => {
      if (off) return;
      if (r.ok) { setDay(r.data); setDraft(r.data.body); } else setErr(r.data.error || "일기를 불러오지 못했어요");
    });
    return () => { off = true; };
  }, [me, selected]);

  if (me === null) return <p className="p-8 text-center text-sm">일기장은 <Link href="/login" className="text-rose-600 underline">로그인</Link> 후 쓸 수 있어요.</p>;
  if (!me || !today || !view || !selected) return <p className="p-8 text-center text-sm text-neutral-400">불러오는 중…</p>;

  const dirty = !!day && draft !== day.body;
  const first = new Date(view.y, view.m0, 1).getDay();
  const dim = new Date(view.y, view.m0 + 1, 0).getDate();

  const save = async () => {
    setBusy(true); setErr(""); setMsg("");
    const r = await api<Day>(`/api/diary/${selected}`, jsonInit("PUT", { body: draft }));
    setBusy(false);
    if (!r.ok) { setErr(r.data.error || "저장에 실패했어요"); return false; }
    setDay(r.data); setDraft(r.data.body); setTick((t) => t + 1); setMsg("저장했어요");
    return true;
  };

  const select = async (date: string) => {
    if (date === selected) return;
    if (dirty && !(await save())) return; // 쓰던 글은 날짜를 옮기기 전에 저장한다
    setDay(null); setDraft(""); setMsg(""); setErr("");
    setSelected(date);
  };

  const move = (delta: number) => {
    const d = new Date(view.y, view.m0 + delta, 1);
    setView({ y: d.getFullYear(), m0: d.getMonth() });
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const files = Array.from(el.files ?? []);
    el.value = "";
    if (files.length === 0 || !day) return;
    if (day.photos.length + files.length > MAX_PHOTOS) return setErr(`사진은 하루에 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요`);
    setBusy(true); setErr(""); setMsg("");
    const f = new FormData();
    files.forEach((p) => f.append("photos", p));
    const r = await api<Day>(`/api/diary/${selected}/photos`, { method: "POST", body: f });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error || "사진 업로드에 실패했어요");
    setDay((d) => d && { ...d, photos: r.data.photos });
    setTick((t) => t + 1);
  };

  const removePhoto = async (p: Photo) => {
    if (!confirm("이 사진을 지울까요?")) return;
    const r = await api(`/api/diary/photo/${p.filename}`, { method: "DELETE" });
    if (!r.ok) return setErr("사진을 지우지 못했어요");
    setDay((d) => d && { ...d, photos: d.photos.filter((x) => x.id !== p.id) });
    setTick((t) => t + 1);
  };

  const removeDay = async () => {
    if (!confirm(`${longDate(selected)} 일기와 사진을 모두 지울까요? 되돌릴 수 없어요.`)) return;
    const r = await api(`/api/diary/${selected}`, { method: "DELETE" });
    if (!r.ok) return setErr("지우지 못했어요");
    setDay({ date: selected, body: "", updatedAt: null, photos: [] }); setDraft(""); setMsg("지웠어요"); setTick((t) => t + 1);
  };

  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-lg font-bold">내 일기장</h1>
        <p className="mt-1 text-sm text-neutral-500">🔒 나만 볼 수 있어요. 다른 회원과 전문가, 관리자 화면에는 보이지 않아요.</p>
      </div>

      <section aria-label="달력">
        <div className="mb-2 flex items-center justify-between">
          <button onClick={() => move(-1)} aria-label="이전 달" className="rounded-full border px-3 py-1 text-sm">‹</button>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{view.y}년 {view.m0 + 1}월</h2>
            <button onClick={() => { const [y, m] = today.split("-").map(Number); setView({ y, m0: m - 1 }); select(today); }} className="rounded-full border px-2 py-0.5 text-xs text-neutral-600">오늘</button>
          </div>
          <button onClick={() => move(1)} aria-label="다음 달" className="rounded-full border px-3 py-1 text-sm">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-neutral-500">
          {WEEK.map((w) => <div key={w} className="py-1">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={`b${i}`} />;
            const date = ymd(view.y, view.m0, d);
            const mk = marks[date];
            const isSel = date === selected;
            return (
              <button
                key={date}
                onClick={() => select(date)}
                disabled={date > today}
                aria-pressed={isSel}
                aria-label={`${view.m0 + 1}월 ${d}일${mk ? " (기록 있음)" : ""}`}
                className={`flex h-14 flex-col items-center rounded-lg border p-1 text-sm disabled:opacity-30 sm:h-16 ${isSel ? "border-rose-600 ring-1 ring-rose-600" : ""} ${date === today ? "font-bold text-rose-600" : ""}`}
              >
                <span>{d}</span>
                {mk && (
                  <span className="mt-auto flex items-center gap-0.5 text-[10px] font-normal text-neutral-500">
                    {mk.preview && <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />}
                    {mk.photos > 0 && <span>📷{mk.photos}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="일기 쓰기" className="space-y-3 border-t pt-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{longDate(selected)}{selected === today && " · 오늘"}</h2>
          {day && (day.body || day.photos.length > 0) && <button onClick={removeDay} className="text-xs text-neutral-500 underline">이 날 일기 지우기</button>}
        </div>
        {!day ? (
          <p className="py-6 text-center text-sm text-neutral-400">{err || "불러오는 중…"}</p>
        ) : (
          <>
            <textarea
              value={draft}
              onChange={(e) => { setDraft(e.target.value.slice(0, MAX_CHARS)); setMsg(""); }}
              rows={8}
              placeholder="오늘은 어떤 하루였나요? 시술하면서 배운 점, 손님 반응, 내일의 다짐을 적어보세요."
              className="w-full rounded-lg border px-3 py-2 text-sm leading-relaxed"
            />
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>{[...draft].length}/{MAX_CHARS}자{dirty && " · 저장 안 됨"}</span>
              {msg && <span className="text-emerald-600">{msg}</span>}
            </div>

            {day.photos.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {day.photos.map((p) => (
                  <li key={p.id} className="relative">
                    <a href={p.url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="일기 사진" className="h-28 w-28 rounded-lg object-cover" />
                    </a>
                    <button onClick={() => removePhoto(p)} aria-label="사진 지우기" className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black text-xs text-white">✕</button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <label className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${day.photos.length >= MAX_PHOTOS ? "pointer-events-none opacity-40" : ""}`}>
                📷 사진 추가 ({day.photos.length}/{MAX_PHOTOS})
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={upload} disabled={busy || day.photos.length >= MAX_PHOTOS} />
              </label>
              <span className="text-xs text-neutral-500">장당 5MB · JPG·PNG·WEBP·GIF</span>
              <button onClick={save} disabled={busy || !dirty} className="ml-auto rounded-lg bg-rose-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-40">
                {busy ? "저장 중…" : "저장"}
              </button>
            </div>
            {err && <p role="alert" className="text-sm text-rose-600">{err}</p>}
          </>
        )}
      </section>
    </div>
  );
}
