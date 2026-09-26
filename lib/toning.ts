import { HUE_FAMILIES, underlyingPigment } from "./colorWheel";
import type { ToneFamily } from "./dyeCatalog";

// 고명도(탈색모) 토닝 기준. 브랜드 염모제는 12~15레벨이 최고라, 그보다 밝은 명도는
// 먼저 탈색으로 밝힌 뒤 목표 계열의 고명도 넘버를 클리어로 희석해 저농도 산화제로 얹는다(토닝).

// 이 레벨부터 염모제 리프트로는 어렵고 탈색이 필요하다.
export const BLEACH_LEVEL = 13;
// 이 레벨부터 화면·배합을 토닝 모드로 바꾼다.
export const TONING_LEVEL = 14;
// 토너로 쓸 넘버의 최소 레벨(고명도 넘버).
export const TONER_MIN_SHADE_LEVEL = 11;

export function isToning(targetLevel: number): boolean {
  return targetLevel >= TONING_LEVEL;
}

// 목표 레벨이 넘버 레벨보다 밝을수록 클리어를 많이 섞어 색을 옅게 한다. [토너, 클리어] 비율.
export function clearRatio(targetLevel: number, shadeLevel: number | null): [number, number] {
  if (shadeLevel === null) return [1, 1];
  const diff = targetLevel - shadeLevel;
  if (diff <= 1) return [2, 1];
  if (diff <= 3) return [1, 1];
  if (diff <= 5) return [1, 2];
  return [1, 3];
}

// 브랜드별 토닝 참고 정보. 이번 조사에서 확인한 판매 제품·공식 가이드 내용만 적었다.
export const BRAND_TONING: Record<string, { developer: string; clear: string }> = {
  wella: {
    developer: "웰라 공식 가이드: 파스텔 결과는 목표 넘버 1 : 1.9% 웰록손 퍼펙트 파스텔 디벨로퍼 2 비율",
    clear: "콜레스톤 스페셜 믹스 Clear, 고명도 12/·14/ 넘버",
  },
  loreal: {
    developer: "로레알은 저농도 다이아 액티베이터 2.7%가 판매돼요 (산성 데미 라인용)",
    clear: "카탈로그에 로레알 클리어가 없어요. 희석이 필요하면 보유한 클리어를 쓰세요",
  },
  milbon: {
    developer: "밀본 어딕시 산화제 3%·4.5% 판매 (토닝은 3%)",
    clear: "올디브 톤 컨트롤러 CO-CL·C13-CL, 어딕시 클리어0·클리어13",
  },
  shiseido: {
    developer: "프리미언스 디벨로퍼 3% 판매",
    clear: "프리미언스 컨트롤 CL 0·CL 14",
  },
  sasaki: {
    developer: "사사키 산화제 3% 판매",
    clear: "뉴사사키 LOOK 컨트롤러 CLEAR, 15레벨 넘버",
  },
  amos: {
    developer: "잇츠 에이블 디벨로퍼 1.5%·3% 판매",
    clear: "잇츠 에이블 믹스 라이트·클리어, 칼라루시드 00 쉬머링 글로스",
  },
  fiole: {
    developer: "쿠알루시아 공식 차트: 1~13레벨은 1:1, 14레벨은 1:2 혼합",
    clear: "쿠알루시아 클리어0·하이라이트너14·밀키 화이트10",
  },
};

// 사진 분석의 뿌리·중간·끝 레벨로 현재 모발 레벨을 정한다(뿌리 비중이 크다). 화면과 서버가 같은 식을 쓴다.
export function currentLevelOf(root: number, mid: number, end: number): number {
  return Math.round(root * 0.4 + mid * 0.35 + end * 0.25);
}

// 톤다운: 이만큼 이상 어둡게 하면 목표 넘버만으로는 목표 명도·톤이 안 나온다.
// 밝혀진 모발은 목표 레벨에 원래 있어야 할 난색 색소가 빠져 있어, 넘버만 바르면 비어 보이고(그린·그레이 기) 빨리 빠진다.
export const TONE_DOWN_DROP = 3;

export function isToneDown(targetLevel: number, currentLevel: number | undefined): boolean {
  return currentLevel !== undefined && currentLevel - targetLevel >= TONE_DOWN_DROP && !isToning(targetLevel);
}

// 레벨 보정: 밝혀진 모발은 흡수가 빠르고 빠지기도 빨라 한 톤 밝게 남으므로 목표보다 1레벨 어두운 넘버를 쓴다.
export function toneDownShadeLevel(targetLevel: number): number {
  return Math.max(1, targetLevel - 1);
}

// 조정색(프리피그먼트): 목표 레벨의 자연모에 있는 잔류 색소(레드·오렌지·골드)를 채운다.
export function fillerFamilies(targetLevel: number): readonly ToneFamily[] {
  return HUE_FAMILIES[underlyingPigment(targetLevel)];
}

// 120g 기준 조정색 양. 많이 내릴수록 비어 있는 색소가 많아 조정색을 늘린다.
export function fillerGrams(drop: number): number {
  return drop >= 6 ? 40 : 30;
}
