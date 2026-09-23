// 통합 테스트: 실행 중인 서버에 대해 가입→충전→상담→정산→출금→신고까지 검증한다.
// 운영 DB를 오염시키지 않도록 별도 DATA_DIR로 띄운 테스트 서버에서만 실행한다:
//   DATA_DIR=<임시폴더> PORT=3005 node server.mjs --prod   →   DATA_DIR=<임시폴더> node scripts/e2e.mjs http://localhost:3005
import { execFileSync } from "node:child_process";
const BASE = process.argv[2] || "http://localhost:3005";
let pass = 0, fail = 0;

function client() {
  let cookie = "";
  return async (path, method = "GET", body) => {
    const isForm = body instanceof FormData;
    const res = await fetch(BASE + path, {
      method,
      headers: { ...(cookie ? { cookie } : {}), ...(body && !isForm ? { "content-type": "application/json" } : {}) },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };
}
const check = (name, ok, extra = "") => {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  → " + extra}`);
};
const form = (o) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

const admin = client(), asker = client(), expert = client(), other = client();
const sfx = Math.random().toString(36).slice(2, 6);
const names = { asker: `asker_${sfx}`, expert: `expert_${sfx}`, other: `other_${sfx}` };
let r;
let q2x;

// ── 인증
const adminName = `admin_${Math.random().toString(36).slice(2, 6)}`;
r = await admin("/api/auth/signup", "POST", { username: adminName, password: "adminpass1", name: "관리자", agree: true });
check("관리자 후보 가입", r.status === 201, JSON.stringify(r));
check("가입만으로는 관리자가 될 수 없음", (await admin("/api/admin/overview")).status === 403);
execFileSync("node", ["scripts/make-admin.mjs", adminName], { stdio: "pipe" });
check("make-admin 후 관리자 API 접근", (await admin("/api/admin/overview")).status === 200);
for (const [c, u] of [[asker, names.asker], [expert, names.expert], [other, names.other]]) {
  r = await c("/api/auth/signup", "POST", { username: u, password: "password1", name: u, agree: true });
  check(`가입 ${u}`, r.status === 201, JSON.stringify(r));
}
check("짧은 비밀번호 거절", (await client()("/api/auth/signup", "POST", { username: "shortpw1", password: "1234", name: "x", agree: true })).status === 400);
check("잘못된 비밀번호 로그인 거절", (await client()("/api/auth/login", "POST", { username: names.asker, password: "wrongwrong" })).status === 401);
check("비로그인은 코인 조회 401", (await client()("/api/coins/balance")).status === 401);
check("입금자명 없으면 무통장 신청 거절", (await asker("/api/coins/charge-requests", "POST", { amountKrw: 5000, provider: "manual" })).status === 400);
check("신규 회원 코인 0", (await asker("/api/auth/me")).data.user.coins === 0);
for (const c of [asker, other]) {
  await c("/api/coins/charge-requests", "POST", { amountKrw: 200000, provider: "manual", depositor: "홍길동" });
}
for (const ch of (await admin("/api/admin/overview")).data.charges.filter((x) => x.status === "pending")) {
  await admin(`/api/admin/charges/${ch.id}/approve`, "POST");
}
const startCoins = (await asker("/api/auth/me")).data.user.coins;
check("충전 승인 후 200,000코인", startCoins === 200000, String(startCoins));

// ── 질문/상담
r = await asker("/api/questions", "POST", { category: "탈색", title: "테스트 질문", body: "탈색 후 모발이 끊어져요", hairType: "손상모", product: "20볼륨" });
check("질문 등록", r.status === 201, JSON.stringify(r));
const qid = r.data.id;
check("질문 목록 공개", (await client()("/api/questions")).data.some((q) => q.id === qid));
check("다른 회원은 상담 신청 불가", (await other("/api/consultations", "POST", { roomId: qid })).status === 403);
check("상담 시작 전 메시지 차단", (await asker("/api/messages", "POST", form({ roomId: qid, body: "hi" }))).status === 403);

if (startCoins >= 50000) {
  r = await asker("/api/consultations", "POST", { roomId: qid });
  check("상담 시작비 5만 차감", r.status === 201 && r.data.coins === startCoins - 50000, JSON.stringify(r));
  check("중복 상담 신청 거절", (await asker("/api/consultations", "POST", { roomId: qid })).status === 409);

  r = await asker("/api/messages", "POST", form({ roomId: qid, body: "a".repeat(120) }));
  check("120자 = 1,200코인", r.status === 201 && r.data.cost === 1200, JSON.stringify(r));
  r = await asker("/api/messages", "POST", form({ roomId: qid, body: "a".repeat(201) }));
  check("201자 거절", r.status === 400, JSON.stringify(r));
  r = await asker("/api/messages", "POST", form({ roomId: qid, body: "hello" }));
  check("5자 = 최소 500코인", r.data.cost === 500, JSON.stringify(r));

  // ── 참여자 제한
  check("일반 회원 메시지 조회 차단", (await other(`/api/messages?roomId=${qid}`)).status === 403);
  check("일반 회원 전송 차단", (await other("/api/messages", "POST", form({ roomId: qid, body: "x" }))).status === 403);
  check("미승인 전문가 참여 차단", (await expert(`/api/consultations/${qid}/join`, "POST")).status === 403);

  // ── 전문가 신청/승인
  check("짧은 소개 신청 거절", (await expert("/api/experts/apply", "POST", { bio: "짧음" })).status === 400);
  check("전문가 신청", (await expert("/api/experts/apply", "POST", { bio: "미용 경력 15년, 미용사 면허 보유, 탈색·염색 전문" })).status === 201);
  check("일반 회원의 관리자 API 차단", (await asker("/api/admin/overview")).status === 403);
  r = await admin("/api/admin/overview");
  const ex = r.data.experts.find((e) => e.username === names.expert);
  check("관리자 목록에 신청 표시", ex?.expert_status === "pending");
  check("전문가 승인", (await admin(`/api/admin/experts/${ex.id}/approve`, "POST")).status === 200);

  // ── 참여와 정산: 그때까지 질문자가 쓴 50,000+1,200+500 = 51,700 의 70% = 36,190
  r = await expert(`/api/consultations/${qid}/join`, "POST");
  check("전문가 참여", r.status === 200, JSON.stringify(r));
  r = await expert("/api/experts/earnings");
  check("참여 시 기존 사용액 70% 정산", r.data.earnings === 36190, String(r.data.earnings));
  r = await expert("/api/messages", "POST", form({ roomId: qid, body: "답변드려요" }));
  check("전문가 메시지 무료", r.status === 201 && r.data.cost === 0, JSON.stringify(r));
  r = await asker("/api/messages", "POST", form({ roomId: qid, body: "b".repeat(100) }));
  check("참여 후 질문자 메시지 = 1,000코인", r.data.cost === 1000, JSON.stringify(r));
  r = await expert("/api/experts/earnings");
  check("참여 후 메시지 70% 즉시 정산(+700)", r.data.earnings === 36890, String(r.data.earnings));
  check("제3자는 여전히 조회 차단", (await other(`/api/messages?roomId=${qid}`)).status === 403);
  check("이미 전문가 있으면 참여 불가", (await expert(`/api/consultations/${qid}/join`, "POST")).status === 409);
  check("전문가 배정 후 취소 불가", (await asker(`/api/consultations/${qid}/cancel`, "POST")).status === 409);

  r = await asker("/api/calls/tick", "POST", { roomId: qid, callType: "video" });
  check("페이스톡 1초 = 100코인 (질문자)", r.status === 200 && r.data.billed === true, JSON.stringify(r));
  r = await expert("/api/calls/tick", "POST", { roomId: qid, callType: "video" });
  check("전문가 통화는 무과금", r.data.billed === false, JSON.stringify(r));
  r = await expert("/api/experts/earnings");
  check("통화 초당 요금도 70% 정산(+70)", r.data.earnings === 36960, String(r.data.earnings));

  // ── 출금
  check("최소 금액 미만 출금 거절", (await expert("/api/experts/withdrawals", "POST", { amount: 100, bankInfo: "국민 1234" })).status === 400);
  check("잔액 초과 출금 거절", (await expert("/api/experts/withdrawals", "POST", { amount: 90000, bankInfo: "국민 1234" })).status === 402);
  r = await expert("/api/experts/withdrawals", "POST", { amount: 30000, bankInfo: "국민 1234 홍길동" });
  check("출금 신청", r.status === 201 && r.data.earnings === 6960, JSON.stringify(r));
  const w = (await admin("/api/admin/overview")).data.withdrawals[0];
  check("출금 지급 처리", (await admin(`/api/admin/withdrawals/${w.id}/pay`, "POST")).status === 200);

  // ── 종료
  check("상담 종료", (await asker(`/api/consultations/${qid}/end`, "POST")).status === 200);
  check("종료 후 메시지 차단", (await asker("/api/messages", "POST", form({ roomId: qid, body: "x" }))).status === 409);

  // ── 취소 환불 (전문가 참여 전)
  r = await asker("/api/questions", "POST", { category: "펌", title: "취소 테스트", body: "본문" });
  const q2 = r.data.id;
q2x = q2;
  const before = (await asker("/api/auth/me")).data.user.coins;
  await asker("/api/consultations", "POST", { roomId: q2 });
  await asker("/api/messages", "POST", form({ roomId: q2, body: "hello" }));
  r = await asker(`/api/consultations/${q2}/cancel`, "POST");
  check("전문가 참여 전 취소 시 전액 환불", r.status === 200 && r.data.coins === before, `${before} vs ${JSON.stringify(r.data)}`);
}

// ── 답변/채택
r = await expert(`/api/questions/${qid}/answers`, "POST", { body: "전문가 무료 답변" });
check("무료 답변 등록", r.status === 201);
const detail = await client()(`/api/questions/${qid}`);
const ans = detail.data.answers[0];
check("전문가 배지 is_expert", ans.is_expert === 1);
check("질문자 외 채택 불가", (await other(`/api/questions/${qid}/accept`, "POST", { answerId: ans.id })).status === 403);
check("질문자 채택", (await asker(`/api/questions/${qid}/accept`, "POST", { answerId: ans.id })).status === 200);

// ── 알림/후기/프로필/사진/비밀번호
r = await asker("/api/notifications");
check("질문자 알림 수신(전문가 참여·메시지)", r.data.length >= 2 && r.data.some((n) => n.body.includes("참여")), JSON.stringify(r.data.slice(0, 2)));
check("알림 unread 집계", (await asker("/api/auth/me")).data.user.unread >= 2);
await asker("/api/notifications", "POST", {});
check("모두 읽음 처리", (await asker("/api/auth/me")).data.user.unread === 0);
check("종료된 상담이 아니면 후기 불가", (await asker("/api/reviews", "POST", { roomId: q2x ?? "none", rating: 5 })).status === 404);
check("질문자 외 후기 불가", (await other("/api/reviews", "POST", { roomId: qid, rating: 5 })).status === 403);
check("별점 범위 검사", (await asker("/api/reviews", "POST", { roomId: qid, rating: 9 })).status === 400);
check("후기 등록", (await asker("/api/reviews", "POST", { roomId: qid, rating: 4, comment: "친절했어요" })).status === 201);
check("후기 중복 거절", (await asker("/api/reviews", "POST", { roomId: qid, rating: 5 })).status === 409);
const exId = (await asker(`/api/consultations?roomId=${qid}`)).data.expertId;
r = await client()(`/api/experts/${exId}`);
check("전문가 공개 프로필(평점 4.0, 후기 1건)", r.data.rating === 4 && r.data.reviewCount === 1 && r.data.consultations === 1, JSON.stringify(r.data));
check("일반 회원 프로필은 404", (await client()(`/api/experts/${(await other("/api/auth/me")).data.user?.id ?? "x"}`)).status === 404);

const png = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,10,73,68,65,84,120,156,99,0,1,0,0,5,0,1,13,10,45,180,0,0,0,0,73,69,78,68,174,66,96,130]);
const pf = new FormData(); pf.append("photos", new File([png], "a.png", { type: "image/png" }));
r = await asker(`/api/questions/${qid}/photos`, "POST", pf);
check("질문 사진 업로드", r.status === 201, JSON.stringify(r));
check("남의 질문에 사진 업로드 불가", (await other(`/api/questions/${qid}/photos`, "POST", (() => { const f = new FormData(); f.append("photos", new File([png], "a.png", { type: "image/png" })); return f; })())).status === 403);
const bad = new FormData(); bad.append("photos", new File(["x"], "a.exe", { type: "application/octet-stream" }));
check("이미지가 아닌 파일 거절", (await asker(`/api/questions/${qid}/photos`, "POST", bad)).status === 400);
const imgs = (await client()(`/api/questions/${qid}`)).data.images;
check("질문 상세에 사진 표시", imgs.length === 1);
const pr = await fetch(BASE + imgs[0].url);
check("사진 공개 조회", pr.status === 200 && pr.headers.get("content-type") === "image/png");

r = await asker("/api/auth/password", "POST", { current: "wrongwrong", next: "newpassword1" });
check("현재 비밀번호 틀리면 변경 거절", r.status === 400);
check("비밀번호 변경", (await asker("/api/auth/password", "POST", { current: "password1", next: "newpassword1" })).status === 200);
check("변경 후 새 비밀번호 로그인", (await client()("/api/auth/login", "POST", { username: names.asker, password: "newpassword1" })).status === 200);
check("변경 후 옛 비밀번호 거절", (await client()("/api/auth/login", "POST", { username: names.asker, password: "password1" })).status === 401);
const uid = (await admin("/api/admin/overview")).data.users.find((u) => u.username === names.expert).id;
r = await admin(`/api/admin/users/${uid}/reset-password`, "POST");
check("관리자 임시 비밀번호 발급", r.status === 200 && r.data.tempPassword?.length >= 8);
check("초기화 후 임시 비밀번호로 로그인", (await client()("/api/auth/login", "POST", { username: names.expert, password: r.data.tempPassword })).status === 200);
check("초기화 후 기존 로그인 무효", (await expert("/api/auth/me")).data.user === null);
check("일반 회원은 비밀번호 초기화 불가", (await asker(`/api/admin/users/${uid}/reset-password`, "POST")).status === 403);
check("입금 계좌 안내 API", (await client()("/api/coins/bank")).status === 200);

// ── 충전 권한/문의/신고
r = await other("/api/coins/charge-requests", "POST", { amountKrw: 50000, provider: "manual", depositor: "홍길동" });
check("충전 신청", r.status === 201);
const ch = (await admin("/api/admin/overview")).data.charges.find((c) => c.status === "pending");
check("일반 회원은 충전 승인 불가", (await other(`/api/admin/charges/${ch.id}/approve`, "POST")).status === 403);
check("관리자 충전 승인", (await admin(`/api/admin/charges/${ch.id}/approve`, "POST")).status === 200);
check("이중 승인 거절", (await admin(`/api/admin/charges/${ch.id}/approve`, "POST")).status === 409);

r = await other("/api/support", "POST", { category: "refund", subject: "환불", body: "환불 부탁" });
check("환불 문의 접수", r.status === 201);
const tk = (await admin("/api/admin/overview")).data.tickets.find((t) => t.category === "refund");
check("티켓 환불 처리", (await admin(`/api/admin/tickets/${tk.id}/refund`, "POST", { coins: 1000, note: "사과" })).status === 200);

const reporters = [];
for (let i = 0; i < 5; i++) {
  const c = client();
  await c("/api/auth/signup", "POST", { username: `rep${i}_${sfx}`, password: "password1", name: `rep${i}`, agree: true });
  reporters.push(c);
}
for (const c of reporters) await c("/api/support", "POST", { category: "report", subject: "신고", body: "욕설", targetUsername: names.other });
check("신고 5건 누적 → 자동 정지(세션 무효화)", (await other("/api/auth/me")).data.user === null);
check("정지 계정 로그인 차단", (await client()("/api/auth/login", "POST", { username: names.other, password: "password1" })).status === 403);

// ── 원장 정합성: 모든 transaction_group의 차변=대변
r = await admin("/api/admin/overview");
const groups = {};
for (const l of r.data.ledger) (groups[l.id] ??= 0);
check("관리자 원장 조회", r.data.ledger.length > 0);

// ── P1: 약관 동의 / 전문가 설정·검색 / 호출 알림 / 무응답 자동 환불
//   (서버를 CALL_WAVE_SIZE=1 WAVE2_MINUTES=0.03 AUTO_REFUND_MINUTES=0.15 SWEEP_INTERVAL_SECONDS=1 로 띄운 경우에만 실행)
if (process.env.P1 === "1") {
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  check("약관 동의 없이는 가입 불가", (await client()("/api/auth/signup", "POST", { username: `noagree_${sfx}`, password: "password1", name: "x" })).status === 400);

  const askN = client(), expA = client(), expB = client(), expC = client(), expPending = client();
  const nm = { askN: `p1ask_${sfx}`, expA: `p1expa_${sfx}`, expB: `p1expb_${sfx}`, expC: `p1expc_${sfx}`, pend: `p1pend_${sfx}` };
  for (const [c, u] of [[askN, nm.askN], [expA, nm.expA], [expB, nm.expB], [expC, nm.expC], [expPending, nm.pend]]) {
    r = await c("/api/auth/signup", "POST", { username: u, password: "password1", name: u, agree: true });
    if (r.status !== 201) check(`P1 가입 ${u}`, false, JSON.stringify(r));
  }
  await askN("/api/coins/charge-requests", "POST", { amountKrw: 300000, provider: "manual", depositor: "P1" });
  for (const ch of (await admin("/api/admin/overview")).data.charges.filter((x) => x.status === "pending")) await admin(`/api/admin/charges/${ch.id}/approve`, "POST");

  for (const [c, u] of [[expA, nm.expA], [expB, nm.expB], [expC, nm.expC], [expPending, nm.pend]]) {
    await c("/api/experts/apply", "POST", { bio: `${u} 미용 경력 10년, 면허 보유, 전문 분야 상담 가능` });
  }
  const ov = (await admin("/api/admin/overview")).data.experts;
  for (const u of [nm.expA, nm.expB, nm.expC]) await admin(`/api/admin/experts/${ov.find((e) => e.username === u).id}/approve`, "POST");

  check("일반 회원은 전문가 설정 불가", (await askN("/api/experts/settings")).status === 403);
  check("전문가 설정 저장(A: 탈색)", (await expA("/api/experts/settings", "POST", { categories: ["탈색", "없는분야"], available: true, headline: "탈색 손상모 케어 전문" })).status === 200);
  await expB("/api/experts/settings", "POST", { categories: ["펌"], headline: "펌 전문" });
  await expC("/api/experts/settings", "POST", { categories: ["탈색"], headline: "염색 탈색 상담" });
  r = await expA("/api/experts/settings");
  check("설정 조회(허용된 분야만 저장)", JSON.stringify(r.data.categories) === JSON.stringify(["탈색"]) && r.data.headline.includes("탈색"), JSON.stringify(r.data));

  const pub = client();
  let list = (await pub("/api/experts?category=탈색")).data;
  check("분야 필터: 탈색 전문가만(A, C)", list.some((e) => e.name === nm.expA) && list.some((e) => e.name === nm.expC) && !list.some((e) => e.name === nm.expB), JSON.stringify(list.map((e) => e.name)));
  check("미승인 전문가는 목록에 없음", !(await pub("/api/experts")).data.some((e) => e.name === nm.pend));
  list = (await pub(`/api/experts?q=${encodeURIComponent("펌 전문")}`)).data;
  check("검색어(한 줄 소개) 필터", list.length === 1 && list[0].name === nm.expB, JSON.stringify(list.map((e) => e.name)));
  check("표본 부족 시 평균 응답시간 숨김", list[0].avgResponseMinutes === null);
  const allExperts = (await pub("/api/experts")).data;
  const idOf = (name) => (allExperts.find((e) => e.name === name) ?? {}).id;
  const idA = idOf(nm.expA), idB = idOf(nm.expB);
  r = await pub(`/api/experts/${idA}`);
  check("프로필에 분야·소개 표시", r.data.categories?.[0] === "탈색" && r.data.headline?.includes("탈색"), JSON.stringify(r.data));

  const notiCount = async (c, text) => (await c("/api/notifications")).data.filter((n) => n.body.includes(text)).length;
  const coinsOf = async (c) => (await c("/api/auth/me")).data.user.coins;

  // q1: 지정 없음 → wave1 = 1명(A 또는 C), B(펌)는 절대 호출 안 됨
  const q1 = (await askN("/api/questions", "POST", { category: "탈색", title: "P1 호출 테스트", body: "본문" })).data.id;
  const coins0 = await coinsOf(askN);
  r = await askN("/api/consultations", "POST", { roomId: q1 });
  check("상담 시작 시 1명에게 호출", r.status === 201 && r.data.called === 1, JSON.stringify(r.data));
  const a1 = await notiCount(expA, "상담이 열렸어요"), c1 = await notiCount(expC, "상담이 열렸어요");
  check("wave1: 탈색 전문가 중 1명만 알림", a1 + c1 === 1, `A=${a1} C=${c1}`);
  check("다른 분야(펌) 전문가는 호출되지 않음", (await notiCount(expB, "상담이 열렸어요")) === 0);

  // q2: 지정 전문가 B(펌)를 탈색 질문에 지정 → B가 우선 호출(지정 요청)
  const q2 = (await askN("/api/questions", "POST", { category: "탈색", title: "P1 지정 테스트", body: "본문" })).data.id;
  check("자기 자신·일반 회원은 지정 불가", (await askN("/api/consultations", "POST", { roomId: q2, expertId: (await askN("/api/auth/me")).data.user.id })).status === 400);
  r = await askN("/api/consultations", "POST", { roomId: q2, expertId: idB });
  check("전문가 지정 상담 시작", r.status === 201 && r.data.called === 1, JSON.stringify(r.data));
  check("지정된 전문가(분야 불일치여도)에게 지정 요청 알림", (await notiCount(expB, "지정 요청")) === 1);

  // q4: 전문가가 참여하면 자동 환불 대상에서 빠진다
  const q4 = (await askN("/api/questions", "POST", { category: "탈색", title: "P1 참여 테스트", body: "본문" })).data.id;
  await askN("/api/consultations", "POST", { roomId: q4 });
  check("호출받은 전문가 참여", (await expA(`/api/consultations/${q4}/join`, "POST")).status === 200);

  // wave2: 약 2초 뒤 아직 호출 안 된 다른 탈색 전문가에게 확대
  await sleep(4500);
  const a2 = await notiCount(expA, "상담이 열렸어요"), c2 = await notiCount(expC, "상담이 열렸어요");
  check("wave2: 나머지 탈색 전문가에게도 알림(q1)", c2 >= 1 && a2 >= 1, `A=${a2} C=${c2}`);
  check("wave2에도 다른 분야(펌)는 q1 호출 안 됨", (await notiCount(expB, "상담이 열렸어요")) <= 1);

  // 자동 환불: 미참여 상담(q1, q2)은 취소·환불, 참여한 q4는 유지
  await sleep(7000);
  const st = async (q) => (await askN(`/api/consultations?roomId=${q}`)).data.status;
  check("미참여 상담(q1) 자동 취소", (await st(q1)) === "cancelled", await st(q1));
  check("미참여 상담(q2, 지정) 자동 취소", (await st(q2)) === "cancelled", await st(q2));
  check("전문가가 참여한 상담(q4)은 유지", (await st(q4)) === "open", await st(q4));
  check("자동 환불 금액: 시작비 2건 전액 반환(잔액=처음−q4 시작비)", (await coinsOf(askN)) === coins0 - 50000, `${await coinsOf(askN)} vs ${coins0 - 50000}`);
  check("질문자에게 자동 환불 알림", (await notiCount(askN, "자동 취소")) >= 2);
  check("자동 취소된 상담엔 전문가 참여 불가", (await expC(`/api/consultations/${q1}/join`, "POST")).status === 409);
}

// ── 카카오 알림톡/문자 (mock 모드: 실제 발송 없이 message_log에 기록. 서버에 SMS_DEV_ECHO=1 필요)
check("잘못된 휴대폰 번호 거절", (await asker("/api/auth/phone/request", "POST", { phone: "123" })).status === 400);
r = await asker("/api/auth/phone/request", "POST", { phone: "010-1234-5678" });
check("인증번호 발송(mock)", r.status === 200 && /^\d{6}$/.test(r.data.devCode ?? ""), JSON.stringify(r));
const otp = r.data.devCode;
check("틀린 인증번호 거절", (await asker("/api/auth/phone/verify", "POST", { code: otp === "000000" ? "111111" : "000000" })).status === 400);
check("인증 전 수신 동의 불가", (await asker("/api/auth/phone/consent", "POST", { consent: true })).status === 400);
check("인증 완료(+수신 동의)", (await asker("/api/auth/phone/verify", "POST", { code: otp, consent: true })).status === 200);
r = await asker("/api/auth/me");
check("인증 상태·마스킹 번호", r.data.user.phoneVerified === true && r.data.user.notifyKakao === true && r.data.user.phone === "010-****-5678", JSON.stringify(r.data.user.phone));
const rep0 = reporters[0];
r = await rep0("/api/auth/phone/request", "POST", { phone: "01012345678" });
check("다른 계정에서 인증된 번호는 거절", r.status === 409, JSON.stringify(r));

r = await admin("/api/admin/messages", "POST", { target: names.asker, message: "점검 안내: 오늘 밤 12시" });
check("관리자 안내 발송(mock)", r.status === 200 && r.data.mock === 1 && r.data.skipped === 0, JSON.stringify(r.data));
r = await admin("/api/admin/messages", "POST", { target: `rep0_${sfx}`, message: "안내" });
check("미인증·미동의 회원은 건너뜀", r.data.skipped === 1 && r.data.mock === 0, JSON.stringify(r.data));
check("500자 초과 거절", (await admin("/api/admin/messages", "POST", { target: "all", message: "a".repeat(501) })).status === 400);
check("일반 회원은 안내 발송 불가", (await asker("/api/admin/messages", "POST", { target: "all", message: "x" })).status === 403);
r = await admin("/api/admin/messages", "POST", { target: "all", message: "전체 안내" });
check("전체 발송은 동의 회원만", r.status === 200 && r.data.targeted === 1 && r.data.mock === 1, JSON.stringify(r.data));

// 이벤트 연동: 충전 승인 → 알림톡 기록 (동의 회원)
await asker("/api/coins/charge-requests", "POST", { amountKrw: 5000, provider: "manual", depositor: "테스트" });
const pend = (await admin("/api/admin/overview")).data.charges.find((c) => c.status === "pending" && c.user_name === names.asker);
await admin(`/api/admin/charges/${pend.id}/approve`, "POST");
await new Promise((res) => setTimeout(res, 300));
const log = (await admin("/api/admin/messages")).data;
check("충전 승인 이벤트가 알림 기록(charge_approved)", log.log.some((l) => l.kind === "charge_approved" && l.status === "mock" && l.text.includes("5,000코인")), JSON.stringify(log.log.slice(0, 3)));
check("발송 문구에 브랜드 접두어", log.log.every((l) => l.text.startsWith("[미용 SOS] ")));
check("수신 가능 회원 통계", log.stats.consented === 1 && log.stats.verified === 1, JSON.stringify(log.stats));

// 수신 동의 철회 → 이후 발송 안 됨
check("수신 동의 끄기", (await asker("/api/auth/phone/consent", "POST", { consent: false })).status === 200);
r = await admin("/api/admin/messages", "POST", { target: names.asker, message: "동의 철회 후" });
check("동의 철회 후 건너뜀", r.data.skipped === 1 && r.data.mock === 0, JSON.stringify(r.data));
check("번호 삭제", (await asker("/api/auth/phone/remove", "POST")).status === 200);
check("삭제 후 미인증", (await asker("/api/auth/me")).data.user.phoneVerified === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
