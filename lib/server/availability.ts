import { db } from "./db";

// 전문가 상담 가능 여부 = 직접 켠 ON/OFF(expert_available) + 상담 불가 시간(expert_off_start~end, 한국 시간).
// 불가 시간 안에서는 ON이어도 호출·목록·지정에서 '쉬는 중'으로 본다.

export type AvailabilityRow = { expert_available: number; expert_off_start: string | null; expert_off_end: string | null };

export const isHHMM = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const kstMinutes = (now: number) => {
  const d = new Date(now + 9 * 3600_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

/** 지금이 상담 불가 시간인지. start > end면 자정을 넘기는 구간(예: 22:00~09:00). */
export function inOffHours(start: string | null, end: string | null, now = Date.now()) {
  if (!isHHMM(start) || !isHHMM(end) || start === end) return false;
  const m = kstMinutes(now), s = toMin(start), e = toMin(end);
  return s < e ? m >= s && m < e : m >= s || m < e;
}

export const isAvailableNow = (r: AvailabilityRow) => !!r.expert_available && !inOffHours(r.expert_off_start, r.expert_off_end);

const getStmt = db.prepare(`SELECT expert_available, expert_off_start, expert_off_end FROM users WHERE id = ?`);
const setOnStmt = db.prepare(`UPDATE users SET expert_available = ? WHERE id = ?`);
const setOffStmt = db.prepare(`UPDATE users SET expert_off_start = ?, expert_off_end = ? WHERE id = ?`);

/** 화면용 상태: on = 직접 켠 상태, offNow = 지금 불가 시간이라 쉬는 중, availableNow = 실제로 상담 요청을 받는지 */
export function getAvailability(userId: string) {
  const r = getStmt.get(userId) as AvailabilityRow;
  const offNow = inOffHours(r.expert_off_start, r.expert_off_end);
  return { on: !!r.expert_available, offStart: r.expert_off_start, offEnd: r.expert_off_end, offNow, availableNow: !!r.expert_available && !offNow };
}

export const setAvailableOn = (userId: string, on: boolean) => setOnStmt.run(on ? 1 : 0, userId);
export const setOffHours = (userId: string, start: string | null, end: string | null) => setOffStmt.run(start, end, userId);
