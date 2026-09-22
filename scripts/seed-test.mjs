// 테스트 계정 시드: 서버가 떠 있는 상태에서 실행한다. (공개 서버에서는 알려진 비밀번호를 쓰므로 확인 후 정지·삭제할 것)
//   ADMIN_PW=<관리자 비밀번호> node scripts/seed-test.mjs [baseUrl]
import { execFileSync } from "node:child_process";
const BASE = process.argv[2] || "https://localhost:3004";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const PW = "test1234!";

function client() {
  let cookie = "";
  return async (path, method = "GET", body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };
}

// 가입에는 휴대폰 인증(중복가입 방지)과 직급(원장/디자이너/인턴) 선택이 필요하다. 테스트용 번호는 순번으로 만든다.
let phoneSeq = Date.now() % 90000000;
const nextPhone = () => "010" + String(++phoneSeq).padStart(8, "0");

const ensure = async (c, username, name, password, position = "디자이너") => {
  const phone = nextPhone();
  const sent = await c("/api/auth/phone/send", "POST", { phone });
  if (sent.data.devCode) await c("/api/auth/phone/verify", "POST", { phone, code: sent.data.devCode });
  const r = await c("/api/auth/signup", "POST", { username, password, name, phone, position });
  if (r.status === 409) await c("/api/auth/login", "POST", { username, password });
};

const admin = client();
if (!process.env.ADMIN_PW) throw new Error("ADMIN_PW 환경변수가 필요해요");
await ensure(admin, "admin", "관리자", process.env.ADMIN_PW, "원장");
execFileSync("node", ["scripts/make-admin.mjs", "admin"], { stdio: "pipe" });

const asker = client(), expert = client();
await ensure(asker, "test_asker", "테스트질문자", PW, "인턴");
await ensure(expert, "test_expert", "테스트전문가", PW, "디자이너");

// 질문자에게 30만 코인 충전(신청 → 관리자 승인)
await asker("/api/coins/charge-requests", "POST", { amountKrw: 300000, provider: "manual", depositor: "테스트" });
for (const ch of (await admin("/api/admin/overview")).data.charges.filter((x) => x.status === "pending")) {
  await admin(`/api/admin/charges/${ch.id}/approve`, "POST");
}
// 전문가 신청 → 승인
await expert("/api/experts/apply", "POST", { bio: "테스트 전문가입니다. 미용 경력 10년, 펌·염색·탈색 상담 담당." });
const ex = (await admin("/api/admin/overview")).data.experts.find((e) => e.username === "test_expert");
if (ex?.expert_status === "pending") await admin(`/api/admin/experts/${ex.id}/approve`, "POST");

const q = await asker("/api/questions", "POST", { category: "탈색", title: "[테스트] 2회 탈색 후 모발 끝이 끊어져요", body: "손상모에 2회 탈색했고 끝부분이 엿가락처럼 늘어나다 끊깁니다. 지금 수습할 수 있을까요?", hairType: "손상모 / 가는 모발", product: "20볼륨 1:2, 15분" });

// 직급별 게시판 테스트 글
await expert("/api/position-posts", "POST", { position: "디자이너", title: "[테스트] 디자이너 게시판 첫 글", body: "디자이너끼리만 보이는 게시판이에요." });
await asker("/api/position-posts", "POST", { position: "인턴", title: "[테스트] 인턴 게시판 첫 글", body: "인턴끼리만 보이는 게시판이에요." });

// 구인구직 테스트 글(채용/구직 · 도시 · 지역)
await expert("/api/jobs", "POST", { type: "hire", city: "서울", district: "강남구", title: "[테스트] 강남 디자이너 채용", body: "경력 3년 이상 디자이너를 채용합니다. 주 5일, 4대보험." });
await asker("/api/jobs", "POST", { type: "seek", city: "서울", district: "강남구", title: "[테스트] 인턴 구직합니다", body: "미용 인턴 경력 6개월, 성실히 배우겠습니다." });
await expert("/api/jobs", "POST", { type: "hire", city: "경기", district: "수원시", title: "[테스트] 수원 매장 원장 구인", body: "신규 오픈 매장을 맡아줄 원장님을 모십니다." });

console.log("seed 완료:", { question: q.data.id, coins: (await asker("/api/auth/me")).data.user.coins, expert: (await expert("/api/auth/me")).data.user.isExpert });
