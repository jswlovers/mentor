import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, db } from "./db";
import { notify } from "./notify";

// 매장(살롱) 그룹: 원장이 매장을 만들고 초대 코드로 직원을 들인다. 회원은 한 번에 한 매장에만 속한다.
// 매장 안에서만 보이는 작업물 피드·공유 일정(근무·휴무·교육·행사)·공지를 쓴다. 손님 예약은 다루지 않는다.
// 직원이 나가면 그 사람이 올린 작업물은 매장에서 지운다(공지·일정은 매장에 남는다).
db.exec(`
  CREATE TABLE IF NOT EXISTS salons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- role: owner | designer | intern
  CREATE TABLE IF NOT EXISTS salon_members (
    salon_id TEXT NOT NULL REFERENCES salons(id),
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
    role TEXT NOT NULL,
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (salon_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS salon_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_salon_posts ON salon_posts(salon_id, id);
  CREATE TABLE IF NOT EXISTS salon_post_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    salon_id TEXT NOT NULL,
    filename TEXT NOT NULL UNIQUE
  );
  CREATE INDEX IF NOT EXISTS idx_salon_post_images ON salon_post_images(post_id);
  CREATE TABLE IF NOT EXISTS salon_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    author_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_salon_comments ON salon_comments(post_id, id);
  -- kind: work(근무) | off(휴무) | edu(교육) | event(매장 일정). member_id는 근무·휴무 대상 직원.
  CREATE TABLE IF NOT EXISTS salon_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    member_id TEXT,
    kind TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    title TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_salon_events ON salon_events(salon_id, date);
  CREATE TABLE IF NOT EXISTS salon_notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_salon_notices ON salon_notices(salon_id, id);
`);

export const ROLES = { owner: "원장", designer: "디자이너", intern: "인턴" } as const;
export type Role = keyof typeof ROLES;
export const isRole = (v: unknown): v is Role => typeof v === "string" && v in ROLES;
export const EVENT_KINDS = { work: "근무", off: "휴무", edu: "교육", event: "매장 일정" } as const;
export type EventKind = keyof typeof EVENT_KINDS;
export const isEventKind = (v: unknown): v is EventKind => typeof v === "string" && v in EVENT_KINDS;

export const MAX_POST_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
export const PHOTO_MIME: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
export const uploadsDir = () => path.join(DATA_DIR, "uploads");
export const salonPhotoUrl = (filename: string) => `/api/salon/photo/${filename}`;
const removeFile = (filename: string) => fs.rmSync(path.join(uploadsDir(), path.basename(filename)), { force: true });

// 헷갈리는 글자(0/O, 1/I/L)를 뺀 6자리 초대 코드
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const newInviteCode = () => Array.from(crypto.randomBytes(6), (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");

export type Membership = { salonId: string; salonName: string; inviteCode: string; role: Role };
const membershipStmt = db.prepare(`
  SELECT m.salon_id AS salonId, s.name AS salonName, s.invite_code AS inviteCode, m.role AS role
  FROM salon_members m JOIN salons s ON s.id = m.salon_id WHERE m.user_id = ?`);
export const getMembership = (userId: string) => membershipStmt.get(userId) as Membership | undefined;

const membersStmt = db.prepare(`
  SELECT u.id, u.name, u.photo, u.expert_status, m.role, m.joined_at
  FROM salon_members m JOIN users u ON u.id = m.user_id
  WHERE m.salon_id = ? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'designer' THEN 1 ELSE 2 END, m.joined_at`);
export const listMembers = (salonId: string) => membersStmt.all(salonId) as { id: string; name: string; photo: string | null; expert_status: string; role: Role; joined_at: string }[];
export const memberIds = (salonId: string) => listMembers(salonId).map((m) => m.id);
const ownerStmt = db.prepare(`SELECT user_id FROM salon_members WHERE salon_id = ? AND role = 'owner'`);
export const salonOwner = (salonId: string) => (ownerStmt.get(salonId) as { user_id: string } | undefined)?.user_id;

/** 매장 사람들에게 알림(보낸 사람은 뺀다). */
export function notifySalon(salonId: string, exceptUserId: string, body: string, link: string) {
  for (const id of memberIds(salonId)) if (id !== exceptUserId) notify(id, body, link);
}

const findByCode = db.prepare(`SELECT id, name FROM salons WHERE invite_code = ?`);
export const salonByCode = (code: string) => findByCode.get(code.trim().toUpperCase()) as { id: string; name: string } | undefined;

const insertSalon = db.prepare(`INSERT INTO salons (id, name, invite_code) VALUES (?, ?, ?)`);
const insertMember = db.prepare(`INSERT INTO salon_members (salon_id, user_id, role) VALUES (?, ?, ?)`);
export function createSalon(userId: string, name: string) {
  const id = `s_${crypto.randomUUID()}`;
  db.exec("BEGIN");
  try {
    insertSalon.run(id, name, newInviteCode());
    insertMember.run(id, userId, "owner");
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return id;
}
export const addMember = (salonId: string, userId: string, role: Role) => insertMember.run(salonId, userId, role);

const postFilesOfUser = db.prepare(`SELECT i.filename FROM salon_post_images i JOIN salon_posts p ON p.id = i.post_id WHERE p.salon_id = ? AND p.author_id = ?`);
const delImagesOfUser = db.prepare(`DELETE FROM salon_post_images WHERE post_id IN (SELECT id FROM salon_posts WHERE salon_id = ? AND author_id = ?)`);
const delCommentsOnUserPosts = db.prepare(`DELETE FROM salon_comments WHERE post_id IN (SELECT id FROM salon_posts WHERE salon_id = ? AND author_id = ?)`);
const delPostsOfUser = db.prepare(`DELETE FROM salon_posts WHERE salon_id = ? AND author_id = ?`);
const delMember = db.prepare(`DELETE FROM salon_members WHERE salon_id = ? AND user_id = ?`);
/** 매장에서 내보내거나 스스로 나갈 때: 그 사람이 올린 작업물(사진·댓글 포함)을 지운다. */
export function removeMember(salonId: string, userId: string) {
  const files = (postFilesOfUser.all(salonId, userId) as { filename: string }[]).map((r) => r.filename);
  db.exec("BEGIN");
  try {
    delCommentsOnUserPosts.run(salonId, userId);
    delImagesOfUser.run(salonId, userId);
    delPostsOfUser.run(salonId, userId);
    delMember.run(salonId, userId);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  files.forEach(removeFile);
}

const allSalonFiles = db.prepare(`SELECT filename FROM salon_post_images WHERE salon_id = ?`);
/** 매장 삭제(원장): 모든 기록을 지운다. */
export function deleteSalon(salonId: string) {
  const files = (allSalonFiles.all(salonId) as { filename: string }[]).map((r) => r.filename);
  db.exec("BEGIN");
  try {
    db.prepare(`DELETE FROM salon_comments WHERE post_id IN (SELECT id FROM salon_posts WHERE salon_id = ?)`).run(salonId);
    for (const t of ["salon_post_images", "salon_posts", "salon_events", "salon_notices", "salon_members"]) db.prepare(`DELETE FROM ${t} WHERE salon_id = ?`).run(salonId);
    db.prepare(`DELETE FROM salons WHERE id = ?`).run(salonId);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  files.forEach(removeFile);
}

// ── 작업물 피드
const POST_PAGE = 10;
const postsStmt = db.prepare(`
  SELECT p.id, p.author_id, u.name AS author_name, u.photo AS author_photo, p.body, p.created_at
  FROM salon_posts p JOIN users u ON u.id = p.author_id
  WHERE p.salon_id = ? AND (? = 0 OR p.id < ?) ORDER BY p.id DESC LIMIT ?`);
const imagesOfPost = db.prepare(`SELECT filename FROM salon_post_images WHERE post_id = ? ORDER BY id`);
const commentsOfPost = db.prepare(`
  SELECT c.id, c.author_id, u.name AS author_name, c.body, c.created_at
  FROM salon_comments c JOIN users u ON u.id = c.author_id WHERE c.post_id = ? ORDER BY c.id`);
export function listPosts(salonId: string, before: number) {
  const rows = postsStmt.all(salonId, before, before, POST_PAGE + 1) as { id: number; author_id: string; author_name: string; author_photo: string | null; body: string; created_at: string }[];
  return {
    items: rows.slice(0, POST_PAGE).map((p) => ({
      ...p,
      photos: (imagesOfPost.all(p.id) as { filename: string }[]).map((i) => salonPhotoUrl(i.filename)),
      comments: commentsOfPost.all(p.id) as { id: number; author_id: string; author_name: string; body: string; created_at: string }[],
    })),
    hasMore: rows.length > POST_PAGE,
  };
}

const insertPost = db.prepare(`INSERT INTO salon_posts (salon_id, author_id, body) VALUES (?, ?, ?)`);
const insertImage = db.prepare(`INSERT INTO salon_post_images (post_id, salon_id, filename) VALUES (?, ?, ?)`);
export function createPost(salonId: string, authorId: string, body: string, filenames: string[]) {
  db.exec("BEGIN");
  try {
    const id = Number(insertPost.run(salonId, authorId, body).lastInsertRowid);
    for (const f of filenames) insertImage.run(id, salonId, f);
    db.exec("COMMIT");
    return id;
  } catch (err) {
    db.exec("ROLLBACK");
    filenames.forEach(removeFile);
    throw err;
  }
}

const postStmt = db.prepare(`SELECT id, salon_id, author_id FROM salon_posts WHERE id = ?`);
export const getPost = (id: number) => postStmt.get(id) as { id: number; salon_id: string; author_id: string } | undefined;
export const postFiles = (id: number) => (imagesOfPost.all(id) as { filename: string }[]).map((r) => r.filename);
export function deletePost(id: number) {
  const files = postFiles(id);
  db.prepare(`DELETE FROM salon_comments WHERE post_id = ?`).run(id);
  db.prepare(`DELETE FROM salon_post_images WHERE post_id = ?`).run(id);
  db.prepare(`DELETE FROM salon_posts WHERE id = ?`).run(id);
  files.forEach(removeFile);
}

const photoSalonStmt = db.prepare(`SELECT salon_id FROM salon_post_images WHERE filename = ?`);
export const photoSalon = (filename: string) => (photoSalonStmt.get(filename) as { salon_id: string } | undefined)?.salon_id;

// ── 일정
const eventsStmt = db.prepare(`
  SELECT e.id, e.kind, e.date, e.start_time, e.end_time, e.title, e.author_id, e.member_id, u.name AS member_name
  FROM salon_events e LEFT JOIN users u ON u.id = e.member_id
  WHERE e.salon_id = ? AND e.date >= ? AND e.date <= ? ORDER BY e.date, COALESCE(e.start_time, ''), e.id`);
export const listEvents = (salonId: string, from: string, to: string) => eventsStmt.all(salonId, from, to);

export const isHHMM = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export function validDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
