import { db } from "./db";
import { cancelAndRefund, type Consultation } from "./consult";
import { callExperts, hasCalledWave } from "./matching";
import { notify } from "./notify";
import { AUTO_REFUND_MINUTES, SWEEP_INTERVAL_SECONDS, WAVE2_MINUTES } from "./pricing";

const secs = (minutes: number) => `-${Math.max(1, Math.round(minutes * 60))} seconds`;

const expiredStmt = db.prepare(
  `SELECT * FROM consultations WHERE status = 'open' AND expert_id IS NULL AND started_at <= datetime('now', ?)`,
);
const wave2Stmt = db.prepare(
  `SELECT c.*, q.category AS category FROM consultations c JOIN questions q ON q.id = c.room_id
   WHERE c.status = 'open' AND c.expert_id IS NULL AND c.started_at <= datetime('now', ?)`,
);

/**
 * 주기 작업(1분): ① 전문가가 안 온 상담에 다음 전문가들을 호출(wave 2), ② 제한 시간이 지난 상담을 자동 취소·전액 환불.
 * 모든 판단은 DB의 시간 조건으로만 하므로 서버가 재시작돼도 다음 주기에 이어서 처리된다.
 */
export function sweepOnce() {
  // ① 2차 호출
  for (const c of wave2Stmt.all(secs(WAVE2_MINUTES)) as (Consultation & { category: string })[]) {
    if (hasCalledWave(c.room_id, 1) && !hasCalledWave(c.room_id, 2)) callExperts(c, c.category, 2);
  }

  // ② 자동 환불
  for (const c of expiredStmt.all(secs(AUTO_REFUND_MINUTES)) as Consultation[]) {
    let done = false;
    db.exec("BEGIN");
    try {
      done = cancelAndRefund(c, "전문가 미참여 자동 환불");
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      console.error("[sweeper] 자동 환불 실패", c.room_id, err);
    }
    if (done) notify(c.asker_id, "전문가가 참여하지 않아 상담이 자동 취소되고 전액 환불됐어요", `/chat/${c.room_id}`, { kind: "consult_expired" });
  }
}

const g = globalThis as unknown as { __mentorSweeper?: ReturnType<typeof setInterval> };

export function startSweeper() {
  if (g.__mentorSweeper) return;
  g.__mentorSweeper = setInterval(() => {
    try {
      sweepOnce();
    } catch (err) {
      console.error("[sweeper] 실패", err);
    }
  }, SWEEP_INTERVAL_SECONDS * 1000);
  g.__mentorSweeper.unref?.();
  console.log(`[sweeper] 시작: ${SWEEP_INTERVAL_SECONDS}초마다, 미참여 ${AUTO_REFUND_MINUTES}분 뒤 자동 환불`);
}
