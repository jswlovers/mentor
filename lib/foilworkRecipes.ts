// 『YANGLEEHAIR SIGNATURE FOILWORK DESIGN』 탈색모 디자인 레시피.
// 출처: 사용자 제공 촬영본 PDF (2026-10-30) "126.pdf"(책 p.14~157), "UNIQUE DESIGN.pdf"(p.158~171).
// formula·steps는 책 표기를 그대로 옮겼다(브랜드: ORDEVE·Addicthy=MILBON, SASAKI, PRIMIENCE·COLORMUSE=SHISEIDO).
// look(색 이름)과 targets(컬러핏 목표 컬러 매핑)는 사진을 보고 Claude가 붙인 것이다.
// Q&A 항목은 lib/server/colorKnowledgeSeed.ts, 추천 문구는 lib/server/colorAi.ts에서 쓴다.

export type FoilworkRecipe = {
  id: string;
  look: string;
  base: string;
  formula: string;
  targets: string[];
  page: string;
  steps?: string[];
};

export const FOILWORK_RECIPES: FoilworkRecipe[] = [
  {
    id: "yl-highlight-purple",
    look: "7레벨 딥퍼플브라운 베이스에 라이트퍼플 하이라이트",
    base: "7Lv (퍼플 딥 브라운)",
    formula:
      "Bleach ORDEVE Addicthy High Bleach + 6% (1:2) / Root & Stain Cover b7-PB + 5% (Beaute) / Highlight Toner 9-55 : 9-CB (2:1) + 3%",
    targets: ["바이올렛", "라벤더", "모브", "플럼"],
    page: "p.34~37",
    steps: [
      "레이어드 컷이면 호일워크 전에 기장과 질감을 먼저 컷한다(컷 디자인에 따라 호일워크 표현이 달라진다)",
      "위빙: 백 하단 칩 0.7cm·슬라이스 1.5cm, 백 상단·사이드 칩 1cm·피치 0.7cm·슬라이스 2cm, 탑 써클섹션 키시멘칩 0.3cm·슬라이스 1cm",
      "열처리 10분(50도, 랩) 후 자연방치, 10분 뒤 레벨을 체크해 탈색 완료된 부분은 와이퍼로 닦아낸다",
      "탈색이 덜 된 부분은 블리치 파워를 높여(9% 1:1) 10분 후 체크, 18Lv 완료 후 보색샴푸로 헹군다",
      "띠 작업(모근 블리치 얼룩 커버) 자연방치 20분 → 웨트 상태에서 토너 7~10분, 원하는 컬러를 체크하며 헹군다",
    ],
  },
  {
    id: "yl-highlight-beige",
    look: "7~8레벨 베이스에 베이지한 하이라이트",
    base: "4/9~10Lv (브라운)",
    formula:
      "Bleach ORDEVE Addicthy High Bleach + 6% (1:2) / Base Color Change(8Lv) 8fGG : 8CB (1:1) + 4% / Root & Stain Cover 7fGG : 7-CB (2:1) + 4.5% / Highlight Toner 9-CB + 4%",
    targets: ["샌드 베이지", "밀크티 브라운", "애쉬 베이지", "모카 브라운"],
    page: "p.40~42",
    steps: [
      "위빙: 백 하단 칩 1cm·피치 1cm·슬라이스 1.5cm, 백 상단·사이드·탑 칩 1cm·피치 1cm·슬라이스 2cm",
      "탑은 모발 숱에 따라 슬라이스 폭을 조정(갈라짐 주의), 가르마 부분은 2mm 커버링",
      "열처리 10분(50도) → 블리치 18Lv 완료 후 헹굼 직전 베이스 약제를 섞어 베이스 컬러를 먼저 헹군다",
      "모근 쪽만 말린 뒤 모근염색·띠 작업 방치 20분 → 웨트 상태 토너 7~10분(약제는 시술 10분 전에 혼합) → 고보습 트리트먼트",
    ],
  },
  {
    id: "yl-lowlight-black-white",
    look: "블랙과 화이트가 조화로운 로우라이트",
    base: "3/18Lv (모근 3Lv / 탈색모)",
    formula: "Base Color Lowlight 3-NB + 3% (ORDEVE)",
    targets: ["블랙", "실버", "그레이"],
    page: "p.94",
    steps: [
      "1:1:1 디자인 칩(칩 1cm·피치 1cm·슬라이스 1.5cm), 가로섹션 기본으로 촘촘히 호일워크",
      "위빙된 탈색 모발에 톤다운 약제를 바르고 모근은 따로 터치하지 않음, 25분 방치",
      "헹굼 시 에멀전해 라이트한 블리치모에 색을 더한다",
    ],
  },
  {
    id: "yl-reverse-ombre-ash",
    look: "모근부터 섀도우 그라데이션되는 투명한 파스텔 애쉬 옴브레 (에어터치)",
    base: "4/19Lv (Bleach hair)",
    formula:
      "Shadow Down 5-Silver : 7-Silver (1:1) + 3% / Root & Stain Cover 5-Silver + 3% / Highlight Toner 13-Silver : Clear (1:1) + 3% (ORDEVE Addicthy)",
    targets: ["애쉬 그레이", "실버", "그레이"],
    page: "p.131~133",
    steps: [
      "탑 슬라이스 폭 1cm, 미들라인·네이프라인 3cm로 에어터치(드라이 바람으로 단차 머리를 띄움)",
      "띄운 탈색 단모에 섀도우 다운 컬러를 바르고 20분 방치 → 루트&스테인 커버 → 샴푸대에서 토너",
    ],
  },
  {
    id: "yl-secret-pink",
    look: "페이스 프레이밍 시크릿 컬러(핑크) + 차분한 베이스",
    base: "4~5Lv / 14Lv (탈색·염색 후 빠진 상태)",
    formula: "Bleach 17Lv: ORDEVE Addicthy High Bleach + 6% (1:2) / Design Color PINK(SASAKI) + 3% / Base Down b7-MB + 4.5% (Beaute)",
    targets: ["핑크", "마젠타", "코랄 핑크"],
    page: "p.146~147",
    steps: [
      "시크릿 컬러 라인은 모근 2~3cm 아래. 앞머리 양의 절반을 호일워크로 리터치(모근 2~3cm 제외)",
      "앞머리·하프라인 17Lv 탈색 → 디자인 컬러 도포 → 디자인 컬러 부분을 제외하고 베이스 도포",
    ],
  },
  {
    id: "yl-gradation-pink",
    look: "핑크 컬러를 그라데이션 느낌으로 (Dark shadow→Very Light)",
    base: "5/6/17Lv (탈염 베이스)",
    formula:
      "Bleach 상단 6% / 하단 3% (1:2) / 모근 3cm 7-55 : PINK (5:1) + 4% / 기장 5cm 8-55 : PINK (5:1) + 4% / 다음 5cm 11-55 : PINK (5:1) + 4% / 나머지 13-55 + 4% (ORDEVE, SASAKI)",
    targets: ["핑크", "로즈 브라운", "핑크 베이지"],
    page: "p.148~151",
    steps: [
      "모근 1cm 띄우고 탈색된 부분까지 블리치 6% → 먼저 바른 부분이 17Lv 발색되면 아랫부분 블리치 3%",
      "보색샴푸로 헹구고 노란 기 중화를 위해 5분 방치 → 18Lv 완성",
      "탑 블록킹 후 모근 3cm → 기장 5cm씩 약제를 바꿔 도포(탑은 1cm씩 교차로 1번·2번 약제를 슬라이스)",
    ],
  },
  {
    id: "yl-pastel-beige-onetone",
    look: "베이지 컬러를 원톤의 파스텔 느낌으로 그라데이션",
    base: "5Lv (자연모)",
    formula:
      "Bleach + 6% (1:2) / 모근 2cm 8-NB + 3% / 기장 3cm 9-NB : 11-NB (2:1) + 3% / 나머지 13-NB : 11NB (2:1) + 4% (ORDEVE)",
    targets: ["샌드 베이지", "밀크티 브라운", "그레이지"],
    page: "p.154~155",
    steps: [
      "탈색제 도포 전 탈색 전용 플렉스 제품을 반드시 사용해야 손상을 줄일 수 있다. 기화현상이 생기지 않도록 전용 파우더를 혼합",
      "모근 1cm 제외한 기장부 블리치 → 17Lv 목표, 방치 타임을 보며 체크 → 목표 Lv가 나오면 모근 터치 → 18Lv",
      "모근 2cm → 기장 3cm → 나머지 순 도포, 20~25분 방치 → 에멀전 후 헹굼 → 색빠짐 방지 케어",
    ],
  },
  {
    id: "yl-white-beige",
    look: "크리미한 화이트 베이지 (숏)",
    base: "5Lv/17~18Lv (탈염 베이스)",
    formula: "Bleach 상단 7.5% / 하단 3% (1:2) / 모근 2cm 13-CB + 4% / 기염부 13-CB : Clear (1:1) + 4% (ORDEVE)",
    targets: ["샴페인 골드", "샌드 베이지", "실버"],
    page: "p.156~158",
    steps: [
      "탈색 전 컷 → 모근에서 띄운 상태로 7.5%로 블리치, 모근 쪽 얼룩 방지를 위해 4섹션으로 파지",
      "자연방치 20분 → 모근 쪽은 6%로 블리치 → 19Lv가 되면 보색샴푸로 헹굼",
      "건조 전 단백질제를 충분히 도포하고 100% 건조 → 모근 2cm → 기염부 도포 → 색빠짐 방지제와 단백질 샴푸로 케어",
    ],
  },
  {
    id: "goyou-two-tone",
    look: "하프라인 기준 유니크한 투톤 (핑크·블루)",
    base: "19Lv (탈색 2회, 블리치 + 6%)",
    formula: "Half Line Up EB5 : CL (1:5) + COLOR MUSE Blue 20% + 3% / Half Line Down P9 : COLOR MUSE Pink 10% + 3% (SHISEIDO, COLORMUSE)",
    targets: ["블루", "핑크", "마젠타"],
    page: "p.159~160",
    steps: ["B.P·G.P·T.S.P(투섹션 포인트) 기준 하프라인으로 나눠 하단 약제 → 상단 약제 순 도포, 랩처리 자연방치 후 컬러 체크"],
  },
  // UNIQUE DESIGN RECIPE (p.166~171) 사진별 레시피
  { id: "ur-pastel-pink", look: "파스텔 핑크", base: "18Lv", formula: "모근 9-55 : PINK (3:1) + 4% / 기염부 (9-55 : PINK (3:1)) : Clear (1:3) + 4%", targets: ["핑크", "핑크 베이지"], page: "p.166" },
  { id: "ur-light-blue", look: "라이트 블루", base: "18Lv", formula: "모근 7-Sapphire : 9-Sapphire (1:1) + 4% / 기염부 13-CB : Clear (1:1) + 4%", targets: ["블루"], page: "p.166" },
  { id: "ur-white-silver", look: "화이트 실버", base: "19Lv", formula: "13-Silver : Clear (1:3) : 13-Amethyst(약제혼합의 10%) + 4%", targets: ["실버"], page: "p.166" },
  { id: "ur-pink-beige-blonde", look: "베이지 블론드", base: "18Lv", formula: "모근 7-NB + 3% / 기염부 11NB + 4.5%", targets: ["샌드 베이지", "골드 베이지"], page: "p.166" },
  { id: "ur-white-beige-short", look: "화이트 베이지", base: "18Lv", formula: "11-iPT : 11NB (1:1) : 11/60(약제혼합의 10%) + 4%", targets: ["샴페인 골드", "샌드 베이지"], page: "p.166" },
  { id: "ur-white-gray", look: "화이트 그레이", base: "19Lv", formula: "13-CB : Clear (1:1) : 13/60(약제혼합의 10%) + 4%", targets: ["실버", "그레이"], page: "p.166" },
  { id: "ur-lavender-pink", look: "라벤더 핑크", base: "18Lv", formula: "모근 BaP 9 : BaP 11 (2:1) + 3% / 기염부 BaP 13 + 4% (PRIMIENCE)", targets: ["라벤더", "핑크"], page: "p.166" },
  { id: "ur-beige-brown", look: "베이지 브라운", base: "18Lv", formula: "8-NB : 8fGG (1:1) + 4%", targets: ["밀크티 브라운", "모카 브라운"], page: "p.166" },
  { id: "ur-deep-blue", look: "딥 블루", base: "18Lv", formula: "Top Weaving 1-NB + 3% / 7-Sapphire : BLUE (5:1) + 3%", targets: ["네이비", "블루", "블루 블랙"], page: "p.166" },
  { id: "ur-ivory-white", look: "아이보리 화이트", base: "19Lv", formula: "Clear : 13-CB (3:1) : 13-60(10%) + 4%", targets: ["샴페인 골드"], page: "p.167" },
  { id: "ur-ash-gray-wave", look: "애쉬 그레이", base: "18Lv", formula: "모근 8iPT : 7iPT (3:1) : 8-55(10%) + 4.5% / 기염 9iPT : 8iPT (3:1) : 9-55(10%) + 4.5%", targets: ["애쉬 그레이", "그레이"], page: "p.167" },
  { id: "ur-rose-pink", look: "로즈 핑크", base: "18Lv", formula: "모근 8-55 : PINK (5:1) + 4% / 기염부 11-55 : PINK (5:1) + 4%", targets: ["로즈 브라운", "핑크"], page: "p.167" },
  { id: "ur-violet-blue", look: "바이올렛 블루 디자인", base: "18Lv Design", formula: "7-Amethyst + 4% / 7-Silver : 9-Silver + 4%", targets: ["바이올렛"], page: "p.167" },
  { id: "ur-pink-beige", look: "핑크 베이지 디자인", base: "18Lv Design", formula: "9-hCN + 6% / 11-hCN + 4%", targets: ["핑크 베이지", "코랄 오렌지"], page: "p.167" },
  { id: "ur-pink-red-design", look: "핑크 레드 디자인", base: "18Lv Design", formula: "8-55 : PINK (3:1) + 5% / 11-55 : PINK (3:1) + 4%", targets: ["마젠타", "체리 레드"], page: "p.167" },
  { id: "ur-balayage-blonde", look: "발레아쥬 블론드", base: "18Lv Balayage", formula: "Toner 13-NB + 3%", targets: ["샴페인 골드", "옐로우 블론드"], page: "p.167" },
  { id: "ur-blue-pink", look: "블루+핑크", base: "18Lv", formula: "Blue : Clear (1:2) + 3% / PINK : Clear (1:2) + 3% (SASAKI)", targets: ["블루", "핑크"], page: "p.167" },
  { id: "ur-burgundy-highlight", look: "버건디 레드 하이라이트", base: "16Lv Highlight", formula: "모근 7-55 : RED (1:1) + 5% / 기염부 8-55 : RED (1:1) + 5%", targets: ["버건디", "와인 레드", "체리 레드"], page: "p.167" },
  { id: "ur-orange-design", look: "오렌지 디자인", base: "18Lv Design", formula: "Top Weaving 1-NB + 3% / PaleOrange : ORANGE (2:1) + 3%", targets: ["오렌지 카퍼", "코랄 오렌지"], page: "p.168" },
  { id: "ur-money-piece", look: "머니피스", base: "18Lv Money piece", formula: "11-NB + 4%", targets: ["허니 브라운", "골드 베이지"], page: "p.168" },
  { id: "ur-mint-gray", look: "민트 그레이", base: "18Lv", formula: "Clear : Green : yellow : blue (20:2:1:1) + 4.5% (SASAKI)", targets: ["민트", "틸 블루"], page: "p.168" },
  { id: "ur-red", look: "레드", base: "16Lv", formula: "RED + 4% (SASAKI)", targets: ["레드", "체리 레드"], page: "p.168" },
  { id: "ur-pale-khaki", look: "애쉬 카키 그레이", base: "18Lv Design", formula: "PaleKhaki : Clear (1:1) + 4%", targets: ["카키 브라운", "올리브 브라운"], page: "p.168" },
  { id: "ur-magenta-purple", look: "마젠타 퍼플", base: "18Lv Design", formula: "Cleo Rose : Mystic Heather (1:1), Point Bleach – No Touch (MANIC PANIC)", targets: ["마젠타", "바이올렛"], page: "p.168" },
  { id: "ur-purple-two-tone", look: "퍼플 투톤", base: "18Lv", formula: "모근·네이프 라인 5-Sapphire + 3% / 기염부 9-Silver : 13-Silver (2:1) + 3% / 앞라인 9-Amethyst + 3%", targets: ["바이올렛", "라벤더"], page: "p.168" },
  { id: "ur-lavender-gray", look: "라벤더 그레이", base: "18Lv", formula: "모근 9-CB + 4% / 기염부 11-CB + 4%", targets: ["그레이지", "라벤더"], page: "p.168" },
  { id: "ur-green", look: "그린 디자인", base: "18Lv Design", formula: "Top Weaving 1-NB + 3% / GREEN + 4% (SASAKI)", targets: ["에메랄드 그린"], page: "p.168" },
  { id: "ur-silver-gray-bob", look: "실버 그레이", base: "18Lv", formula: "PaleKakhaki : Clear (1:1) + 3%", targets: ["실버", "애쉬 그레이"], page: "p.169" },
  { id: "ur-pure-blue", look: "딥 블루 디자인", base: "18Lv Design", formula: "Top Weaving 1-NB + 3% / PureBlue (anthocyanin)", targets: ["네이비", "블루"], page: "p.169" },
  { id: "ur-red-ombre", look: "레드 옴브레", base: "18Lv Ombre", formula: "8-55 : PINK (10:1) + 3%", targets: ["와인 레드", "체리 레드"], page: "p.169" },
  { id: "ur-beige-highlight", look: "베이지 하이라이트", base: "18Lv Highlight", formula: "Base Color 8-CB + 4.5% / Toner PaleBeige : Clear (1:1) + 3%", targets: ["밀크티 브라운", "애쉬 베이지"], page: "p.169" },
  { id: "ur-pink-balayage", look: "핑크 발레아쥬", base: "18Lv Balayage", formula: "8-58 : PINK (10:1) + 3%", targets: ["로즈 브라운", "핑크"], page: "p.169" },
  { id: "ur-beige-ombre", look: "베이지 옴브레", base: "18Lv Ombre", formula: "상단 7-CB : 7hCN (1:1) + 3% / 중단 8-CB + 4.5% / 하단 11-CB + 4.5%", targets: ["밀크티 브라운", "샌드 베이지"], page: "p.169" },
  { id: "ur-silver-ombre", look: "실버 옴브레", base: "18Lv Ombre", formula: "Base Color 6fGG : 1-NB (10:1) + 3% / Toner 9-Silver : 13-Silver (1:1) + 4.5%", targets: ["애쉬 그레이", "실버"], page: "p.169" },
  { id: "ur-orange-ombre", look: "오렌지 옴브레", base: "17Lv Ombre", formula: "Base Color 6fGG : 1-NB (10:1) + 3% / Toner PaleOrange : Clear (1:1) + 3%", targets: ["오렌지 브라운", "오렌지 카퍼"], page: "p.169" },
  { id: "ur-pink-clear", look: "라벤더 핑크", base: "18Lv", formula: "Clear : PINK (5:1) + 4% (SASAKI)", targets: ["핑크", "핑크 베이지"], page: "p.169" },
  { id: "ur-white-silver-p7", look: "화이트 실버", base: "19Lv", formula: "P7 : CL (1:20) + 3% (PRIMIENCE)", targets: ["실버"], page: "p.170" },
  { id: "ur-blue-pastel-eb5", look: "파스텔 블루", base: "19Lv", formula: "EB5 : CL/0 (1:10) + 3% / EB5 : CL/0 (1:1) + 3% (PRIMIENCE)", targets: ["블루"], page: "p.170" },
  { id: "ur-orange-yellow", look: "오렌지 옐로우", base: "18Lv", formula: "1N + 3% / Orange : Yellow (1:1) + 3% (COLORMUSE)", targets: ["옐로우 블론드", "코랄 오렌지"], page: "p.170" },
  { id: "ur-pink-red-r8", look: "핑크 레드", base: "19Lv", formula: "LT/13 : WHITE SILVER (1:1) + 3% / R8 : RED (8:2) + 3% (PRIMIENCE, COLORMUSE)", targets: ["코랄 핑크", "레드"], page: "p.170" },
  { id: "ur-violet-highlight", look: "바이올렛 하이라이트", base: "19Lv Highlight Design", formula: "VIOLET (COLORMUSE)", targets: ["바이올렛"], page: "p.170" },
  { id: "ur-blue-violet", look: "블루 바이올렛", base: "19Lv", formula: "P5 + 3% / EB5 + CL/0 (1:15) + 3% (PRIMIENCE)", targets: ["바이올렛", "네이비"], page: "p.170" },
  { id: "ur-violet-pink", look: "바이올렛 + 핑크", base: "19Lv", formula: "VIOLET : WHITE (1:5) / PINK : WHITE (1:10) (COLORMUSE)", targets: ["라벤더", "핑크"], page: "p.170" },
  { id: "ur-black-blue-inner", look: "블랙 + 블루 이너", base: "19Lv Design", formula: "EB5 : CL/0 (1:5) + 3% (PRIMIENCE)", targets: ["블루 블랙"], page: "p.170" },
  { id: "ur-yellow-orange-red", look: "옐로우·오렌지·레드", base: "19Lv Design", formula: "YELLOW / O8 : ORANGE : RED (7:2:1) + 3% (PRIMIENCE, COLORMUSE)", targets: ["옐로우 블론드", "오렌지 카퍼"], page: "p.170" },
  { id: "ur-violet-green-orange", look: "바이올렛·그린·오렌지 포인트", base: "18Lv", formula: "Clear : VIOLET (10:1) + 3% / Clear : GREEN (10:1) + 3% / Clear : ORANGE (10:1) + 3% (SASAKI)", targets: ["라벤더"], page: "p.171" },
  { id: "ur-yellow-orange", look: "옐로우 + 오렌지", base: "18Lv", formula: "YELLOW + 3% / ORANGE + 3% (SASAKI)", targets: ["옐로우 블론드", "오렌지 카퍼"], page: "p.171" },
  { id: "ur-blue-pink-sasaki", look: "블루 + 핑크", base: "18Lv", formula: "BLUE + 3% / PINK + 3% (SASAKI)", targets: ["블루", "마젠타"], page: "p.171" },
  { id: "ur-half-blue-gray", look: "블루 그레이", base: "18Lv Half", formula: "12/BP + 3% (DEMI)", targets: ["애쉬 그레이"], page: "p.171" },
  { id: "ur-yellow-green", look: "옐로우 그린", base: "18Lv", formula: "YELLOW : GREEN (20:1) + 3% / 7-Sapphire + 3%", targets: ["올리브 브라운", "카키 브라운"], page: "p.171" },
  { id: "ur-blue-orange", look: "파스텔 블루 + 오렌지", base: "18Lv", formula: "PaleBlue : Clear (1:1) + 3% / PaleOrange : Clear (1:1) + 3%", targets: ["블루", "코랄 오렌지"], page: "p.171" },
  { id: "ur-yellow-blue-orange", look: "옐로우·블루·오렌지", base: "18Lv", formula: "YELLOW + 3% / PaleBlue : BLUE (1:1) + 3% / PaleOrange + 3%", targets: ["옐로우 블론드"], page: "p.171" },
  { id: "ur-design-brown-highlight", look: "브라운 하이라이트", base: "18Lv Design", formula: "Base Color 6-NB + 3% / Toner 11-NB + 3%", targets: ["허니 브라운", "초코 브라운"], page: "p.171" },
  { id: "ur-design-blue-blonde", look: "블론드 + 파스텔 블루", base: "18Lv Design", formula: "11-NB + 3% / PaleBlue + Clear (1:1) + 3%", targets: ["애쉬 베이지"], page: "p.171" },
];

/** p.18 호일워크 용어 중 컬러핏 Q&A에 쓰는 정의. */
export const FOILWORK_TERMS: [string, string][] = [
  ["하이라이트", "헤어 슬라이스를 떠 모다발을 부분적으로 밝게 컬러링. 로우라이트는 반대로 부분적으로 톤다운"],
  ["옴브레", "투톤 염색. 블런트하게 톤 대비가 심한 컬러링"],
  ["발레아쥬", "'빗자루로 쓸다'. 모근은 어둡고 끝으로 갈수록 밝게 자연스럽게 연결. 호일발레아쥬는 위빙과 발레아쥬의 혼합"],
  ["솜브레", "소프트 옴브레. 옴브레보다 부드럽게 톤 차이를 연결, 발레아쥬와 하이라이트를 혼합한 디자인"],
  ["에어터치", "드라이 바람으로 단차 있는 짧은 머리카락을 날려 자연스럽게 걸러내고 컬러링"],
  ["블록킹", "컬러가 필요한 부분에 효율적으로 넣기 위해 섹션을 나누는 것. 누가 언제 해도 같은 위치에 작업할 수 있다"],
  ["위빙", "모발을 촘촘히 떠서 호일로 부분 색 변화. 칩(폭)·피치(간격)·깊이·슬라이스 두께로 조절"],
  ["브릭워크", "벽돌처럼 섹션마다 어긋나게 칩을 뜨는 방법"],
  ["슬라이싱", "슬라이스 그대로 면으로 떠서 도포. 위빙보다 콘트라스트가 강하다"],
  ["커버링", "위빙 칩이 표면에 확연히 드러나지 않도록 2mm 모다발을 남겨 베이스와 조화"],
  ["띠 작업(Stain Cover)", "호일워크 후 모근 쪽 블리치 얼룩을 모근 컬러와 연결하며 커버"],
  ["토너 작업", "블리치 모발에 색 입히기. 3~4% 산화제와 염모제, 웨트 또는 드라이 상태에서 3분~최대 10분 방치"],
  ["머니피스", "페이스라인 위주로 얇고 촘촘하게 넣는 포인트(위빙 or 슬라이스칩)"],
  ["페이스 프레이밍", "얼굴 주변에 컬러를 배치하는 디자인. 시크릿컬러·이너컬러라고도 한다"],
  ["루트 섀도우·루트 멜트", "모근 컬러를 디자인 있게 어둡게, 또는 코밍으로 녹아내리듯 연결"],
];

/** 하이라이트·옴브레·투톤처럼 일부만 다르게 넣는 디자인인지(전체 원톤 토닝이 아닌지). */
export function isPartialDesign(r: FoilworkRecipe): boolean {
  return (
    /design|highlight|ombre|balayage|money|half/i.test(r.base) ||
    /하이라이트|로우라이트|옴브레|발레아쥬|시크릿|투톤|디자인|에어터치|그라데이션|포인트|머니피스|이너|\+|·/.test(r.look)
  );
}

/** 추천 결과 안내 문구: 목표 컬러에 맞는 탈색모 레시피(탈색·토닝일 때만 의미가 있다).
 *  컬러핏 추천은 전체 토닝이라 원톤 레시피를 먼저 쓰고, 없을 때만 부분 디자인 레시피를 표시해 보여준다. */
export function foilworkRecipeNotes(targetName: string, toning: boolean): string[] {
  if (!toning) return [];
  const hits = FOILWORK_RECIPES.filter((r) => r.targets.includes(targetName));
  const oneTone = hits.filter((r) => !isPartialDesign(r));
  const picked = oneTone.length ? oneTone : hits.filter(isPartialDesign);
  return picked
    .slice(0, 2)
    .map((r) => `탈색모 ${isPartialDesign(r) ? "부분 디자인" : "원톤"} 레시피 · ${r.look} (${r.base} 베이스): ${r.formula}. 디자인·모발 상태에 따라 조정하세요.`);
}
