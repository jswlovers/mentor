export const CAFE_BOARDS = [
    { slug: "talk", name: "자유수다", description: "동료들과 나누는 일상과 고민", group: "소통", listing: false },
    { slug: "intro", name: "가입인사", description: "나를 소개하고 동료를 만나요", group: "소통", listing: false },
    { slug: "recipe", name: "시술 레시피", description: "사용 제품·배합·시술 순서 공유", group: "기술·교육", listing: false },
    { slug: "gallery", name: "시술 사진", description: "완성한 스타일과 작업물 공유", group: "기술·교육", listing: false },
    { slug: "education", name: "교육·세미나", description: "교육, 스터디, 세미나와 정모 모집", group: "기술·교육", listing: true },
    { slug: "review", name: "교육·제품 후기", description: "교육 경험과 제품 사용 후기", group: "기술·교육", listing: false },
    { slug: "business", name: "매장 경영", description: "매장 운영·마케팅·고객 응대 노하우", group: "매장·정보", listing: false },
    { slug: "news", name: "미용 정보", description: "업계 소식과 유용한 자료", group: "매장·정보", listing: false },
    { slug: "materials", name: "미용재료·도서", description: "미용 재료·도구·도서와 판매처 정보", group: "모집·거래", listing: true },
    { slug: "jobs", name: "정규·알바 채용", description: "채용·구직·스페어 모집", group: "모집·거래", listing: true },
    { slug: "used", name: "중고장터", description: "미용 도구·재료 팝니다 / 삽니다", group: "모집·거래", listing: true },
    { slug: "salon-sale", name: "미용실 매매", description: "매장 양도·인수 정보", group: "모집·거래", listing: true },
    { slug: "model", name: "헤어모델", description: "시술·교육·촬영 모델 모집", group: "모집·거래", listing: true },
    { slug: "volunteer", name: "미용봉사", description: "봉사 참여자 모집과 활동 공유", group: "모집·거래", listing: true },
    { slug: "event", name: "이벤트·나눔", description: "미용인 행사와 나눔 소식", group: "모집·거래", listing: true },
    { slug: "notice", name: "공지사항", description: "미용카페 운영 안내", group: "소통", listing: false },
    { slug: "anonymous", name: "익명 고민", description: "닉네임을 공개하지 않고 나누는 이야기", group: "소통", listing: false },
    { slug: "question", name: "미용 질문·답변", description: "기술 질문과 동료의 해결 경험", group: "기술·교육", listing: false },
    { slug: "poll", name: "미용 설문", description: "동료들의 의견을 모아요", group: "소통", listing: false },
    { slug: "humor", name: "좋은글·유머", description: "동료들과 웃고 쉬어가는 공간", group: "소통", listing: false },
    { slug: "congrats", name: "축하해주세요", description: "기쁜 소식을 나눠요", group: "소통", listing: false },
    { slug: "suggestion", name: "운영진 건의", description: "카페 운영에 관한 제안", group: "소통", listing: false },
    { slug: "cut", name: "커트 교육", description: "커트 자료와 시술 노하우", group: "기술·교육", listing: false },
    { slug: "perm", name: "펌·아이롱펌", description: "펌 시술과 복구 노하우", group: "기술·교육", listing: false },
    { slug: "color", name: "염색·탈색", description: "염색 레시피와 컬러 교육", group: "기술·교육", listing: false },
    { slug: "upstyle", name: "드라이·업스타일", description: "스타일링과 특수머리 자료", group: "기술·교육", listing: false },
    { slug: "scalp", name: "두피·모발 관리", description: "두피와 클리닉 자료", group: "기술·교육", listing: false },
    { slug: "video", name: "동영상 교육", description: "교육 영상과 설명을 공유해요", group: "기술·교육", listing: false },
    { slug: "basics", name: "미용 기초·공부방", description: "기초상식과 나의 노하우", group: "기술·교육", listing: false },
    { slug: "complaint", name: "고민·클레임 상담", description: "고객 응대와 시술 고민 상담", group: "매장·정보", listing: false },
    { slug: "tax", name: "세무·운영 자료", description: "세무 상식과 매장 운영 자료", group: "매장·정보", listing: false },
    { slug: "promotion", name: "매장 소개·홍보", description: "내 매장 소개와 마케팅 사례", group: "매장·정보", listing: false },
    { slug: "school", name: "미용대학·아카데미", description: "학교·강사·아카데미 등록과 소개", group: "매장·정보", listing: false },
    { slug: "supplier", name: "지역 재료상", description: "지역 미용재료 판매처 등록", group: "매장·정보", listing: false },
    { slug: "meeting-review", name: "모임·봉사 사진", description: "교육·정모·봉사 활동 후기", group: "소통", listing: false },
    { slug: "owner", name: "원장님 공간", description: "원장 회원끼리 나누는 경험", group: "회원 공간", listing: false },
    { slug: "designer", name: "디자이너 공간", description: "디자이너 회원끼리 소통해요", group: "회원 공간", listing: false },
    { slug: "intern", name: "스태프 사랑방", description: "인턴·스태프 회원의 공간", group: "회원 공간", listing: false },
    { slug: "vip", name: "우수회원 자료방", description: "우수회원의 제품 레시피와 자료", group: "회원 공간", listing: false },
    { slug: "staff", name: "운영진 자료방", description: "관리자 운영 자료", group: "회원 공간", listing: false },
] as const;
export type CafeBoard = (typeof CAFE_BOARDS)[number]["slug"];
export const findCafeBoard = (slug: string) => CAFE_BOARDS.find((board) => board.slug === slug);
export const CAFE_REGIONS = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주", "온라인"] as const;
export type CafeDetails = {
    region: string;
    place: string;
    date: string;
    price: string;
    kind: string;
    url: string;
    product: string;
    formula: string;
    deposit: string;
    rent: string;
    area: string;
    capacity: string;
    fee: string;
    deadline: string;
    tags: string;
};
export const EMPTY_CAFE_DETAILS: CafeDetails = { region: "", place: "", date: "", price: "", kind: "", url: "", product: "", formula: "", deposit: "", rent: "", area: "", capacity: "", fee: "", deadline: "", tags: "" };
export const CAFE_DETAIL_LABELS: Record<keyof CafeDetails, string> = { region: "지역", place: "장소·상세 지역", date: "일정", price: "금액·급여·참가비", kind: "유형", url: "참고 링크", product: "사용 제품", formula: "배합·시술 조건", deposit: "보증금", rent: "월세", area: "면적", capacity: "모집 정원", fee: "참가비 (원)", deadline: "신청 마감일", tags: "분야·태그" };
export const CAFE_KINDS: Partial<Record<CafeBoard, string[]>> = { materials: ["미용재료", "미용도구", "미용도서", "지역 재료상"], jobs: ["정규 채용", "정규 구직", "알바·스페어 채용", "알바·스페어 구직"], used: ["팝니다", "삽니다", "무료나눔"], education: ["교육", "세미나", "스터디", "정모"], model: ["모델 모집", "모델 지원"], volunteer: ["봉사 모집", "봉사 지원", "봉사 후기"], "salon-sale": ["매장 양도", "매장 인수"], event: ["이벤트", "무료나눔"] };
export type CafePost = {
    id: number;
    board: CafeBoard;
    title: string;
    body: string;
    author_id: string;
    author_name: string;
    created_at: string;
    updated_at: string;
    status: "open" | "closed";
    pinned: number;
    details: CafeDetails;
    photos: string[];
    like_count: number;
    comment_count: number;
    liked: boolean;
    saved: boolean;
    views?: number;
    attachments?: {id:number;name:string;mime:string;url:string}[];
};
export type CafeComment = {
    id: number;
    author_id: string;
    author_name: string;
    body: string;
    created_at: string;
    parent_id?:number|null;
};
