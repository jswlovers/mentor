// 테스트 계정 시드: 서버가 떠 있는 상태에서 실행한다. (공개 서버에서는 알려진 비밀번호를 쓰므로 확인 후 정지·삭제할 것)
//   node scripts/seed-test.mjs [baseUrl]   (관리자 비밀번호를 바꿨으면 ADMIN_PW=<비밀번호>)
import { execFileSync } from "node:child_process";
const BASE = process.argv[2] || "https://localhost:3004";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const PW = "ouU@FuiVWNaEQcpZcU4n"; // D:\github 모든 서비스 공통 테스트·관리자 암호

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
  const r = await c("/api/auth/signup", "POST", { username, password, name, agree: true });
  if (r.status === 409) await c("/api/auth/login", "POST", { username, password });
};

const admin = client();
await ensure(admin, "admin@mail.sean2022.one", "관리자", process.env.ADMIN_PW || PW);
execFileSync("node", ["scripts/make-admin.mjs", "admin@mail.sean2022.one"], { stdio: "pipe" });

const asker = client(), expert = client();
await ensure(asker, "test_asker@mail.sean2022.one", "테스트질문자", PW);
await ensure(expert, "test_expert@mail.sean2022.one", "테스트전문가", PW);
for (const n of [1, 2, 3]) await ensure(client(), `test${n}@mail.sean2022.one`, `테스트${n}`, PW);

// 질문자에게 30만 코인 충전(신청 → 관리자 승인)
await asker("/api/coins/charge-requests", "POST", { amountKrw: 300000, provider: "manual", depositor: "테스트" });
for (const ch of (await admin("/api/admin/overview")).data.charges.filter((x) => x.status === "pending")) {
  await admin(`/api/admin/charges/${ch.id}/approve`, "POST");
}
// 전문가 신청 → 승인
await expert("/api/experts/apply", "POST", { bio: "테스트 전문가입니다. 미용 경력 10년, 펌·염색·탈색 상담 담당." });
const ex = (await admin("/api/admin/overview")).data.experts.find((e) => e.username === "test_expert@mail.sean2022.one");
if (ex?.expert_status === "pending") await admin(`/api/admin/experts/${ex.id}/approve`, "POST");

const q = await asker("/api/questions", "POST", { category: "탈색", title: "[테스트] 2회 탈색 후 모발 끝이 끊어져요", body: "손상모에 2회 탈색했고 끝부분이 엿가락처럼 늘어나다 끊깁니다. 지금 수습할 수 있을까요?", hairType: "손상모 / 가는 모발", product: "20볼륨 1:2, 15분" });
console.log("seed 완료:", { question: q.data.id, coins: (await asker("/api/auth/me")).data.user.coins, expert: (await expert("/api/auth/me")).data.user.isExpert });
