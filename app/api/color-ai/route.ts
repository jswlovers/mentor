import crypto from "node:crypto";
import { getUser, limited } from "@/lib/server/http";
import {
  TARGET_COLORS,
  computeRecommendation,
  listRecommendations,
  saveRecommendation,
  type RecommendInput,
  type Undertone,
} from "@/lib/server/colorAi";

// 최근 추천 기록 조회. 비로그인 방문자는 기록이 없으므로 빈 목록을 준다.
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return Response.json({ recommendations: [] });
  const rows = listRecommendations(user.id, 5).map((r) => ({
    id: r.id,
    rootLevel: r.root_level,
    midLevel: r.mid_level,
    endLevel: r.end_level,
    undertone: r.undertone,
    targetName: r.target_name,
    targetColor: r.target_color,
    formula: JSON.parse(r.formula),
    createdAt: r.created_at,
  }));
  return Response.json({ recommendations: rows });
}

function isLevel(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 10;
}

// 사진 분석(브라우저 캔버스 픽셀 분석) 결과 + 시술 조건을 받아 배합을 계산한다.
// 로그인 없이도 쓸 수 있게 열어뒀다(당분간). 로그인한 회원만 추천 기록이 저장된다.
export async function POST(req: Request) {
  const user = getUser(req);
  const limitKey = user ? `color-ai:${user.id}` : `color-ai:ip:${req.headers.get("x-forwarded-for") ?? "local"}`;
  if (limited(limitKey, 60 * 60 * 1000, 30)) {
    return Response.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { rootLevel, midLevel, endLevel, undertone, targetName, history, brandId, tubes, thickness } = body ?? {};

  if (!isLevel(rootLevel) || !isLevel(midLevel) || !isLevel(endLevel)) {
    return Response.json({ error: "모발 사진을 먼저 분석해주세요" }, { status: 400 });
  }
  if (!["warm", "cool", "neutral"].includes(undertone)) {
    return Response.json({ error: "모발 사진을 먼저 분석해주세요" }, { status: 400 });
  }
  if (!TARGET_COLORS.some((c) => c.name === targetName)) {
    return Response.json({ error: "목표 컬러를 선택해주세요" }, { status: 400 });
  }
  if (!Array.isArray(history) || history.some((h) => typeof h !== "string")) {
    return Response.json({ error: "시술 이력이 올바르지 않아요" }, { status: 400 });
  }
  if (!Array.isArray(tubes) || tubes.length > 300 || tubes.some((t) => typeof t !== "string")) {
    return Response.json({ error: "보유 염모제가 올바르지 않아요" }, { status: 400 });
  }

  const input: RecommendInput = {
    rootLevel,
    midLevel,
    endLevel,
    undertone: undertone as Undertone,
    targetName,
    history,
    brandId: typeof brandId === "string" ? brandId : undefined,
    tubes,
    thickness: typeof thickness === "string" ? thickness : undefined,
  };

  const formula = computeRecommendation(input);
  const id = `ca_${crypto.randomUUID().slice(0, 12)}`;
  if (user) saveRecommendation(user.id, id, input, formula);

  return Response.json({ id, formula });
}
