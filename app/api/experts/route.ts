import { listExperts } from "@/lib/server/experts";

// 전문가 목록(공개): ?category=탈색&sort=rating|responses|recent&q=검색어&available=1&offset=0&limit=20
// limit을 주면 그만큼만 잘라 보내고, 다음 쪽이 있는지는 X-Total-Count 헤더로 알려준다.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const list = listExperts({
    category: sp.get("category") || "",
    sort: sp.get("sort") || "rating",
    q: sp.get("q") || "",
    onlyAvailable: sp.get("available") === "1",
  });
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 0, 0), 100);
  const offset = Math.max(Number(sp.get("offset")) || 0, 0);
  const page = limit ? list.slice(offset, offset + limit) : list;
  return Response.json(page, { headers: { "X-Total-Count": String(list.length) } });
}
