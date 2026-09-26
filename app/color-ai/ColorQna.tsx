"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { api, jsonInit } from "@/lib/client";

type Answer = {
  id: string;
  title: string;
  summary: string;
  points: string[];
  page: string | null;
  source: { title: string; author: string; url: string };
};
type Related = { id: string; title: string };
type AskResult = { matched: boolean; answer: Answer | null; related: Related[] };
type Source = { id: string; title: string; author: string; url: string; topics: Related[] };

const SAMPLE_QUESTIONS = [
  "칩과 피치가 뭐예요?",
  "하이라이트를 자연스럽게 블랜드하려면?",
  "호일 워크 비율은 어떻게 잡나요?",
  "앞머리 슬라이스는 어떤 방향으로?",
  "베이스 명도가 질감에 주는 영향은?",
  "투톤 배색 요령 알려줘",
];

// 학습한 컬러 이론 자료(영상·책)에서 답을 찾아 출처와 함께 보여준다.
export default function ColorQna() {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [showTopics, setShowTopics] = useState(false);

  useEffect(() => {
    api<{ sources: Source[] }>("/api/color-ai/ask").then((r) => {
      if (r.ok) setSources(r.data.sources);
    });
  }, []);

  const ask = async (q: string) => {
    const text = q.trim();
    if (text.length < 2) {
      setError("질문을 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    const r = await api<AskResult>("/api/color-ai/ask", jsonInit("POST", { question: text }));
    setLoading(false);
    if (!r.ok) {
      setError(r.data.error || "답변을 찾지 못했어요.");
      return;
    }
    setAsked(text);
    setResult(r.data);
  };

  const openTopic = async (topic: Related) => {
    setLoading(true);
    setError("");
    const r = await api<{ answer: Answer }>(`/api/color-ai/ask?id=${encodeURIComponent(topic.id)}`);
    setLoading(false);
    if (!r.ok) {
      setError(r.data.error || "항목을 불러오지 못했어요.");
      return;
    }
    setAsked(topic.title);
    setResult({ matched: true, answer: r.data.answer, related: [] });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(question);
  };

  const topicCount = sources.reduce((n, s) => n + s.topics.length, 0);

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-4 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">Color Theory Q&amp;A</p>
          <h2 className="mt-1 text-lg font-bold">컬러 이론 물어보기</h2>
          <p className="mt-1 text-xs text-muted">학습한 자료 {sources.length}건 · 주제 {topicCount}개에서 답을 찾아 출처와 함께 알려드려요.</p>
        </div>
        <button type="button" onClick={() => setShowTopics((v) => !v)} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground">
          {showTopics ? "주제 닫기" : "학습한 주제 보기"}
        </button>
      </div>

      {showTopics ? (
        <div className="mt-4 space-y-3">
          {sources.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-surface-2 p-3">
              <a href={s.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-rose-300 underline">{s.title}</a>
              <p className="mt-0.5 text-[11px] text-muted">{s.author}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.topics.map((t) => (
                  <button key={t.id} type="button" onClick={() => openTopic(t)} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted hover:border-rose-500 hover:text-foreground">{t.title}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={300}
          placeholder="예) 위빙할 때 칩 두께는 어떻게 정하나요?"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted"
        />
        <button type="submit" disabled={loading} className="shrink-0 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-400 disabled:opacity-50">
          {loading ? "찾는 중..." : "질문"}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SAMPLE_QUESTIONS.map((q) => (
          <button key={q} type="button" onClick={() => { setQuestion(q); ask(q); }} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-muted hover:text-foreground">{q}</button>
        ))}
      </div>
      {error ? <p className="mt-3 text-xs text-rose-400" role="status">{error}</p> : null}

      {result ? (
        <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
          <p className="text-[11px] text-muted">Q. {asked}</p>
          {result.answer ? (
            <>
              <h3 className="mt-2 font-bold">{result.answer.title}</h3>
              <p className="mt-2 text-sm leading-6">{result.answer.summary}</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs leading-5 text-muted">
                {result.answer.points.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
              <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted">
                출처: <a href={result.answer.source.url} target="_blank" rel="noreferrer" className="text-rose-300 underline">{result.answer.source.title}</a>
                {result.answer.page ? ` · ${result.answer.page}` : ""}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm leading-6">
              학습한 자료에서 딱 맞는 답을 찾지 못했어요. 질문을 조금 바꿔 보거나{" "}
              <Link href="/ask" className="font-semibold text-rose-400 underline">전문가에게 질문</Link>해 보세요.
            </p>
          )}
          {result.related.length > 0 ? (
            <div className="mt-3">
              <p className="text-[11px] font-semibold text-muted">{result.answer ? "관련 내용" : "혹시 이런 내용을 찾으셨나요?"}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {result.related.map((t) => (
                  <button key={t.id} type="button" onClick={() => openTopic(t)} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted hover:border-rose-500 hover:text-foreground">{t.title}</button>
                ))}
              </div>
            </div>
          ) : null}
          <p className="mt-3 text-[10px] text-muted">자료 내용을 요약한 참고 정보이며, 실제 시술은 모발 상태에 따른 디자이너의 판단이 필요합니다.</p>
        </div>
      ) : null}
    </section>
  );
}
