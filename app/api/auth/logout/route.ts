import { destroySession, sessionCookie } from "@/lib/server/http";

export async function POST(req: Request) {
  destroySession(req);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(null) } });
}
