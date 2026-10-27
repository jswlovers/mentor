import type { Metadata, Viewport } from "next";
import Header from "./components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "FisheryLink - 수협 조합원 어업 자문",
  description: "양식·어선어업·가공·경영까지, 어업 현장의 문제를 검증된 전문가에게 묻고 해결하세요.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-neutral-100 text-neutral-900">
        <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white shadow">
          <Header />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
