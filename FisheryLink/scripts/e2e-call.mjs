// 통화 종료 동기화 테스트 (실제 Daily.co 방을 만든다 → DAILY_API_KEY가 설정된 서버, seed-test.mjs 계정 필요)
//   node scripts/e2e-call.mjs [baseUrl]
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const B = process.argv[2] || "https://localhost:3004";
function cl() {
  let c = "";
  return async (p, m = "GET", b) => {
    const isF = b instanceof FormData;
    const r = await fetch(B + p, { method: m, headers: { ...(c ? { cookie: c } : {}), ...(b && !isF ? { "content-type": "application/json" } : {}) }, body: b ? (isF ? b : JSON.stringify(b)) : undefined });
    const s = r.headers.get("set-cookie");
    if (s) c = s.split(";")[0];
    return { status: r.status, data: await r.json().catch(() => ({})) };
  };
}
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { if (c) pass++; else fail++; console.log((c ? "PASS " : "FAIL ") + n + (c ? "" : " -> " + x)); };

const a = cl(), e = cl();
await a("/api/auth/login", "POST", { username: "test_asker", password: "test1234!" });
await e("/api/auth/login", "POST", { username: "test_expert", password: "test1234!" });
const q = (await a("/api/questions")).data[0].id;
async function newCall(who, type) {
  const f = new FormData(); f.set("roomId", q); f.set("kind", "call"); f.set("callType", type);
  const r = await who("/api/messages", "POST", f);
  if (r.status !== 201) throw new Error("통화 요청 실패: " + JSON.stringify(r));
  return (await a(`/api/messages?roomId=${q}`)).data.filter((x) => x.attachment_type === "call").pop().attachment_url;
}
const tick = (who, url) => who("/api/calls/tick", "POST", { roomId: q, callType: "video", url });

// 1) 전문가가 종료 → 질문자도 종료
let url = await newCall(a, "video");
let r = await tick(a, url);
ok("통화 중 질문자 과금", r.data.billed === true && r.data.shouldEnd === false, JSON.stringify(r.data));
const before = (await a("/api/auth/me")).data.user.coins;
r = await e("/api/calls/end", "POST", { roomId: q, url });
ok("전문가가 종료", r.status === 200, JSON.stringify(r));
r = await tick(a, url);
ok("질문자 tick → 함께 종료", r.data.shouldEnd === true && r.data.endedByPeer === true, JSON.stringify(r.data));
ok("종료 후 추가 과금 없음", (await a("/api/auth/me")).data.user.coins === before);
r = await a(`/api/calls/can-enter?roomId=${q}&url=${encodeURIComponent(url)}`);
ok("종료된 통화 재입장 차단", r.data.allowed === false && /종료/.test(r.data.reason));

// 2) 질문자가 종료 → 전문가도 종료
url = await newCall(e, "voice");
r = await tick(e, url);
ok("전문가 tick 정상(무과금)", r.data.shouldEnd === false && r.data.billed === false, JSON.stringify(r.data));
r = await a("/api/calls/end", "POST", { roomId: q, url });
ok("질문자가 종료", r.status === 200);
r = await tick(e, url);
ok("전문가 tick → 함께 종료", r.data.shouldEnd === true && r.data.endedByPeer === true, JSON.stringify(r.data));
r = await a("/api/calls/end", "POST", { roomId: q, url });
ok("중복 종료는 무해", r.status === 200);
const endMsgs = (await a(`/api/messages?roomId=${q}`)).data.filter((x) => x.body.includes("통화가 종료"));
ok("종료 안내 메시지는 통화당 1건", endMsgs.length >= 2 && endMsgs.length % 1 === 0, String(endMsgs.length));

// 3) 권한
const o = cl();
await o("/api/auth/signup", "POST", { username: "outsider" + Math.random().toString(36).slice(2, 6), password: "password1", name: "x" });
ok("제3자 종료 불가", (await o("/api/calls/end", "POST", { roomId: q, url })).status === 403);
ok("없는 통화 URL 거절", (await a("/api/calls/end", "POST", { roomId: q, url: "https://x/none" })).status === 404);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
