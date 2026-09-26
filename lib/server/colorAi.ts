// 컬러핏 AI: 실제 업로드 사진(캔버스 픽셀 분석)에서 나온 레벨·언더톤을 받아
// 규칙 기반으로 염모제 배합을 계산한다. 외부 AI API는 쓰지 않는다.
// 염모제는 브랜드별 카탈로그(lib/dyeCatalog.ts)의 넘버 id로 받는다.
import { db } from "./db";
import { harmonyNotes } from "../colorHarmony";
import { HUE_LABEL, complement, underlyingPigment } from "../colorWheel";
import {
  BLEACH_LEVEL,
  BRAND_TONING,
  TONER_MIN_SHADE_LEVEL,
  clearRatio,
  currentLevelOf,
  fillerFamilies,
  fillerGrams,
  isToneDown,
  isToning,
  toneDownShadeLevel,
} from "../toning";
import {
  DYE_BRANDS,
  FAMILY_LABEL,
  TARGET_COLORS,
  byLevelDistance,
  correctionFamilies,
  findBrand,
  findShade,
  findTarget,
  shadeLabel,
  type ShadeRef,
  type ToneFamily,
} from "../colorTargets";

export { TARGET_COLORS };

export type Undertone = "warm" | "cool" | "neutral";

export const HISTORY_OPTIONS = ["탈색 1회", "흑염색 이력", "손상모", "새치 30%"] as const;

export type RecommendInput = {
  rootLevel: number;
  midLevel: number;
  endLevel: number;
  undertone: Undertone;
  targetName: string;
  targetLevel?: number;
  history: string[];
  brandId?: string;
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
  // 탈색모 토닝(14레벨 이상)·크게 톤다운할 때 단계별 시술 방법.
  guide?: { title: string; steps: string[] };
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function nearest(refs: ShadeRef[], level: number): ShadeRef | undefined {
  const cmp = byLevelDistance(level);
  return [...refs].sort((a, b) => cmp(a.shade, b.shade))[0];
}

// 계열 순서를 우선한다: 앞 계열(예: 와인 레드의 레드)에 목표 레벨 ±2 안의 넘버가 있으면 그것을, 없으면 전체에서 레벨이 가장 가까운 것.
function nearestByFamily(refs: ShadeRef[], families: readonly ToneFamily[], level: number): ShadeRef | undefined {
  for (const f of families) {
    const hit = nearest(refs.filter((r) => r.shade.family === f), level);
    if (hit && (hit.shade.level === null || Math.abs(hit.shade.level - level) <= 2)) return hit;
  }
  return nearest(refs.filter((r) => families.includes(r.shade.family)), level);
}

const familyNames = (fs: readonly ToneFamily[]) => fs.map((f) => FAMILY_LABEL[f]).join("/");

export function computeRecommendation(input: RecommendInput): Formula {
  const target = findTarget(input.targetName) ?? TARGET_COLORS[0];
  const history = input.history.filter((h) => (HISTORY_OPTIONS as readonly string[]).includes(h));
  const owned = input.tubes.map(findShade).filter((r): r is ShadeRef => !!r);
  const brand = input.brandId ? findBrand(input.brandId) : owned[0]?.brand;
  const mainFamilies: readonly ToneFamily[] = target.families;

  const currentLevel = currentLevelOf(input.rootLevel, input.midLevel, input.endLevel);
  // 목표 레벨은 화면에서 명도 차트로 고른 값. 없으면 목표 컬러의 기본 레벨.
  const targetLevel = input.targetLevel ?? target.level;
  const levelGap = targetLevel - currentLevel;
  // 14레벨 이상은 염모제 넘버가 없어 탈색 후 고명도 넘버를 클리어로 희석해 토닝한다.
  const toning = isToning(targetLevel);
  const usable = (r: ShadeRef) => !toning || r.shade.level === null || r.shade.level >= TONER_MIN_SHADE_LEVEL;
  // 3레벨 이상 톤다운: 조정색을 넣고, 넘버는 목표보다 1레벨 어둡게 고른다.
  const toneDown = isToneDown(targetLevel, currentLevel);
  const drop = currentLevel - targetLevel;
  const shadeLevel = toneDown ? toneDownShadeLevel(targetLevel) : targetLevel;
  // 희석용은 이름이 클리어인 제품을 먼저 쓴다. 라이트너는 밝히는 제품이라 희석용으로 뒤로 보낸다.
  const clearRank = (r: ShadeRef) => (/라이트너|lightner/i.test(`${r.shade.code} ${r.shade.name ?? ""}`) ? 0 : /클리어|clear|CL/i.test(`${r.shade.code} ${r.shade.name ?? ""}`) ? 2 : 1);
  const byClear = (a: ShadeRef, b: ShadeRef) => clearRank(b) - clearRank(a) || (b.shade.level ?? 0) - (a.shade.level ?? 0);

  const notes: string[] = [];
  let matchScore = 95;

  // 염모제 리프트는 보통 3~4레벨이 한계라, 그 이상 밝히거나 13레벨 이상으로 올리면 탈색을 먼저 안내한다.
  if (toning) {
    notes.push(
      levelGap > 0
        ? `${targetLevel}레벨은 염모제로 올릴 수 없는 명도예요. 먼저 ${targetLevel + 1}레벨 정도까지 탈색한 뒤 토닝하세요.`
        : `이미 ${currentLevel}레벨까지 밝혀진 모발이라 탈색 없이 바로 토닝할 수 있어요.`,
    );
  } else if (levelGap >= 4 || (targetLevel >= BLEACH_LEVEL && levelGap > 0)) {
    matchScore -= 8;
    notes.push(`현재 ${currentLevel}레벨에서 목표 ${targetLevel}레벨까지 ${levelGap}레벨을 올려야 해요. 염모제만으로는 어려워 탈색 후 진행을 권장해요.`);
  } else if (toneDown) {
    notes.push(`${currentLevel}레벨에서 ${targetLevel}레벨로 ${drop}레벨 톤다운이에요. 목표 넘버만 바르면 ${targetLevel}레벨이 나오지 않아, 빠진 색소를 채우는 조정색을 판단하고 넘버를 ${shadeLevel}레벨로 한 단계 낮춰 계산했어요.`);
  }

  // 1) 주 배합(목표 톤): 목표 계열 중 레벨이 가장 가까운 보유 넘버. 없으면 같은 브랜드에서 구매할 넘버를 제안.
  let primary = nearestByFamily(owned.filter(usable), mainFamilies, shadeLevel);
  let primaryOwned = true;
  if (!primary) {
    primaryOwned = false;
    matchScore -= 10;
    const candidates: ShadeRef[] = (brand?.lines ?? []).flatMap((line) =>
      line.shades.filter((sh) => mainFamilies.includes(sh.family) && !sh.guessed).map((shade) => ({ brand: brand!, line, shade })),
    ).filter(usable);
    primary = nearestByFamily(candidates, mainFamilies, shadeLevel);
    notes.push(
      primary
        ? `보유 염모제 중 ${familyNames(mainFamilies)} 계열이 없어요. ${shadeLabel(primary)} 구매 후 진행해주세요.`
        : `선택한 브랜드에 ${familyNames(mainFamilies)} 계열 넘버가 없어요. 다른 브랜드를 선택해주세요.`,
    );
  } else if (!toning && primary.shade.level !== null && Math.abs(primary.shade.level - shadeLevel) >= 2) {
    matchScore -= 6;
    notes.push(`${toneDown ? "보정한 " : "목표 "}${shadeLevel}레벨과 보유 넘버(${primary.shade.code}) 레벨 차이가 커서 발색이 달라질 수 있어요.`);
  }

  // 2) 보정(보색 원리): 목표 레벨에서 드러나는 잔류 색소를 색상환의 보색 계열로 지운다.
  //    밝히면 목표 레벨의 잔류 색소가, 어둡게·같은 레벨이면 지금 모발의 잔류 색소가 결과에 남는다.
  let secondary: ShadeRef | undefined;
  let secondaryOwned = true;
  const exposedLevel = levelGap > 0 ? targetLevel : currentLevel;
  const pigment = underlyingPigment(exposedLevel);
  const pigmentName = HUE_LABEL[pigment];
  const compName = HUE_LABEL[complement(pigment)];
  const correctors = correctionFamilies(target, exposedLevel);
  const fillers = fillerFamilies(targetLevel);
  const fillerName = HUE_LABEL[underlyingPigment(targetLevel)];
  if (toneDown) {
    // 톤다운: 밝혀진 모발에 빠져 있는 목표 레벨의 난색 색소를 조정색으로 채운다(보색 중화는 하지 않는다).
    if (fillers.some((f) => mainFamilies.includes(f))) {
      notes.push(`목표 톤(${target.name}) 자체가 ${targetLevel}레벨의 ${fillerName} 색소를 채워줘서 조정색을 따로 넣지 않았어요.`);
    } else {
      secondary = nearestByFamily(owned.filter((r) => r !== primary), fillers, targetLevel);
      if (!secondary && brand) {
        secondaryOwned = false;
        const pool: ShadeRef[] = brand.lines.flatMap((line) => line.shades.filter((sh) => fillers.includes(sh.family) && !sh.guessed).map((shade) => ({ brand, line, shade })));
        secondary = nearestByFamily(pool, fillers, targetLevel);
      }
      notes.push(
        secondary
          ? `조정색: ${targetLevel}레벨 자연모에 있는 ${fillerName} 색소가 빠져 있어 ${shadeLabel(secondary)}${secondaryOwned ? "" : "(구매 필요)"}로 채웠어요. 없으면 그린·그레이 기가 돌고 빨리 빠져요.`
          : `조정색으로 쓸 ${familyNames(fillers)} 계열 넘버가 없어요. ${fillerName} 계열을 25~30% 섞어주세요.`,
      );
    }
  } else if (target.warm) {
    // 난색 목표: 잔류 색소(레드~옐로우)가 같은 난색이라 발색을 도와준다. 쿨 잔류(애쉬)는 반대로 난색을 탁하게 만든다.
    if (levelGap > 0) notes.push(`${targetLevel}레벨에서 드러나는 ${pigmentName} 잔류 색소는 목표(${target.name})와 같은 난색이라 따로 중화하지 않았어요.`);
    if (input.undertone === "cool") {
      matchScore -= 4;
      notes.push(`모발에 애쉬(쿨) 잔류가 보여요. 쿨 톤은 난색의 보색 쪽이라 발색을 탁하게 만들 수 있으니 방치 시간을 충분히 두세요.`);
    }
  } else if (target.hue && correctors.some((f) => (target.families as readonly ToneFamily[]).includes(f))) {
    // 목표 색 자체가 잔류 색소의 보색이면(예: 옐로우 잔류 + 바이올렛 목표) 메인 톤이 중화까지 해준다.
    notes.push(`${pigmentName} 잔류 색소의 보색이 목표 톤(${target.name})이라, 메인 배합이 중화까지 해줘요.`);
  } else if (input.undertone === "cool" && levelGap <= 0) {
    notes.push(`이미 쿨 톤이 보이고 밝히지 않는 시술이라 보색 보정은 넣지 않았어요.`);
  } else {
    secondary = nearest(owned.filter((r) => correctors.includes(r.shade.family) && r !== primary), targetLevel);
    if (secondary) {
      notes.push(`보색 중화: ${exposedLevel}레벨에서 드러나는 ${pigmentName} 잔류 색소를 보색인 ${compName} 계열 ${shadeLabel(secondary)}로 지웠어요.`);
    } else {
      matchScore -= 6;
      notes.push(`${pigmentName} 잔류 색소를 지울 보색(${compName}) 계열 ${familyNames(correctors)} 넘버가 보유 목록에 없어요. 있으면 20~30% 섞어주세요.`);
    }
  }

  // 3) 희석: 손상모이거나 가는 모발이면 클리어로 강도를 낮춘다.
  const needsDilute = history.includes("손상모") || input.thickness === "가는 모발";
  let diluter: ShadeRef | undefined;
  let diluterOwned = true;
  if (toning && !primary) {
    // 이 브랜드에 목표 계열 고명도 넘버가 없으면 클리어만 남는 배합을 만들지 않고, 넘버가 있는 브랜드를 안내한다.
    const others = DYE_BRANDS.filter((b) =>
      b.lines.some((l) => l.shades.some((sh) => mainFamilies.includes(sh.family) && !sh.guessed && (sh.level === null || sh.level >= TONER_MIN_SHADE_LEVEL))),
    ).map((b) => b.name);
    notes.push(`토닝용 ${familyNames(mainFamilies)} 고명도 넘버(${TONER_MIN_SHADE_LEVEL}레벨 이상)가 있는 브랜드: ${others.join(", ") || "없음"}`);
  } else if (toning) {
    // 토닝은 클리어 희석이 기본. 보유 클리어가 없으면 같은 브랜드 클리어를 구매 목록으로 제안한다.
    diluter = owned.filter((r) => r.shade.family === "clear").sort(byClear)[0];
    if (!diluter && brand) {
      diluterOwned = false;
      diluter = brand.lines
        .flatMap((line) => line.shades.filter((sh) => sh.family === "clear").map((shade) => ({ brand, line, shade })))
        .sort(byClear)[0];
    }
  } else if (needsDilute) {
    diluter = owned.find((r) => r.shade.family === "clear");
    if (diluter) notes.push(`손상/가는 모발을 고려해 ${shadeLabel(diluter)}를 섞어 강도를 낮췄어요.`);
  }

  const slots = [primary, secondary, diluter].filter((t): t is ShadeRef => !!t);
  const weightsBySlotCount: Record<number, number[]> = { 1: [120], 2: [80, 40], 3: [60, 30, 30] };
  let weights = weightsBySlotCount[slots.length] ?? [120];
  const [tonerPart, clearPart] = clearRatio(targetLevel, primary?.shade.level ?? null);
  if (toning) {
    // 토닝: 보색 보정은 10% 정도만, 나머지를 토너:클리어 비율로 나눈다(5g 단위).
    const corrector = secondary ? 10 : 0;
    const rest = 120 - corrector;
    const toner = diluter ? Math.round((rest * tonerPart) / (tonerPart + clearPart) / 5) * 5 : rest;
    weights = slots.map((t) => (t === primary ? toner : t === secondary ? corrector : rest - toner));
  } else if (toneDown && secondary) {
    const filler = fillerGrams(drop);
    const clearG = diluter ? 15 : 0;
    weights = slots.map((t) => (t === secondary ? filler : t === diluter ? clearG : 120 - filler - clearG));
  }
  const mix: MixItem[] = slots.map((t, i) => ({
    tube: shadeLabel(t),
    grams: weights[i],
    owned: t === primary ? primaryOwned : t === diluter ? diluterOwned : t === secondary ? secondaryOwned : true,
  }));

  // 산화제: 밝혀야 하는 폭이 클수록 고볼륨. 손상/탈색 이력이 있으면 한 단계 낮춘다. 토닝은 저농도.
  const devSteps = [3, 4.5, 6, 9];
  let devIndex = levelGap >= 3 ? 3 : levelGap >= 1 ? 2 : levelGap === 0 ? 1 : 0;
  if (history.includes("손상모") || history.includes("탈색 1회")) devIndex = Math.max(0, devIndex - 1);
  const developerPercent = toning ? (history.includes("손상모") ? 1.5 : 3) : devSteps[devIndex];
  const ratio = toning ? (clearPart >= 2 ? "1:2" : "1:1") : developerPercent <= 4.5 ? "1:1" : "1:1.5";

  // 방치 시간
  let timeMinutes = 30;
  if (history.includes("손상모")) timeMinutes -= 8;
  if (history.includes("탈색 1회")) timeMinutes -= 5;
  if (history.includes("새치 30%")) timeMinutes += 6;
  if (history.includes("흑염색 이력")) timeMinutes += 4;
  timeMinutes = clamp(timeMinutes, 15, 45);
  if (toning) timeMinutes = clamp((clearPart >= 2 ? 10 : 15) - (history.includes("손상모") ? 5 : 0), 5, 20);

  if (history.includes("손상모")) notes.push(`끝 모발 손상도가 높아 마지막 ${Math.max(5, timeMinutes - 20)}분만 도포하세요.`);
  if (history.includes("흑염색 이력")) notes.push("흑염색 이력이 있어 탈색이 고르지 않을 수 있어요. 스트랜드 테스트를 진행하세요.");
  if (history.includes("새치 30%")) notes.push("새치가 많은 뿌리 부위는 5g을 추가로 밀착 도포하세요.");
  if (history.includes("흑염색 이력")) matchScore -= 5;

  const order = toning
    ? "타월 드라이 후 밝은 부분부터 빠르게 전체 도포"
    : toneDown
      ? "밝게 빠진 부분(탈색부) → 중간 → 뿌리 순으로 도포"
      : input.endLevel - input.rootLevel >= 2
      ? "중간 → 뿌리 순으로 도포 (끝은 처리 시간을 짧게)"
      : "전체 동시 도포";

  let guide: Formula["guide"];
  if (toning) {
    const brandTip = brand ? BRAND_TONING[brand.id] : undefined;
    const recipe = mix.map((m) => `${m.tube} ${m.grams}g${m.owned ? "" : "(구매 필요)"}`).join(" + ");
    const toningSteps = [
      levelGap > 0
        ? `탈색: ${targetLevel + 1}레벨 정도까지 균일하게 밝혀요. 목표보다 한 레벨 밝아야 토너가 옅게 얹혀요. 남은 ${HUE_LABEL[underlyingPigment(targetLevel)]}기를 확인하세요.`
        : `탈색 확인: 이미 ${currentLevel}레벨이에요. 얼룩지게 어두운 부분이 있으면 그 부분만 먼저 밝혀요.`,
      recipe
        ? `토너 배합: ${recipe}. 클리어로 묽게 해서 ${targetLevel}레벨의 옅은 발색을 만들어요.`
        : `토너 배합: 선택한 브랜드에 ${familyNames(mainFamilies)} 고명도 넘버가 없어요. 위 안내의 다른 브랜드 넘버를 클리어와 1:1~1:3으로 희석해 쓰세요.`,
      `산화제: 저농도 ${developerPercent}%를 ${ratio}로 섞어요.${brandTip ? ` (${brandTip.developer})` : ""}`,
      "도포: 샴푸 후 물기를 70~80% 제거한 모발에, 밝고 노란기가 적은 부분부터 빠르게 전체 도포해요.",
      `방치: 5분마다 색을 보며 ${timeMinutes}분 이내로 둬요. 원하는 톤보다 살짝 진할 때 헹궈요(헹구고 말리면 조금 옅어져요).`,
      target.warm
        ? "마무리: 산성 트리트먼트로 정리하고, 같은 계열 컬러 샴푸로 유지해요."
        : "마무리: 산성 트리트먼트로 정리하고, 보라·블루 보색 샴푸로 노란기가 다시 올라오지 않게 유지해요.",
    ];
    if (brandTip) notes.push(`토닝용 클리어·고명도 넘버: ${brandTip.clear}`);
    guide = { title: "탈색 후 토닝 방법", steps: toningSteps };
  } else if (toneDown) {
    const main = mix.find((m) => primary && m.tube === shadeLabel(primary));
    const fill = mix.find((m) => secondary && m.tube === shadeLabel(secondary));
    guide = {
      title: "톤다운 방법 (조정색 + 레벨 보정)",
      steps: [
        `왜 조정이 필요한가요: ${currentLevel}레벨 모발에는 ${targetLevel}레벨에 있어야 할 ${fillerName} 색소가 빠져 있어요. ${targetLevel}레벨 넘버만 바르면 비어 보이고(그린·그레이 기) 금방 빠져서 ${targetLevel}레벨이 나오지 않아요.`,
        fill
          ? `조정색: ${fill.tube} ${fill.grams}g으로 빠진 ${fillerName} 색소를 채워요.`
          : `조정색: 목표 톤이 ${fillerName} 계열이라 메인 넘버가 조정색 역할을 해요.`,
        main
          ? `레벨 보정: 목표보다 1레벨 어두운 ${main.tube} ${main.grams}g을 써요. 밝혀진 모발은 색이 빠르게 들어가고 빠르게 빠져 한 톤 밝게 남아요.`
          : `레벨 보정: 목표보다 1레벨 어두운 ${shadeLevel}레벨 넘버를 써요.`,
        ...(fill ? ["2단계로 할 때: 조정색만 먼저 얇게 도포해 5~10분 두고, 헹구지 않고 그 위에 목표 배합을 덧도포해요. 많이 밝은 모발일수록 2단계가 안정적이에요."] : []),
        `산화제: 밝힐 필요가 없으니 ${developerPercent}% ${ratio}로 저농도만 써요. 방치 ${timeMinutes}분, 밝게 빠진 부분부터 바르고 뿌리는 마지막에 발라요.`,
        "마무리: 1~2주 뒤 색 빠짐을 보고 한 번 더 덧염색하면 명도가 오래 유지돼요.",
      ],
    };
  }

  notes.push(...harmonyNotes(target.name));

  notes.push("AI 추천은 보조 정보이며 실제 모발 상태에 따른 디자이너의 최종 판단이 필요합니다.");

  return { mix, developerPercent, ratio, timeMinutes, order, matchScore: clamp(matchScore, 55, 97), notes, ...(guide ? { guide } : {}) };
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
    input.targetLevel ?? target.level,
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
