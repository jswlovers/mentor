import type { Metadata } from "next";
import { db } from "@/lib/server/db";
import { jsonLd, siteUrl, SITE_NAME, summarize } from "@/lib/server/site";

// 질문 상세는 화면이 클라이언트에서 그려지므로, 검색엔진·공유 미리보기를 위한 제목·설명과
// 구조화 데이터(QAPage: 질문과 답변 본문)를 여기서 서버가 미리 넣어 준다.
type Q = { id: string; category: string; title: string; body: string; created_at: string; asker_name: string; status: string };
type A = { author_name: string; is_expert: number; body: string; accepted: number; created_at: string };

const qStmt = db.prepare(`SELECT id, category, title, body, created_at, asker_name, status FROM questions WHERE id = ?`);
const aStmt = db.prepare(`SELECT author_name, is_expert, body, accepted, created_at FROM answers WHERE question_id = ? ORDER BY id ASC`);
const imgStmt = db.prepare(`SELECT url FROM question_images WHERE question_id = ? ORDER BY id LIMIT 1`);

const iso = (sqlTime: string) => `${sqlTime.replace(" ", "T")}Z`;

export async function generateMetadata({ params }: LayoutProps<"/q/[id]">): Promise<Metadata> {
  const { id } = await params;
  const q = qStmt.get(id) as Q | undefined;
  if (!q) return { title: `질문을 찾을 수 없어요 - ${SITE_NAME}`, robots: { index: false } };
  const hasAnswer = !!aStmt.get(id);
  const title = `[${q.category}] ${q.title} - ${SITE_NAME}`;
  const description = summarize(`${q.body}${hasAnswer ? "" : " (전문가 답변을 기다리는 질문)"}`);
  const img = imgStmt.get(id) as { url: string } | undefined;
  const url = `${siteUrl()}/q/${q.id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", title, description, url, siteName: SITE_NAME, locale: "ko_KR", publishedTime: iso(q.created_at), images: img ? [img.url] : undefined },
  };
}

export default async function QuestionLayout({ children, params }: LayoutProps<"/q/[id]">) {
  const { id } = await params;
  const q = qStmt.get(id) as Q | undefined;
  if (!q) return children;
  const answers = aStmt.all(id) as A[];
  const toAnswer = (a: A) => ({
    "@type": "Answer",
    text: a.body,
    dateCreated: iso(a.created_at),
    author: { "@type": "Person", name: a.is_expert ? `${a.author_name} (전문가)` : a.author_name },
    url: `${siteUrl()}/q/${q.id}`,
  });
  const accepted = answers.find((a) => a.accepted);
  const data = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: q.title,
      text: q.body,
      dateCreated: iso(q.created_at),
      author: { "@type": "Person", name: q.asker_name },
      answerCount: answers.length,
      ...(accepted ? { acceptedAnswer: toAnswer(accepted) } : {}),
      ...(answers.length ? { suggestedAnswer: answers.filter((a) => a !== accepted).map(toAnswer) } : {}),
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />
      {children}
    </>
  );
}
