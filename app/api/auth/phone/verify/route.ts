import { checkCode, PHONE_RE } from "@/lib/server/phone";

export async function POST(req: Request) {
  const { phone, code } = await req.json().catch(() => ({}));
  const p = String(phone ?? "").replace(/[^0-9]/g, "");
  if (!PHONE_RE.test(p)) return Response.json({ error: "휴대폰 번호 형식이 올바르지 않아요" }, { status: 400 });
  const c = String(code ?? "").trim();
  const r = checkCode(p, c);
  if (!r.ok) return Response.json({ error: r.error }, { status: 400 });
  return Response.json({ ok: true });
}
