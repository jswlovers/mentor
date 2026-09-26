// 보색(색상환) 기반 중화 판단. 12색 색상환에서 마주 보는 색이 보색이며, 보색끼리 섞으면 서로를 지워 무채색에 가까워진다.
// 모발은 밝힐수록 레드 → 레드오렌지 → 오렌지 → 옐로우 순으로 잔류 색소가 드러나므로,
// 목표가 차가운 색·무채색이면 드러나는 잔류 색소의 보색 계열로 중화한다.
import type { ToneFamily } from "./dyeCatalog";

export const WHEEL = [
  "red", "red-orange", "orange", "yellow-orange", "yellow", "yellow-green",
  "green", "blue-green", "blue", "blue-violet", "violet", "red-violet",
] as const;
export type WheelHue = (typeof WHEEL)[number];

export const HUE_LABEL: Record<WheelHue, string> = {
  red: "레드",
  "red-orange": "레드오렌지",
  orange: "오렌지",
  "yellow-orange": "옐로우오렌지",
  yellow: "옐로우",
  "yellow-green": "옐로우그린",
  green: "그린",
  "blue-green": "블루그린",
  blue: "블루",
  "blue-violet": "블루바이올렛",
  violet: "바이올렛",
  "red-violet": "레드바이올렛",
};

export function complement(hue: WheelHue): WheelHue {
  return WHEEL[(WHEEL.indexOf(hue) + 6) % WHEEL.length];
}

// 색상환의 색을 염모제 계열로 옮긴 것. 앞쪽 계열을 먼저 쓴다.
// 헤어 컬러에서 매트는 그린, 애쉬는 블루, 그레이·실버는 블루바이올렛 쪽 반사빛이다.
export const HUE_FAMILIES: Record<WheelHue, readonly ToneFamily[]> = {
  red: ["red"],
  "red-orange": ["orange", "red"],
  orange: ["orange"],
  "yellow-orange": ["gold", "orange"],
  yellow: ["gold"],
  "yellow-green": ["matte"],
  green: ["matte"],
  "blue-green": ["matte", "blue"],
  blue: ["blue", "ash"],
  "blue-violet": ["violet", "gray", "blue"],
  violet: ["violet"],
  "red-violet": ["pink", "violet"],
};

// 밝혔을 때 드러나는 잔류 색소(언더 피그먼트). 밀본 올디브 레벨 스케일(1~20)에 맞춘 대략값이며 모질에 따라 1~2레벨 차이가 난다.
export function underlyingPigment(level: number): WheelHue {
  if (level <= 6) return "red";
  if (level <= 9) return "red-orange";
  if (level <= 12) return "orange";
  if (level <= 14) return "yellow-orange";
  return "yellow";
}

// 목표 레벨에서 드러나는 잔류 색소를 지우는 데 쓸 보색 계열.
export function neutralizerFamilies(level: number): readonly ToneFamily[] {
  return HUE_FAMILIES[complement(underlyingPigment(level))];
}
