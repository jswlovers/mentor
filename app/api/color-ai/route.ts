import crypto from "node:crypto";
import { getUser, limited } from "@/lib/server/http";
import { db } from "@/lib/server/db";
import { debitCoins, getBalance, InsufficientCoinsError } from "@/lib/server/coins";
import { COLORFIT_EXTRA_COST } from "@/lib/server/pricing";
import {
  TARGET_COLORS,
  computeRecommendation,
  getColorfitUsage,
  listRecommendations,
  saveRecommendation,
  type RecommendInput,
  type Undertone,
} from "@/lib/server/colorAi";

// 최근 추천 기록과 이번 달 남은 횟수. 비로그인 방문자는 기록이 없으므로 빈 목록을 준다.
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return Response.json({ recommendations: [], usage: null, extraCost: COLORFIT_EXTRA_COST });
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
  return Response.json({ recommendations: rows, usage: getColorfitUsage(user.id), extraCost: COLORFIT_EXTRA_COST });
}

// 명도 차트(FIOLE·WELLA 실물 사진 참고) 1~20레벨.
function isLevel(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 20;
}

// 사진 분석(브라우저 캔버스 픽셀 분석) 결과 + 시술 조건을 받아 배합을 계산한다.
// 플랜의 월 횟수(pricing.ts COLORFIT_PLANS)를 쓰고, 다 쓰면 useCoins: true일 때만 1회당 COLORFIT_EXTRA_COST 코인을 차감한다.
// 횟수를 세야 해서 로그인한 회원만 쓸 수 있다.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return Response.json({ error: "로그인 후 이용할 수 있어요" }, { status: 401 });
  if (limited(`color-ai:${user.id}`, 60 * 60 * 1000, 30)) {
    return Response.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { rootLevel, midLevel, endLevel, undertone, targetName, targetLevel, history, brandId, tubes, thickness, useCoins } = body ?? {};

  if (!isLevel(rootLevel) || !isLevel(midLevel) || !isLevel(endLevel)) {
    return Response.json({ error: "모발 사진을 먼저 분석해주세요" }, { status: 400 });
  }
  if (!["warm", "cool", "neutral"].includes(undertone)) {
    return Response.json({ error: "모발 사진을 먼저 분석해주세요" }, { status: 400 });
  }
  if (!TARGET_COLORS.some((c) => c.name === targetName)) {
    return Response.json({ error: "목표 컬러를 선택해주세요" }, { status: 400 });
  }
  if (targetLevel !== undefined && !isLevel(targetLevel)) {
    return Response.json({ error: "목표 레벨을 선택해주세요" }, { status: 400 });
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
    targetLevel,
    history,
    brandId: typeof brandId === "string" ? brandId : undefined,
    tubes,
    thickness: typeof thickness === "string" ? thickness : undefined,
  };

  const usage = getColorfitUsage(user.id);
  const cost = usage.remaining > 0 ? 0 : COLORFIT_EXTRA_COST;
  if (cost && useCoins !== true) {
    return Response.json(
      { error: `이번 달 ${usage.planLabel} 플랜 AI 추천 ${usage.limit}회를 모두 썼어요`, needCoins: true, cost, coins: getBalance(user.id), usage },
      { status: 402 },
    );
  }

  const formula = computeRecommendation(input);
  const id = `ca_${crypto.randomUUID().slice(0, 12)}`;
  db.exec("BEGIN");
  try {
    if (cost) debitCoins(user.id, cost, "colorfit_extra", "컬러핏 AI 추가 추천 1회");
    saveRecommendation(user.id, id, input, formula, cost);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    if (err instanceof InsufficientCoinsError) {
      return Response.json({ error: `코인이 부족해요 (추가 추천 1회 ${cost.toLocaleString()}코인 필요)`, coins: getBalance(user.id) }, { status: 402 });
    }
    throw err;
  }

  return Response.json({ id, formula, charged: cost, usage: getColorfitUsage(user.id) });
}
