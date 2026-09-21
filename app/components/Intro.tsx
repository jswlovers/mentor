"use client";
import Link from "next/link";
import { useMe, won } from "@/lib/client";
import { CONSULT_START_FEE, COST_PER_SEC, EXPERT_SHARE } from "@/lib/server/pricing";

const STEPS = [
  {
    n: 1,
    title: "질문 올리기",
    badge: "무료",
    body: "막힌 시술·매장 문제를 사진(최대 3장)과 함께 올려요. 약제·시간·모질을 적을수록 답이 정확해져요.",
  },
  {
    n: 2,
    title: "답변 받고 채택하기",
    badge: "무료",
    body: "누구나 답변을 남길 수 있고, 검증 전문가의 답변에는 배지가 붙어요. 도움이 된 답변을 채택하면 해결됨으로 바뀌어요.",
  },
  {
    n: 3,
    title: "급하면 1:1 상담",
    badge: "코인",
    body: `전문가와 채팅·보이스톡·페이스톡으로 바로 해결해요. 상담 시작비 ${won(CONSULT_START_FEE)}, 전문가가 참여하기 전에는 전액 환불로 취소할 수 있어요.`,
  },
];

export default function Intro() {
  const { me } = useMe();
  return (
    <section className="border-b px-4 py-8 sm:py-10" aria-labelledby="intro-title">
      <p className="text-sm font-semibold text-rose-600">미용 SOS</p>
      <h1 id="intro-title" className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">
        시술 중에 막혔나요?
        <br />
        현직 전문가에게 바로 물어보세요.
      </h1>
      <p className="mt-3 max-w-2xl text-neutral-600">
        미용인이 시술·매장 운영 중 막힌 문제를 올리면, 검증된 현직 전문가가 답해 주는 서비스예요.
        가볍게 물어볼 땐 무료 Q&amp;A로, 지금 당장 해결해야 할 땐 유료 1:1 상담으로 이용하세요.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/ask" className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-medium text-white">
          질문하기
        </Link>
        {me === null && (
          <Link href="/login" className="rounded-full border px-5 py-2.5 text-sm font-medium">
            로그인 · 회원가입
          </Link>
        )}
      </div>

      <h2 className="mt-9 text-lg font-bold">이렇게 이용해요</h2>
      <ol className="mt-3 grid gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white">{s.n}</span>
              <span className="font-semibold">{s.title}</span>
              <span className="ml-auto rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">{s.badge}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-600">
          <p className="font-semibold text-neutral-900">코인이란?</p>
          <p className="mt-1">
            서비스 안에서 쓰는 결제 수단이에요. 1코인 = 1원이고, 무통장입금으로 충전해요.
            보이스톡은 분당 {won(COST_PER_SEC.voice * 60)}, 페이스톡은 분당 {won(COST_PER_SEC.video * 60)}이 통화한 시간만큼만 차감돼요.
            요금은 질문자에게만 부과되고 전문가는 무료예요.
          </p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-600">
          <p className="font-semibold text-neutral-900">전문가로 활동하고 싶다면</p>
          <p className="mt-1">
            로그인 후 <Link href="/expert" className="text-rose-600 underline">전문가 신청</Link>으로 경력을 남기면, 관리자 승인 뒤 상담에 참여할 수 있어요.
            상담 금액의 {Math.round(EXPERT_SHARE * 100)}%가 수익으로 쌓이고 출금 신청할 수 있어요.
          </p>
        </div>
      </div>

      <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
        사진은 질문과 함께 누구에게나 공개돼요. 고객의 얼굴·이름·연락처가 보이면 가리거나 잘라서 올려 주세요.
      </p>
    </section>
  );
}
