// 컬러핏 AI의 목표 컬러와 염모제 카탈로그 조회. 화면(보유 염모제 필터)과 서버(배합 계산)가 함께 쓴다.
import { DYE_BRANDS, type DyeBrand, type DyeLine, type DyeShade, type ToneFamily } from "./dyeCatalog";

export { DYE_BRANDS };
export type { DyeBrand, DyeLine, DyeShade, ToneFamily };

export const FAMILY_LABEL: Record<ToneFamily, string> = {
  natural: "내추럴·브라운",
  ash: "애쉬",
  matte: "매트·카키·그린",
  beige: "베이지·모카",
  gold: "골드·옐로우",
  orange: "오렌지·카퍼",
  red: "레드·마호가니",
  pink: "핑크·로즈",
  violet: "바이올렛·라벤더",
  blue: "블루·네이비",
  gray: "그레이·실버",
  clear: "클리어·라이트너",
  etc: "계열 미확인",
};

// 차가운 계열: 잔류 오렌지(웜 언더톤)를 중화하는 보정용으로 쓴다.
export const COOL_FAMILIES: readonly ToneFamily[] = ["ash", "matte", "violet", "blue", "gray"];

// families: 목표 톤을 내는 메인 계열. supports: 보정(중화)·베이스(깊이)·희석용으로 함께 쓸 수 있는 계열.
// 목표와 상관없는 계열(예: 레드 목표인데 그레이)은 둘 다에 넣지 않아 화면에서 보이지 않는다.
export const TARGET_COLORS = [
  { name: "로즈 브라운", level: 8, color: "#a95f5d", families: ["pink"], supports: ["red", "violet", "natural", "clear"] },
  { name: "레드", level: 7, color: "#9b2d30", families: ["red"], supports: ["pink", "natural", "clear"] },
  { name: "핑크", level: 9, color: "#c9798e", families: ["pink"], supports: ["violet", "clear"] },
  { name: "오렌지 카퍼", level: 8, color: "#b8622f", families: ["orange"], supports: ["gold", "red", "natural", "clear"] },
  { name: "골드 베이지", level: 9, color: "#bf9a6a", families: ["gold", "beige"], supports: ["natural", "clear"] },
  { name: "코코아 브라운", level: 7, color: "#765047", families: ["natural", "beige"], supports: ["matte", "ash", "clear"] },
  { name: "애쉬 베이지", level: 9, color: "#a69888", families: ["ash", "beige"], supports: ["gray", "violet", "blue", "clear"] },
  { name: "그레이", level: 9, color: "#8d8d91", families: ["gray", "ash"], supports: ["violet", "blue", "clear"] },
  { name: "카키 브라운", level: 8, color: "#777358", families: ["matte"], supports: ["ash", "natural", "clear"] },
  { name: "바이올렛", level: 7, color: "#69536f", families: ["violet"], supports: ["blue", "pink", "clear"] },
  { name: "블루 블랙", level: 4, color: "#283247", families: ["blue"], supports: ["ash", "natural", "clear"] },
] as const satisfies readonly { name: string; level: number; color: string; families: readonly ToneFamily[]; supports: readonly ToneFamily[] }[];

export type TargetColor = (typeof TARGET_COLORS)[number];

export function findTarget(name: string): TargetColor | undefined {
  return TARGET_COLORS.find((c) => c.name === name);
}

export type ShadeRef = { brand: DyeBrand; line: DyeLine; shade: DyeShade };

const SHADE_INDEX = new Map<string, ShadeRef>();
for (const brand of DYE_BRANDS) for (const line of brand.lines) for (const shade of line.shades) SHADE_INDEX.set(shade.id, { brand, line, shade });

export function findShade(id: string): ShadeRef | undefined {
  return SHADE_INDEX.get(id);
}

export function findBrand(id: string): DyeBrand | undefined {
  return DYE_BRANDS.find((b) => b.id === id);
}

export function shadeLabel(ref: ShadeRef): string {
  return `${ref.line.name} ${ref.shade.code}`;
}

// 목표 레벨에 가까운 순. 레벨 정보가 없는 넘버(컨트롤러 등)는 뒤로 보낸다.
export function byLevelDistance(level: number) {
  return (a: DyeShade, b: DyeShade) => (a.level === null ? 99 : Math.abs(a.level - level)) - (b.level === null ? 99 : Math.abs(b.level - level));
}
