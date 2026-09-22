import { limited } from "@/lib/server/http";
import { isPhoneTaken, issueCode, PHONE_RE } from "@/lib/server/phone";

export async function POST(req: Request) {
  if (limited(`phone-send:${req.headers.get("x-forwarded-for") ?? "local"}`, 60 * 60 * 1000, 30)) {
    return Response.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }
  const { phone } = await req.json().catch(() => ({}));
  const p = String(phone ?? "").replace(/[^0-9]/g, "");
  if (!PHONE_RE.test(p)) return Response.json({ error: "휴대폰 번호 형식이 올바르지 않아요" }, { status: 400 });
  if (isPhoneTaken(p)) return Response.json({ error: "이미 가입에 사용된 휴대폰 번호예요" }, { status: 409 });
  const code = issueCode(p);
  // 실제 SMS 연동 전(개발/테스트용): 인증번호를 응답에 그대로 담아 돌려준다.
  return Response.json({ ok: true, devCode: code });
}
