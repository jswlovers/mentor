import { db } from "@/lib/server/db";
import { forbidden, getAdmin, limited } from "@/lib/server/http";
import { sendToUser } from "@/lib/server/messaging";

const MAX_LEN = 500;
const logStmt = db.prepare(
  `SELECT l.id, l.channel, l.kind, l.text, l.status, l.created_at, u.name AS user_name, u.username
   FROM message_log l LEFT JOIN users u ON u.id = l.user_id ORDER BY l.id DESC LIMIT 200`,
);
const statsStmt = db.prepare(
  `SELECT COUNT(*) AS total, SUM(CASE WHEN phone_verified_at IS NOT NULL THEN 1 ELSE 0 END) AS verified,
          SUM(CASE WHEN phone_verified_at IS NOT NULL AND notify_kakao = 1 THEN 1 ELSE 0 END) AS consented FROM users WHERE suspended_at IS NULL`,
);
const oneStmt = db.prepare(`SELECT id FROM users WHERE username = ? AND suspended_at IS NULL`);
const allStmt = db.prepare(`SELECT id FROM users WHERE phone_verified_at IS NOT NULL AND notify_kakao = 1 AND suspended_at IS NULL`);

// 발송 기록과 수신 가능 회원 수
export async function GET(req: Request) {
  if (!getAdmin(req)) return forbidden();
  return Response.json({ stats: statsStmt.get(), log: logStmt.all() });
}

/**
 * 관리자 안내 발송: target = "all"(수신 동의 회원 전체) 또는 회원 아이디.
 * 서비스 안내·공지용이다. 광고성(마케팅) 내용은 별도 광고 수신 동의가 필요하므로 보내지 않는다.
 */
export async function POST(req: Request) {
  const admin = getAdmin(req);
  if (!admin) return forbidden();
  if (limited(`adminmsg:${admin.id}`, 60 * 60 * 1000, 10)) {
    return Response.json({ error: "발송 요청이 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }
  const { target, message } = await req.json().catch(() => ({}));
  const text = String(message ?? "").trim();
  if (!text || [...text].length > MAX_LEN) return Response.json({ error: `내용을 ${MAX_LEN}자 이내로 입력해주세요` }, { status: 400 });

  let ids: string[];
  if (target === "all") {
    ids = (allStmt.all() as { id: string }[]).map((r) => r.id);
  } else {
    const u = oneStmt.get(String(target ?? "").trim().toLowerCase()) as { id: string } | undefined;
    if (!u) return Response.json({ error: "회원을 찾을 수 없어요" }, { status: 404 });
    ids = [u.id];
  }

  const count = { sent: 0, mock: 0, failed: 0, skipped: 0 };
  for (const id of ids) count[await sendToUser(id, "admin_notice", { message: text })]++;
  return Response.json({ ok: true, targeted: ids.length, ...count });
}
