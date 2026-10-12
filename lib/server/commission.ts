import { db } from "./db";
import { EXPERT_SHARE, TIER_KEYS, type Tier } from "./pricing";

// 답변 등급(상담 금액)별 플랫폼 수수료율(%). 관리자 페이지에서 바꾸고, settings 테이블에 저장한다.
// 상담이 시작될 때 그 시점의 값을 consultations.commission_pct에 고정하므로, 바꿔도 진행 중인 상담에는 소급되지 않는다.

/** 설정이 없을 때의 기본 수수료율(%) */
export const DEFAULT_COMMISSION_PCT = Math.round((1 - EXPERT_SHARE) * 1000) / 10;

const key = (t: Tier) => `commission_pct:${t}`;
const getStmt = db.prepare(`SELECT key, value, updated_by, updated_at FROM settings WHERE key LIKE 'commission_pct:%'`);
const upsertStmt = db.prepare(
  `INSERT INTO settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, datetime('now'))
   ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
);

export type CommissionRow = { tier: Tier; pct: number; updatedBy: string | null; updatedAt: string | null };

export function getCommissions(): CommissionRow[] {
  const saved = new Map((getStmt.all() as { key: string; value: string; updated_by: string | null; updated_at: string }[]).map((r) => [r.key, r]));
  return TIER_KEYS.map((tier) => {
    const r = saved.get(key(tier));
    const pct = r ? Number(r.value) : NaN;
    return { tier, pct: Number.isFinite(pct) ? pct : DEFAULT_COMMISSION_PCT, updatedBy: r?.updated_by ?? null, updatedAt: r?.updated_at ?? null };
  });
}

export const commissionPct = (tier: Tier) => getCommissions().find((c) => c.tier === tier)!.pct;

/** 수수료율 검증: 0~100, 소수 첫째 자리까지 */
export const isValidPct = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100 && Math.round(v * 10) === v * 10;

export function setCommissions(rates: Partial<Record<Tier, number>>, adminName: string) {
  db.exec("BEGIN");
  try {
    for (const t of TIER_KEYS) if (rates[t] !== undefined) upsertStmt.run(key(t), String(rates[t]), adminName);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/** 상담에 고정된 수수료율로 계산한 전문가 몫 비율(0~1) */
export const expertShareOf = (commissionPctValue: number | null) => 1 - (commissionPctValue ?? DEFAULT_COMMISSION_PCT) / 100;
