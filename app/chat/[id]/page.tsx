"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, jsonInit, useMe, won } from "@/lib/client";
import { ATTACHMENT_COST, CONSULT_START_FEE, COST_PER_SEC, EXPERT_SHARE, MAX_MESSAGE_CHARS, MESSAGE_PER_CHAR, messageCost } from "@/lib/server/pricing";

type Msg = {
  id: number; sender_id: string; sender_name: string; body: string;
  attachment_type: "image" | "file" | "call" | null; attachment_url: string | null; attachment_name: string | null; created_at: string;
};
type Status = {
  started: boolean; status: "open" | "ended" | "cancelled" | null; role: "asker" | "expert" | "viewer";
  canJoin: boolean; isQuestionOwner: boolean; expertName: string | null; expertId: string | null; reviewed: boolean; askerName: string | null; coins: number;
};
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
    <div className="fixed inset-0 z-20 mx-auto flex max-w-md flex-col bg-black">
      <iframe src={call.url} allow="camera; microphone; fullscreen; display-capture" className="flex-1 border-0" title="통화" />
      <div className="flex items-center justify-between bg-neutral-900 px-4 py-3 text-sm text-white">
        <span>
          {call.type === "video" ? "페이스톡" : "보이스톡"} {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}
          {billed ? ` · 사용 ${won(sec * rate)}${coins !== null ? ` · 잔액 ${coins.toLocaleString()}` : ""}` : " · 무료"}
        </span>
        <button onClick={() => { ended.current = true; api("/api/calls/end", jsonInit("POST", { roomId, url: call.url })); onEnd(); }} className="rounded-full bg-rose-600 px-3 py-1">종료</button>
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

  if (!status) return <p className="p-8 text-center text-sm text-neutral-500">{err || "불러오는 중…"}{err.includes("로그인") && <> <Link href="/login" className="text-rose-600 underline">로그인</Link></>}</p>;

  // ── 상담 시작 전 ──
  if (!status.started) {
    return (
      <div className="space-y-4 p-4">
        <h1 className="text-lg font-bold">전문가 상담 신청</h1>
        {status.isQuestionOwner ? (
          <>
            <div className="rounded-xl border p-4 text-sm">
              <p>상담 시작비 <b>{won(CONSULT_START_FEE)}</b> 를 결제하면 채팅과 통화를 시작할 수 있어요.</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-neutral-600">
                <li>쪽지 글자당 {MESSAGE_PER_CHAR}코인 (최소 500코인, 1회 {MAX_MESSAGE_CHARS}자 이내)</li>
                <li>보이스톡 초당 {COST_PER_SEC.voice}코인 · 페이스톡 초당 {COST_PER_SEC.video}코인</li>
                <li>전문가가 참여하기 전에는 언제든 전액 환불로 취소할 수 있어요.</li>
              </ul>
              <p className="mt-3">내 코인: <b>{status.coins.toLocaleString()}</b></p>
            </div>
            {status.coins < CONSULT_START_FEE && <Link href="/coins" className="block rounded-lg border py-2 text-center text-sm">코인 충전하러 가기</Link>}
            {err && <p className="text-sm text-rose-600">{err}</p>}
            <button onClick={() => post("/api/consultations", { roomId })} className="w-full rounded-lg bg-rose-600 py-3 font-medium text-white">{won(CONSULT_START_FEE)} 결제하고 상담 시작</button>
          </>
        ) : (
          <p className="text-sm text-neutral-600">질문 작성자가 상담을 시작하면 승인된 전문가가 참여할 수 있어요.</p>
        )}
      </div>
    );
  }

  // ── 상담 참여 전(구경) ──
  if (status.role === "viewer") {
    return (
      <div className="space-y-4 p-4">
        <h1 className="text-lg font-bold">1:1 상담</h1>
        {status.canJoin ? (
          <>
            <p className="text-sm text-neutral-600">{status.askerName}님이 상담을 신청했어요. 참여하면 질문자가 낸 금액의 {Math.round(EXPERT_SHARE * 100)}%가 수익으로 쌓여요.</p>
            {err && <p className="text-sm text-rose-600">{err}</p>}
            <button onClick={() => post(`/api/consultations/${roomId}/join`)} className="w-full rounded-lg bg-rose-600 py-3 font-medium text-white">전문가로 상담 참여</button>
          </>
        ) : (
          <p className="text-sm text-neutral-600">이 상담은 참여자만 볼 수 있어요.</p>
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
    <div className="flex h-[calc(100vh-88px)] flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2 text-xs">
        <span>
          {isAsker ? <>질문자(나) · 전문가: {status.expertId ? <Link href={`/experts/${status.expertId}`} className="underline">{status.expertName}</Link> : "대기 중"}</> : `전문가(나) · 질문자: ${status.askerName}`}
          {isAsker && ` · 잔액 ${status.coins.toLocaleString()}`}
        </span>
        <span className="flex shrink-0 gap-2">
          {open && isAsker && !status.expertName && <button onClick={() => confirm("전액 환불하고 상담을 취소할까요?") && post(`/api/consultations/${roomId}/cancel`)} className="underline">취소·환불</button>}
          {open && <button onClick={() => confirm("상담을 종료할까요? 종료 후에는 메시지·통화를 할 수 없어요.") && post(`/api/consultations/${roomId}/end`)} className="underline">상담 종료</button>}
          <Link href={`/q/${roomId}`} className="text-rose-600 underline">질문</Link>
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto bg-neutral-50 p-3">
        {isAsker && open && !status.expertName && <p className="rounded-lg bg-amber-50 p-2 text-center text-xs text-amber-800">전문가가 참여하길 기다리고 있어요. 메시지를 남겨두면 참여한 전문가가 볼 수 있어요.</p>}
        {!open && <p className="rounded-lg bg-neutral-200 p-2 text-center text-xs">{status.status === "cancelled" ? "취소된 상담이에요 (전액 환불)" : "종료된 상담이에요"}</p>}
        {msgs.map((m) => {
          const mine = m.sender_id === me?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-rose-600 text-white" : "bg-white shadow-sm"}`}>
                {!mine && <p className="mb-0.5 text-[11px] font-semibold text-neutral-500">{m.sender_name}</p>}
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
        <div className="space-y-2 border-t bg-white p-3">
          <p className="text-sm font-medium">상담은 어땠나요?</p>
          <div className="flex gap-1 text-2xl">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setRating(n)} className={n <= rating ? "text-amber-500" : "text-neutral-300"}>★</button>)}</div>
          <input value={comment} onChange={(e) => setComment(e.target.value.slice(0, 300))} placeholder="후기 (선택, 300자 이내)" className="w-full rounded-lg border px-3 py-2 text-sm" />
          <button onClick={review} className="w-full rounded-lg bg-rose-600 py-2 text-sm font-medium text-white">후기 남기기</button>
        </div>
      )}
      {status.status === "ended" && isAsker && status.reviewed && <p className="border-t bg-white p-3 text-center text-xs text-neutral-500">후기를 남겨주셔서 감사해요.</p>}
      {open && (
        <form onSubmit={submit} className="space-y-1.5 border-t bg-white p-3">
          {err && <p className="text-xs text-rose-600">{err}</p>}
          {file && <p className="text-xs text-neutral-600">📎 {file.name} <button type="button" onClick={() => setFile(null)} className="underline">취소</button></p>}
          <div className="flex gap-1.5">
            <button type="button" onClick={() => requestCall("voice")} className="rounded-lg border px-2 text-lg" title="보이스톡">📞</button>
            <button type="button" onClick={() => requestCall("video")} className="rounded-lg border px-2 text-lg" title="페이스톡">📹</button>
            <label className="flex cursor-pointer items-center rounded-lg border px-2 text-lg" title="사진/파일">
              📎<input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <input value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_MESSAGE_CHARS))} placeholder="메시지 입력" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" />
            <button className="rounded-lg bg-neutral-900 px-3 text-sm text-white">전송</button>
          </div>
          <p className="text-[11px] text-neutral-400">
            {chars}/{MAX_MESSAGE_CHARS}자{isAsker ? ` · 이 메시지 ${won(cost)}${file ? ` (첨부 ${ATTACHMENT_COST} 포함)` : ""}` : " · 전문가는 무료"}
          </p>
        </form>
      )}
      {!open && err && <p className="p-3 text-xs text-rose-600">{err}</p>}
      {call && <CallPanel call={call} roomId={roomId} billed={isAsker} onEnd={(reason) => { setCall(null); if (reason) setErr(reason); loadStatus(); }} />}
    </div>
  );
}
