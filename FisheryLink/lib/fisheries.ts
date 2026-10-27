// 어업 분야 도감. 질문 분야(category)와 전문가 전문 분야가 모두 이 목록의 id를 쓴다.
// 서버(질문 검증)와 화면(분야 선택·도감)이 같은 파일을 읽으므로 분야를 더하거나 고칠 때는 여기만 바꾸면 된다.

export type FieldItem = {
  id: string;
  name: string;
  /** 다른 이름·학명 대신 현장에서 부르는 이름 */
  alias?: string;
  /** 주 생산지 */
  regions: string;
  /** 양식·조업 방식 */
  method: string;
  /** 한 줄 소개 */
  desc: string;
  /** 조합원이 자주 묻는 주제 */
  topics: string[];
};

export type FieldGroup = { id: string; name: string; icon: string; desc: string; items: FieldItem[] };

export const FIELD_GROUPS: FieldGroup[] = [
  {
    id: "fish",
    name: "해면양식 · 어류",
    icon: "🐟",
    desc: "육상수조와 해상가두리에서 기르는 바닷물고기",
    items: [
      { id: "flounder", name: "광어", alias: "넙치", regions: "제주, 전남 완도", method: "육상수조식 (지하해수·유수식)", desc: "국내 양식 어류 생산량 1위. 육상수조에서 연중 양성한다.", topics: ["에드워드병·연쇄구균증", "스쿠티카충", "VHS(바이러스성출혈성패혈증)", "사료효율·성장", "출하 크기와 가격"] },
      { id: "rockfish", name: "우럭", alias: "조피볼락", regions: "경남 통영, 전남 여수, 충남 태안", method: "해상가두리", desc: "광어 다음으로 많이 기르는 어류. 저수온에 강하지만 고수온에 약하다.", topics: ["고수온 대량폐사", "적조 대응", "연쇄구균증", "생사료·배합사료 전환", "월동 관리"] },
      { id: "red-seabream", name: "참돔", regions: "경남 통영·거제, 전남 여수", method: "해상가두리", desc: "체색 관리가 상품성을 좌우하는 고급 어종.", topics: ["체색(흑화) 관리", "이리도바이러스", "선도 유지·활어 수송", "일본 수입산과 가격 경쟁"] },
      { id: "rock-bream", name: "돌돔", regions: "경남, 전남, 제주", method: "해상가두리·육상수조", desc: "고가 횟감. 이리도바이러스 피해가 크다.", topics: ["이리도바이러스", "종자 수급", "월동", "출하 시기"] },
      { id: "black-seabream", name: "감성돔", regions: "경남, 전남", method: "해상가두리", desc: "연안 가두리 어종. 방류 사업 종자로도 쓰인다.", topics: ["종자 생산", "성장 속도", "방류용 종자 납품"] },
      { id: "mullet", name: "숭어", alias: "참숭어·가숭어", regions: "전남 무안·신안, 충남", method: "축제식(제방)·가두리", desc: "겨울철 횟감. 축제식 양식장에서 기른다.", topics: ["축제식 수질", "월동 폐사", "출하 성수기"] },
      { id: "seabass", name: "농어", regions: "경남, 전남", method: "해상가두리", desc: "여름철 횟감으로 수요가 높은 어종.", topics: ["노카르디아증", "고수온기 사료 조절", "활어 수송"] },
      { id: "yellowtail", name: "방어", alias: "부시리 포함", regions: "제주, 경남 통영·욕지", method: "해상가두리 (자연산 치어 축양)", desc: "겨울 대방어 수요로 축양이 늘고 있다.", topics: ["치어 확보", "대형 개체 사육 밀도", "기생충(아가미흡충)"] },
      { id: "bluefin-tuna", name: "참다랑어", regions: "경남 통영 욕지도", method: "외해 대형 가두리", desc: "국내 시험·상업 양식이 진행 중인 고부가 어종.", topics: ["외해 가두리 시설", "생사료 확보", "인공종자 연구"] },
      { id: "starry-flounder", name: "강도다리", regions: "경북 포항·울진, 강원", method: "육상수조식", desc: "동해안 냉수성 넙치류. 고수온에 약하다.", topics: ["여름철 냉각", "질병 관리", "판로"] },
      { id: "grouper", name: "능성어·자바리", alias: "구문쟁이·다금바리", regions: "제주, 경남", method: "육상수조·가두리", desc: "고가 바리과 어류. 성장이 느리다.", topics: ["종자 생산", "수온 유지", "바이러스성신경괴사증(VNN)"] },
      { id: "filefish", name: "쥐치", alias: "말쥐치·쥐치", regions: "경남 통영", method: "해상가두리", desc: "해파리를 먹어 혼합양식에도 쓰인다.", topics: ["종자 수급", "공식(서로 물어뜯기)", "가공 판로"] },
      { id: "salmon", name: "연어", alias: "은연어·대서양연어", regions: "강원 양양·고성, 동해 외해", method: "해상가두리·순환여과식(RAS)", desc: "국산 연어 양식을 위한 신규 분야.", topics: ["냉수 확보", "RAS 설비", "수입산과 가격 경쟁"] },
    ],
  },
  {
    id: "shellfish",
    name: "해면양식 · 패류",
    icon: "🦪",
    desc: "수하식·바닥식·가두리로 기르는 조개류",
    items: [
      { id: "oyster", name: "굴", alias: "참굴", regions: "경남 통영·거제·고성, 전남 여수", method: "수하식 (연승·뗏목)", desc: "남해안 대표 패류. 수출 비중이 높다.", topics: ["노로바이러스 관리", "패각 처리", "채묘·종패", "수출 위생(지정해역)", "박신 인력"] },
      { id: "abalone", name: "전복", alias: "참전복·말전복", regions: "전남 완도·진도·해남", method: "해상가두리 (다시마·미역 먹이)", desc: "국내 생산 대부분이 완도. 먹이 해조류 확보가 관건.", topics: ["고수온 폐사", "먹이 해조류 수급", "가두리 시설 태풍 피해", "출하 크기·가격"] },
      { id: "mussel", name: "홍합", alias: "진주담치", regions: "경남 창원·고성·거제", method: "수하식", desc: "생산량은 많고 단가는 낮은 패류.", topics: ["패류독소", "대량 생산 판로", "탈각 가공"] },
      { id: "scallop", name: "가리비", alias: "참가리비·해만가리비", regions: "경남 고성, 강원 고성", method: "수하식 (채롱·귀매달기)", desc: "남해안 고성 해만가리비, 동해안 참가리비가 대표.", topics: ["종패 수급", "고수온 폐사", "패류독소"] },
      { id: "manila-clam", name: "바지락", regions: "충남 태안·서산, 전북 고창, 경남", method: "갯벌 살포식", desc: "어촌계 공동어장의 대표 품목.", topics: ["종패 살포", "갯벌 환경 변화", "불가사리·쏙 피해", "어촌계 공동작업"] },
      { id: "cockle", name: "꼬막", alias: "참꼬막·새꼬막", regions: "전남 보성·고흥·여수, 순천만", method: "갯벌 살포식·채묘", desc: "생산량이 크게 줄어 종패 확보가 과제.", topics: ["채묘 부진", "폐사 원인", "자원 회복"] },
      { id: "ark-shell", name: "피조개", regions: "경남 진해만, 전남", method: "바닥식", desc: "수출 품목이었던 대형 조개류.", topics: ["빈산소 피해", "종패", "수출"] },
      { id: "pen-shell", name: "키조개", regions: "충남 보령, 전남 장흥·득량만", method: "잠수기 채취·바닥식", desc: "관자를 주로 이용하는 고가 조개.", topics: ["자원 관리", "잠수기 허가"] },
      { id: "razor-clam", name: "개조개·맛조개", regions: "경남, 서해안", method: "갯벌·바닥 채취", desc: "갯벌 패류. 맨손·잠수 채취가 많다.", topics: ["채취 허가", "자원량 변동"] },
    ],
  },
  {
    id: "seaweed",
    name: "해면양식 · 해조류",
    icon: "🌿",
    desc: "김·미역·다시마 등 겨울철 해조류 양식",
    items: [
      { id: "laver", name: "김", alias: "방사무늬김·모무늬돌김", regions: "전남 신안·고흥·해남·진도·완도, 충남 서천, 전북 부안", method: "지주식·부류식(뜬발)", desc: "최대 수출 수산물. 마른김·조미김으로 가공한다.", topics: ["갯병(붉은갯병·호상균)", "황백화(영양염 부족)", "산 처리 기준", "채묘·냉동망", "위판 가격"] },
      { id: "sea-mustard", name: "미역", regions: "전남 완도·진도·고흥, 부산 기장", method: "연승 수하식", desc: "산모·제사 수요가 꾸준한 대표 해조류.", topics: ["종묘 생산", "끝녹음 현상", "건조·염장 가공", "전복 먹이용 판매"] },
      { id: "kelp", name: "다시마", regions: "전남 완도, 부산 기장", method: "연승 수하식", desc: "식용·육수용과 전복 먹이로 쓰인다.", topics: ["건조 기상 관리", "엽체 탈락", "전복 먹이 수급"] },
      { id: "hijiki", name: "톳", regions: "전남 진도·완도, 제주", method: "연승 수하식", desc: "일본 수출 비중이 큰 해조류.", topics: ["수출 규격", "건조·자숙 가공"] },
      { id: "maesaengi", name: "매생이", regions: "전남 장흥·완도·고흥", method: "지주식 (대나무 발)", desc: "겨울 한철 생산되는 고급 해조류.", topics: ["수온·기상 의존", "짧은 출하기", "냉동 유통"] },
      { id: "green-laver", name: "파래·감태", regions: "전남, 충남", method: "지주식·자연 채취", desc: "김 양식장과 함께 관리하는 녹조류.", topics: ["김 양식장 혼입", "가공 판로"] },
      { id: "gracilaria", name: "꼬시래기·모자반", alias: "참모자반·청각 포함", regions: "제주, 경남, 전남", method: "연승 수하식", desc: "소규모 신규 해조류 품목.", topics: ["종묘 확보", "판로 개척"] },
    ],
  },
  {
    id: "invertebrate",
    name: "해면양식 · 멍게·해삼 등",
    icon: "🪸",
    desc: "멍게·미더덕·해삼·성게 등 무척추동물",
    items: [
      { id: "sea-squirt", name: "멍게", alias: "우렁쉥이", regions: "경남 통영·거제, 경북 포항", method: "수하식 (채묘 후 연승 2~3년)", desc: "국내 생산 대부분이 통영·거제. 여름 고수온 폐사가 반복된다.", topics: ["고수온 대량폐사", "물렁증(피낭연화증)", "채묘·종묘 확보", "출하 조절과 가격"] },
      { id: "warty-sea-squirt", name: "미더덕", alias: "오만둥이 포함", regions: "경남 창원 진동만", method: "수하식", desc: "창원 진동이 주산지인 피낭류.", topics: ["껍질 탈피 가공", "부착생물 관리"] },
      { id: "sea-cucumber", name: "해삼", regions: "경남, 전남, 경북, 충남", method: "바다목장·축제식·육상수조", desc: "건해삼 수출을 노린 양식이 늘고 있다.", topics: ["종묘 방류", "여름잠(하면)", "건해삼 가공·수출", "도난 방지"] },
      { id: "sea-urchin", name: "성게", alias: "보라성게·말똥성게", regions: "강원, 경북, 제주", method: "마을어장 채취·축양", desc: "해녀 채취 비중이 높고 갯녹음과 연관된다.", topics: ["갯녹음(바다 사막화)", "생식소 축양", "채취 시기"] },
      { id: "spoon-worm", name: "개불", regions: "경남, 전남", method: "갯벌·바닥 채취", desc: "겨울철 채취 품목.", topics: ["채취 허가", "자원 관리"] },
    ],
  },
  {
    id: "crustacean",
    name: "갑각류 양식",
    icon: "🦐",
    desc: "새우·게 등 갑각류",
    items: [
      { id: "whiteleg-shrimp", name: "흰다리새우", regions: "충남 태안·서산, 전남 신안, 육상 전국", method: "축제식·바이오플락·RAS", desc: "국내 새우 양식의 주력 품종.", topics: ["흰반점바이러스(WSSV)", "바이오플락 수질", "월동·실내 양식", "축제 출하"] },
      { id: "fleshy-prawn", name: "대하", regions: "충남 태안·홍성", method: "축제식", desc: "서해안 가을 축제 품목. 바이러스 피해로 흰다리새우로 많이 전환했다.", topics: ["WSSV", "종자 입식"] },
      { id: "kuruma-prawn", name: "보리새우", regions: "제주, 전남", method: "육상수조·축제식", desc: "활어 수출용 고가 새우.", topics: ["모래 바닥 관리", "활어 수송"] },
      { id: "swimming-crab", name: "꽃게", regions: "인천, 충남, 전북", method: "축제식·종자 방류", desc: "양식보다 방류·자원 조성 비중이 크다.", topics: ["종자 방류", "공식 방지"] },
    ],
  },
  {
    id: "inland",
    name: "내수면 양식",
    icon: "🏞️",
    desc: "민물(하천·저수지·지하수)에서 기르는 어류·패류",
    items: [
      { id: "eel", name: "뱀장어", alias: "민물장어", regions: "전북 고창, 전남 영암·나주, 경기", method: "하우스 순환수조", desc: "내수면 양식 생산액 1위. 실뱀장어(치어)를 잡아 기른다.", topics: ["실뱀장어 가격·수급", "아가미 질병", "에너지(난방)비", "출하 규격"] },
      { id: "catfish", name: "메기", regions: "충남, 전북, 경기", method: "지수식·순환여과식", desc: "매운탕용 주력 민물고기.", topics: ["수질·용존산소", "질병", "판로"] },
      { id: "trout", name: "송어", alias: "무지개송어", regions: "강원 평창·홍천", method: "유수식 (계곡수)", desc: "냉수성 어종. 겨울 축제 수요가 크다.", topics: ["여름철 수온", "IHN 바이러스", "축제 납품"] },
      { id: "israeli-carp", name: "향어", alias: "이스라엘잉어", regions: "충북, 경기", method: "가두리·지수식", desc: "과거 댐 가두리에서 많이 기르던 어종.", topics: ["수질 규제", "판로 축소"] },
      { id: "carp", name: "잉어·붕어", regions: "전국 저수지·지수식", method: "지수식", desc: "약용·낚시터 납품 수요가 있는 전통 품목.", topics: ["낚시터 납품", "질병"] },
      { id: "loach", name: "미꾸라지", regions: "전남, 전북, 충남", method: "논·지수식", desc: "추어탕 원료. 중국산 수입과 경쟁한다.", topics: ["종자 생산", "논 양식", "원산지 표시"] },
      { id: "mandarin-fish", name: "쏘가리·동자개", alias: "빠가사리 포함", regions: "충북, 경기, 강원", method: "순환여과식", desc: "고가 토종 민물고기.", topics: ["산 먹이 의존", "종자 생산"] },
      { id: "sturgeon", name: "철갑상어", regions: "강원, 충북, 경기", method: "순환여과식", desc: "캐비아와 육 판매를 겸하는 장기 양식.", topics: ["장기 투자 회수", "캐비아 가공 허가"] },
      { id: "freshwater-prawn", name: "큰징거미새우·다슬기", regions: "전남, 충북", method: "지수식·하천 방류", desc: "신규 민물 품목.", topics: ["월동", "판로"] },
      { id: "soft-turtle", name: "자라", regions: "전남, 경기", method: "가온 하우스", desc: "건강식품 원료 수요.", topics: ["난방비", "질병"] },
    ],
  },
  {
    id: "fishing",
    name: "연근해 어선어업",
    icon: "🚢",
    desc: "업종별 연안·근해 어선 조업",
    items: [
      { id: "purse-seine", name: "근해 대형선망", regions: "부산 (제주·남해 어장)", method: "선단 선망", desc: "고등어·전갱이를 잡는 대규모 선단 어업.", topics: ["휴어기", "선원 확보", "TAC(총허용어획량)", "위판 가격"] },
      { id: "anchovy-seine", name: "기선권현망", alias: "멸치잡이", regions: "경남 통영·남해", method: "선단 끌그물 + 선상 자숙", desc: "마른멸치 생산 어업.", topics: ["금어기", "선상 자숙·건조", "멸치 위판"] },
      { id: "stow-net", name: "안강망", alias: "근해·연안개량안강망", regions: "전남 목포·신안, 전북 군산, 충남", method: "닻으로 고정한 자루그물", desc: "서해안 조기·갈치·젓새우 어업.", topics: ["조업 구역 분쟁", "어획 부진", "젓새우 가공"] },
      { id: "gillnet", name: "자망", alias: "근해·연안자망", regions: "전국 (서해 꽃게, 동해 대게, 남해 조기)", method: "걸그물", desc: "어선 수가 가장 많은 업종 중 하나.", topics: ["폐어구·어구실명제", "꽃게·대게 금어기", "그물 손상"] },
      { id: "trap", name: "통발", alias: "근해·연안통발", regions: "전국 (장어·문어·꽃게·붉은대게)", method: "통발 연승", desc: "문어·붕장어·붉은대게 등을 잡는다.", topics: ["어구 규격", "미끼 비용", "붉은대게 TAC"] },
      { id: "squid-jigging", name: "채낚기", alias: "오징어·갈치 채낚기", regions: "강원, 경북, 제주", method: "집어등 낚시", desc: "동해 오징어 어획 급감으로 어려움이 큰 업종.", topics: ["어획량 급감 대책", "유류비", "감척 지원"] },
      { id: "longline", name: "연승", alias: "근해·연안연승", regions: "제주, 경남, 전남", method: "주낙", desc: "갈치·옥돔·장어를 낚는 어업.", topics: ["미끼", "선원 확보", "선도 관리"] },
      { id: "trawl", name: "저인망·트롤", alias: "쌍끌이·외끌이·동해구 트롤", regions: "부산, 경남, 전남", method: "끌그물", desc: "대형 저층 어업. 자원 관리 규제가 많다.", topics: ["TAC", "조업 구역", "감척"] },
      { id: "set-net", name: "정치망", regions: "강원, 경북, 경남, 제주", method: "고정 그물", desc: "연안에 그물을 고정해 회유 어종을 잡는다.", topics: ["면허 갱신", "태풍 피해", "방어·삼치 어획"] },
      { id: "coastal-complex", name: "연안복합", alias: "낚시·손줄·연승 겸업", regions: "전국 연안", method: "소형 어선 복합 어구", desc: "1인·부부 조업이 많은 소형 어선 업종.", topics: ["어선 안전·구명조끼", "유어(낚시어선) 겸업", "고령화"] },
      { id: "diver-boat", name: "잠수기 어업", regions: "경남, 전남, 충남", method: "공기 공급식 잠수", desc: "키조개·개조개·해삼 등을 잠수로 채취한다.", topics: ["잠수 안전", "조업 구역"] },
      { id: "fishing-boat", name: "낚시어선업", regions: "전국", method: "유어 승객 승선", desc: "어업인이 겸업하는 낚시 관광.", topics: ["신고·안전 기준", "승객 보험", "영업 구역"] },
    ],
  },
  {
    id: "distant",
    name: "원양어업",
    icon: "🌏",
    desc: "해외 어장에서 조업하는 원양 업종",
    items: [
      { id: "tuna-purse", name: "참치 선망", regions: "중서부 태평양", method: "대형 선망", desc: "가다랑어 중심의 대규모 원양 어업.", topics: ["입어 협정", "국제 어업 규제(RFMO)"] },
      { id: "tuna-longline", name: "참치 연승", regions: "태평양·인도양·대서양", method: "연승", desc: "횟감용 다랑어를 잡는 원양 어업.", topics: ["초저온 보관", "어획 쿼터"] },
      { id: "distant-trawl", name: "원양 트롤", alias: "남빙양 크릴 포함", regions: "남극해, 북태평양, 대서양", method: "트롤", desc: "크릴·명태·대구 등을 잡는다.", topics: ["CCAMLR 규제", "선상 가공"] },
      { id: "distant-squid", name: "원양 오징어 채낚기", alias: "꽁치봉수망 포함", regions: "남서대서양, 북태평양", method: "채낚기·봉수망", desc: "포클랜드 오징어 등 원거리 어장.", topics: ["어황 변동", "입어료"] },
    ],
  },
  {
    id: "village",
    name: "마을어업 · 맨손",
    icon: "🤿",
    desc: "어촌계 공동어장과 해녀·맨손어업",
    items: [
      { id: "haenyeo", name: "해녀 (나잠어업)", regions: "제주, 경북, 부산, 전남", method: "맨몸 잠수 채취", desc: "전복·소라·성게·해조류를 채취하는 전통 어업.", topics: ["잠수 안전·건강", "해녀 지원 제도", "자원 조성"] },
      { id: "mudflat", name: "갯벌 맨손어업", regions: "충남, 전남, 전북, 인천", method: "호미·삽 채취", desc: "바지락·낙지·굴 등을 갯벌에서 채취한다.", topics: ["맨손어업 신고", "물때와 안전", "갯벌 휴식년"] },
      { id: "village-ground", name: "어촌계 공동어장", regions: "전국 어촌계", method: "마을어업 면허", desc: "어촌계가 면허를 받아 공동으로 관리하는 어장.", topics: ["어촌계 가입·규약", "공동어장 수익 배분", "자원 조성 사업", "불법 채취 감시"] },
      { id: "seaweed-harvest", name: "자연산 해조류 채취", alias: "돌김·돌미역·우뭇가사리", regions: "부산 기장, 경북, 제주, 전남", method: "갯바위 채취", desc: "자연산 해조류를 철에 맞춰 채취한다.", topics: ["갯닦기", "채취 시기", "건조 가공"] },
    ],
  },
  {
    id: "processing",
    name: "수산가공 · 유통",
    icon: "🏭",
    desc: "위판부터 가공·수출·직판까지",
    items: [
      { id: "auction", name: "위판·공판", regions: "수협 위판장", method: "경매·입찰", desc: "수협 위판장을 통한 산지 판매.", topics: ["위판 수수료", "경매 가격 형성", "산지 저온 시설"] },
      { id: "dried", name: "건조 가공", alias: "마른멸치·오징어·굴비·황태", regions: "경남 통영, 전남 영광, 강원 인제", method: "자연·열풍 건조", desc: "건조 수산물 생산과 품질 관리.", topics: ["건조 설비", "위생 관리", "명절 판매"] },
      { id: "salted", name: "젓갈·액젓", regions: "충남 강경·광천, 전남 신안", method: "염장 숙성", desc: "새우젓·멸치액젓 등 발효 가공.", topics: ["천일염 사용", "숙성 기간", "식품 표시"] },
      { id: "frozen", name: "냉동·선어 유통", regions: "부산, 전국 산지", method: "급랭·콜드체인", desc: "냉동 창고와 선도 유지 유통.", topics: ["냉동 설비", "콜드체인", "수입산 경쟁"] },
      { id: "laver-processing", name: "김 가공", alias: "마른김·조미김", regions: "전남, 충남 서천", method: "건조·조미 공장", desc: "수출 1위 수산 가공품.", topics: ["수출 인증", "원초 가격", "해외 바이어"] },
      { id: "haccp", name: "위생·인증", alias: "HACCP·지정해역·이력제", regions: "전국", method: "인증 취득·유지", desc: "수산물 위생과 품질 인증 제도.", topics: ["HACCP 취득", "수산물 이력제", "원산지 표시", "ASC·MSC 친환경 인증"] },
      { id: "export", name: "수출", regions: "전국", method: "직수출·대행", desc: "김·굴·전복·참치 등 수산물 수출.", topics: ["수출 검역", "해외 인증", "수출 물류비 지원"] },
      { id: "direct-sale", name: "온라인 직판·브랜드", regions: "전국", method: "산지 직송·온라인몰", desc: "어가가 직접 소비자에게 판매.", topics: ["택배 포장", "온라인몰 입점", "라이브커머스", "통신판매업 신고"] },
    ],
  },
  {
    id: "management",
    name: "경영 · 제도",
    icon: "📋",
    desc: "면허·보험·자금·세무 등 어업 경영",
    items: [
      { id: "license", name: "어업 면허·허가", regions: "시·군·구청", method: "면허(양식·정치망·마을)·허가·신고", desc: "어업권 취득, 갱신, 이전, 행사계약.", topics: ["면허 갱신·연장", "어업권 이전·임대", "어장 이용 개발 계획", "어업 허가 정수"] },
      { id: "insurance", name: "양식수산물 재해보험", regions: "수협 공제", method: "정책보험", desc: "태풍·적조·고수온 등 재해 피해 보상.", topics: ["가입 품목·시기", "고수온 특약", "피해 신고 절차", "보험금 산정"] },
      { id: "boat-insurance", name: "어선·어선원 보험", regions: "수협 공제", method: "정책보험", desc: "어선 사고와 선원 재해 보상.", topics: ["가입 의무", "보험료 지원", "사고 처리"] },
      { id: "tax-free-fuel", name: "면세유", regions: "수협", method: "어업용 면세유 배정", desc: "어선·양식장 면세유 배정과 관리.", topics: ["배정 기준", "부정 사용 제재", "유가 연동 보조"] },
      { id: "policy-fund", name: "수산정책자금", regions: "수협, 해양수산부", method: "융자·보조", desc: "어업경영자금, 시설자금, 경영회생 지원.", topics: ["자금 신청 절차", "금리·상환", "담보·보증(수산업협동조합 보증)"] },
      { id: "direct-payment", name: "수산공익직불제", regions: "시·군·구청", method: "직접지불금", desc: "소규모어가·어촌 공익직불, 수산자원보호 직불.", topics: ["지급 요건", "신청 기간", "의무 이행"] },
      { id: "return-fishing", name: "귀어·후계어업인", regions: "귀어귀촌지원센터", method: "창업·정착 지원", desc: "귀어 정착과 청년·후계 어업인 육성.", topics: ["귀어 창업 자금", "어촌계 가입", "어선·어장 확보", "청년 어업인 정착금"] },
      { id: "crew", name: "선원 · 외국인 근로자", regions: "전국", method: "고용허가제(E-9)·선원취업(E-10)", desc: "어선·양식장 인력 고용.", topics: ["외국인 선원 도입", "선원법·근로계약", "숙소 기준", "인력 이탈"] },
      { id: "boat-safety", name: "어선 안전 · 검사", regions: "선박안전기술공단", method: "검사·설비 기준", desc: "어선 검사와 안전 장비, 기관 정비.", topics: ["정기 검사", "구명설비", "어선 위치발신장치(V-PASS)", "기관 고장 대처"] },
      { id: "accounting", name: "세무 · 회계", regions: "전국", method: "신고·장부", desc: "어업 소득세, 부가세, 영어조합법인.", topics: ["어로어업 소득 비과세", "양식어업 과세", "영어조합법인 설립", "부가세 환급"] },
    ],
  },
  {
    id: "tech",
    name: "양식 기술 공통",
    icon: "🔬",
    desc: "품목을 가리지 않는 질병·수질·사료·시설 기술",
    items: [
      { id: "disease", name: "질병 · 방역", regions: "수산질병관리원, 국립수산과학원", method: "진단·처방", desc: "수산생물 질병 진단과 수산용 의약품 사용.", topics: ["질병 진단 의뢰", "수산질병관리사 처방", "휴약 기간", "법정 전염병 신고"] },
      { id: "water", name: "수질 · 해양 재해", alias: "적조·고수온·저수온·빈산소", regions: "전국", method: "관측·예찰", desc: "수온, 용존산소, 적조 예찰과 재해 대응.", topics: ["적조 황토 살포", "고수온 사료 중단", "액화산소 공급", "실시간 수온 정보"] },
      { id: "feed", name: "사료 · 영양", regions: "전국", method: "배합사료·생사료(MP)", desc: "사료 선택과 급이 관리, 생사료 전환.", topics: ["배합사료 전환 지원", "사료비 절감", "급이량 조절", "사료 보관"] },
      { id: "seed", name: "종자 · 육종", regions: "국립수산과학원, 민간 종자 업체", method: "인공종자 생산", desc: "우량 종자 확보와 종자 생산 기술.", topics: ["종자 품질", "수입 종자 검역", "우량 품종 보급"] },
      { id: "facility", name: "양식 시설 · 장비", alias: "RAS·바이오플락·가두리", regions: "전국", method: "시설 설치·개보수", desc: "가두리, 육상수조, 순환여과식 시설.", topics: ["순환여과식(RAS) 설계", "가두리 태풍 대비", "정전 대비 비상 발전", "시설 현대화 지원"] },
      { id: "smart", name: "스마트 양식", regions: "전국", method: "IoT 센서·자동 급이", desc: "센서와 자동화로 양식장을 원격 관리.", topics: ["수질 센서", "자동 급이기", "스마트양식 클러스터", "데이터 활용"] },
    ],
  },
];

export const ALL_FIELDS: (FieldItem & { group: FieldGroup })[] = FIELD_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g })));
const byId = new Map(ALL_FIELDS.map((f) => [f.id, f]));

export const findField = (id: string) => byId.get(id);
export const fieldName = (id: string) => byId.get(id)?.name ?? id;
export const isField = (id: unknown): id is string => typeof id === "string" && byId.has(id);
export const isGroup = (id: unknown): id is string => typeof id === "string" && FIELD_GROUPS.some((g) => g.id === id);
export const groupName = (id: string) => FIELD_GROUPS.find((g) => g.id === id)?.name ?? id;
