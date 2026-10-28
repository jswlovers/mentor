import { EXPERT_GRADES, gradeFee } from "@/lib/server/pricing";
import { won } from "@/lib/client";

export type GradeInfo = {
  grade: number; label: string; plusPct: number;
  stats: { solved: number; reviews: number; rating: number | null };
  next: (typeof EXPERT_GRADES)[number] & { grade: number } | null;
};

/** 내 전문가 등급과 다음 등급까지 남은 조건. 등급이 오르면 상담비·통화 단가에 가산율이 붙어 수익이 는다. */
export default function GradeCard({ g }: { g: GradeInfo }) {
  const { stats, next } = g;
  const bar = (now: number, goal: number) => (
    <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-white/10">
      <span className="block h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, goal ? (now / goal) * 100 : 100)}%` }} />
    </span>
  );
  return (
    <section className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">내 전문가 등급</h2>
        <span className="text-lg font-bold text-amber-300">{g.label}{g.plusPct > 0 && <span className="ml-1 text-xs font-normal">상담비 +{g.plusPct}%</span>}</span>
      </div>
      <p className="text-xs text-muted">해결한 상담 {stats.solved}건 · 후기 {stats.reviews}개 · 평균 별점 {stats.rating ?? "-"}</p>
      {next ? (
        <div className="space-y-2 text-xs">
          <p>다음 등급 <b className="text-amber-300">{next.label}</b> (상담비 +{next.plusPct}%) 조건</p>
          <p>해결한 상담 {stats.solved}/{next.minSolved}건{bar(stats.solved, next.minSolved)}</p>
          <p>후기 {stats.reviews}/{next.minReviews}개{bar(stats.reviews, next.minReviews)}</p>
          <p>평균 별점 {stats.rating ?? 0}/{next.minRating}점 이상{bar(stats.rating ?? 0, next.minRating)}</p>
          <p className="text-muted">
            {next.label}가 되면 상세 답변 상담비가 {won(gradeFee("detail", g.grade))} → <b className="text-foreground">{won(gradeFee("detail", next.grade))}</b>로 올라요. 조건을 모두 채우면 자동으로 승급해요.
          </p>
        </div>
      ) : (
        <p className="text-xs text-amber-300">최고 등급이에요. 🎉</p>
      )}
    </section>
  );
}
