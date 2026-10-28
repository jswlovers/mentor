import { db } from "./db";
import { notify } from "./notify";
import { EXPERT_GRADES, gradeOf, isGrade, MAX_GRADE } from "./pricing";

// 전문가 등급: 실적(해결한 상담 수 · 평균 별점 · 후기 수)으로 자동 승급하고, 관리자는 직접 정할 수 있다.
// 자동 승급은 올리기만 한다. 내리는 건 관리자만 한다.

const gradeStmt = db.prepare(`SELECT expert_grade FROM users WHERE id = ?`);
const solvedStmt = db.prepare(`SELECT COUNT(*) AS n FROM consultations WHERE expert_id = ? AND status = 'ended'`);
const reviewStmt = db.prepare(`SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE expert_id = ?`);
const setStmt = db.prepare(`UPDATE users SET expert_grade = ? WHERE id = ?`);

export type GradeStats = { solved: number; reviews: number; rating: number | null };

export const currentGrade = (expertId: string) => (gradeStmt.get(expertId) as { expert_grade: number } | undefined)?.expert_grade ?? 0;

export function gradeStats(expertId: string): GradeStats {
  const r = reviewStmt.get(expertId) as { n: number; avg: number | null };
  return { solved: (solvedStmt.get(expertId) as { n: number }).n, reviews: r.n, rating: r.avg === null ? null : Math.round(r.avg * 100) / 100 };
}

/** 실적이 기준을 모두 넘는 가장 높은 등급 */
export function earnedGrade(s: GradeStats) {
  let g = 0;
  EXPERT_GRADES.forEach((d, i) => {
    if (s.solved >= d.minSolved && s.reviews >= d.minReviews && (s.rating ?? 0) >= d.minRating) g = i;
  });
  return g;
}

/** 다음 등급까지 남은 조건(최고 등급이면 null). 전문가 대시보드에 보여준다. */
export function gradeProgress(expertId: string) {
  const grade = currentGrade(expertId);
  const stats = gradeStats(expertId);
  const next = grade < MAX_GRADE ? { grade: grade + 1, ...EXPERT_GRADES[grade + 1] } : null;
  return { grade, label: gradeOf(grade).label, plusPct: gradeOf(grade).plusPct, stats, next };
}

/** 상담 종료·후기 등록 뒤 호출한다. 실적이 현재 등급보다 높으면 올리고 알린다. */
export function refreshGrade(expertId: string | null) {
  if (!expertId) return;
  const now = currentGrade(expertId);
  const earned = earnedGrade(gradeStats(expertId));
  if (earned <= now) return;
  setStmt.run(earned, expertId);
  notify(expertId, `축하해요! ${EXPERT_GRADES[earned].label} 등급으로 올랐어요. 이제 상담비에 +${EXPERT_GRADES[earned].plusPct}%가 붙어요`, "/expert");
}

/** 관리자가 등급을 직접 정한다(초기 세팅·조정). */
export function setGrade(expertId: string, grade: number) {
  if (!isGrade(grade)) return false;
  const res = setStmt.run(grade, expertId);
  if (Number(res.changes) === 0) return false;
  notify(expertId, `관리자가 회원님의 전문가 등급을 ${EXPERT_GRADES[grade].label}(으)로 정했어요`, "/expert");
  return true;
}
