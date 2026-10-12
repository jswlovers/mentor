import { getAdminPending } from "@/lib/server/adminAlerts";
import { getAvailability } from "@/lib/server/availability";
import { getBalance, getEarnings } from "@/lib/server/coins";
import { db } from "@/lib/server/db";
import { getUser } from "@/lib/server/http";
import { maskPhone } from "@/lib/server/messaging";
import { photoUrl } from "@/lib/server/photo";

const phoneStmt = db.prepare(`SELECT phone, phone_verified_at, notify_kakao, photo, expert_salon FROM users WHERE id = ?`);
const unreadStmt = db.prepare(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL`);

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return Response.json({ user: null });
  const ph = phoneStmt.get(user.id) as { phone: string | null; phone_verified_at: string | null; notify_kakao: number; photo: string | null; expert_salon: string | null };
  return Response.json({
    user: {
      ...user,
      coins: getBalance(user.id),
      earnings: user.isExpert ? getEarnings(user.id) : 0,
      phone: maskPhone(ph.phone_verified_at ? ph.phone : null),
      phoneVerified: !!ph.phone_verified_at,
      notifyKakao: !!ph.notify_kakao,
      unread: (unreadStmt.get(user.id) as { c: number }).c,
      photoUrl: photoUrl(user.id, ph.photo),
      salon: ph.expert_salon,
      // 전문가 상담 ON/OFF 상태(헤더 토글용)
      availability: user.isExpert ? getAvailability(user.id) : null,
      // 관리자만: 처리 대기 건수(헤더 배지용)
      adminPending: user.isAdmin ? getAdminPending() : null,
    },
  });
}
