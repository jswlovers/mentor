import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 임시 공개 링크(Cloudflare 터널)로 개발 서버를 열 때 화면 스크립트가 막히지 않게 허용한다
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
