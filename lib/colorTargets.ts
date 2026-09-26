// 컬러핏 AI의 목표 컬러와 염모제 카탈로그 조회. 화면(보유 염모제 필터)과 서버(배합 계산)가 함께 쓴다.
import { DYE_BRANDS, type DyeBrand, type DyeLine, type DyeShade, type ToneFamily } from "./dyeCatalog";
import { neutralizerFamilies, type WheelHue } from "./colorWheel";
import { fillerFamilies, isToneDown } from "./toning";

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

// families: 목표 톤을 내는 메인 계열. supports: 보정(중화)·베이스(깊이)·희석용으로 함께 쓸 수 있는 계열.
// 목표와 상관없는 계열(예: 레드 목표인데 그레이)은 둘 다에 넣지 않아 화면에서 보이지 않는다.
// hue: 색상환 위치(무채색·브라운 계열은 null). warm: 난색 목표면 밝혔을 때 드러나는 잔류 색소를 살리고 중화하지 않는다.
export const TARGET_COLORS = [
  { group: "브라운", name: "내추럴 브라운", level: 6, color: "#5a4033", families: ["natural"], supports: ["beige", "clear"], hue: null, warm: false },
  { group: "브라운", name: "초코 브라운", level: 5, color: "#4a3024", families: ["natural", "beige"], supports: ["matte", "ash", "clear"], hue: null, warm: false },
  { group: "브라운", name: "코코아 브라운", level: 7, color: "#765047", families: ["natural", "beige"], supports: ["matte", "ash", "clear"], hue: null, warm: false },
  { group: "브라운", name: "모카 브라운", level: 7, color: "#6d5446", families: ["beige"], supports: ["natural", "ash", "clear"], hue: null, warm: false },
  { group: "브라운", name: "밀크티 브라운", level: 9, color: "#9c7c64", families: ["beige", "natural"], supports: ["ash", "violet", "clear"], hue: null, warm: false },
  { group: "브라운", name: "카키 브라운", level: 8, color: "#777358", families: ["matte"], supports: ["ash", "natural", "clear"], hue: "yellow-green", warm: false },
  { group: "브라운", name: "올리브 브라운", level: 7, color: "#5f5b3e", families: ["matte"], supports: ["ash", "natural", "clear"], hue: "yellow-green", warm: false },
  { group: "애쉬·무채색", name: "애쉬 브라운", level: 7, color: "#6b625c", families: ["ash"], supports: ["natural", "violet", "blue", "clear"], hue: null, warm: false },
  { group: "애쉬·무채색", name: "애쉬 베이지", level: 9, color: "#a69888", families: ["ash", "beige"], supports: ["gray", "violet", "blue", "clear"], hue: null, warm: false },
  { group: "애쉬·무채색", name: "애쉬 그레이", level: 10, color: "#7d7f84", families: ["ash", "gray"], supports: ["violet", "blue", "clear"], hue: null, warm: false },
  { group: "애쉬·무채색", name: "그레이", level: 9, color: "#8d8d91", families: ["gray", "ash"], supports: ["violet", "blue", "clear"], hue: null, warm: false },
  { group: "애쉬·무채색", name: "그레이지", level: 11, color: "#9a938a", families: ["gray", "beige"], supports: ["ash", "violet", "clear"], hue: null, warm: false },
  { group: "애쉬·무채색", name: "실버", level: 16, color: "#b9bbc0", families: ["gray"], supports: ["violet", "ash", "clear"], hue: null, warm: false },
  { group: "애쉬·무채색", name: "블랙", level: 3, color: "#1c1c20", families: ["natural"], supports: ["blue", "clear"], hue: null, warm: false },
  { group: "애쉬·무채색", name: "블루 블랙", level: 4, color: "#283247", families: ["blue"], supports: ["ash", "natural", "clear"], hue: "blue", warm: false },
  { group: "베이지·골드", name: "샌드 베이지", level: 11, color: "#b39f84", families: ["beige"], supports: ["gold", "ash", "clear"], hue: null, warm: false },
  { group: "베이지·골드", name: "골드 베이지", level: 9, color: "#bf9a6a", families: ["gold", "beige"], supports: ["natural", "clear"], hue: "yellow-orange", warm: true },
  { group: "베이지·골드", name: "허니 브라운", level: 9, color: "#a0703a", families: ["gold", "natural"], supports: ["orange", "clear"], hue: "yellow-orange", warm: true },
  { group: "베이지·골드", name: "샴페인 골드", level: 14, color: "#d8c08e", families: ["gold", "beige"], supports: ["clear"], hue: "yellow", warm: true },
  { group: "베이지·골드", name: "옐로우 블론드", level: 16, color: "#e0c86a", families: ["gold"], supports: ["clear"], hue: "yellow", warm: true },
  { group: "오렌지·카퍼", name: "오렌지 브라운", level: 8, color: "#9a5a34", families: ["orange", "natural"], supports: ["gold", "red", "clear"], hue: "orange", warm: true },
  { group: "오렌지·카퍼", name: "오렌지 카퍼", level: 8, color: "#b8622f", families: ["orange"], supports: ["gold", "red", "natural", "clear"], hue: "orange", warm: true },
  { group: "오렌지·카퍼", name: "테라코타", level: 8, color: "#a4513a", families: ["orange", "red"], supports: ["natural", "clear"], hue: "red-orange", warm: true },
  { group: "오렌지·카퍼", name: "코랄 오렌지", level: 11, color: "#d9785a", families: ["orange", "pink"], supports: ["gold", "clear"], hue: "red-orange", warm: true },
  { group: "레드·핑크", name: "레드", level: 7, color: "#9b2d30", families: ["red"], supports: ["pink", "natural", "clear"], hue: "red", warm: true },
  { group: "레드·핑크", name: "체리 레드", level: 6, color: "#8a1f35", families: ["red", "pink"], supports: ["violet", "natural", "clear"], hue: "red", warm: true },
  { group: "레드·핑크", name: "와인 레드", level: 5, color: "#6a2034", families: ["red", "violet"], supports: ["pink", "natural", "clear"], hue: "red-violet", warm: true },
  { group: "레드·핑크", name: "버건디", level: 4, color: "#5c1f2e", families: ["red", "violet"], supports: ["natural", "clear"], hue: "red-violet", warm: true },
  { group: "레드·핑크", name: "로즈 브라운", level: 8, color: "#a95f5d", families: ["pink"], supports: ["red", "violet", "natural", "clear"], hue: "red-violet", warm: true },
  { group: "레드·핑크", name: "핑크 베이지", level: 11, color: "#c49a8e", families: ["pink", "beige"], supports: ["violet", "clear"], hue: "red-violet", warm: true },
  { group: "레드·핑크", name: "코랄 핑크", level: 11, color: "#d97b72", families: ["pink", "orange"], supports: ["clear"], hue: "red", warm: true },
  { group: "레드·핑크", name: "핑크", level: 9, color: "#c9798e", families: ["pink"], supports: ["violet", "clear"], hue: "red-violet", warm: true },
  { group: "레드·핑크", name: "마젠타", level: 8, color: "#b0306e", families: ["pink", "violet"], supports: ["red", "clear"], hue: "red-violet", warm: true },
  { group: "퍼플", name: "바이올렛", level: 7, color: "#69536f", families: ["violet"], supports: ["blue", "pink", "clear"], hue: "violet", warm: false },
  { group: "퍼플", name: "라벤더", level: 15, color: "#a996c6", families: ["violet"], supports: ["pink", "blue", "gray", "clear"], hue: "violet", warm: false },
  { group: "퍼플", name: "모브", level: 10, color: "#8e7280", families: ["violet", "pink"], supports: ["gray", "ash", "clear"], hue: "red-violet", warm: false },
  { group: "퍼플", name: "플럼", level: 5, color: "#5b2e45", families: ["violet", "red"], supports: ["natural", "clear"], hue: "red-violet", warm: true },
  { group: "블루·그린", name: "네이비", level: 5, color: "#26304f", families: ["blue"], supports: ["ash", "violet", "clear"], hue: "blue", warm: false },
  { group: "블루·그린", name: "블루", level: 12, color: "#3a5ea8", families: ["blue"], supports: ["ash", "violet", "clear"], hue: "blue", warm: false },
  { group: "블루·그린", name: "틸 블루", level: 9, color: "#2c7c80", families: ["blue", "matte"], supports: ["ash", "clear"], hue: "blue-green", warm: false },
  { group: "블루·그린", name: "에메랄드 그린", level: 8, color: "#1f6b58", families: ["matte"], supports: ["blue", "clear"], hue: "green", warm: false },
  { group: "블루·그린", name: "민트", level: 16, color: "#86c2b0", families: ["matte", "blue"], supports: ["ash", "clear"], hue: "blue-green", warm: false },
] as const satisfies readonly { group: string; name: string; level: number; color: string; families: readonly ToneFamily[]; supports: readonly ToneFamily[]; hue: WheelHue | null; warm: boolean }[];

export type TargetColor = (typeof TARGET_COLORS)[number];

// 화면에서 목표 컬러를 계열별로 묶어 보여줄 순서.
export const TARGET_GROUPS: string[] = [...new Set<string>(TARGET_COLORS.map((c) => c.group))];

// 목표 레벨에서 드러나는 잔류 색소를 지울 보색 계열. 난색 목표는 잔류 색소가 오히려 도움이 되므로 중화하지 않는다.
// 크게 톤다운할 때는 잔류 색소를 지우지 않고 오히려 조정색으로 채우므로 보색 중화를 하지 않는다.
export function correctionFamilies(target: TargetColor, level: number, currentLevel?: number): readonly ToneFamily[] {
  if (isToneDown(level, currentLevel)) return [];
  return target.warm ? [] : neutralizerFamilies(level);
}

// 보정·베이스용으로 보여줄 계열: 목표 레벨의 보색 중화 계열 + 목표별 기본 계열(메인 계열은 뺀다).
// 크게 톤다운할 때는 조정색(레드·오렌지·골드) 계열을 앞에 넣는다.
export function supportFamilies(target: TargetColor, level: number, currentLevel?: number): ToneFamily[] {
  const main: readonly ToneFamily[] = target.families;
  const extra = isToneDown(level, currentLevel) ? fillerFamilies(level) : correctionFamilies(target, level, currentLevel);
  return [...new Set<ToneFamily>([...extra, ...target.supports])].filter((f) => !main.includes(f));
}

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
