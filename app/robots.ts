import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/server/site";

// 공개 콘텐츠(홈·질문·전문가·컬러AI·약관)만 수집하게 하고, 로그인 뒤 화면과 API는 막는다.
export const revalidate = 3600;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/account", "/chat/", "/coins", "/notifications", "/diary", "/salon", "/expert$", "/support", "/login"], // /expert$: 전문가 센터만 막고 /experts(목록·프로필)는 연다
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
