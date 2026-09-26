// 컬러핏 AI의 "배색 이미지" 가이드 데이터.
// 출처: 배색·레이아웃 교재 92쪽 「배색으로 바뀌는 색의 이미지」 (빨강·검정 예시).
// 색은 교재 인쇄 견본을 눈으로 옮긴 근사값이다. swatch의 weight는 면적 비율.

export type Swatch = { color: string; weight?: number };
// sets: 교재에서 같은 설명에 견본이 여러 개 붙은 경우 각각 한 줄씩.
export type Harmony = { mood: string; sets: Swatch[][]; description: string };
export type HarmonyGroup = { key: string; name: string; base: string; harmonies: Harmony[] };

export const HARMONY_INTRO =
  "색에는 그 색 자체의 이미지가 있지만, 다른 색과 조합하면 그 이미지가 크게 달라집니다.";

export const HARMONY_TIP =
  "배색을 이야기하다 보면 목표와 방향이 달라질 수 있어요. 먼저 원하는 이미지를 분명히 정하고, 옆에 놓일 색을 함께 생각하는 것이 중요해요.";

const RED = "#c0504d";
const BLACK = "#3a3a3c";

export const HARMONY_GROUPS: HarmonyGroup[] = [
  {
    key: "red",
    name: "빨강",
    base: RED,
    harmonies: [
      {
        mood: "여성적 · 화려함",
        sets: [[{ color: "#f2cdd6" }, { color: RED }]],
        description: "핑크를 조합하면 여성스러움이 생긴다.",
      },
      {
        mood: "여성적 · 엘레강스",
        sets: [[{ color: "#f5dde3", weight: 2 }, { color: RED, weight: 0.6 }, { color: "#a9a6d6", weight: 1.4 }]],
        description: "빨강을 줄이고 라벤더 같은 보라를 더하면 여성스러움이 더욱 강조된다.",
      },
      {
        mood: "즐거움 · 앳되다",
        sets: [
          [{ color: "#e6d84a" }, { color: RED }],
          [{ color: "#e5805e" }, { color: RED }],
        ],
        description: "노랑과 오렌지를 조합하면 빨강의 즐거움이 강조된다.",
      },
      {
        mood: "활기 · 즐겁다",
        sets: [[{ color: "#e6d84a" }, { color: RED }, { color: "#5a68b8" }]],
        description: "파랑을 더하면 색상 차이가 돋보이고, 노랑·빨강의 즐거움이 강조된다.",
      },
      {
        mood: "대담 · 격렬하다",
        sets: [[{ color: BLACK }, { color: RED }]],
        description: "검정은 빨강의 강도를 강조한다.",
      },
    ],
  },
  {
    key: "black",
    name: "검정",
    base: BLACK,
    harmonies: [
      {
        mood: "대담 · 격렬하다",
        sets: [
          [{ color: "#c85a64" }, { color: BLACK }],
          [{ color: "#e8955a" }, { color: BLACK }],
        ],
        description: "검정은 난색의 이미지를 과장해서 전체를 강하게 만든다.",
      },
      {
        mood: "클리어 · 스포티",
        sets: [[{ color: BLACK, weight: 5 }, { color: "#c85a64", weight: 1 }]],
        description: "빨강의 비율을 줄여 액센트로 쓰면 모던한 이미지가 된다.",
      },
      {
        mood: "샤프 · 심플",
        sets: [[{ color: "#f5f5f5" }, { color: "#8e8e90" }, { color: BLACK }]],
        description: "모노톤의 콘트라스트는 샤프하고 심플한 이미지.",
      },
      {
        mood: "이지적 · 중후",
        sets: [[{ color: "#3f4a44" }, { color: "#454349" }]],
        description: "짙은 녹색과 조합하면 중후한 인상이 된다.",
      },
      {
        mood: "클래식 · 엄숙함",
        sets: [[{ color: "#3f4a44" }, { color: "#3e3a40" }, { color: "#4c3a4a" }]],
        description: "녹색이 검정의 강도를 부드럽게 해서 안정된 인상으로.",
      },
    ],
  },
];

// 목표 헤어 컬러별로 교재에서 해당되는 배색 항목. (그룹 key, mood)
// 교재에 직접 대응되는 예시가 없는 컬러(코코아 브라운)는 넣지 않는다.
const TARGET_HARMONY: Record<string, { family: string; picks: [string, string][] }> = {
  "로즈 브라운": {
    family: "빨강 계열",
    picks: [["red", "여성적 · 화려함"], ["red", "여성적 · 엘레강스"], ["red", "대담 · 격렬하다"]],
  },
  "바이올렛": {
    family: "보라 계열",
    picks: [["red", "여성적 · 엘레강스"]],
  },
  "카키 브라운": {
    family: "짙은 녹색 계열",
    picks: [["black", "이지적 · 중후"], ["black", "클래식 · 엄숙함"]],
  },
  "애쉬 베이지": {
    family: "모노톤 계열",
    picks: [["black", "샤프 · 심플"]],
  },
};

// 컬러핏 AI 추천 결과의 Stylist Check에 붙일 배색 상담 팁.
export function harmonyNotes(targetName: string): string[] {
  const entry = TARGET_HARMONY[targetName];
  if (!entry) return [];
  const tips = entry.picks
    .map(([key, mood]) => HARMONY_GROUPS.find((g) => g.key === key)?.harmonies.find((h) => h.mood === mood))
    .filter((h): h is Harmony => !!h)
    .map((h) => `${h.mood.replace(/ · /g, "·")}: ${h.description}`);
  if (tips.length === 0) return [];
  return [`배색 팁 (${targetName}, ${entry.family}) — ${tips.join(" / ")} 의상·메이크업 색과 함께 상담해 보세요.`];
}
