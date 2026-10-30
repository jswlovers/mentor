// 『COLOR BASIC MASTER BOOK』 Chapter 1~7 정리.
// 출처: 사용자 제공 촬영본 PDF (2026-10-30) "Chapter 1- 멜라닌색소.pdf"(책 p.17~50),
// "Chapter 2- 적색계 언더톤.pdf"(p.49~120, Chapter 3 모질~Chapter 7 유지력), "Chapter 7- 컬러클렌징.pdf"(p.121~124).
// 문구는 책 내용을 따르고, 목표 컬러와 책 분류를 잇는 매핑(…_OF 함수)은 Claude가 덧붙인 것이다.
// Q&A 항목은 lib/server/colorKnowledgeSeed.ts, 추천 문구는 lib/server/colorAi.ts에서 쓴다.

/** p.28 리스크가 적은 염모제 라인 추천 (*저자의 개인적인 견해로 참고만). */
export const LOW_RISK_LINES = {
  red: "8.55(아모스) / 6.66(로레알)",
  ash: "10(밀본) / BA(데미) / MT(호유)",
  blue: "코발트 블루, 사파이어(밀본) / 쉐도우 블루(데미)",
  gray: "6.11 & 8.11(웰라) / 플래티넘(데미) / 어딕시 실버(밀본)",
  pink: "올디브 55, 시어모브핑크(밀본) / 플럼핑크(아모스)",
  coolViolet: "애미시스트(밀본) / BV(데미)",
  warmViolet: "퍼플가넷(밀본) / RV(데미)",
  vividPink: "퓨저니스트 핑크(데미) / 미엘 핑크레드(믹스컬러)",
  beige: "글로우카카오, 헬시시나몬, 헬시헤이즐, NB(밀본) / PB(데미) / PB(아이데보)",
  grayCover: "보떼(밀본) / D-BB(데미) / 이고라골드(슈바츠코프) / ijp(일진)",
  mix: "사사키 믹스톤 전부",
} as const;
export type LowRiskKey = keyof typeof LOW_RISK_LINES;

export const LOW_RISK_LABEL: Record<LowRiskKey, string> = {
  red: "레드 계열",
  ash: "애쉬 계열",
  blue: "블루 계열",
  gray: "그레이 계열",
  pink: "핑크 계열",
  coolViolet: "쿨 바이올렛 계열",
  warmViolet: "웜 바이올렛 계열",
  vividPink: "비비드 핑크 계열",
  beige: "베이지 계열",
  grayCover: "그레이커버(새치)",
  mix: "믹스컬러",
};

// (Claude 매핑) 컬러핏 목표 컬러 → 책의 라인 분류.
const LOW_RISK_OF: Record<string, LowRiskKey> = {
  "레드": "red",
  "체리 레드": "red",
  "와인 레드": "warmViolet",
  "버건디": "warmViolet",
  "플럼": "warmViolet",
  "애쉬 브라운": "ash",
  "애쉬 베이지": "ash",
  "애쉬 그레이": "gray",
  "그레이": "gray",
  "그레이지": "gray",
  "실버": "gray",
  "네이비": "blue",
  "블루": "blue",
  "블루 블랙": "blue",
  "틸 블루": "blue",
  "핑크": "pink",
  "로즈 브라운": "pink",
  "핑크 베이지": "pink",
  "코랄 핑크": "pink",
  "마젠타": "vividPink",
  "바이올렛": "coolViolet",
  "라벤더": "coolViolet",
  "모브": "coolViolet",
  "샌드 베이지": "beige",
  "밀크티 브라운": "beige",
  "모카 브라운": "beige",
};

/** p.30 건강모 상태에서 염색할 때 산화 염료별 유지력(개월). */
export const RETENTION_MONTHS = { ash: 3, red: 6, brown: 9, grayCover: 12 } as const;

// (Claude 매핑) 목표 컬러 → 유지력 분류. 책에 없는 블루·그린 등은 넣지 않는다.
function retentionOf(group: string, name: string): keyof typeof RETENTION_MONTHS | null {
  if (group === "애쉬·무채색" && name !== "블랙" && name !== "블루 블랙") return "ash";
  if (group === "레드·핑크" || name === "플럼") return "red";
  if (group === "브라운" || name === "샌드 베이지" || name === "허니 브라운") return "brown";
  return null;
}

/** p.31 농도별 산화제 종류. */
export const DEVELOPER_GUIDE: { percent: number; vol: number; use: string; tip: string }[] = [
  { percent: 1.5, vol: 5, use: "탈색 등으로 손상이 심한 모발에 착색 목적으로 사용. 주로 디자인컬러(솜브레 등)에 쓰며 유지력이 가장 짧다", tip: "페이크블랙 / 잠깐의 톤다운(결혼식, 장례식 등)이 필요할 때 추천" },
  { percent: 3, vol: 10, use: "톤다운, 탈색모 같은 밝은 손상모에 사용", tip: "한색계열을 표현할 때 / 연모(얇은 모발)의 뿌리 염색 시 사용" },
  { percent: 4.5, vol: 15, use: "가볍게 모발 베이스를 리프트 업 할 경우 사용", tip: "8레벨 이하 베이스에서 뿌리염색과 전체염색 원터치 시 사용(톤업과 톤온톤을 동시에 할 때 좋다)" },
  { percent: 6, vol: 20, use: "일반적으로 가장 많이 사용. 톤업, 컬러체인지, 탈색, 탈염, 새치커버", tip: "새치커버는 6%를 사용해야 한다" },
  { percent: 9, vol: 30, use: "3~4레벨 이상 밝은 염색을 할 경우 사용", tip: "함량이 높은 만큼 모발과 두피에 손상을 입힐 수 있다" },
  { percent: 12, vol: 40, use: "염색으로 가장 밝게 하고 싶을 때 사용. 14레벨 염모제+12%면 탈색 1회 정도의 베이스가 가능", tip: "모발이 많이 건조해지는 단점이 있다" },
];

/** p.43 일반 염색 포인트: 3/6/9/12/15레벨을 기억하라. */
export const LEVEL_POINTS: { level: number; text: string }[] = [
  { level: 3, text: "한국인의 모발에서는 거의 나올 수 없는 레벨로, 톤다운을 했거나 블랙을 한 모발이다" },
  { level: 6, text: "레드와 브라운 색소가 가장 많은 구간으로 레드 혹은 초코브라운 계열만 가능하다" },
  { level: 9, text: "레드오렌지 구간으로 레드, 레드오렌지 표현이 가능하다" },
  { level: 12, text: "오렌지 구간으로 카키, 애쉬브라운 등 한색계의 브라운 표현이 가능하다" },
  { level: 15, text: "베이지·옐로우 계열로, 난색계 컬러 등 다양한 색감표현이 본격적으로 가능해진다" },
];

/** p.48 레벨별 언더톤. 염색 명도(3~13)와 탈색 명도(13~20)를 나눠 본다. */
export const UNDERTONE_BY_LEVEL: { from: number; to: number; tone: string }[] = [
  { from: 3, to: 4, tone: "블루" },
  { from: 5, to: 8, tone: "레드" },
  { from: 9, to: 11, tone: "레드오렌지" },
  { from: 12, to: 13, tone: "오렌지" },
  { from: 13, to: 14, tone: "오렌지옐로우" },
  { from: 15, to: 16, tone: "옐로우" },
  { from: 17, to: 18, tone: "페일옐로우" },
  { from: 19, to: 20, tone: "백금발" },
];

type ChangeKind = "red" | "orange" | "brown" | "green" | "blue";

/** p.49~50 적색계·황색계 언더톤 모발에서 계열을 바꾸는 방법. */
export const UNDERTONE_CHANGE: Record<"redBase" | "yellowBase", Partial<Record<ChangeKind, string>>> = {
  redBase: {
    orange: "골드계열 염모제를 선택하여 도포한다",
    brown: "매트 혹은 카키 염모제를 선택한다. 단, 초코브라운이 나올 것이라고 고객에게 먼저 알린다",
    green: "탈색 후 레드오렌지 베이스에서 카키/매트 염모제에 블루를 추가로 믹스하여 도포한다",
    blue: "탈색 후 옐로우 베이스에서 파란색을 넣으면 녹색이 되므로, 블루바이올렛(청자색)을 만들어서 염색한다",
  },
  yellowBase: {
    red: "보색인 보라색이 믹스된 레드바이올렛 염모제를 도포한다",
    orange: "레드 단독으로 염색을 한다면 다홍색이 될 수 있으므로 오렌지 또는 골드와 믹스해서 도포한다",
    green: "카키 / 블루 / 블루애쉬 계열을 도포한다. 노란색이 강한 베이스라면 카키는 쉽게 표현된다",
    blue: "블루 단독으로 염색을 하면 블루그린이 될 수 있다. 보색인 바이올렛을 믹스하거나 블루색소가 강한 블루바이올렛 염모제를 단독으로 도포한다",
  },
};

// (Claude 매핑) 목표 컬러 → 책의 계열 변경 분류.
function changeKindOf(group: string, hue: string | null): ChangeKind | null {
  if (hue === "red") return "red";
  if (hue === "orange" || hue === "red-orange" || hue === "yellow-orange") return "orange";
  if (hue === "yellow-green" || hue === "green" || hue === "blue-green") return "green";
  if (hue === "blue") return "blue";
  if (group === "브라운" && hue === null) return "brown";
  return null;
}

/** p.71~72 톤업 공식: 원하는 명도에 더하는 염모제 레벨(모질 및 베이스). */
export const TONE_UP_LEVEL_ADJUST: { hair: string; add: number }[] = [
  { hair: "경모", add: 2 },
  { hair: "보통모", add: 1 },
  { hair: "연모", add: -1 },
  { hair: "곱슬", add: 1 },
  { hair: "기염모(염색이력)", add: 4 },
  { hair: "매직 드라이모", add: 2 },
  { hair: "펌 퇴색모", add: -1 },
];

/** p.83 모질별 뿌리염색 명도 조절법 (원하는 10Lv 기준). */
export const ROOT_BY_HAIR_TYPE: { hair: string; recipe: string; why: string }[] = [
  { hair: "보통모", recipe: "11Lv + 6%", why: "" },
  { hair: "발수성모", recipe: "프리소프트닝 후 11Lv + 6%", why: "염모제 침투가 잘 되지 않으므로 산화제를 선도포해 유분과 수분을 최대한 적게 만든 후 염색한다" },
  { hair: "곱슬모", recipe: "12Lv + 6%", why: "같은 명도로 톤업하면 난반사로 더 얼룩져 보이므로 명도를 올려 조금 더 밝게 하면 난반사가 줄어든다" },
  { hair: "건조모", recipe: "젖은 상태에서 11Lv + 9%", why: "수분이 너무 없으면 탈색이 잘 진행되지 않아 젖은 상태로 시작하고 반드시 9% 산화제를 쓴다" },
];

/** p.73~74 톤다운 공식: 베이스 레벨별 N(NB) 염모제 레벨과 결과. */
export const TONE_DOWN_TABLE: { base: number; rows: [shade: number, result: number][] }[] = [
  { base: 10, rows: [[9, 9], [8, 8], [7, 7], [6, 6]] },
  { base: 12, rows: [[9, 11], [8, 10], [7, 9], [6, 8]] },
];

/** p.106 새치커버 공식 Case1: 새치량별 새치커버 염모제 레벨 (결과는 모두 7Lv 정도). */
export const GRAY_COVER_LEVEL: { from: number; to: number; level: number }[] = [
  { from: 10, to: 20, level: 8 },
  { from: 30, to: 30, level: 7 },
  { from: 40, to: 50, level: 6 },
];

/** p.111 기장별 총 사용량(1제+2제 1:1 기준, g). */
export const AMOUNT_BY_LENGTH: { length: string; total: string; first: string }[] = [
  { length: "뿌리", total: "80~100g", first: "40~50g" },
  { length: "숏", total: "100~160g", first: "50~80g" },
  { length: "미디움", total: "140~240g", first: "70~120g" },
  { length: "롱", total: "240~300g", first: "120~150g" },
];

export type BookNoteInput = {
  targetName: string;
  targetGroup: string;
  targetHue: string | null;
  targetLevel: number;
  currentLevel: number;
  developerPercent: number;
  grayPercent: number;
  thickness?: string;
  history?: string[];
  toneDown?: boolean;
  toning?: boolean;
};

/** 컬러핏 AI 추천 결과에 붙일 책 기반 안내 문구. */
export function colorBasicNotes(input: BookNoteInput): string[] {
  const notes: string[] = [];
  const src = "컬러 베이직 마스터북";

  // 염색할 때 드러나는 베이스: 밝히면 목표 레벨, 아니면 지금 레벨. 13레벨 이상이면 황색계로 본다(책 p.48 언더톤 표).
  const baseLevel = Math.max(input.currentLevel, input.targetLevel);
  const point = [...LEVEL_POINTS].reverse().find((p) => p.level <= input.targetLevel);
  if (point) notes.push(`${src} · ${point.level}레벨 포인트: ${point.text}.`);

  const kind = changeKindOf(input.targetGroup, input.targetHue);
  const baseKey = baseLevel >= 13 ? "yellowBase" : "redBase";
  const change = kind ? UNDERTONE_CHANGE[baseKey][kind] : undefined;
  if (change) notes.push(`${src} · ${baseKey === "yellowBase" ? "황색계" : "적색계"} 언더톤(${baseLevel}레벨 베이스)에서 바꾸려면: ${change}.`);

  const dev = DEVELOPER_GUIDE.find((d) => d.percent === input.developerPercent);
  if (input.grayPercent > 0 && input.developerPercent !== 6) {
    notes.push(`${src} · 산화제: 새치커버는 6%를 사용해야 한다(지금 배합은 ${input.developerPercent}%). 새치 비율과 모발 상태를 보고 판단하세요.`);
  } else if (dev) {
    notes.push(`${src} · 산화제 ${dev.percent}%(${dev.vol}vol): ${dev.use}. ${dev.tip}.`);
  }

  const lineKey: LowRiskKey | undefined = input.grayPercent >= 30 ? "grayCover" : LOW_RISK_OF[input.targetName];
  if (lineKey) notes.push(`${src} · 리스크가 적은 ${LOW_RISK_LABEL[lineKey]} 라인(저자 개인 견해): ${LOW_RISK_LINES[lineKey]}.`);

  const ret = input.grayPercent >= 30 ? "grayCover" : retentionOf(input.targetGroup, input.targetName);
  if (ret) {
    const label = { ash: "애쉬 계열", red: "레드 계열", brown: "브라운 계열", grayCover: "새치 계열" }[ret];
    notes.push(
      `${src} · 유지력: 건강모 기준 ${label}은 약 ${RETENTION_MONTHS[ret]}개월. 염색을 거듭할수록 유지력이 높아져(레드 2회면 12개월 뒤 애쉬 체인지 가능), 그 전에 바꾸려면 컬러클렌징(탈염)으로 인공염료를 지우고 시술하세요.`,
    );
  }
  notes.push(...chapter3to7Notes(input));
  return notes;
}

// (Claude 매핑) 컬러핏 화면의 모발 굵기 값 → 책의 모질 이름.
const HAIR_OF: Record<string, string> = { "가는 모발": "연모", "보통모": "보통모", "굵은 모발": "경모" };

// 염모제 넘버가 있는 가장 높은 레벨. 공식 결과가 이보다 높으면 여기서 멈춘다.
const MAX_DYE_LEVEL = 13;

export type ToneUpPlan = { hair: string; add: number; level: number; dyed: boolean };

/** p.71~72 톤업 공식으로 고를 염모제 레벨. 기염모(흑염색 이력)는 모질과 관계없이 +4Lv에 산화제 9%. */
export function toneUpPlan(targetLevel: number, thickness?: string, history: string[] = []): ToneUpPlan {
  const dyed = history.includes("흑염색 이력");
  const hair = dyed ? "기염모(염색이력)" : HAIR_OF[thickness ?? "보통모"] ?? "보통모";
  const add = TONE_UP_LEVEL_ADJUST.find((a) => a.hair === hair)!.add;
  return { hair, add, level: Math.min(targetLevel + add, MAX_DYE_LEVEL), dyed };
}

function chapter3to7Notes(input: BookNoteInput): string[] {
  const notes: string[] = [];
  const src = "컬러 베이직 마스터북";
  const history = input.history ?? [];

  // 톤업(밝히기)일 때만 책의 레벨 공식을 보여준다. 배합도 이 레벨로 계산한다(colorAi.ts).
  if (!input.toneDown && !input.toning && input.targetLevel > input.currentLevel) {
    const plan = toneUpPlan(input.targetLevel, input.thickness, history);
    notes.push(
      `${src} · 톤업 레벨 공식: ${plan.hair}는 원하는 명도 ${plan.add > 0 ? "+" : ""}${plan.add}Lv → ${input.targetLevel}레벨을 원하면 ${plan.level}레벨 염모제를 써요. 배합 넘버도 ${plan.level}레벨 기준으로 골랐어요.` +
        (plan.dyed ? " 염모제는 인공염료를 분해하지 못해 산화제를 9%로 높였어요." : ""),
    );
  }

  if (input.toneDown) {
    const table = TONE_DOWN_TABLE.find((t) => t.base === (input.currentLevel >= 11 ? 12 : 10))!;
    const row = table.rows.find((r) => r[1] === input.targetLevel);
    notes.push(
      `${src} · 톤다운 공식: NB(내추럴) 계열을 반드시 섞고 산화제는 3% 이하. ${table.base}Lv 베이스에서는 ${table.rows.map(([s, r]) => `${s}/N→${r}Lv`).join(", ")}${row ? ` (목표 ${input.targetLevel}레벨은 ${row[0]}레벨 N)` : ""}. 컬러감을 살리려면 한색은 컬러:NB 2:1, 난색은 1:1.`,
    );
    if (input.currentLevel - input.targetLevel >= 6) {
      notes.push(`${src} · 명도 차이가 많이 날 때: (기염모+신생모)÷2 결과가 10Lv 이하면 그보다 2레벨 낮은 약제, 11Lv 이상이면 결과에서 원하는 명도를 뺀 레벨의 새치커버(패션그레이) 약제를 3%로 기염모에, 신생모에는 원하는 레벨 + 6%를 먼저 도포해요.`);
    }
  }

  if (input.grayPercent > 0) {
    const g = GRAY_COVER_LEVEL.find((r) => input.grayPercent >= r.from - 5 && input.grayPercent <= r.to + 5);
    notes.push(
      `${src} · 새치커버 공식: 새치커버 염모제는 7Lv·새치 30~40% 기준이에요. 10~20%면 8Lv, 30%면 7Lv, 40~50%면 6Lv를 고르면 비슷하게 7Lv가 나와요${g ? ` (지금 ${input.grayPercent}%는 ${g.level}Lv)` : ""}. 흰머리 많은 곳부터, 산화제는 6%만, 도포량은 멋내기의 1.5배.`,
    );
  }

  if (input.thickness === "가는 모발") {
    notes.push(`${src} · 연모: 밝게 잘 나오지만 유지력이 짧고 손상되기 쉬워요. 낮은 농도 산화제를 쓰고, 브라운 계열을 20~30% 믹스하면 유지력이 높아져요.`);
  } else if (input.thickness === "굵은 모발") {
    notes.push(`${src} · 경모: 탈색이 잘 안 돼 색이 탁할 수 있어요. 원하는 레벨보다 높은 레벨 + 높은 농도 산화제, 브라운 색소가 적은 염모제를 쓰면 투명감이 나요.`);
  }

  if (history.includes("손상모")) {
    notes.push(`${src} · 손상모 유지력: 염색 직후 클리닉·열처리는 퇴색을 늘려요(4번 퇴색). 선착법(1레벨 낮은 염모제를 먼저 바르고 10~15분 후 본 염색)이나 후토닝으로 유지력을 높이세요.`);
  }
  return notes;
}
