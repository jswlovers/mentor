import { db } from "@/lib/server/db";
import { getUser, hashPassword, limited, unauthorized, verifyPassword, SESSION_COOKIE } from "@/lib/server/http";

const getHash = db.prepare(`SELECT pw_hash FROM users WHERE id = ?`);
const setHash = db.prepare(`UPDATE users SET pw_hash = ? WHERE id = ?`);
const dropOthers = db.prepare(`DELETE FROM sessions WHERE user_id = ? AND token != ?`);

// 비밀번호 변경: 현재 비밀번호를 확인하고, 현재 세션을 뺀 다른 로그인은 모두 끊는다.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (limited(`pw:${user.id}`, 10 * 60 * 1000, 10)) {
    return Response.json({ error: "시도가 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }
  const { current, next } = await req.json().catch(() => ({}));
  const row = getHash.get(user.id) as { pw_hash: string };
  if (!verifyPassword(String(current ?? ""), row.pw_hash)) return Response.json({ error: "현재 비밀번호가 올바르지 않아요" }, { status: 400 });
  if (String(next ?? "").length < 8) return Response.json({ error: "새 비밀번호는 8자 이상이어야 해요" }, { status: 400 });
  setHash.run(hashPassword(String(next)), user.id);
  const token = (req.headers.get("cookie") || "").split(";").map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.split("=")[1] ?? "";
  dropOthers.run(user.id, decodeURIComponent(token));
  return Response.json({ ok: true });
}
