// 현장 원장님이 DM으로 공유해 준 브랜드별 컬러 레시피 (2026-09-30 캡처 2장).
// 문구와 넘버는 원문 그대로 옮겼다. 원문 표기가 모호한 부분(예: "벨트", "네이키드샌드 1제")은 해석하지 않고 그대로 둔다.
// targets(목표 컬러 이름, lib/colorTargets.ts)와 brandIds(lib/dyeCatalog.ts)는 Claude가 원문 설명(매트·애쉬·베이지 등)을 보고 붙인 매핑이다.
// 컬러핏 추천 결과 안내(colorAi.ts)와 Q&A 지식 베이스(colorKnowledgeSeed.ts)가 이 데이터를 함께 쓴다.

export type ProRecipe = {
  id: string;
  brandIds: string[];
  brandLabel: string;
  formula: string;
  mood: string;
  tips: string[];
  targets: string[];
  keywords: string[];
};

/** 모든 레시피에 공통으로 붙는 원문 조건 */
export const PRO_RECIPE_COMMON = [
  "염색모 기준 레시피예요. 버진모라면 리프트업(밝히기) 후 진행해야 하고, 아니면 밝기와 색감 표현이 덜 될 수 있어요.",
  "모든 레시피는 조합이나 양 조절에 따라 디테일이 다르고, 모질에 따라 차이가 있어요.",
];

export const PRO_RECIPES: ProRecipe[] = [
  {
    id: "pro-milbon-matte-ash-beige",
    brandIds: ["milbon"],
    brandLabel: "밀본",
    formula: "hcn 13 + fsa 13 (1:1)에 네이키드샌드 1제 15% 정도",
    mood: "밝은 톤의 매트한 애쉬 베이지 느낌 (웨딩, 외국 언니들 머리색 느낌)",
    tips: ["리프트업 사용 권장"],
    targets: ["애쉬 베이지", "샌드 베이지", "그레이지"],
    keywords: ["밀본", "hcn", "fsa", "네이키드샌드", "매트", "애쉬베이지", "웨딩", "외국인", "외국언니", "밝은톤"],
  },
  {
    id: "pro-sasaki-mint-brown",
    brandIds: ["sasaki"],
    brandLabel: "사사키",
    formula: "마레 11 + 슈퍼노바 그레이 11 (3:1)에 그린 15g 정도",
    mood: "민트 브라운 (단일 브랜드 버전), 매트 브라운",
    tips: [],
    targets: ["카키 브라운", "올리브 브라운"],
    keywords: ["사사키", "마레", "슈퍼노바", "그레이", "그린", "민트브라운", "매트브라운", "민트"],
  },
  {
    id: "pro-loreal-ash",
    brandIds: ["loreal"],
    brandLabel: "로레알",
    formula: "7.1 + cc7.1 (1:1), 벨트 15% 정도",
    mood: "애쉬. 붉은기·노란기가 제일 잘 잡혀요 (웨딩 컬러로도 추천)",
    tips: ["타사보다 색감이 오래가는 편"],
    targets: ["애쉬 브라운", "애쉬 베이지"],
    keywords: ["로레알", "7.1", "cc7.1", "애쉬", "붉은기", "노란기", "웨딩", "지속력", "오래가는"],
  },
  {
    id: "pro-shiseido-warm-beige",
    brandIds: ["shiseido"],
    brandLabel: "시세이도",
    formula: "be 11 + n 13 (1:1)",
    mood: "웜톤 분들에게 베이지 컬러로 추천",
    tips: ["모질에 따라 잘못 들어가면 노란기가 금방 올라올 수 있음", "리프트업 사용 권장"],
    targets: ["샌드 베이지", "밀크티 브라운", "골드 베이지"],
    keywords: ["시세이도", "be11", "n13", "베이지", "웜톤", "노란기"],
  },
  {
    id: "pro-mix-matte-green",
    brandIds: ["loreal", "sasaki", "milbon"],
    brandLabel: "로레알 + 사사키 + 밀본 믹스",
    formula: "로레알 6.07 : 사사키 마레 그린(7·9레벨) : 밀본 어딕시 사파이어(7레벨) = 1 : 1 : 0.5, 사사키 부스터 그린 15g 정도",
    mood: "매트한 색감 (비율은 그때그때 조금씩 다르게 들어감)",
    tips: [
      "로레알은 07 라인에서 밝기를 골라 쓰고, 보통 6.07을 많이 사용",
      "산화제는 보통 로레알 6% 사용",
      "밝기는 넘버로 조절",
      "너무 밝으면 모질에 따라 매트한 색감이 예쁘지 않음",
    ],
    targets: ["카키 브라운", "올리브 브라운"],
    keywords: ["로레알", "6.07", "07라인", "마레그린", "마레", "어딕시", "사파이어", "부스터그린", "매트", "그린", "카키", "산화제6%"],
  },
];

/** 추천 결과 안내 문구: 목표 컬러에 맞는 현장 레시피. 고른 브랜드의 레시피를 앞에 둔다. */
export function proRecipeNotes(targetName: string, brandId?: string): string[] {
  const hits = PRO_RECIPES.filter((r) => r.targets.includes(targetName)).sort(
    (a, b) => Number(!!brandId && b.brandIds.includes(brandId)) - Number(!!brandId && a.brandIds.includes(brandId)),
  );
  return hits.slice(0, 2).map((r) => {
    const tips = r.tips.length ? ` (${r.tips.join(", ")})` : "";
    return `현장 원장 레시피 · ${r.brandLabel}: ${r.formula} → ${r.mood}${tips}. 염색모 기준, 버진모는 리프트업 후 진행.`;
  });
}
