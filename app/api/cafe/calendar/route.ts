import { db } from "@/lib/server/db";
import { cafeJson, cafeError } from "@/lib/server/cafe";
export async function GET(req: Request) {
  const month = new URL(req.url).searchParams.get("month") || "";
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) return cafeError("조회할 월을 확인해주세요");
  const items = db.prepare(`SELECT id,board,title,json_extract(details,'$.date') AS date,json_extract(details,'$.region') AS region FROM cafe_posts
    WHERE deleted_at IS NULL AND status='open' AND board IN ('education','model','volunteer','event')
    AND substr(json_extract(details,'$.date'),1,7)=? ORDER BY date,id LIMIT 200`).all(month);
  return cafeJson({items});
}
