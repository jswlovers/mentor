// 모발 명도(레벨) 차트: 밀본 올디브 레벨 스케일(자연계 멜라닌 타입) 1~20레벨의 모발 색.
// 판매 페이지의 실물 차트 사진에서 흰 탭으로 화이트밸런스를 맞춰 뽑은 값이라 실제 차트와 조금 다를 수 있다.
// 사진에서 밝기 순서가 뒤집힌 칸(11·12)은 평균으로 맞췄고, 1~4레벨은 사진에서 구분되지 않아 같은 색이다.
export const LEVEL_CHART: { level: number; color: string }[] = [
  { level: 1, color: "#1f2128" },
  { level: 2, color: "#1f2128" },
  { level: 3, color: "#1f2128" },
  { level: 4, color: "#1f2128" },
  { level: 5, color: "#24232c" },
  { level: 6, color: "#312f37" },
  { level: 7, color: "#36323a" },
  { level: 8, color: "#5e5156" },
  { level: 9, color: "#615557" },
  { level: 10, color: "#6e5b5c" },
  { level: 11, color: "#7e655f" },
  { level: 12, color: "#7e655f" },
  { level: 13, color: "#8e7061" },
  { level: 14, color: "#997458" },
  { level: 15, color: "#b0865a" },
  { level: 16, color: "#c09763" },
  { level: 17, color: "#c79e65" },
  { level: 18, color: "#dcb876" },
  { level: 19, color: "#dfc88e" },
  { level: 20, color: "#d3cba9" },
];

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 20;

export function levelColor(level: number): string {
  return LEVEL_CHART.find((c) => c.level === level)?.color ?? LEVEL_CHART[0].color;
}

// sRGB → CIE L*(0~100). 레벨은 색상보다 밝기로 정해지므로 밝기만 비교한다.
function lightness(r: number, g: number, b: number): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
}

function hexLightness(hex: string): number {
  return lightness(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));
}

const CHART_L = LEVEL_CHART.map((c) => ({ level: c.level, l: hexLightness(c.color) }));
const DARKEST_DISTINCT = CHART_L.find((c) => c.level === 4)!.l;

// 사진에서 읽은 모발 평균색을 차트 밝기와 비교해 가장 가까운 레벨로 바꾼다.
export function levelFromRgb(r: number, g: number, b: number): number {
  const l = lightness(r, g, b);
  if (l <= DARKEST_DISTINCT) return Math.max(MIN_LEVEL, Math.round(1 + (3 * l) / DARKEST_DISTINCT));
  let best = CHART_L[0];
  for (const c of CHART_L) if (Math.abs(c.l - l) < Math.abs(best.l - l)) best = c;
  return best.level;
}
