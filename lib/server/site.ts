// 검색엔진·공유 미리보기에 쓰는 사이트 기본 정보. SITE_URL은 실제 서비스 주소(https://...)로 설정한다.
export const SITE_NAME = "미용 SOS";
export const SITE_DESCRIPTION = "미용인이 시술·매장 운영 중 막힌 문제를 올리고, 검증된 현직 전문가에게 답을 받는 곳. 무료 Q&A와 1:1 상담.";
export const siteUrl = () => (process.env.SITE_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");

/** 메타 설명용: 줄바꿈·공백을 정리하고 max자에서 자른다. */
export const summarize = (text: string, max = 150) => {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/** <script type="application/ld+json"> 본문. </script> 탈출을 막기 위해 <를 이스케이프한다. */
export const jsonLd = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });
