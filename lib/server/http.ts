import crypto from "node:crypto";
import { db } from "./db";

export type User = {
  id: string;
  username: string;
  name: string;
  isAdmin: boolean;
  expertStatus: "none" | "pending" | "approved" | "rejected";
  isExpert: boolean;
};

export const SESSION_COOKIE = "mentor_session";
const SESSION_DAYS = 14;

type Row = { id: string; username: string; name: string; role: string; expert_status: User["expertStatus"]; suspended_at: string | null };

const findSession = db.prepare(
  `SELECT u.id, u.username, u.name, u.role, u.expert_status, u.suspended_at
   FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?`,
);
const insertSession = db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`);
const deleteSession = db.prepare(`DELETE FROM sessions WHERE token = ?`);

function readCookie(req: Request, name: string) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** 세션 쿠키로 로그인한 회원을 찾는다. 정지된 회원은 null. */
export function getUser(req: Request): User | null {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const row = findSession.get(token, Date.now()) as Row | undefined;
  if (!row || row.suspended_at) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    isAdmin: row.role === "admin",
    expertStatus: row.expert_status,
    isExpert: row.expert_status === "approved",
  };
}

export function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  insertSession.run(token, userId, Date.now() + SESSION_DAYS * 86400_000);
  return token;
}

export function destroySession(req: Request) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) deleteSession.run(token);
}

export function sessionCookie(token: string | null) {
  const base = `${SESSION_COOKIE}=${token ?? ""}; Path=/; HttpOnly; SameSite=Lax`;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return token ? `${base}; Max-Age=${SESSION_DAYS * 86400}${secure}` : `${base}; Max-Age=0${secure}`;
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex");
  const b = crypto.scryptSync(password, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const unauthorized = () => Response.json({ error: "로그인이 필요해요" }, { status: 401 });
export const forbidden = (msg = "권한이 없어요") => Response.json({ error: msg }, { status: 403 });

/** 관리자 세션이면 User, 아니면 null. */
export function getAdmin(req: Request) {
  const u = getUser(req);
  return u?.isAdmin ? u : null;
}

/** 간단한 인메모리 레이트 리미터. 단일 프로세스 기준. */
const buckets = new Map<string, number[]>();
export function limited(key: string, windowMs: number, max: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return true;
  }
  hits.push(now);
  buckets.set(key, hits);
  return false;
}
