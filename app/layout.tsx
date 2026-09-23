import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Header from "./components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "미용 SOS - 미용인 실시간 기술 문제 해결",
  description: "지금 눈앞의 시술·매장 문제를 검증된 현직자에게 묻고 해결하세요.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border px-4 py-5 text-center text-[11px] text-muted">
            <Link href="/terms" className="underline decoration-white/20 underline-offset-2 hover:text-foreground">이용약관</Link> · <Link href="/privacy" className="underline decoration-white/20 underline-offset-2 hover:text-foreground">개인정보 처리방침</Link> · <Link href="/refund-policy" className="underline decoration-white/20 underline-offset-2 hover:text-foreground">환불 규정</Link>
          </footer>
        </div>
      </body>
    </html>
  );
}
