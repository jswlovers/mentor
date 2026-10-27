import { db } from "@/lib/server/db";

const listStmt = db.prepare(`
  SELECT u.id, u.name, u.expert_bio, u.expert_fields,
         (SELECT COUNT(*) FROM reviews r WHERE r.expert_id = u.id) AS review_count,
         (SELECT AVG(rating) FROM reviews r WHERE r.expert_id = u.id) AS rating,
         (SELECT COUNT(*) FROM answers a WHERE a.author_id = u.id) AS answers
  FROM users u WHERE u.expert_status = 'approved' AND u.suspended_at IS NULL
  ORDER BY answers DESC, u.created_at ASC LIMIT 200
`);

type Row = { id: string; name: string; expert_bio: string; expert_fields: string; review_count: number; rating: number | null; answers: number };

// 승인된 전문가 목록. 누구나 볼 수 있다.
export async function GET() {
  return Response.json(
    (listStmt.all() as Row[]).map((r) => ({
      id: r.id,
      name: r.name,
      bio: r.expert_bio,
      fields: r.expert_fields ? r.expert_fields.split(",") : [],
      reviewCount: r.review_count,
      rating: r.rating === null ? null : Math.round(r.rating * 10) / 10,
      answers: r.answers,
    })),
  );
}
