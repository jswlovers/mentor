// 사용자 제공 FIOLE·WELLA 실물 사진(2026-10-07, 조명 있음·없음 4장)의 견본 픽셀을 측정해 만든 화면용 근사색.
// 밝기(L*)는 WELLA 사진 3장의 레벨별 중앙값(10~20), 색상 방향은 자연광 사진 2장의 평균이다.
// 4~9레벨은 사진에서 거의 검정으로 뭉개져(L* 1~5) 단계가 구분되도록 펼친 값이고, 1~3레벨은 확장값이다.
// 실물에서 14→15 사이 밝기 차이가 크다(주황 갈색 → 골드). 19·20은 밝기가 비슷하고 20이 더 하얗다.
// 측색값이나 브랜드 간 환산표가 아니다. WELLA 왼쪽 백모 비율(%)과 오른쪽 명도 레벨은 별개다.
export const LEVEL_CHART: { level: number; color: string }[] = [
  { level: 1, color: "#0d0a08" },
  { level: 2, color: "#110e0b" },
  { level: 3, color: "#14100e" },
  { level: 4, color: "#17130f" },
  { level: 5, color: "#191511" },
  { level: 6, color: "#1d1610" },
  { level: 7, color: "#211912" },
  { level: 8, color: "#2a1a10" },
  { level: 9, color: "#2d1d12" },
  { level: 10, color: "#331f0f" },
  { level: 11, color: "#39230e" },
  { level: 12, color: "#44260b" },
  { level: 13, color: "#502f0d" },
  { level: 14, color: "#5e3a0e" },
  { level: 15, color: "#8b6a32" },
  { level: 16, color: "#aa8d4a" },
  { level: 17, color: "#bea056" },
  { level: 18, color: "#c6b57d" },
  { level: 19, color: "#cec6aa" },
  { level: 20, color: "#d7d5c7" },
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

// 사진에서 읽은 모발 평균색을 차트 밝기와 비교해 가장 가까운 레벨로 바꾼다.
export function levelFromRgb(r: number, g: number, b: number): number {
  const l = lightness(r, g, b);
  let best = CHART_L[0];
  for (const c of CHART_L) if (Math.abs(c.l - l) < Math.abs(best.l - l)) best = c;
  return best.level;
}
