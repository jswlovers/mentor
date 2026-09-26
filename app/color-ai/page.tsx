"use client";

import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, jsonInit, timeAgo, useMe } from "@/lib/client";
import { DYE_BRANDS, FAMILY_LABEL, TARGET_COLORS, TARGET_GROUPS, correctionFamilies, findShade, supportFamilies, type DyeShade, type TargetColor, type ToneFamily } from "@/lib/colorTargets";
import { LEVEL_CHART, levelColor, levelFromRgb } from "@/lib/levelChart";
import { TONER_MIN_SHADE_LEVEL, currentLevelOf, isToneDown, isToning, toneDownShadeLevel } from "@/lib/toning";
import ColorQna from "./ColorQna";

const histories = ["탈색 1회", "흑염색 이력", "손상모", "새치 30%"];
const UNDERTONE_LABEL: Record<string, string> = { warm: "웜(잔류 오렌지)", cool: "쿨(애쉬)", neutral: "중성" };

type Analysis = { root: number; mid: number; end: number; undertone: "warm" | "cool" | "neutral" };
type MixItem = { tube: string; grams: number; owned: boolean };
type Formula = { mix: MixItem[]; developerPercent: number; ratio: string; timeMinutes: number; order: string; matchScore: number; notes: string[]; guide?: { title: string; steps: string[] } };
type HistoryRow = { id: string; targetName: string; targetColor: string; formula: Formula; createdAt: string };

type WhitePoint = { x: number; y: number };
type Measured = Analysis & { whiteApplied: boolean; overExposed: boolean };

// 사진 픽셀을 실제로 읽어 뿌리/중간/끝 3구간의 밝기(레벨)와 웜/쿨 언더톤을 계산한다.
// 조명 영향 줄이기: ① 흰색 기준점을 찍으면 그 색이 흰색이 되도록 채널별로 보정(조명 색·밝기)
// ② 가장자리 배경을 빼고 가운데 60%만 보고 ③ 반사광(가장 밝은 25%)과 그림자(가장 어두운 10%)를 빼고 평균낸다.
function analyzeImage(imageUrl: string, white: WhitePoint | null): Promise<Measured> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = 120, h = 180;
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
      const px = (x: number, y: number) => {
        const i = (y * w + x) * 4;
        return [data[i], data[i + 1], data[i + 2]];
      };

      let gain = [1, 1, 1];
      if (white) {
        const cx = Math.round(white.x * (w - 1)), cy = Math.round(white.y * (h - 1));
        const sum = [0, 0, 0];
        let n = 0;
        for (let y = Math.max(0, cy - 3); y <= Math.min(h - 1, cy + 3); y++)
          for (let x = Math.max(0, cx - 3); x <= Math.min(w - 1, cx + 3); x++) {
            const p = px(x, y);
            sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2]; n++;
          }
        const ref = sum.map((v) => v / n);
        if (Math.max(...ref) < 60) return reject(new Error("찍은 흰색 부분이 너무 어두워요. 흰 수건·종이·벽을 다시 찍어주세요."));
        gain = ref.map((v) => Math.min(3, Math.max(0.4, 235 / Math.max(v, 1))));
      }

      const bandHeight = Math.floor(h / 3);
      let clipped = 0, total = 0;
      const bands = [0, bandHeight, bandHeight * 2].map((startY, i) => {
        const endY = i === 2 ? h : startY + bandHeight;
        const list: { r: number; g: number; b: number; l: number }[] = [];
        for (let y = startY; y < endY; y++) {
          for (let x = Math.floor(w * 0.2); x < Math.ceil(w * 0.8); x++) {
            const [r0, g0, b0] = px(x, y);
            if (r0 >= 250 || g0 >= 250 || b0 >= 250) clipped++;
            total++;
            const r = Math.min(255, r0 * gain[0]), g = Math.min(255, g0 * gain[1]), b = Math.min(255, b0 * gain[2]);
            list.push({ r, g, b, l: 0.2126 * r + 0.7152 * g + 0.0722 * b });
          }
        }
        list.sort((p, q) => p.l - q.l);
        const kept = list.slice(Math.floor(list.length * 0.1), Math.max(Math.floor(list.length * 0.1) + 1, Math.floor(list.length * 0.75)));
        const avg = kept.reduce((acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }), { r: 0, g: 0, b: 0 });
        return { r: avg.r / kept.length, g: avg.g / kept.length, b: avg.b / kept.length };
      });
      // 밝기를 명도 차트(1~20레벨)의 모발 색과 비교해 레벨을 정한다.
      const toLevel = ({ r, g, b }: { r: number; g: number; b: number }) => levelFromRgb(r, g, b);
      const [rootBand, midBand, endBand] = bands;
      const avg = { r: (rootBand.r + midBand.r + endBand.r) / 3, g: (rootBand.g + midBand.g + endBand.g) / 3, b: (rootBand.b + midBand.b + endBand.b) / 3 };
      const warmth = (avg.r - avg.b) / 255;
      const undertone = warmth > 0.08 ? "warm" : warmth < -0.02 ? "cool" : "neutral";
      resolve({ root: toLevel(rootBand), mid: toLevel(midBand), end: toLevel(endBand), undertone, whiteApplied: !!white, overExposed: clipped / total > 0.15 });
    };
    img.onerror = () => reject(new Error("사진을 불러오지 못했어요."));
    img.src = imageUrl;
  });
}

// 매장 조명 보정값(레벨). 같은 조명에서 찍은 사진에 계속 적용되도록 이 기기에 저장한다.
const LIGHT_KEY = "colorfit.lightOffset";
function readLightOffset(): number {
  if (typeof window === "undefined") return 0;
  try {
    const v = Number(window.localStorage.getItem(LIGHT_KEY));
    return Number.isFinite(v) ? Math.max(-6, Math.min(6, Math.round(v))) : 0;
  } catch {
    return 0;
  }
}
function writeLightOffset(v: number) {
  try {
    if (v === 0) window.localStorage.removeItem(LIGHT_KEY);
    else window.localStorage.setItem(LIGHT_KEY, String(v));
  } catch {
    // 저장이 막힌 브라우저에서는 이번 화면에서만 적용된다.
  }
}
const clampLevel = (n: number) => Math.max(1, Math.min(20, n));

type PickerShade = DyeShade & { lineName: string };

function ShadeChips({ shades, selected, onToggle }: { shades: PickerShade[]; selected: string[]; onToggle: (id: string) => void }) {
  if (shades.length === 0) return <p className="mt-2 text-xs text-muted">이 레벨·계열에 맞는 넘버가 없어요.</p>;
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

// 명도 차트(1~20레벨). onSelect가 있으면 레벨을 고를 수 있고, markers 레벨은 흰 테두리로 표시한다.
function LevelBar({ selected, markers = [], onSelect }: { selected?: number; markers?: number[]; onSelect?: (level: number) => void }) {
  return (
    <div className="mt-3">
      <div className="flex gap-0.5">
        {LEVEL_CHART.map((c) => {
          const cls = `h-8 min-w-0 flex-1 rounded-sm ${selected === c.level ? "ring-2 ring-rose-400 ring-offset-1 ring-offset-surface" : markers.includes(c.level) ? "ring-2 ring-white/80" : ""}`;
          return onSelect ? (
            <button key={c.level} type="button" aria-label={`${c.level}레벨`} title={`${c.level}레벨`} onClick={() => onSelect(c.level)} style={{ backgroundColor: c.color }} className={cls} />
          ) : (
            <span key={c.level} title={`${c.level}레벨`} style={{ backgroundColor: c.color }} className={cls} />
          );
        })}
      </div>
      <div className="mt-1 flex gap-0.5 text-center text-[9px] text-muted">
        {LEVEL_CHART.map((c) => <span key={c.level} className={`min-w-0 flex-1 ${selected === c.level ? "font-bold text-rose-300" : ""}`}>{c.level}</span>)}
      </div>
    </div>
  );
}

// 목표 레벨 근처만 보여준다: 메인 톤은 ±1, 보정·베이스는 ±2. 레벨이 없는 넘버(컨트롤러 등)와 클리어는 항상 보인다.
const nearLevel = (s: DyeShade, level: number, range: number) => s.level === null || s.family === "clear" || Math.abs(s.level - level) <= range;

// 브랜드·라인의 넘버 중 목표 컬러 계열과 목표 레벨에 맞는 것만 보여준다. "전체 넘버 보기"를 켜면 계열별로 전부 보여준다.
function TubePicker({ brandId, lineId, target, targetLevel, currentLevel, selected, onToggle, showAll }: { brandId: string; lineId: string; target: TargetColor; targetLevel: number; currentLevel?: number; selected: string[]; onToggle: (id: string) => void; showAll: boolean }) {
  const shades = useMemo<PickerShade[]>(() => {
    const brand = DYE_BRANDS.find((b) => b.id === brandId) ?? DYE_BRANDS[0];
    return brand.lines
      .filter((l) => lineId === "all" || l.id === lineId)
      .flatMap((l) => l.shades.map((s) => ({ ...s, lineName: l.name })))
      .sort((a, b) => (b.level ?? -1) - (a.level ?? -1));
  }, [brandId, lineId]);
  const main: readonly ToneFamily[] = target.families;
  const supports = supportFamilies(target, targetLevel, currentLevel);
  const correctors = correctionFamilies(target, targetLevel, currentLevel);
  // 크게 톤다운하면 넘버는 목표보다 1레벨 어둡게 고르므로 그 레벨을 중심으로 보여준다.
  const toneDown = isToneDown(targetLevel, currentLevel);
  const center = toneDown ? toneDownShadeLevel(targetLevel) : targetLevel;
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
  // 14레벨 이상은 해당 명도의 넘버가 없어, 탈색 후 고명도 넘버(11레벨 이상)를 클리어로 희석해 토닝한다.
  const toning = isToning(targetLevel);
  const tonerLevel = (s: DyeShade) => s.level === null || s.level >= TONER_MIN_SHADE_LEVEL;
  const mainList = shades.filter((s) => main.includes(s.family) && !s.guessed && (toning ? tonerLevel(s) : nearLevel(s, center, 1)));
  const supportList = shades.filter((s) => supports.includes(s.family) && !s.guessed && (toning ? tonerLevel(s) : nearLevel(s, targetLevel, 2)));
  return (
    <div>
      {toneDown && currentLevel !== undefined ? <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] leading-4 text-amber-200">{currentLevel}레벨 → {targetLevel}레벨 톤다운이에요. 목표 넘버만으로는 명도가 안 나와서, {center}레벨(한 단계 어둡게) 넘버와 조정색(레드·오렌지·골드 계열)을 함께 골라주세요.</p> : null}
      {toning ? <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] leading-4 text-amber-200">{targetLevel}레벨은 염모제로 낼 수 없는 명도예요. 탈색 후 아래 고명도 넘버를 클리어로 희석해 토닝해요.</p> : null}
      <p className="mt-3 text-xs font-bold text-rose-300">{toning ? `토닝용 · ${main.map((f) => FAMILY_LABEL[f]).join(", ")} · 고명도 ${TONER_MIN_SHADE_LEVEL}레벨 이상` : `메인 톤 · ${main.map((f) => FAMILY_LABEL[f]).join(", ")} · ${center}±1레벨`}</p>
      <ShadeChips shades={mainList} selected={selected} onToggle={onToggle} />
      <p className="mt-4 text-xs font-bold text-muted">{toning ? `보정·희석용 · ${supports.map((f) => FAMILY_LABEL[f]).join(", ")}` : `${toneDown ? "조정색·베이스용" : "보정·베이스용"} · ${supports.map((f) => FAMILY_LABEL[f]).join(", ")} · ${targetLevel}±2레벨`}</p>
      {correctors.length ? <p className="mt-1 text-[10px] leading-4 text-muted">보색 중화: {targetLevel}레벨에서 드러나는 잔류 색소를 지우는 {correctors.map((f) => FAMILY_LABEL[f]).join(", ")} 계열을 포함했어요.</p> : null}
      <ShadeChips shades={supportList} selected={selected} onToggle={onToggle} />
    </div>
  );
}

const selectCls = "mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-normal text-foreground";

export default function ColorAiPage() {
  const { me } = useMe();
  const [selectedColor, setSelectedColor] = useState<TargetColor>(TARGET_COLORS[0]);
  const [targetLevel, setTargetLevel] = useState<number>(TARGET_COLORS[0].level);
  const [selectedHistory, setSelectedHistory] = useState<string[]>([]);
  const [brandId, setBrandId] = useState(DYE_BRANDS[0].id);
  const [lineId, setLineId] = useState("all");
  const [showAllShades, setShowAllShades] = useState(false);
  const [selectedTubes, setSelectedTubes] = useState<string[]>([]);
  const brand = DYE_BRANDS.find((b) => b.id === brandId) ?? DYE_BRANDS[0];
  const visibleLines = brand.lines.filter((l) => lineId === "all" || l.id === lineId);
  const [thickness, setThickness] = useState("보통모");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [adjust, setAdjust] = useState<[number, number, number]>([0, 0, 0]);
  const [lightOffset, setLightOffset] = useState<number>(readLightOffset);
  const [whitePoint, setWhitePoint] = useState<WhitePoint | null>(null);
  const [pickingWhite, setPickingWhite] = useState(false);
  // 추천·차트·필터에 쓰는 레벨 = 사진 측정값 + 매장 조명 보정 + 부위별 수동 보정.
  const analysis = useMemo<Analysis | null>(
    () =>
      measured
        ? {
            root: clampLevel(measured.root + lightOffset + adjust[0]),
            mid: clampLevel(measured.mid + lightOffset + adjust[1]),
            end: clampLevel(measured.end + lightOffset + adjust[2]),
            undertone: measured.undertone,
          }
        : null,
    [measured, lightOffset, adjust],
  );
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
    setMeasured(null);
    setAdjust([0, 0, 0]);
    setWhitePoint(null);
    setPickingWhite(false);
    setFormula(null);
    setMessage("");
  };

  const runAnalysis = async (white: WhitePoint | null = whitePoint) => {
    if (!imageUrl) {
      setMessage("먼저 모발 사진을 선택해 주세요.");
      return;
    }
    setAnalyzing(true);
    setMessage("");
    try {
      const result = await analyzeImage(imageUrl, white);
      setMeasured(result);
      setAdjust([0, 0, 0]);
      setFormula(null);
      setMessage(
        result.overExposed
          ? "조명이 강해 하얗게 날아간 부분이 많아요. 조명을 줄이거나 흰색 기준을 찍고, 레벨을 −/+로 확인해 주세요."
          : "모발 분석이 완료되었습니다. 실제와 다르면 레벨을 −/+로 맞춰 주세요.",
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "분석에 실패했어요.");
    } finally {
      setAnalyzing(false);
    }
  };

  // 흰색 기준 찍기: 사진은 object-contain으로 보여주므로 실제 사진 영역 안의 위치(0~1)로 바꾼다.
  const pickWhite = (event: React.MouseEvent<HTMLImageElement>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const scale = Math.min(rect.width / el.naturalWidth, rect.height / el.naturalHeight);
    const dw = el.naturalWidth * scale, dh = el.naturalHeight * scale;
    const x = (event.clientX - rect.left - (rect.width - dw) / 2) / dw;
    const y = (event.clientY - rect.top - (rect.height - dh) / 2) / dh;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    const point = { x, y };
    setWhitePoint(point);
    setPickingWhite(false);
    runAnalysis(point);
  };

  const nudge = (index: number, delta: number) => {
    setAdjust((prev) => prev.map((v, i) => (i === index ? v + delta : v)) as [number, number, number]);
    setFormula(null);
  };

  // 지금 맞춘 부위별 보정의 평균을 매장 조명 보정값으로 저장한다(다음 사진부터 자동 적용).
  const rememberLighting = () => {
    const shift = Math.round((adjust[0] + adjust[1] + adjust[2]) / 3);
    const next = Math.max(-6, Math.min(6, lightOffset + shift));
    setLightOffset(next);
    writeLightOffset(next);
    setAdjust((prev) => prev.map((v) => v - shift) as [number, number, number]);
    setMessage(`이 조명 보정(${next > 0 ? "+" : ""}${next}레벨)을 저장했어요. 같은 조명에서 찍은 사진에 자동으로 적용돼요.`);
  };

  const resetLighting = () => {
    setLightOffset(0);
    writeLightOffset(0);
    setMessage("조명 보정을 초기화했어요.");
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
        targetLevel,
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
              {imageUrl && pickingWhite ? (
                <>
                  <img src={imageUrl} alt="흰색 기준을 찍을 사진" onClick={pickWhite} className="absolute inset-0 z-[2] h-full w-full cursor-crosshair object-contain" />
                  <p className="pointer-events-none absolute left-2 right-2 top-2 z-[3] rounded-lg bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white">사진 속 흰 수건·종이·벽을 눌러주세요</p>
                </>
              ) : imageUrl ? (
                <img src={imageUrl} alt="선택한 모발 사진" className="absolute inset-0 h-full w-full object-cover opacity-75" />
              ) : null}
              <div className={`relative z-[1] px-5 ${pickingWhite ? "invisible" : ""}`}>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/20 text-2xl">◎</div>
                <p className="mt-3 font-semibold">{imageUrl ? "사진을 확인하고 분석해 주세요" : "모발 사진을 선택해 주세요"}</p>
                <p className="mt-1 text-xs leading-5 text-muted">자연광에서 모발 전체가 보이게, 흰 수건이나 종이를 함께 찍으면 조명 보정이 정확해져요.</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <label className="cursor-pointer rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-400">
                    사진 선택
                    <input type="file" accept="image/*" onChange={selectPhoto} className="sr-only" />
                  </label>
                  <button type="button" onClick={() => runAnalysis()} disabled={analyzing || !imageUrl} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-foreground disabled:opacity-50">
                    {analyzing ? "분석 중..." : analysis ? "다시 분석" : "사진 분석"}
                  </button>
                </div>
              </div>
            </div>
            {imageUrl ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <button type="button" onClick={() => setPickingWhite((v) => !v)} className="rounded-full border border-border px-2.5 py-1 font-semibold text-muted hover:text-foreground">
                  {pickingWhite ? "흰색 찍기 취소" : whitePoint ? "흰색 기준 다시 찍기" : "흰색 기준 찍기 (조명 보정)"}
                </button>
                {whitePoint ? (
                  <button type="button" onClick={() => { setWhitePoint(null); runAnalysis(null); }} className="rounded-full border border-border px-2.5 py-1 text-muted hover:text-foreground">흰색 기준 해제</button>
                ) : null}
                {measured?.whiteApplied ? <span className="text-emerald-300">흰색 기준 보정 적용됨</span> : null}
              </div>
            ) : null}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["뿌리", "중간", "끝"] as const).map((zone, index) => (
                <div key={zone} className="rounded-lg bg-white/5 px-2 py-2.5">
                  <span className="flex items-center justify-between text-[11px] text-muted">
                    {zone}
                    {measured ? (
                      <span className="flex gap-1">
                        <button type="button" aria-label={`${zone} 레벨 낮추기`} onClick={() => nudge(index, -1)} className="h-5 w-5 rounded bg-white/10 text-xs leading-5 text-foreground">−</button>
                        <button type="button" aria-label={`${zone} 레벨 높이기`} onClick={() => nudge(index, 1)} className="h-5 w-5 rounded bg-white/10 text-xs leading-5 text-foreground">+</button>
                      </span>
                    ) : null}
                  </span>
                  <strong className="mt-1 flex items-center gap-1.5 text-sm">
                    {analysis ? <span className="h-3 w-3 shrink-0 rounded-sm ring-1 ring-white/20" style={{ backgroundColor: levelColor([analysis.root, analysis.mid, analysis.end][index]) }} /> : null}
                    {analysis ? `${[analysis.root, analysis.mid, analysis.end][index]} 레벨` : "분석 대기"}
                  </strong>
                </div>
              ))}
            </div>
            {measured ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                <span>조명 보정 {lightOffset > 0 ? "+" : ""}{lightOffset}레벨{adjust.some((v) => v !== 0) ? ` · 수동 ${adjust.map((v) => (v > 0 ? `+${v}` : v)).join("/")}` : ""}</span>
                {adjust.some((v) => v !== 0) ? <button type="button" onClick={rememberLighting} className="rounded-full bg-rose-500/15 px-2.5 py-1 font-semibold text-rose-300">이 조명 기억하기</button> : null}
                {lightOffset !== 0 ? <button type="button" onClick={resetLighting} className="rounded-full border border-border px-2.5 py-1 hover:text-foreground">조명 보정 초기화</button> : null}
              </div>
            ) : null}
            <p className="mt-3 text-[11px] text-muted">명도 차트 (밀본 올디브 레벨 스케일 기준){analysis ? " · 흰 테두리가 현재 모발 레벨" : ""}</p>
            <LevelBar markers={analysis ? [analysis.root, analysis.mid, analysis.end] : []} />
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
              <div className="flex items-center justify-between"><h3 className="text-sm font-bold">목표 컬러</h3><span className="text-xs text-muted">{selectedColor.name}</span></div>
              <div className="mt-2 space-y-2">
                {TARGET_GROUPS.map((group) => (
                  <div key={group}>
                    <p className="text-[10px] font-bold text-muted">{group}</p>
                    <div className="mt-1 flex flex-wrap gap-x-1 gap-y-1.5">
                      {TARGET_COLORS.filter((c) => c.group === group).map((color) => (
                        <button key={color.name} type="button" onClick={() => setSelectedColor(color)} className="flex w-11 flex-col items-center gap-0.5">
                          <span style={{ backgroundColor: color.color }} className={`h-7 w-7 rounded-full ring-1 ring-white/15 ring-offset-1 ring-offset-surface ${selectedColor.name === color.name ? "ring-2 ring-rose-400" : ""}`} />
                          <span className={`text-center text-[9px] leading-[11px] tracking-tight ${selectedColor.name === color.name ? "font-bold text-rose-300" : "text-muted"}`}>{color.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between"><h3 className="text-sm font-bold">목표 레벨</h3><span className="text-xs text-muted">{targetLevel}레벨 · 칸을 눌러 선택</span></div>
              <LevelBar selected={targetLevel} markers={analysis ? [analysis.root, analysis.mid, analysis.end] : []} onSelect={setTargetLevel} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <label className="text-sm font-bold">사용 브랜드<select value={brandId} onChange={(e) => { setBrandId(e.target.value); setLineId("all"); setSelectedTubes([]); }} className={selectCls}>{DYE_BRANDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
              <label className="text-sm font-bold">모발 굵기<select value={thickness} onChange={(e) => setThickness(e.target.value)} className={selectCls}><option>보통모</option><option>가는 모발</option><option>굵은 모발</option></select></label>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between"><h3 className="text-sm font-bold">보유 염모제</h3><span className="text-xs text-muted">{selectedTubes.length}개 선택</span></div>
              <p className="mt-1 text-[11px] leading-4 text-muted">목표 컬러({selectedColor.name})와 목표 레벨({targetLevel}레벨)에 맞는 넘버만 보여줘요. 가지고 있는 넘버를 골라주세요.</p>
              <div className="mt-2 flex items-center gap-2">
                <select value={lineId} onChange={(e) => setLineId(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-foreground">
                  <option value="all">전체 라인</option>
                  {brand.lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted"><input type="checkbox" checked={showAllShades} onChange={(e) => setShowAllShades(e.target.checked)} />전체 넘버 보기</label>
              </div>
              <TubePicker brandId={brandId} lineId={lineId} target={selectedColor} targetLevel={targetLevel} currentLevel={analysis ? currentLevelOf(analysis.root, analysis.mid, analysis.end) : undefined} selected={selectedTubes} onToggle={(id) => toggle(id, selectedTubes, setSelectedTubes)} showAll={showAllShades} />
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
                <div className="mt-1 flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{targetLevel}레벨 {selectedColor.name} 배합</h2><p className="mt-1 text-xs text-muted">현재 밝기와 잔류 색소를 고려한 120g 기준입니다.</p></div><span className="rounded-full bg-lime-300 px-2 py-1 text-xs font-bold text-neutral-900">적합도 {formula.matchScore}%</span></div>
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
              {formula.guide ? (
                <div className="border-b border-border p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Procedure Guide</p>
                  <h3 className="mt-1 font-bold">{formula.guide.title}</h3>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-5 text-muted">{formula.guide.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
                </div>
              ) : null}
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
