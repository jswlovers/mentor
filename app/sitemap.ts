import type { MetadataRoute } from "next";
import { db } from "@/lib/server/db";
import { siteUrl } from "@/lib/server/site";

// 검색엔진에 알려 줄 공개 페이지 목록. 1시간마다 새로 만든다.
export const revalidate = 3600;

const questionsStmt = db.prepare(
  `SELECT q.id, MAX(q.created_at, COALESCE((SELECT MAX(a.created_at) FROM answers a WHERE a.question_id = q.id), q.created_at)) AS updated
   FROM questions q ORDER BY q.created_at DESC LIMIT 45000`,
);
const expertsStmt = db.prepare(`SELECT id FROM users WHERE expert_status = 'approved' AND suspended_at IS NULL`);

const iso = (sqlTime: string) => new Date(`${sqlTime.replace(" ", "T")}Z`);

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const fixed: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/experts`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/color-ai`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${base}/refund-policy`, changeFrequency: "yearly", priority: 0.1 },
  ];
  const questions = (questionsStmt.all() as { id: string; updated: string }[]).map((q) => ({
    url: `${base}/q/${q.id}`,
    lastModified: iso(q.updated),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  const experts = (expertsStmt.all() as { id: string }[]).map((e) => ({ url: `${base}/experts/${e.id}`, changeFrequency: "weekly" as const, priority: 0.6 }));
  return [...fixed, ...questions, ...experts];
}
