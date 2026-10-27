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
const ensure = async (c, username, name, password) => {
  const r = await c("/api/auth/signup", "POST", { username, password, name });
  if (r.status === 409) await c("/api/auth/login", "POST", { username, password });
};

const admin = client();
if (!process.env.ADMIN_PW) throw new Error("ADMIN_PW 환경변수가 필요해요");
await ensure(admin, "admin", "관리자", process.env.ADMIN_PW);
execFileSync("node", ["scripts/make-admin.mjs", "admin"], { stdio: "pipe" });

const asker = client(), expert = client();
await ensure(asker, "test_asker", "테스트질문자", PW);
await ensure(expert, "test_expert", "테스트전문가", PW);

// 질문자에게 30만 코인 충전(신청 → 관리자 승인)
await asker("/api/coins/charge-requests", "POST", { amountKrw: 300000, provider: "manual", depositor: "테스트" });
for (const ch of (await admin("/api/admin/overview")).data.charges.filter((x) => x.status === "pending")) {
  await admin(`/api/admin/charges/${ch.id}/approve`, "POST");
}
// 전문가 신청 → 승인
await expert("/api/experts/apply", "POST", { bio: "테스트 전문가입니다. 해상가두리 양식 경력 10년, 수산질병관리사, 우럭·참돔 상담 담당.", fields: ["fish", "tech"] });
const ex = (await admin("/api/admin/overview")).data.experts.find((e) => e.username === "test_expert");
if (ex?.expert_status === "pending") await admin(`/api/admin/experts/${ex.id}/approve`, "POST");

const q = await asker("/api/questions", "POST", { category: "rockfish", title: "[테스트] 수온 27도 넘으면서 우럭이 수면에 떠올라요", body: "사흘 전부터 가두리 우럭이 수면 가까이 떠서 사료를 잘 안 먹습니다. 하루 수십 마리씩 폐사가 나오는데 지금 할 수 있는 조치가 있을까요?", farmInfo: "통영 해상가두리 20칸", conditions: "수온 27~28도, 배합사료 1일 1회" });
console.log("seed 완료:", { question: q.data.id, coins: (await asker("/api/auth/me")).data.user.coins, expert: (await expert("/api/auth/me")).data.user.isExpert });
