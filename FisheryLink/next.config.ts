import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 mentor 앱에도 package-lock.json이 있어서, 이 폴더를 프로젝트 루트로 고정한다.
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
