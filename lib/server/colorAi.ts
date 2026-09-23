// 컬러핏 AI: 실제 업로드 사진(캔버스 픽셀 분석)에서 나온 레벨·언더톤을 받아
// 규칙 기반으로 염모제 배합을 계산한다. 외부 AI API는 쓰지 않는다.
import { db } from "./db";

export type Undertone = "warm" | "cool" | "neutral";

export const TARGET_COLORS = [
  { name: "로즈 브라운", level: 8, tone: "Rose", color: "#a95f5d" },
  { name: "코코아 브라운", level: 7, tone: "Natural", color: "#765047" },
  { name: "애쉬 베이지", level: 9, tone: "Silver", color: "#a69888" },
  { name: "카키 브라운", level: 8, tone: "Matte", color: "#777358" },
  { name: "바이올렛", level: 7, tone: "Violet", color: "#69536f" },
] as const;

export const HISTORY_OPTIONS = ["탈색 1회", "흑염색 이력", "손상모", "새치 30%"] as const;
export const TUBE_CATALOG = ["8-Rose", "9-Silver", "7-Natural", "Clear", "6-Violet", "5-Matte"] as const;

// 톤 계열: cool 계열은 보정(중화) 용도, clear는 희석용, warm/neutral은 커버 용도.
const TONE_GROUP: Record<string, "warm" | "cool" | "neutral" | "clear"> = {
  Rose: "warm",
  Silver: "cool",
  Natural: "neutral",
  Clear: "clear",
  Violet: "cool",
  Matte: "cool",
};

type Tube = { raw: string; level: number; tone: string };

function parseTube(raw: string): Tube | null {
  if (raw === "Clear") return { raw, level: 0, tone: "Clear" };
  const m = /^(\d+)-([A-Za-z]+)$/.exec(raw);
  if (!m) return null;
  return { raw, level: Number(m[1]), tone: m[2] };
}

// 매장에서 실제로 파는 톤별 대표 제품(레벨). 미보유 시 "구매 필요"로 추천할 때 이 제품명을 쓴다.
const CATALOG_BY_TONE: Record<string, Tube> = Object.fromEntries(
  TUBE_CATALOG.map(parseTube)
    .filter((t): t is Tube => !!t && t.tone !== "Clear")
    .map((t) => [t.tone, t]),
);

export type RecommendInput = {
  rootLevel: number;
  midLevel: number;
  endLevel: number;
  undertone: Undertone;
  targetName: string;
  history: string[];
  tubes: string[];
  thickness?: string;
};

export type MixItem = { tube: string; grams: number; owned: boolean };
export type Formula = {
  mix: MixItem[];
  developerPercent: number;
  ratio: string;
  timeMinutes: number;
  order: string;
  matchScore: number;
  notes: string[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function computeRecommendation(input: RecommendInput): Formula {
  const target = TARGET_COLORS.find((c) => c.name === input.targetName) ?? TARGET_COLORS[0];
  const history = input.history.filter((h) => (HISTORY_OPTIONS as readonly string[]).includes(h));
  const ownedRaw = input.tubes.filter((t) => (TUBE_CATALOG as readonly string[]).includes(t));
  const owned = ownedRaw.map(parseTube).filter((t): t is Tube => !!t);

  const currentLevel = Math.round(input.rootLevel * 0.4 + input.midLevel * 0.35 + input.endLevel * 0.25);
  const levelGap = target.level - currentLevel;

  const notes: string[] = [];
  let matchScore = 95;

  // 1) 주 배합(목표 톤 커버) 튜브 고르기: 톤이 맞고 레벨이 가까운 것 우선.
  const toneMatches = owned.filter((t) => t.tone === target.tone);
  let primary: Tube | undefined = toneMatches.sort((a, b) => Math.abs(a.level - target.level) - Math.abs(b.level - target.level))[0];
  let primaryOwned = true;
  if (!primary) {
    primary = owned
      .filter((t) => t.tone !== "Clear")
      .sort((a, b) => Math.abs(a.level - target.level) - Math.abs(b.level - target.level))[0];
    if (primary) {
      matchScore -= 8;
      notes.push(`보유한 배합 중 ${target.tone} 톤이 없어 레벨이 가장 가까운 ${primary.raw}로 대체했어요.`);
    } else {
      primary = CATALOG_BY_TONE[target.tone] ?? { raw: `${target.level}-${target.tone}`, level: target.level, tone: target.tone };
      primaryOwned = false;
      matchScore -= 10;
      notes.push(`${primary.raw}가 보유 목록에 없어요. 구매 후 진행해주세요.`);
    }
  }

  // 2) 보정 튜브: 웜 언더톤(잔류 오렌지/레드)인데 목표가 웜/뉴트럴 계열이면 쿨 톤으로 중화.
  let secondary: Tube | undefined;
  if (input.undertone === "warm" && TONE_GROUP[target.tone] !== "cool") {
    secondary = owned
      .filter((t) => TONE_GROUP[t.tone] === "cool" && t.raw !== primary.raw)
      .sort((a, b) => Math.abs(a.level - target.level) - Math.abs(b.level - target.level))[0];
    if (secondary) {
      notes.push(`잔류 오렌지가 감지되어 ${secondary.raw} 톤을 추가해 중화했어요.`);
    } else {
      matchScore -= 6;
      notes.push("잔류 오렌지가 감지됐지만 중화용 쿨 톤(Silver/Violet/Matte) 보유가 없어 배합에 반영하지 못했어요.");
    }
  }

  // 3) 희석 튜브: 손상모이거나 가는 모발이면 Clear로 강도를 낮춘다.
  const needsDilute = history.includes("손상모") || input.thickness === "가는 모발";
  let diluter: Tube | undefined;
  if (needsDilute) {
    diluter = owned.find((t) => t.tone === "Clear");
    if (diluter) notes.push("손상/가는 모발을 고려해 Clear를 섞어 강도를 낮췄어요.");
  }

  const slots = [primary, secondary, diluter].filter((t): t is Tube => !!t);
  const weightsBySlotCount: Record<number, number[]> = { 1: [120], 2: [80, 40], 3: [60, 30, 30] };
  const weights = weightsBySlotCount[slots.length] ?? [120];
  const mix: MixItem[] = slots.map((t, i) => ({ tube: t.raw, grams: weights[i], owned: t !== primary || primaryOwned }));

  // 산화제: 밝혀야 하는 폭이 클수록 고볼륨. 손상/탈색 이력이 있으면 한 단계 낮춘다.
  const devSteps = [3, 4.5, 6, 9];
  let devIndex = levelGap >= 3 ? 3 : levelGap >= 1 ? 2 : levelGap === 0 ? 1 : 0;
  if (history.includes("손상모") || history.includes("탈색 1회")) devIndex = Math.max(0, devIndex - 1);
  const developerPercent = devSteps[devIndex];
  const ratio = developerPercent <= 4.5 ? "1:1" : "1:1.5";

  // 방치 시간
  let timeMinutes = 30;
  if (history.includes("손상모")) timeMinutes -= 8;
  if (history.includes("탈색 1회")) timeMinutes -= 5;
  if (history.includes("새치 30%")) timeMinutes += 6;
  if (history.includes("흑염색 이력")) timeMinutes += 4;
  timeMinutes = clamp(timeMinutes, 15, 45);

  if (history.includes("손상모")) notes.push(`끝 모발 손상도가 높아 마지막 ${Math.max(5, timeMinutes - 20)}분만 도포하세요.`);
  if (history.includes("흑염색 이력")) notes.push("흑염색 이력이 있어 탈색이 고르지 않을 수 있어요. 스트랜드 테스트를 진행하세요.");
  if (history.includes("새치 30%")) notes.push("새치가 많은 뿌리 부위는 5g을 추가로 밀착 도포하세요.");
  if (history.includes("흑염색 이력")) matchScore -= 5;

  const order = input.endLevel - input.rootLevel >= 2 ? "중간 → 뿌리 순으로 도포 (끝은 처리 시간을 짧게)" : "전체 동시 도포";

  notes.push("AI 추천은 보조 정보이며 실제 모발 상태에 따른 디자이너의 최종 판단이 필요합니다.");

  return { mix, developerPercent, ratio, timeMinutes, order, matchScore: clamp(matchScore, 55, 97), notes };
}

const insertStmt = db.prepare(
  `INSERT INTO color_ai_recommendations (id, user_id, root_level, mid_level, end_level, undertone, target_name, target_level, target_color, history, tubes, formula)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const listStmt = db.prepare(`SELECT * FROM color_ai_recommendations WHERE user_id = ? ORDER BY id DESC LIMIT ?`);

export function saveRecommendation(userId: string, id: string, input: RecommendInput, formula: Formula) {
  const target = TARGET_COLORS.find((c) => c.name === input.targetName) ?? TARGET_COLORS[0];
  insertStmt.run(
    id,
    userId,
    input.rootLevel,
    input.midLevel,
    input.endLevel,
    input.undertone,
    target.name,
    target.level,
    target.color,
    JSON.stringify(input.history),
    JSON.stringify(input.tubes),
    JSON.stringify(formula),
  );
}

export type RecommendationRow = {
  id: string;
  root_level: number;
  mid_level: number;
  end_level: number;
  undertone: string;
  target_name: string;
  target_color: string;
  formula: string;
  created_at: string;
};

export function listRecommendations(userId: string, limit = 5) {
  return listStmt.all(userId, limit) as RecommendationRow[];
}
