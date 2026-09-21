import type { Metadata, Viewport } from "next";
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
      <body className="min-h-full bg-neutral-100 text-neutral-900">
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="mx-auto w-full max-w-4xl flex-1 border-x bg-white">{children}</main>
        </div>
      </body>
    </html>
  );
}
