"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, jsonInit, useMe, won } from "@/lib/client";
import Avatar from "../../components/Avatar";
import {
  ATTACHMENT_COST, AUTO_REFUND_MINUTES, COST_PER_SEC, DEFAULT_TIER, MAX_MESSAGE_CHARS, MAX_VIDEO_BYTES,
  MESSAGE_PER_CHAR, messageCost, type Tier, TIER_KEYS, TIERS,
} from "@/lib/server/pricing";

type Msg = {
  id: number; sender_id: string; sender_name: string; body: string;
  attachment_type: "image" | "video" | "file" | "call" | null; attachment_url: string | null; attachment_name: string | null; created_at: string;
};
type Status = {
  started: boolean; status: "open" | "ended" | "cancelled" | null; role: "asker" | "expert" | "viewer";
  canJoin: boolean; isQuestionOwner: boolean; category: string; expertName: string | null; expertId: string | null; reviewed: boolean; askerName: string | null; coins: number;
  tier: Tier | null; fee: number | null; expertShare: number | null; deadline: string | null; preferredName: string | null; targetNames: string[];
};
type Expert = {
  id: string; name: string; headline: string | null; salon: string | null; photoUrl: string | null; rating: number | null; reviewCount: number; available: boolean;
  consultations: number; medianResponseMinutes: number | null;
};

/** 등급별로 답변에 담기는 것 */
const INCLUDES: Record<Tier, string[]> = {
  basic: ["글 답변"],
  detail: ["글 답변", "사진·도식·자료 첨부"],
  premium: ["글 답변", "사진·도식·자료 첨부", "🎬 시연 영상"],
};
const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm";
const PHOTO_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip";

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
  if (m.attachment_type === "video") return <video src={m.attachment_url!} controls playsInline preload="metadata" className="mt-1 max-h-80 w-full rounded-lg bg-black" />;
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
  const [expertsLoaded, setExpertsLoaded] = useState(false);
  const [tierKey, setTierKey] = useState<Tier>(DEFAULT_TIER);
  // 전문가 찾기에서 골라 온 전문가(?expert=)를 미리 선택해 둔다
  const search = useSearchParams();
  const presetExpert = search.get("expert");
  // ⚡ 지금 답변 가능한 전문가 찾기로 고른 여러 명(?experts=a,b). 기본으로 "이분들에게 동시에 요청"이 선택된다.
  const groupIds = (search.get("experts") ?? "").split(",").filter(Boolean).slice(0, 10);
  const GROUP = "__group__";
  const [pick, setPick] = useState(groupIds.length ? GROUP : presetExpert ?? "");
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
      if (r.ok && Array.isArray(r.data)) { setExperts(r.data as never); setExpertsLoaded(true); }
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
    const tier = TIERS[tierKey];
    const eligible = experts.filter((x) => x.id !== me?.id);
    // 골라 온 전문가가 지금 응대 불가(쉬는 중·불가 시간)면 자동 배정으로 신청한다
    const groupOnline = eligible.filter((x) => groupIds.includes(x.id)); // 고른 전문가 중 지금 온라인인 분
    const pickOk = !pick || (pick === GROUP ? groupOnline.length > 0 : eligible.some((x) => x.id === pick));
    const pickGone = expertsLoaded && !pickOk;
    const pill = (on: boolean) => `rounded-xl border p-3 text-left transition ${on ? "border-rose-500 bg-rose-500/10" : "border-border bg-surface hover:border-white/20"}`;
    return (
      <div className="mx-auto max-w-xl space-y-4 px-6 py-8">
        <h1 className="text-lg font-bold">실시간 전문가 상담 신청</h1>
        {status.isQuestionOwner ? (
          <>
            <section>
              <h2 className="mb-2 text-sm font-semibold">1. 답변 등급</h2>
              <div className="grid grid-cols-3 gap-2">
                {TIER_KEYS.map((k) => {
                  const t = TIERS[k];
                  return (
                    <button type="button" key={k} onClick={() => setTierKey(k)} className={pill(tierKey === k)}>
                      <b className="block text-sm">{t.label}</b>
                      <span className="block text-sm text-rose-300">{won(t.fee)}</span>
                      <ul className="mt-1 space-y-0.5 text-[11px] text-muted">
                        {INCLUDES[k].map((s) => <li key={s}>✓ {s}</li>)}
                      </ul>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted">{tier.label}: {tier.desc}</p>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold">2. 지금 답변 가능한 전문가 <span className="font-normal text-muted">(선택)</span></h2>
              <ul className="space-y-2">
                {groupIds.length > 0 && (
                  <li>
                    <button type="button" onClick={() => setPick(GROUP)} className={`w-full ${pill(pick === GROUP && !pickGone)}`}>
                      <b className="text-sm">⚡ 고른 전문가에게 동시에 요청 ({groupOnline.length}/{groupIds.length}명 온라인)</b>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {groupOnline.map((x) => <span key={x.id} className="flex items-center gap-1 rounded-full border border-border py-0.5 pl-0.5 pr-2 text-xs"><Avatar name={x.name} url={x.photoUrl} size={18} />{x.name}</span>)}
                      </span>
                      <span className="mt-1 block text-xs text-muted">지금 온라인인 분들에게만 알림이 가고, 가장 먼저 참여한 분과 연결돼요</span>
                    </button>
                  </li>
                )}
                <li>
                  <button type="button" onClick={() => setPick("")} className={`w-full ${pill(pick === "" || pickGone)}`}>
                    <b className="text-sm">자동 배정</b>
                    <span className="block text-xs text-muted">응대 가능한 전문가 여러 명에게 동시에 알려 가장 먼저 참여한 분과 연결해요</span>
                  </button>
                </li>
                {eligible.map((x) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => setPick(x.id)} className={`flex w-full gap-3 ${pill(pick === x.id)}`}>
                      <Avatar name={x.name} url={x.photoUrl} size={40} />
                      <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm">
                        <b>{x.name}</b>
                        <span className="text-[11px] text-emerald-400">● 응대 가능</span>
                      </span>
                      {x.salon && <span className="block text-xs text-foreground/80">🏢 {x.salon}</span>}
                      {x.headline && <span className="block text-xs">{x.headline}</span>}
                      <span className="block text-xs text-muted">
                        {x.rating !== null ? <><span className="text-amber-400">★</span> {x.rating.toFixed(1)} ({x.reviewCount})</> : "후기 없음"}
                        {` · 상담 ${x.consultations}건`}
                        {x.medianResponseMinutes !== null && ` · 보통 ${x.medianResponseMinutes}분 안에 응답`}
                      </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {eligible.length === 0 && (
                <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-300">
                  지금 응대 가능한 전문가가 없어요. 자동 배정으로 신청하면 쉬는 중이던 전문가가 돌아올 때까지 기다리고, {AUTO_REFUND_MINUTES}분 안에 아무도 참여하지 않으면 전액 환불돼요.
                </p>
              )}
              {pickGone && <p className="mt-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-300">{pick === GROUP ? "고른 전문가가 모두 지금은 쉬는 중이에요." : "고른 전문가가 지금은 쉬는 중이라 목록에 없어요."} 다른 전문가를 고르거나 자동 배정으로 신청해주세요.</p>}
              {pick && pickOk && <p className="mt-1.5 text-xs text-muted">{pick === GROUP ? "고른 전문가들" : "고른 전문가"}에게 먼저 알리고, 5분 안에 아무도 참여하지 않으면 다른 온라인 전문가에게도 알려요.</p>}
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
            <button onClick={() => post("/api/consultations", { roomId, tier: tierKey, ...(pickOk && pick === GROUP ? { expertIds: groupOnline.map((x) => x.id) } : { expertId: pickOk && pick ? pick : undefined }) })} className="w-full rounded-lg bg-rose-500 py-3 font-medium text-white hover:bg-rose-400">{won(tier.fee)} 결제하고 상담 시작</button>
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
              {status.askerName}님이 {status.tier && <b className="text-foreground">{TIERS[status.tier].label}</b>} 상담을 신청했어요.{status.tier === "premium" && " 시연 영상을 첨부해 답변해주세요."} {status.expertShare !== null && ` 참여하면 질문자가 낸 금액의 ${Math.round(status.expertShare * 1000) / 10}%가 수익으로 쌓여요.`}
              {status.deadline && <> 응답 마감까지 <Countdown until={status.deadline} onDone={loadStatus} /></>}
            </p>
            {err && <p className="text-sm text-rose-400">{err}</p>}
            <button onClick={() => post(`/api/consultations/${roomId}/join`)} className="w-full rounded-lg bg-rose-500 py-3 font-medium text-white hover:bg-rose-400">전문가로 상담 참여</button>
          </>
        ) : (
          <p className="text-sm text-muted">이 상담은 참여자만 볼 수 있어요.</p>
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
  // 답변 등급이 정한 첨부 범위: 영상은 프리미엄에서만, 기본 등급의 전문가는 글로만 답한다(질문자는 사진·파일 가능).
  const media = TIERS[status.tier ?? DEFAULT_TIER].media;
  const canVideo = media === "video";
  const canAttach = isAsker || media !== "text";
  const pickFile = (f: File | null) => {
    if (f && f.type.startsWith("video/") && f.size > MAX_VIDEO_BYTES) return setErr(`영상은 ${MAX_VIDEO_BYTES / 1024 / 1024}MB 이하만 보낼 수 있어요`);
    setErr("");
    setFile(f);
  };

  return (
    <div className="flex h-[calc(100vh-134px)] flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 text-xs text-muted">
        <span>
          {isAsker ? <>질문자(나) · 전문가: {status.expertId ? <Link href={`/experts/${status.expertId}`} className="underline">{status.expertName}</Link> : "대기 중"}</> : `전문가(나) · 질문자: ${status.askerName}`}
          {isAsker && ` · 잔액 ${status.coins.toLocaleString()}`}
          {status.tier && <span className="ml-1 rounded bg-rose-500/15 px-1.5 py-0.5 text-[11px] text-rose-300">{TIERS[status.tier].label}</span>}
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
              {status.targetNames?.length ? <>고른 전문가 <b>{status.targetNames.join(", ")}</b>님 중 온라인인 분들에게 요청했어요. </> : status.preferredName ? <><b>{status.preferredName}</b> 전문가에게 먼저 요청했어요. </> : "전문가가 참여하길 기다리고 있어요. "}
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
                {(m.attachment_type === "image" || m.attachment_type === "video" || m.attachment_type === "file") && m.attachment_url && <Attachment m={m} />}
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
          {!isAsker && status.tier && (
            <p className="text-[11px] text-muted">
              {TIERS[status.tier].label} 상담 · {media === "video" ? "🎬 시연 영상과 사진을 첨부해 답변해주세요" : media === "photo" ? "📷 참고 사진·자료를 첨부해 자세히 답변해주세요" : "글로 답변하는 상담이에요"}
            </p>
          )}
          {file && <p className="text-xs text-muted">{file.type.startsWith("video/") ? "🎬" : "📎"} {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB) <button type="button" onClick={() => setFile(null)} className="underline">취소</button></p>}
          <div className="flex gap-1.5">
            <button type="button" onClick={() => requestCall("voice")} className="rounded-lg border border-border px-2 text-lg hover:border-white/30" title="보이스톡">📞</button>
            <button type="button" onClick={() => requestCall("video")} className="rounded-lg border border-border px-2 text-lg hover:border-white/30" title="페이스톡">📹</button>
            {canAttach && (
              <label className="flex cursor-pointer items-center rounded-lg border border-border px-2 text-lg hover:border-white/30" title="사진/파일">
                📎<input type="file" accept={PHOTO_ACCEPT} className="hidden" onChange={(e) => { pickFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              </label>
            )}
            {canVideo && (
              <label className="flex cursor-pointer items-center rounded-lg border border-border px-2 text-lg hover:border-white/30" title={`영상 (최대 ${MAX_VIDEO_BYTES / 1024 / 1024}MB)`}>
                🎬<input type="file" accept={VIDEO_ACCEPT} className="hidden" onChange={(e) => { pickFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              </label>
            )}
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
