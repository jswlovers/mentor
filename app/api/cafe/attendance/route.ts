import { db } from "@/lib/server/db";
import { getUser, unauthorized } from "@/lib/server/http";
import { cafeAttendance, cafeJson } from "@/lib/server/cafe";
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  return cafeJson(cafeAttendance(user.id));
}
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const { day } = cafeAttendance(user.id);
  db.prepare("INSERT OR IGNORE INTO cafe_attendance(user_id,day) VALUES(?,?)").run(user.id,day);
  return cafeJson(cafeAttendance(user.id));
}
