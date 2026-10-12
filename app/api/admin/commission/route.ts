import { getCommissions, isValidPct, setCommissions } from "@/lib/server/commission";
import { forbidden, getAdmin, getUser, unauthorized } from "@/lib/server/http";
import { TIER_KEYS, TIERS, type Tier } from "@/lib/server/pricing";

const list = () => getCommissions().map((c) => ({ ...c, label: TIERS[c.tier].label, fee: TIERS[c.tier].fee }));

// 답변 등급(상담 금액)별 플랫폼 수수료율 조회
export async function GET(req: Request) {
  if (!getUser(req)) return unauthorized();
  if (!getAdmin(req)) return forbidden();
  return Response.json(list());
}

// 수수료율 변경: { rates: { basic: 30, detail: 30, premium: 25 } } — 이후 새로 시작되는 상담부터 적용
export async function POST(req: Request) {
  if (!getUser(req)) return unauthorized();
  const admin = getAdmin(req);
  if (!admin) return forbidden();
  const { rates } = await req.json().catch(() => ({}));
  if (!rates || typeof rates !== "object") return Response.json({ error: "수수료율을 입력해주세요" }, { status: 400 });
  const next: Partial<Record<Tier, number>> = {};
  for (const t of TIER_KEYS) {
    if (rates[t] === undefined) continue;
    if (!isValidPct(rates[t])) return Response.json({ error: `${TIERS[t].label} 수수료율은 0~100 사이(소수 첫째 자리까지)로 입력해주세요` }, { status: 400 });
    next[t] = rates[t];
  }
  setCommissions(next, admin.name);
  return Response.json(list());
}
