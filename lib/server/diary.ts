import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, db } from "./db";

export const MAX_DIARY_CHARS = 5000;
export const MAX_DIARY_PHOTOS = 5;
export const MAX_DIARY_PHOTO_BYTES = 5 * 1024 * 1024;
export const DIARY_PHOTO_EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
export const DIARY_PHOTO_MIME: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };

export const uploadsDir = () => path.join(DATA_DIR, "uploads");

/** 'YYYY-MM-DD' 형식이면서 실제로 있는 날짜인지. */
export function validDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export const validMonth = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

type EntryRow = { body: string; updated_at: string };
type ImageRow = { id: number; filename: string };

const getEntry = db.prepare(`SELECT body, updated_at FROM diary_entries WHERE user_id = ? AND date = ?`);
const upsertEntry = db.prepare(`
  INSERT INTO diary_entries (user_id, date, body) VALUES (?, ?, ?)
  ON CONFLICT(user_id, date) DO UPDATE SET body = excluded.body, updated_at = datetime('now')
`);
const deleteEntry = db.prepare(`DELETE FROM diary_entries WHERE user_id = ? AND date = ?`);
const listImages = db.prepare(`SELECT id, filename FROM diary_images WHERE user_id = ? AND date = ? ORDER BY id`);
const countImages = db.prepare(`SELECT COUNT(*) AS n FROM diary_images WHERE user_id = ? AND date = ?`);
const insertImage = db.prepare(`INSERT INTO diary_images (user_id, date, filename) VALUES (?, ?, ?)`);
const findImage = db.prepare(`SELECT user_id, filename FROM diary_images WHERE filename = ?`);
const deleteImage = db.prepare(`DELETE FROM diary_images WHERE user_id = ? AND filename = ?`);
const deleteImagesOfDay = db.prepare(`DELETE FROM diary_images WHERE user_id = ? AND date = ?`);
const monthEntries = db.prepare(`SELECT date, body FROM diary_entries WHERE user_id = ? AND date >= ? AND date <= ? AND body <> ''`);
const monthImages = db.prepare(`SELECT date, COUNT(*) AS n FROM diary_images WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY date`);

export const photoUrl = (filename: string) => `/api/diary/photo/${filename}`;

function removeFile(filename: string) {
  try {
    fs.unlinkSync(path.join(uploadsDir(), path.basename(filename)));
  } catch {}
}

export function loadDay(userId: string, date: string) {
  const e = getEntry.get(userId, date) as EntryRow | undefined;
  const photos = (listImages.all(userId, date) as ImageRow[]).map((r) => ({ id: r.id, filename: r.filename, url: photoUrl(r.filename) }));
  return { date, body: e?.body ?? "", updatedAt: e?.updated_at ?? null, photos };
}

/** 본문 저장. 본문이 비어 있으면 행을 지운다(사진은 그대로 둔다). */
export function saveBody(userId: string, date: string, body: string) {
  if (body.trim() === "") deleteEntry.run(userId, date);
  else upsertEntry.run(userId, date, body);
  return loadDay(userId, date);
}

export function photoCount(userId: string, date: string) {
  return (countImages.get(userId, date) as { n: number }).n;
}

export function addPhoto(userId: string, date: string, filename: string) {
  insertImage.run(userId, date, filename);
}

/** 사진 파일의 주인(없으면 undefined). */
export function photoOwner(filename: string) {
  return (findImage.get(filename) as { user_id: string } | undefined)?.user_id;
}

export function removePhoto(userId: string, filename: string) {
  const res = deleteImage.run(userId, filename);
  if (Number(res.changes) > 0) removeFile(filename);
  return Number(res.changes) > 0;
}

/** 그날의 일기와 사진을 모두 지운다. */
export function removeDay(userId: string, date: string) {
  for (const r of listImages.all(userId, date) as ImageRow[]) removeFile(r.filename);
  deleteImagesOfDay.run(userId, date);
  deleteEntry.run(userId, date);
}

/** 달력 표시용: 일기나 사진이 있는 날짜와 미리보기. */
export function monthSummary(userId: string, month: string) {
  const from = `${month}-01`;
  const to = `${month}-31`;
  const days = new Map<string, { date: string; preview: string; photos: number }>();
  for (const r of monthEntries.all(userId, from, to) as { date: string; body: string }[]) {
    days.set(r.date, { date: r.date, preview: r.body.replace(/\s+/g, " ").slice(0, 40), photos: 0 });
  }
  for (const r of monthImages.all(userId, from, to) as { date: string; n: number }[]) {
    const d = days.get(r.date) ?? { date: r.date, preview: "", photos: 0 };
    d.photos = Number(r.n);
    days.set(r.date, d);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
