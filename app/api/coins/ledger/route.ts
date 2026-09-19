import { getUserLedger } from "@/lib/server/coins";
import { getUser, unauthorized } from "@/lib/server/http";

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  return Response.json(getUserLedger(user.id));
}
