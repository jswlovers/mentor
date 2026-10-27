import { getBalance, getEarnings } from "@/lib/server/coins";
import { db } from "@/lib/server/db";
import { getUser } from "@/lib/server/http";

const unreadStmt = db.prepare(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL`);

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return Response.json({ user: null });
  return Response.json({
    user: {
      ...user,
      coins: getBalance(user.id),
      earnings: user.isExpert ? getEarnings(user.id) : 0,
      unread: (unreadStmt.get(user.id) as { c: number }).c,
    },
  });
}
