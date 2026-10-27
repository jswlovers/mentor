import { getBalance } from "@/lib/server/coins";
import { getUser, unauthorized } from "@/lib/server/http";

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  return Response.json({ coins: getBalance(user.id) });
}
