"use client";

import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, jsonInit, timeAgo, useMe } from "@/lib/client";
import { DYE_BRANDS, FAMILY_LABEL, TARGET_COLORS, findShade, type DyeShade, type TargetColor, type ToneFamily } from "@/lib/colorTargets";
import ColorQna from "./ColorQna";

const histories = ["탈색 1회", "흑염색 이력", "손상모", "새치 30%"];
const UNDERTONE_LABEL: Record<string, string> = { warm: "웜(잔류 오렌지)", cool: "쿨(애쉬)", neutral: "중성" };

type Analysis = { root: number; mid: number; end: number; undertone: "warm" | "cool" | "neutral" };
type MixItem = { tube: string; grams: number; owned: boolean };
type Formula = { mix: MixItem[]; developerPercent: number; ratio: string; timeMinutes: number; order: string; matchScore: number; notes: string[] };
type HistoryRow = { id: string; targetName: string; targetColor: string; formula: Formula; createdAt: string };

// 사진 픽셀을 실제로 읽어 뿌리/중간/끝 3구간의 밝기(레벨)와 웜/쿨 언더톤을 계산한다.
function analyzeImage(imageUrl: string): Promise<Analysis> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = 60, h = 90;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("이 브라우저에서는 분석할 수 없어요."));
      ctx.drawImage(img, 0, 0, w, h);
      let data: Uint8ClampedArray;
      try {
        data = ctx.getImageData(0, 0, w, h).data;
      } catch {
        return reject(new Error("사진을 분석할 수 없어요."));
      }
      const bandHeight = Math.floor(h / 3);
      const bands = [0, bandHeight, bandHeight * 2].map((startY, i) => {
        const endY = i === 2 ? h : startY + bandHeight;
        let r = 0, g = 0, b = 0, count = 0;
        for (let y = startY; y < endY; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            r += data[idx]; g += data[idx + 1]; b += data[idx + 2];
            count++;
          }
        }
        return { r: r / count, g: g / count, b: b / count };
      });
      const toLevel = ({ r, g, b }: { r: number; g: number; b: number }) => {
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return Math.min(10, Math.max(1, Math.round(1 + (lum / 255) * 9)));
      };
      const [rootBand, midBand, endBand] = bands;
      const avg = { r: (rootBand.r + midBand.r + endBand.r) / 3, g: (rootBand.g + midBand.g + endBand.g) / 3, b: (rootBand.b + midBand.b + endBand.b) / 3 };
      const warmth = (avg.r - avg.b) / 255;
      const undertone = warmth > 0.08 ? "warm" : warmth < -0.02 ? "cool" : "neutral";
      resolve({ root: toLevel(rootBand), mid: toLevel(midBand), end: toLevel(endBand), undertone });
    };
    img.onerror = () => reject(new Error("사진을 불러오지 못했어요."));
    img.src = imageUrl;
  });
}

type PickerShade = DyeShade & { lineName: string };

function ShadeChips({ shades, selected, onToggle }: { shades: PickerShade[]; selected: string[]; onToggle: (id: string) => void }) {
  if (shades.length === 0) return <p className="mt-2 text-xs text-muted">이 라인에는 해당 계열 넘버가 없어요.</p>;
  return (
    <div className="mt-2 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1">
      {shades.map((s) => (
        <button key={s.id} type="button" onClick={() => onToggle(s.id)} title={`${s.lineName} ${s.code}${s.name ? ` · ${s.name}` : ""}`} className={`rounded-lg border px-2 py-1.5 text-left transition ${selected.includes(s.id) ? "border-rose-500 bg-rose-500/15 text-rose-300" : "border-border text-muted hover:text-foreground"}`}>
          <b className="block truncate text-xs font-semibold">{s.code}</b>
          <span className="block truncate text-[10px] opacity-80">{s.name ?? FAMILY_LABEL[s.family]}{s.guessed ? " (추정)" : ""}</span>
        </button>
      ))}
    </div>
  );
}

// 브랜드·라인의 넘버 중 목표 컬러에 맞는 계열만 보여준다. "전체 넘버 보기"를 켜면 계열별로 전부 보여준다.
function TubePicker({ brandId, lineId, target, selected, onToggle, showAll }: { brandId: string; lineId: string; target: TargetColor; selected: string[]; onToggle: (id: string) => void; showAll: boolean }) {
  const shades = useMemo<PickerShade[]>(() => {
    const brand = DYE_BRANDS.find((b) => b.id === brandId) ?? DYE_BRANDS[0];
    return brand.lines
      .filter((l) => lineId === "all" || l.id === lineId)
      .flatMap((l) => l.shades.map((s) => ({ ...s, lineName: l.name })))
      .sort((a, b) => (b.level ?? -1) - (a.level ?? -1));
  }, [brandId, lineId]);
  const main: readonly ToneFamily[] = target.families;
  const supports: readonly ToneFamily[] = target.supports;
  if (showAll) {
    const families = Object.keys(FAMILY_LABEL) as ToneFamily[];
    return (
      <div>
        {families.map((f) => {
          const list = shades.filter((s) => s.family === f);
          if (list.length === 0) return null;
          return (
            <div key={f}>
              <p className="mt-3 text-xs font-bold text-muted">{FAMILY_LABEL[f]} · {list.length}</p>
              <ShadeChips shades={list} selected={selected} onToggle={onToggle} />
            </div>
          );
        })}
      </div>
    );
  }
  const mainList = shades.filter((s) => main.includes(s.family) && !s.guessed);
  const supportList = shades.filter((s) => supports.includes(s.family) && !s.guessed);
  return (
    <div>
      <p className="mt-3 text-xs font-bold text-rose-300">메인 톤 · {main.map((f) => FAMILY_LABEL[f]).join(", ")}</p>
      <ShadeChips shades={mainList} selected={selected} onToggle={onToggle} />
      <p className="mt-4 text-xs font-bold text-muted">보정·베이스용 · {supports.map((f) => FAMILY_LABEL[f]).join(", ")}</p>
      <ShadeChips shades={supportList} selected={selected} onToggle={onToggle} />
    </div>
  );
}

const selectCls = "mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-normal text-foreground";

export default function ColorAiPage() {
  const { me } = useMe();
  const [selectedColor, setSelectedColor] = useState<TargetColor>(TARGET_COLORS[0]);
  const [selectedHistory, setSelectedHistory] = useState<string[]>([]);
  const [brandId, setBrandId] = useState(DYE_BRANDS[0].id);
  const [lineId, setLineId] = useState("all");
  const [showAllShades, setShowAllShades] = useState(false);
  const [selectedTubes, setSelectedTubes] = useState<string[]>([]);
  const brand = DYE_BRANDS.find((b) => b.id === brandId) ?? DYE_BRANDS[0];
  const visibleLines = brand.lines.filter((l) => lineId === "all" || l.id === lineId);
  const [thickness, setThickness] = useState("보통모");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [formula, setFormula] = useState<Formula | null>(null);
  const [message, setMessage] = useState("");
  const [recent, setRecent] = useState<HistoryRow[]>([]);

  const loadRecent = useCallback(async () => {
    const r = await api<{ recommendations: HistoryRow[] }>("/api/color-ai");
    if (r.ok) setRecent(r.data.recommendations);
  }, []);

  useEffect(() => {
    if (me) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadRecent();
    }
  }, [me, loadRecent]);

  const toggle = (value: string, values: string[], setValues: (next: string[]) => void) => {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
    setAnalysis(null);
    setFormula(null);
    setMessage("");
  };

  const runAnalysis = async () => {
    if (!imageUrl) {
      setMessage("먼저 모발 사진을 선택해 주세요.");
      return;
    }
    setAnalyzing(true);
    setMessage("");
    try {
      const result = await analyzeImage(imageUrl);
      setAnalysis(result);
      setFormula(null);
      setMessage("모발 분석이 완료되었습니다.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "분석에 실패했어요.");
    } finally {
      setAnalyzing(false);
    }
  };

  const createRecommendation = async () => {
    if (!analysis) {
      setMessage("먼저 모발 사진을 분석해 주세요.");
      return;
    }
    setRecommending(true);
    setMessage("");
    const r = await api<{ id: string; formula: Formula }>(
      "/api/color-ai",
      jsonInit("POST", {
        rootLevel: analysis.root,
        midLevel: analysis.mid,
        endLevel: analysis.end,
        undertone: analysis.undertone,
        targetName: selectedColor.name,
        history: selectedHistory,
        brandId,
        tubes: selectedTubes,
        thickness,
      }),
    );
    setRecommending(false);
    if (!r.ok) {
      setMessage(r.data.error || "추천에 실패했어요.");
      return;
    }
    setFormula(r.data.formula);
    setMessage("현재 밝기와 잔류 색소를 반영해 배합을 추천했습니다.");
    loadRecent();
  };

  return (
    <div className="px-6 pb-16 pt-7 md:px-10">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">Color Diagnosis</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">컬러핏 AI</h1>
            <p className="mt-1 text-sm text-muted">모발 상태에 맞는 염색 배합을 설계하세요.</p>
          </div>
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-muted">BETA</span>
        </div>
        {me === null ? (
          <p className="mt-2 text-xs text-muted">
            <Link href="/login" className="font-semibold text-rose-400 underline">로그인</Link>하면 추천 기록이 저장돼요. 로그인 없이도 바로 써볼 수 있어요.
          </p>
        ) : null}
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2 md:items-start md:gap-6">
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface-2 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold"><span className="mr-2 text-rose-400">01</span>현재 모발 분석</h2>
              <span className="text-xs text-muted">뿌리부터 끝까지 촬영</span>
            </div>
            <div className="relative mt-4 flex min-h-56 flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30 text-center">
              {imageUrl ? <img src={imageUrl} alt="선택한 모발 사진" className="absolute inset-0 h-full w-full object-cover opacity-75" /> : null}
              <div className="relative z-[1] px-5">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/20 text-2xl">◎</div>
                <p className="mt-3 font-semibold">{imageUrl ? "사진을 확인하고 분석해 주세요" : "모발 사진을 선택해 주세요"}</p>
                <p className="mt-1 text-xs leading-5 text-muted">자연광에서 모발 전체가 보이는 사진이 좋아요.</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <label className="cursor-pointer rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-400">
                    사진 선택
                    <input type="file" accept="image/*" onChange={selectPhoto} className="sr-only" />
                  </label>
                  <button type="button" onClick={runAnalysis} disabled={analyzing || !imageUrl} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-foreground disabled:opacity-50">
                    {analyzing ? "분석 중..." : analysis ? "다시 분석" : "사진 분석"}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["뿌리", "중간", "끝"] as const).map((zone, index) => (
                <div key={zone} className="rounded-lg bg-white/5 px-2 py-2.5">
                  <span className="block text-[11px] text-muted">{zone}</span>
                  <strong className="mt-1 block text-sm">{analysis ? `${[analysis.root, analysis.mid, analysis.end][index]} 레벨` : "분석 대기"}</strong>
                </div>
              ))}
            </div>
            {analysis ? <p className="mt-2 text-center text-[11px] text-muted">언더톤 · {UNDERTONE_LABEL[analysis.undertone]}</p> : null}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold"><span className="mr-2 text-rose-400">02</span>시술 조건</h2>
              <span className="text-xs text-muted">추천에 반영됩니다</span>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between"><h3 className="text-sm font-bold">시술 이력</h3><span className="text-xs text-muted">복수 선택</span></div>
              <div className="mt-2 flex flex-wrap gap-2">
                {histories.map((history) => <button key={history} type="button" onClick={() => toggle(history, selectedHistory, setSelectedHistory)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${selectedHistory.includes(history) ? "border-rose-500 bg-rose-500/15 text-rose-300" : "border-border text-muted hover:text-foreground"}`}>{history}</button>)}
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between"><h3 className="text-sm font-bold">목표 컬러</h3><span className="text-xs text-muted">{selectedColor.level}레벨 {selectedColor.name}</span></div>
              <div className="mt-3 flex flex-wrap gap-3">
                {TARGET_COLORS.map((color) => <button key={color.name} type="button" aria-label={color.name} title={color.name} onClick={() => setSelectedColor(color)} style={{ backgroundColor: color.color }} className={`h-10 w-10 rounded-full ring-offset-2 ring-offset-surface ${selectedColor.name === color.name ? "ring-2 ring-rose-400" : ""}`} />)}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <label className="text-sm font-bold">사용 브랜드<select value={brandId} onChange={(e) => { setBrandId(e.target.value); setLineId("all"); setSelectedTubes([]); }} className={selectCls}>{DYE_BRANDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
              <label className="text-sm font-bold">모발 굵기<select value={thickness} onChange={(e) => setThickness(e.target.value)} className={selectCls}><option>보통모</option><option>가는 모발</option><option>굵은 모발</option></select></label>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between"><h3 className="text-sm font-bold">보유 염모제</h3><span className="text-xs text-muted">{selectedTubes.length}개 선택</span></div>
              <p className="mt-1 text-[11px] leading-4 text-muted">목표 컬러({selectedColor.name})에 맞는 계열의 넘버만 보여줘요. 가지고 있는 넘버를 골라주세요.</p>
              <div className="mt-2 flex items-center gap-2">
                <select value={lineId} onChange={(e) => setLineId(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-foreground">
                  <option value="all">전체 라인</option>
                  {brand.lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted"><input type="checkbox" checked={showAllShades} onChange={(e) => setShowAllShades(e.target.checked)} />전체 넘버 보기</label>
              </div>
              <TubePicker brandId={brandId} lineId={lineId} target={selectedColor} selected={selectedTubes} onToggle={(id) => toggle(id, selectedTubes, setSelectedTubes)} showAll={showAllShades} />
              {selectedTubes.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedTubes.map((id) => {
                    const ref = findShade(id);
                    return <button key={id} type="button" onClick={() => toggle(id, selectedTubes, setSelectedTubes)} className="rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300">{ref ? `${ref.line.name} ${ref.shade.code}` : id} ✕</button>;
                  })}
                </div>
              ) : null}
              <p className="mt-2 text-[10px] leading-4 text-muted">출처: {[...new Set(visibleLines.map((l) => l.source))].join(" · ")}</p>
            </div>

            <button type="button" onClick={createRecommendation} disabled={recommending} className="mt-6 w-full rounded-xl bg-rose-500 py-3.5 font-bold text-white transition hover:bg-rose-400 disabled:opacity-50">{recommending ? "추천 계산 중..." : "AI 배합 추천 받기"}</button>
            {message ? <p className="mt-3 text-center text-xs text-rose-400" role="status">{message}</p> : null}
          </section>
        </div>

        <div className="space-y-4">
          {formula ? (
            <section className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="border-b border-border bg-surface-2 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-300">Recommended Formula</p>
                <div className="mt-1 flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{selectedColor.name} 배합</h2><p className="mt-1 text-xs text-muted">현재 밝기와 잔류 색소를 고려한 120g 기준입니다.</p></div><span className="rounded-full bg-lime-300 px-2 py-1 text-xs font-bold text-neutral-900">적합도 {formula.matchScore}%</span></div>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {formula.mix.map((item, i) => (
                    <span key={item.tube} className="flex items-center gap-2">
                      <div className={`rounded-lg px-4 py-3 text-center ${item.owned ? "bg-white/5 border border-white/10" : "bg-amber-500/15 ring-1 ring-amber-400/50"}`}>
                        <b className="block text-lg">{item.grams}g</b>
                        <span className="text-xs text-muted">{item.tube}{!item.owned ? " (구매 필요)" : ""}</span>
                      </div>
                      {i < formula.mix.length - 1 ? <b className="text-muted">+</b> : null}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border border-b border-border text-center"><div className="p-3"><span className="block text-[11px] text-muted">산화제</span><b className="text-xs">{formula.developerPercent}% · {formula.ratio}</b></div><div className="p-3"><span className="block text-[11px] text-muted">도포 순서</span><b className="text-xs">{formula.order}</b></div><div className="p-3"><span className="block text-[11px] text-muted">방치 시간</span><b className="text-xs">{formula.timeMinutes}분</b></div></div>
              <div className="p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-400">Stylist Check</p><h3 className="mt-1 font-bold">시술 전 확인해 주세요</h3><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-muted">{formula.notes.map((note, i) => <li key={i}>{note}</li>)}</ul></div>
            </section>
          ) : (
            <section className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
              사진 분석 → 시술 조건 선택 후<br />추천을 받으면 여기에 배합이 표시돼요.
            </section>
          )}

          {recent.length > 0 ? (
            <section className="rounded-2xl border border-border bg-surface p-4">
              <h2 className="text-sm font-bold">최근 추천 기록</h2>
              <ul className="mt-3 space-y-2">
                {recent.map((row) => (
                  <li key={row.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: row.targetColor }} />
                      <b className="font-semibold">{row.targetName}</b>
                      <span className="text-muted">적합도 {row.formula.matchScore}%</span>
                    </span>
                    <span className="text-muted">{timeAgo(row.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <ColorQna />
    </div>
  );
}
