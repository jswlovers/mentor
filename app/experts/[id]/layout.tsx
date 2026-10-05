import type { Metadata } from "next";
import { getExpertProfile } from "@/lib/server/experts";
import { jsonLd, siteUrl, SITE_NAME, summarize } from "@/lib/server/site";

// 전문가 프로필도 화면은 클라이언트에서 그려지므로, 검색엔진·공유 미리보기용 정보를 서버가 미리 넣어 준다.
export async function generateMetadata({ params }: LayoutProps<"/experts/[id]">): Promise<Metadata> {
  const { id } = await params;
  const e = getExpertProfile(id);
  if (!e) return { title: `전문가를 찾을 수 없어요 - ${SITE_NAME}`, robots: { index: false } };
  const fields = e.categories.length ? `${e.categories.join("·")} 전문가` : "미용 전문가";
  const title = `${e.name} ${fields}${e.salon ? ` (${e.salon})` : ""} - ${SITE_NAME}`;
  const description = summarize(
    [e.headline, e.rating !== null ? `평점 ${e.rating} · 후기 ${e.reviewCount}개` : null, e.bio].filter(Boolean).join(" · ") || `${SITE_NAME}에서 ${e.name} 전문가에게 질문하고 1:1 상담을 받아보세요.`,
  );
  const url = `${siteUrl()}/experts/${e.id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "profile", title, description, url, siteName: SITE_NAME, locale: "ko_KR", images: e.photoUrl ? [e.photoUrl] : undefined },
  };
}

export default async function ExpertLayout({ children, params }: LayoutProps<"/experts/[id]">) {
  const { id } = await params;
  const e = getExpertProfile(id);
  if (!e) return children;
  const data = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: e.name,
      description: e.headline || undefined,
      jobTitle: e.categories.length ? `${e.categories.join("·")} 전문가` : "미용 전문가",
      worksFor: e.salon ? { "@type": "Organization", name: e.salon } : undefined,
      url: `${siteUrl()}/experts/${e.id}`,
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />
      {children}
    </>
  );
}
