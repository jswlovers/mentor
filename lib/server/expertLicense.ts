import path from "node:path";
import { DATA_DIR } from "./db";

// 전문가 신청 면허증·자격증 사진. 개인정보라 공개 업로드 폴더와 분리해 두고 관리자 경로로만 내보낸다.
export const LICENSE_DIR = path.join(DATA_DIR, "expert-licenses");
export const LICENSE_MAX_BYTES = 5 * 1024 * 1024;
export const LICENSE_EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
export const LICENSE_MIME: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
