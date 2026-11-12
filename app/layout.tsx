import type { Metadata, Viewport } from "next";
import { Gowun_Dodum } from "next/font/google";
import Link from "next/link";
import { siteUrl, SITE_DESCRIPTION, SITE_LOGO, SITE_NAME, SITE_TAGLINE } from "@/lib/server/site";
import BusinessInfo from "./components/BusinessInfo";
import Header from "./components/Header";
import "./globals.css";

// 헤더 말풍선 부제용 둥근 서체. 한글 글리프는 subset 미리 로드 대상이 아니라 preload를 끈다.
const softFont = Gowun_Dodum({ weight: "400", subsets: ["latin"], preload: false, variable: "--font-soft" });

const verification: Metadata["verification"] = {
  google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  other: process.env.NAVER_SITE_VERIFICATION ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION } : undefined,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: `${SITE_LOGO} ${SITE_NAME} - ${SITE_TAGLINE}`,
  description: "지금 눈앞의 시술·매장 문제를 검증된 현직자에게 묻고 해결하세요.",
  openGraph: { type: "website", siteName: SITE_NAME, locale: "ko_KR", title: `${SITE_LOGO} ${SITE_NAME} - ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  verification,
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`h-full antialiased ${softFont.variable}`}>
      <body className="min-h-full bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border px-4 py-5 text-center text-[11px] text-muted">
            <Link href="/terms" className="underline decoration-white/20 underline-offset-2 hover:text-foreground">이용약관</Link> · <Link href="/privacy" className="underline decoration-white/20 underline-offset-2 hover:text-foreground">개인정보 처리방침</Link> · <Link href="/refund-policy" className="underline decoration-white/20 underline-offset-2 hover:text-foreground">환불 규정</Link>
            <BusinessInfo />
          </footer>
        </div>
      </body>
    </html>
  );
}
