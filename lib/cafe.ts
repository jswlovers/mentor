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
    { slug: "notice", name: "공지사항", description: "라운지 운영 안내", group: "소통", listing: false },
    { slug: "anonymous", name: "익명 고민", description: "닉네임을 공개하지 않고 나누는 이야기", group: "소통", listing: false },
    { slug: "question", name: "질문·답변", description: "기술 질문과 동료의 해결 경험", group: "기술·교육", listing: false },
    { slug: "poll", name: "미용 설문", description: "동료들의 의견을 모아요", group: "소통", listing: false },
    { slug: "humor", name: "좋은글·유머", description: "동료들과 웃고 쉬어가는 공간", group: "소통", listing: false },
    { slug: "congrats", name: "축하해주세요", description: "기쁜 소식을 나눠요", group: "소통", listing: false },
    { slug: "suggestion", name: "운영진 건의", description: "라운지 운영에 관한 제안", group: "소통", listing: false },
    { slug: "cut", name: "커트", description: "커트 자료와 시술 노하우", group: "기술·교육", listing: false },
    { slug: "perm", name: "펌·아이롱펌", description: "펌 시술과 복구 노하우", group: "기술·교육", listing: false },
    { slug: "color", name: "염색·탈색", description: "염색 레시피와 컬러 교육", group: "기술·교육", listing: false },
    { slug: "upstyle", name: "드라이·업스타일", description: "스타일링과 특수머리 자료", group: "기술·교육", listing: false },
    { slug: "scalp", name: "두피·모발", description: "두피와 클리닉 자료", group: "기술·교육", listing: false },
    { slug: "video", name: "교육 영상", description: "교육 영상과 설명을 공유해요", group: "기술·교육", listing: false },
    { slug: "basics", name: "기초 공부", description: "기초상식과 나의 노하우", group: "기술·교육", listing: false },
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
// 비슷한 게시판을 하나의 주제로 묶어 메뉴를 간결하게 보여준다. 게시판·글 데이터는 그대로이고 화면에서만 묶는다.
export const CAFE_TOPICS = [
    { slug: "technique", name: "시술 노하우", description: "커트·펌·염색·스타일링·두피 자료와 시술 레시피", boards: ["cut", "perm", "color", "upstyle", "scalp", "recipe"] },
    { slug: "study", name: "질문·공부", description: "기술 질문과 기초 공부", boards: ["question", "basics"] },
    { slug: "learning", name: "교육·후기", description: "교육·세미나 모집, 교육 영상, 교육·제품 후기", boards: ["education", "video", "review"] },
] as const;
export const findCafeTopic = (slug: string) => CAFE_TOPICS.find((topic) => topic.slug === slug);
export const boardTopic = (board: string) => CAFE_TOPICS.find((topic) => (topic.boards as readonly string[]).includes(board));
// 분류 메뉴에 보일 항목: 주제로 묶인 게시판은 주제 하나로, 나머지는 게시판 그대로.
export const groupEntries = (group: string) => {
    const seen = new Set<string>(), entries: { slug: string; name: string; topic: boolean }[] = [];
    for (const board of CAFE_BOARDS.filter((b) => b.group === group)) {
        const topic = boardTopic(board.slug), slug = topic ? topic.slug : board.slug;
        if (!seen.has(slug)) { seen.add(slug); entries.push({ slug, name: topic ? topic.name : board.name, topic: !!topic }); }
    }
    return entries;
};
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
    salon: string;
    role: string;
    hours: string;
    career: string;
    district: string;
};
export const EMPTY_CAFE_DETAILS: CafeDetails = { region: "", place: "", date: "", price: "", kind: "", url: "", product: "", formula: "", deposit: "", rent: "", area: "", capacity: "", fee: "", deadline: "", tags: "", salon: "", role: "", hours: "", career: "", district: "" };
export const CAFE_DETAIL_LABELS: Record<keyof CafeDetails, string> = { region: "지역", place: "장소·상세 지역", date: "일정", price: "금액·급여·참가비", kind: "유형", url: "참고 링크", product: "사용 제품", formula: "배합·시술 조건", deposit: "보증금", rent: "월세", area: "면적", capacity: "모집 정원", fee: "참가비 (원)", deadline: "신청 마감일", tags: "분야·태그", salon: "매장명", role: "직급", hours: "근무 시간", career: "경력", district: "시·군·구" };
export const CAFE_KINDS: Partial<Record<CafeBoard, string[]>> = { materials: ["미용재료", "미용도구", "미용도서", "지역 재료상"], jobs: ["정규 채용", "정규 구직", "알바·스페어 채용", "알바·스페어 구직"], used: ["팝니다", "삽니다", "무료나눔"], education: ["교육", "세미나", "스터디", "정모"], model: ["모델 모집", "모델 지원"], volunteer: ["봉사 모집", "봉사 지원", "봉사 후기"], "salon-sale": ["매장 양도", "매장 인수"], event: ["이벤트", "무료나눔"] };
// 채용·구직 글: 직급과 인증(매장 등록 또는 라운지 등업)에 따라 쓸 수 있는 유형과 입력 항목이 달라진다.
export type JobSide = "hire" | "seek";
export const jobSide = (kind: string): JobSide | null => kind.endsWith("채용") ? "hire" : kind.endsWith("구직") ? "seek" : null;
export const JOB_ROLES = ["디자이너", "인턴", "점장·원장급", "무관"] as const;
export const JOB_FIELDS: Record<JobSide, (keyof CafeDetails)[]> = { hire: ["region", "district", "place", "salon", "role", "price", "hours", "deadline", "capacity", "tags"], seek: ["region", "district", "role", "career", "price", "hours", "tags"] };
export const JOB_REQUIRED: Record<JobSide, (keyof CafeDetails)[]> = { hire: ["district", "salon", "role", "price"], seek: ["district", "role", "career"] };
const JOB_LABELS: Record<JobSide, Partial<Record<keyof CafeDetails, string>>> = {
    hire: { region: "근무 지역", place: "상세 위치", role: "모집 직급", price: "급여", hours: "근무 시간", capacity: "모집 인원" },
    seek: { region: "희망 지역", district: "희망 시·군·구", role: "희망 직급", price: "희망 급여", hours: "희망 근무 시간" },
};
export const detailLabel = (key: keyof CafeDetails, kind = "") => { const side = jobSide(kind); return (side && JOB_LABELS[side][key]) || CAFE_DETAIL_LABELS[key]; };
export type JobRights = { position: string | null; verified: boolean; isAdmin: boolean };
/** 정규 채용은 인증된 원장, 알바·스페어 채용은 인증된 원장·디자이너, 구직은 누구나 쓸 수 있다. */
export function allowedJobKinds(r: JobRights) {
    const kinds = CAFE_KINDS.jobs!;
    if (r.isAdmin) return kinds;
    return kinds.filter(kind => kind === "정규 채용" ? r.verified && r.position === "원장" : kind === "알바·스페어 채용" ? r.verified && (r.position === "원장" || r.position === "디자이너") : true);
}
export const canHire = (r: JobRights) => allowedJobKinds(r).some(kind => jobSide(kind) === "hire");
export const JOB_RULE_TEXT = "정규 채용은 인증된 원장, 알바·스페어 채용은 인증된 원장·디자이너만 쓸 수 있어요. 인증은 매장 등록(원장·디자이너로 소속) 또는 라운지 등업으로 받아요. 구직 글은 누구나 쓸 수 있고, 본문은 채용 권한이 있는 회원에게만 보여요.";
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
    masked?: boolean;
    sponsored_until?: string | null;
};
// 채용공고 상단 노출: 코인으로 고를 수 있는 기간(일)
export const JOB_BOOST_DAYS = [3, 7, 14, 30] as const;
// sponsored_until은 SQLite datetime(UTC, "YYYY-MM-DD HH:MM:SS")으로 저장된다.
const utc = (at: string) => new Date(at.replace(" ", "T") + "Z");
export const isSponsored = (post: { sponsored_until?: string | null }) => !!post.sponsored_until && utc(post.sponsored_until) > new Date();
export const sponsoredLabel = (at: string) => utc(at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
export type CafeComment = {
    id: number;
    author_id: string;
    author_name: string;
    body: string;
    created_at: string;
    parent_id?:number|null;
};
// 구직자 이력서: 한 번 저장해 두고 채용공고에 그대로 제출한다(제출 시점의 내용을 지원서에 보관).
export type Resume = { name: string; phone: string; birth_year: string; desired_role: string; desired_region: string; desired_pay: string; career_years: string; license: string; careers: string; skills: string; available_from: string; intro: string };
export const LICENSE_OPTIONS = ["보유", "취득 예정", "미보유"] as const;
export type ResumeField = { key: keyof Resume; label: string; type: "text" | "tel" | "number" | "date" | "textarea" | "select"; options?: readonly string[]; required?: boolean; max: number; placeholder?: string };
export const RESUME_FIELDS: ResumeField[] = [
    { key: "name", label: "이름", type: "text", required: true, max: 30 },
    { key: "phone", label: "연락처", type: "tel", required: true, max: 13, placeholder: "010-1234-5678" },
    { key: "birth_year", label: "출생연도", type: "number", max: 4, placeholder: "예: 1998" },
    { key: "desired_role", label: "희망 직급", type: "select", options: JOB_ROLES, required: true, max: 20 },
    { key: "desired_region", label: "희망 지역", type: "select", options: CAFE_REGIONS, max: 20 },
    { key: "desired_pay", label: "희망 급여", type: "text", max: 100, placeholder: "예: 월 280만원 이상 / 협의" },
    { key: "career_years", label: "총 경력 (년)", type: "number", required: true, max: 2 },
    { key: "license", label: "미용사 면허", type: "select", options: LICENSE_OPTIONS, required: true, max: 10 },
    { key: "careers", label: "경력 사항", type: "textarea", max: 2000, placeholder: "한 줄에 하나씩: 매장명 / 근무 기간 / 직급·담당" },
    { key: "skills", label: "전문 분야", type: "text", max: 200, placeholder: "예: 커트, 염색, 펌, 클리닉" },
    { key: "available_from", label: "근무 가능일", type: "date", max: 10 },
    { key: "intro", label: "자기소개", type: "textarea", required: true, max: 2000, placeholder: "일하는 스타일, 강점, 매장에 바라는 점" },
];
export const EMPTY_RESUME: Resume = { name: "", phone: "", birth_year: "", desired_role: "", desired_region: "", desired_pay: "", career_years: "", license: "", careers: "", skills: "", available_from: "", intro: "" };
