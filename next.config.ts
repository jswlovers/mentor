import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 임시 공개 링크(Cloudflare 터널)나 같은 와이파이의 핸드폰(PC 내부 IP)으로 개발 서버를 열 때
  // 화면 스크립트가 막히지 않게 허용한다. PC 내부 IP가 바뀌면 여기도 바꿔야 한다.
  allowedDevOrigins: ["*.trycloudflare.com", "192.168.75.108"],
};

export default nextConfig;
