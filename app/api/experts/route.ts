import { db } from '@/lib/server/db';
const list = db.prepare(`
 SELECT u.id, u.name, u.expert_bio AS bio,
 (SELECT COUNT(*) FROM consultations c WHERE c.expert_id=u.id AND c.status='ended') AS consultations,
 (SELECT COUNT(*) FROM reviews r WHERE r.expert_id=u.id) AS reviewCount,
 (SELECT ROUND(AVG(r.rating),1) FROM reviews r WHERE r.expert_id=u.id) AS rating
 FROM users u WHERE u.expert_status='approved'
 ORDER BY consultations DESC, reviewCount DESC, rating DESC, u.created_at ASC, u.id ASC
`);
export async function GET(){ return Response.json(list.all()); }
