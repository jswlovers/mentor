import { TARGET_COLORS, type TargetColor } from "./colorTargets";

type Lab = [number, number, number];

const lin = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

// sRGB(D65) → CIE L*a*b*
export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = lin(r), G = lin(g), B = lin(b);
  const x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function hexToLab(hex: string): Lab {
  return rgbToLab(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));
}

const TARGET_LAB = TARGET_COLORS.map((t) => ({ target: t as TargetColor, lab: hexToLab(t.color) }));

// 사진 속 모발 색과 가까운 목표 컬러 순으로 돌려준다.
// 사진 밝기는 조명·보정 필터에 따라 크게 흔들리므로 밝기 차이는 절반만 반영하고 색조(a*, b*)를 더 본다.
export function matchTargets(r: number, g: number, b: number, count = 3): { target: TargetColor; distance: number }[] {
  const [L, A, B] = rgbToLab(r, g, b);
  return TARGET_LAB.map(({ target, lab }) => ({
    target,
    distance: Math.sqrt((0.5 * (L - lab[0])) ** 2 + (A - lab[1]) ** 2 + (B - lab[2]) ** 2),
  }))
    .sort((p, q) => p.distance - q.distance)
    .slice(0, count);
}

export function labDistance(p: Lab, q: Lab): number {
  return Math.sqrt((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2);
}

// 밝은 피부(얼굴·목·손, 그늘진 피부 포함)로 보이는 색: 밝고, 빨강 > 초록 > 파랑이며 빨강-초록 차이가 초록-파랑보다 큰 살구빛.
// 차트 20단계와 목표 컬러로 점검했을 때 브라운·골드·베이지 모발은 걸리지 않고 핑크 베이지만 겹친다.
export function isSkinLike(r: number, g: number, b: number): boolean {
  const rg = r - g, gb = g - b;
  return r >= 160 && rg >= 30 && rg <= 75 && gb >= 10 && gb <= rg * 0.85 && b >= r * 0.4;
}

export function rgbHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}
