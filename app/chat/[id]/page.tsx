"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, jsonInit, useMe, won } from "@/lib/client";
import {
  ATTACHMENT_COST, AUTO_REFUND_MINUTES, canHandle, COST_PER_SEC, DEFAULT_DIFFICULTY, DIFFICULTIES, DIFFICULTY_KEYS, type Difficulty,
  EXPERT_SHARE, MAX_MESSAGE_CHARS, MESSAGE_PER_CHAR, messageCost,
} from "@/lib/server/pricing";

type Msg = {
  id: number; sender_id: string; sender_name: string; body: string;
  attachment_type: "image" | "file" | "call" | null; attachment_url: string | null; attachment_name: string | null; created_at: string;
};
type Status = {
  started: boolean; status: "open" | "ended" | "cancelled" | null; role: "asker" | "expert" | "viewer";
  canJoin: boolean; isQuestionOwner: boolean; category: string; expertName: string | null; expertId: string | null; reviewed: boolean; askerName: string | null; coins: number;
  difficulty: Difficulty | null; fee: number | null; deadline: string | null; preferredName: string | null;
};
type Expert = {
  id: string; name: string; headline: string | null; rating: number | null; reviewCount: number; available: boolean;
  years: number | null; consultations: number; avgResponseMinutes: number | null;
};

/** 응답 마감까지 남은 시간(mm:ss). 1초마다 갱신하고, 10초마다·마감 시 상태를 다시 불러온다. */
function Countdown({ until, onDone }: { until: string; onDone: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const s = setInterval(onDone, 10_000);
    return () => { clearInterval(t); clearInterval(s); };
  }, [onDone]);
  const left = Math.max(0, Math.round((Date.parse(until) - now) / 1000));
  useEffect(() => { if (left === 0) onDone(); }, [left, onDone]);
  return <b className="tabular-nums">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</b>;
}
type Call = { url: string; type: "voice" | "video" };

function Attachment({ m }: { m: Msg }) {
  // 같은 출처 + 세션 쿠키로 인증되므로 그대로 src에 쓸 수 있다.
  return m.attachment_type === "image"
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={m.attachment_url!} alt={m.attachment_name ?? "사진"} className="mt-1 max-h-60 rounded-lg" />
    : <a href={m.attachment_url!} download={m.attachment_name ?? "file"} className="mt-1 block text-xs underline">📎 {m.attachment_name}</a>;
}

function CallPanel({ call, roomId, billed, onEnd }: { call: Call; roomId: string; billed: boolean; onEnd: (reason?: string) => void }) {
  const [sec, setSec] = useState(0);
  const [coins, setCoins] = useState<number | null>(null);
  const ended = useRef(false);

  useEffect(() => {
    const t = setInterval(async () => {
      if (ended.current) return;
      setSec((s) => s + 1);
      const r = await api<{ coins: number; shouldEnd: boolean; endedByPeer?: boolean }>("/api/calls/tick", jsonInit("POST", { roomId, callType: call.type, url: call.url }));
      if (ended.current) return;
      if (!r.ok) { ended.current = true; onEnd(r.data.error || "통화를 종료했어요"); return; }
      setCoins(r.data.coins);
      if (r.data.shouldEnd) {
        ended.current = true;
        onEnd(r.data.endedByPeer ? "상대방이 통화를 종료했어요" : billed ? "코인이 부족해 통화가 종료됐어요" : "상담이 종료됐어요");
      }
    }, 1000);
    return () => clearInterval(t);
  }, [call.type, call.url, roomId, onEnd, billed]);

  const rate = COST_PER_SEC[call.type];
  return (
    <div className="fixed inset-0 z-20 mx-auto flex max-w-3xl flex-col bg-black">
      <iframe src={call.url} allow="camera; microphone; fullscreen; display-capture" className="flex-1 border-0" title="통화" />
      <div className="flex items-center justify-between border-t border-border bg-surface-2 px-4 py-3 text-sm text-white">
        <span>
          {call.type === "video" ? "페이스톡" : "보이스톡"} {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}
          {billed ? ` · 사용 ${won(sec * rate)}${coins !== null ? ` · 잔액 ${coins.toLocaleString()}` : ""}` : " · 무료"}
        </span>
        <button onClick={() => { ended.current = true; api("/api/calls/end", jsonInit("POST", { roomId, url: call.url })); onEnd(); }} className="rounded-full bg-rose-500 px-3 py-1 hover:bg-rose-400">종료</button>
      </div>
    </div>
  );
}

export default function Chat() {
  const { id: roomId } = useParams<{ id: string }>();
  const { me } = useMe();
  const [status, setStatus] = useState<Status | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [call, setCall] = useState<Call | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [experts, setExperts] = useState<Expert[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [pick, setPick] = useState("");
  const lastId = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);

  const loadStatus = useCallback(async () => {
    const r = await api<Status>(`/api/consultations?roomId=${roomId}`);
    if (r.ok) setStatus(r.data as Status);
    else if (r.status === 401) setErr("로그인이 필요해요");
    else setErr(r.data.error || "상담 정보를 불러오지 못했어요");
  }, [roomId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStatus();
  }, [loadStatus]);

  const participant = !!status && status.started && status.role !== "viewer";

  // 상담 시작 전, 질문 분야에 맞고 지금 응대 가능한 전문가 목록(지정용). 30초마다 갱신한다.
  const startPending = !!status && !status.started && status.isQuestionOwner;
  const category = status?.category;
  useEffect(() => {
    if (!startPending || !category) return;
    const load = () => api<Expert[]>(`/api/experts?available=1&category=${encodeURIComponent(category)}`).then((r) => {
      if (r.ok && Array.isArray(r.data)) setExperts(r.data as never);
    });
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [startPending, category]);

  // 3초마다 새 메시지를 가져온다 (포레스트클럽과 같은 폴링 방식).
  useEffect(() => {
    if (!participant) return;
    let stop = false;
    const tick = async () => {
      const r = await api<Msg[]>(`/api/messages?roomId=${roomId}&after=${lastId.current}`);
      if (stop || !r.ok || !Array.isArray(r.data) || r.data.length === 0) return;
      const list = r.data as unknown as Msg[];
      lastId.current = list[list.length - 1].id;
      setMsgs((prev) => [...prev, ...list]);
    };
    tick();
    const t = setInterval(() => { tick(); }, 3000);
    return () => { stop = true; clearInterval(t); };
  }, [participant, roomId]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  const post = async (path: string, body?: unknown) => {
    setErr("");
    const r = await api(path, jsonInit("POST", body ?? {}));
    if (!r.ok && r.status !== 409) setErr(r.data.error || "요청에 실패했어요");
    await loadStatus();
    return r;
  };

  const send = async (form: FormData) => {
    setErr("");
    form.set("roomId", roomId);
    const r = await api("/api/messages", { method: "POST", body: form });
    if (!r.ok) { setErr(r.data.error || "전송에 실패했어요"); return false; }
    loadStatus();
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !file) return;
    const f = new FormData();
    f.set("body", text);
    if (file) f.set("file", file);
    if (await send(f)) { setText(""); setFile(null); }
  };

  const join = async (type: "voice" | "video", url: string) => {
    setErr("");
    const chk = await api<{ allowed: boolean; entryMin: number; reason?: string }>(`/api/calls/can-enter?roomId=${roomId}&url=${encodeURIComponent(url)}`);
    if (!chk.data.allowed) { setErr(chk.data.reason || `코인이 ${chk.data.entryMin?.toLocaleString()}개 이하면 통화에 참여할 수 없어요`); return; }
    setCall({ url, type });
  };

  const requestCall = async (type: "voice" | "video") => {
    const f = new FormData();
    f.set("kind", "call");
    f.set("callType", type);
    if (!(await send(f))) return;
    const r = await api<Msg[]>(`/api/messages?roomId=${roomId}&after=0`);
    const last = [...((r.data as unknown as Msg[]) ?? [])].reverse().find((m) => m.attachment_type === "call");
    if (last?.attachment_url) join(type, last.attachment_url);
  };

  if (!status) return <p className="p-8 text-center text-sm text-muted">{err || "불러오는 중…"}{err.includes("로그인") && <> <Link href="/login" className="text-rose-400 underline">로그인</Link></>}</p>;

  // ── 상담 시작 전 ──
  if (!status.started) {
    const tier = DIFFICULTIES[difficulty];
    const eligible = experts.filter((x) => x.id !== me?.id && canHandle(x.years, difficulty));
    const choose = (d: Difficulty) => {
      setDifficulty(d);
      // 고른 전문가가 새 난이도를 맡을 수 없으면 선택을 푼다
      if (pick && !experts.some((x) => x.id === pick && canHandle(x.years, d))) setPick("");
    };
    const pill = (on: boolean) => `rounded-xl border p-3 text-left transition ${on ? "border-rose-500 bg-rose-500/10" : "border-border bg-surface hover:border-white/20"}`;
    return (
      <div className="mx-auto max-w-xl space-y-4 px-6 py-8">
        <h1 className="text-lg font-bold">실시간 전문가 상담 신청</h1>
        {status.isQuestionOwner ? (
          <>
            <section>
              <h2 className="mb-2 text-sm font-semibold">1. 질문 난이도</h2>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTY_KEYS.map((d) => {
                  const t = DIFFICULTIES[d];
                  const n = experts.filter((x) => x.id !== me?.id && canHandle(x.years, d)).length;
                  return (
                    <button type="button" key={d} onClick={() => choose(d)} className={pill(difficulty === d)}>
                      <b className="block text-sm">{t.label}</b>
                      <span className="block text-sm text-rose-300">{won(t.fee)}</span>
                      <span className="mt-1 block text-[11px] text-muted">{t.minYears > 0 ? `경력 ${t.minYears}년+` : "경력 무관"} · 응대 가능 {n}명</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted">{tier.label}: {tier.desc}</p>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold">2. 지금 답변 가능한 전문가 <span className="font-normal text-muted">(선택)</span></h2>
              <ul className="space-y-2">
                <li>
                  <button type="button" onClick={() => setPick("")} className={`w-full ${pill(pick === "")}`}>
                    <b className="text-sm">자동 배정</b>
                    <span className="block text-xs text-muted">응대 가능한 전문가 여러 명에게 동시에 알려 가장 먼저 참여한 분과 연결해요</span>
                  </button>
                </li>
                {eligible.map((x) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => setPick(x.id)} className={`w-full ${pill(pick === x.id)}`}>
                      <span className="flex items-center gap-1.5 text-sm">
                        <b>{x.name}</b>
                        <span className="text-[11px] text-emerald-400">● 응대 가능</span>
                        {x.years !== null && <span className="text-[11px] text-muted">경력 {x.years}년</span>}
                      </span>
                      {x.headline && <span className="block text-xs">{x.headline}</span>}
                      <span className="block text-xs text-muted">
                        {x.rating !== null ? <><span className="text-amber-400">★</span> {x.rating.toFixed(1)} ({x.reviewCount})</> : "후기 없음"}
                        {` · 상담 ${x.consultations}건`}
                        {x.avgResponseMinutes !== null && ` · 평균 응답 ${x.avgResponseMinutes}분`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {eligible.length === 0 && (
                <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-300">
                  지금 {tier.label} 질문을 맡을 수 있는 응대 가능 전문가가 없어요. 자동 배정으로 신청하면 쉬는 중이던 전문가가 돌아올 때까지 기다리고, {AUTO_REFUND_MINUTES}분 안에 아무도 참여하지 않으면 전액 환불돼요.
                </p>
              )}
              {pick && <p className="mt-1.5 text-xs text-muted">고른 전문가에게 먼저 알리고, 응답이 없으면 다른 전문가에게도 알려요.</p>}
            </section>

            <div className="rounded-xl border border-border bg-surface p-4 text-sm">
              <p><b>{AUTO_REFUND_MINUTES}분 안에 응답</b>을 약속해요. 그 안에 참여하는 전문가가 없으면 자동으로 취소되고 전액 환불돼요.</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted">
                <li>상담 시작비 {tier.label} <b>{won(tier.fee)}</b> (신청할 때 1회)</li>
                <li>쪽지 글자당 {MESSAGE_PER_CHAR}코인 (최소 500코인, 1회 {MAX_MESSAGE_CHARS}자 이내)</li>
                <li>보이스톡 초당 {COST_PER_SEC.voice}코인 · 페이스톡 초당 {COST_PER_SEC.video}코인</li>
                <li>전문가가 참여하기 전에는 언제든 전액 환불로 취소할 수 있어요.</li>
              </ul>
              <p className="mt-3">내 코인: <b>{status.coins.toLocaleString()}</b></p>
            </div>
            {status.coins < tier.fee && <Link href="/coins" className="block rounded-lg border border-border py-2 text-center text-sm hover:border-white/30">코인 충전하러 가기</Link>}
            {err && <p className="text-sm text-rose-400">{err}</p>}
            <button onClick={() => post("/api/consultations", { roomId, difficulty, expertId: pick || undefined })} className="w-full rounded-lg bg-rose-500 py-3 font-medium text-white hover:bg-rose-400">{won(tier.fee)} 결제하고 상담 시작</button>
          </>
        ) : (
          <p className="text-sm text-muted">질문 작성자가 상담을 시작하면 승인된 전문가가 참여할 수 있어요.</p>
        )}
      </div>
    );
  }

  // ── 상담 참여 전(구경) ──
  if (status.role === "viewer") {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-6 py-8">
        <h1 className="text-lg font-bold">1:1 상담</h1>
        {status.canJoin ? (
          <>
            <p className="text-sm text-muted">
              {status.askerName}님이 {status.difficulty && <b className="text-foreground">{DIFFICULTIES[status.difficulty].label}</b>} 상담을 신청했어요. 참여하면 질문자가 낸 금액의 {Math.round(EXPERT_SHARE * 100)}%가 수익으로 쌓여요.
              {status.deadline && <> 응답 마감까지 <Countdown until={status.deadline} onDone={loadStatus} /></>}
            </p>
            {err && <p className="text-sm text-rose-400">{err}</p>}
            <button onClick={() => post(`/api/consultations/${roomId}/join`)} className="w-full rounded-lg bg-rose-500 py-3 font-medium text-white hover:bg-rose-400">전문가로 상담 참여</button>
          </>
        ) : (
          <p className="text-sm text-muted">
            {status.deadline && status.difficulty && me?.isExpert
              ? `${DIFFICULTIES[status.difficulty].label} 상담은 경력 ${DIFFICULTIES[status.difficulty].minYears}년 이상 전문가만 참여할 수 있어요.`
              : "이 상담은 참여자만 볼 수 있어요."}
          </p>
        )}
      </div>
    );
  }

  const isAsker = status.role === "asker";
  const review = async () => {
    const r = await api("/api/reviews", jsonInit("POST", { roomId, rating, comment }));
    if (!r.ok) setErr(r.data.error || "후기 등록에 실패했어요");
    loadStatus();
  };
  const open = status.status === "open";
  const cost = isAsker ? messageCost(text, !!file) : 0;
  const chars = [...text].length;

  return (
    <div className="flex h-[calc(100vh-134px)] flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 text-xs text-muted">
        <span>
          {isAsker ? <>질문자(나) · 전문가: {status.expertId ? <Link href={`/experts/${status.expertId}`} className="underline">{status.expertName}</Link> : "대기 중"}</> : `전문가(나) · 질문자: ${status.askerName}`}
          {isAsker && ` · 잔액 ${status.coins.toLocaleString()}`}
        </span>
        <span className="flex shrink-0 gap-2">
          {open && isAsker && !status.expertName && <button onClick={() => confirm("전액 환불하고 상담을 취소할까요?") && post(`/api/consultations/${roomId}/cancel`)} className="underline hover:text-foreground">취소·환불</button>}
          {open && <button onClick={() => confirm("상담을 종료할까요? 종료 후에는 메시지·통화를 할 수 없어요.") && post(`/api/consultations/${roomId}/end`)} className="underline hover:text-foreground">상담 종료</button>}
          <Link href={`/q/${roomId}`} className="text-rose-400 underline">질문</Link>
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto bg-surface p-3">
        {isAsker && open && !status.expertName && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-center text-xs text-amber-300">
            <p>
              {status.preferredName ? <><b>{status.preferredName}</b> 전문가에게 먼저 요청했어요. </> : "전문가가 참여하길 기다리고 있어요. "}
              {status.deadline && <>응답 마감까지 <Countdown until={status.deadline} onDone={loadStatus} /></>}
            </p>
            <p className="mt-0.5 text-amber-300/80">{AUTO_REFUND_MINUTES}분 안에 참여하는 전문가가 없으면 자동으로 전액 환불돼요. 메시지를 남겨두면 참여한 전문가가 볼 수 있어요.</p>
          </div>
        )}
        {!open && <p className="rounded-lg bg-white/5 p-2 text-center text-xs text-muted">{status.status === "cancelled" ? "취소된 상담이에요 (전액 환불)" : "종료된 상담이에요"}</p>}
        {msgs.map((m) => {
          const mine = m.sender_id === me?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-rose-500 text-white" : "border border-border bg-surface-2"}`}>
                {!mine && <p className="mb-0.5 text-[11px] font-semibold text-muted">{m.sender_name}</p>}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                {(m.attachment_type === "image" || m.attachment_type === "file") && m.attachment_url && <Attachment m={m} />}
                {m.attachment_type === "call" && m.attachment_url && open && (
                  <button onClick={() => join(m.attachment_name === "video" ? "video" : "voice", m.attachment_url!)} className="mt-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-rose-600">통화 참여</button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {status.status === "ended" && isAsker && status.expertId && !status.reviewed && (
        <div className="space-y-2 border-t border-border bg-surface p-3">
          <p className="text-sm font-medium">상담은 어땠나요?</p>
          <div className="flex gap-1 text-2xl">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setRating(n)} className={n <= rating ? "text-amber-400" : "text-white/15"}>★</button>)}</div>
          <input value={comment} onChange={(e) => setComment(e.target.value.slice(0, 300))} placeholder="후기 (선택, 300자 이내)" className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted" />
          <button onClick={review} className="w-full rounded-lg bg-rose-500 py-2 text-sm font-medium text-white hover:bg-rose-400">후기 남기기</button>
        </div>
      )}
      {status.status === "ended" && isAsker && status.reviewed && <p className="border-t border-border bg-surface p-3 text-center text-xs text-muted">후기를 남겨주셔서 감사해요.</p>}
      {open && (
        <form onSubmit={submit} className="space-y-1.5 border-t border-border bg-surface p-3">
          {err && <p className="text-xs text-rose-400">{err}</p>}
          {file && <p className="text-xs text-muted">📎 {file.name} <button type="button" onClick={() => setFile(null)} className="underline">취소</button></p>}
          <div className="flex gap-1.5">
            <button type="button" onClick={() => requestCall("voice")} className="rounded-lg border border-border px-2 text-lg hover:border-white/30" title="보이스톡">📞</button>
            <button type="button" onClick={() => requestCall("video")} className="rounded-lg border border-border px-2 text-lg hover:border-white/30" title="페이스톡">📹</button>
            <label className="flex cursor-pointer items-center rounded-lg border border-border px-2 text-lg hover:border-white/30" title="사진/파일">
              📎<input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <input value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_MESSAGE_CHARS))} placeholder="메시지 입력" className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted" />
            <button className="rounded-lg bg-rose-500 px-3 text-sm text-white hover:bg-rose-400">전송</button>
          </div>
          <p className="text-[11px] text-muted">
            {chars}/{MAX_MESSAGE_CHARS}자{isAsker ? ` · 이 메시지 ${won(cost)}${file ? ` (첨부 ${ATTACHMENT_COST} 포함)` : ""}` : " · 전문가는 무료"}
          </p>
        </form>
      )}
      {!open && err && <p className="p-3 text-xs text-rose-400">{err}</p>}
      {call && <CallPanel call={call} roomId={roomId} billed={isAsker} onEnd={(reason) => { setCall(null); if (reason) setErr(reason); loadStatus(); }} />}
    </div>
  );
}
