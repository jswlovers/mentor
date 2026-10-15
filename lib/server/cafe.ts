import path from "node:path";
import { CITY_DISTRICTS } from "../regions";
import { DATA_DIR, db } from "./db";
import { CAFE_BOARDS, CAFE_REGIONS, CAFE_KINDS, EMPTY_CAFE_DETAILS, JOB_REQUIRED, JOB_ROLES, detailLabel, findCafeBoard, findCafeTopic, jobSide, type CafeDetails, type CafePost } from "../cafe";
db.exec(`
  CREATE TABLE IF NOT EXISTS cafe_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, board TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
    author_id TEXT NOT NULL REFERENCES users(id), details TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'open',
    pinned INTEGER NOT NULL DEFAULT 0, deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_cafe_posts_board ON cafe_posts(board, id);
  CREATE TABLE IF NOT EXISTS cafe_images (filename TEXT PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES cafe_posts(id));
  CREATE INDEX IF NOT EXISTS idx_cafe_images_post ON cafe_images(post_id);
  CREATE TABLE IF NOT EXISTS cafe_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL REFERENCES cafe_posts(id),
    author_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_cafe_comments_post ON cafe_comments(post_id, id);
  CREATE TABLE IF NOT EXISTS cafe_reactions (post_id INTEGER NOT NULL REFERENCES cafe_posts(id), user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL CHECK(kind IN ('like','save')), PRIMARY KEY(post_id,user_id,kind));
  CREATE TABLE IF NOT EXISTS cafe_attendance (user_id TEXT NOT NULL REFERENCES users(id), day TEXT NOT NULL, PRIMARY KEY(user_id,day));
  CREATE TABLE IF NOT EXISTS cafe_reports (post_id INTEGER NOT NULL REFERENCES cafe_posts(id), user_id TEXT NOT NULL REFERENCES users(id), reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY(post_id,user_id));
`);
export const cafeUploads = () => path.join(DATA_DIR, "uploads", "cafe");
export const cafeJson = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
export const cafeError = (error: string, status = 400) => cafeJson({ error }, status);
export const validId = (id: string) => /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) > 0;
export function validateCafePost(value: Record<string, unknown>) {
    const board = findCafeBoard(String(value.board ?? ""));
    const title = String(value.title ?? "").trim();
    const body = String(value.body ?? "").trim();
    if (!board)
        throw new Error("게시판을 선택해주세요");
    if (!title || title.length > 100)
        throw new Error("제목은 1~100자로 입력해주세요");
    if (!body || body.length > 6000)
        throw new Error("내용은 1~6,000자로 입력해주세요");
    const raw = value.details && typeof value.details === "object" && !Array.isArray(value.details) ? value.details as Record<string, unknown> : {};
    const details: CafeDetails = { ...EMPTY_CAFE_DETAILS };
    for (const key of Object.keys(details) as (keyof CafeDetails)[]) {
        details[key] = String(raw[key] ?? "").trim();
        if (details[key].length > (key === "url" ? 1000 : key === "formula" ? 500 : 150))
            throw new Error("상세 정보가 너무 길어요");
    }
    if (details.region && !(CAFE_REGIONS as readonly string[]).includes(details.region))
        throw new Error("지역을 다시 선택해주세요");
    if (details.date && (!/^\d{4}-\d{2}-\d{2}$/.test(details.date) || !Number.isFinite(Date.parse(details.date)) || new Date(details.date).toISOString().slice(0, 10) !== details.date))
        throw new Error("올바른 일정 날짜를 입력해주세요");
    if (details.url) throw new Error("외부 사이트 링크는 사용할 수 없어요. 자료는 직접 첨부해주세요");
    if(details.capacity&&(!/^\d+$/.test(details.capacity)||Number(details.capacity)<1||Number(details.capacity)>100000))throw new Error("모집 정원은 1~100,000명으로 입력해주세요");
    if(details.fee&&(!/^\d+$/.test(details.fee)||Number(details.fee)>100000000))throw new Error("참가비는 0~100,000,000원으로 입력해주세요");
    if(details.deadline&&(!/^\d{4}-\d{2}-\d{2}$/.test(details.deadline)||!Number.isFinite(Date.parse(details.deadline))||new Date(details.deadline).toISOString().slice(0,10)!==details.deadline))throw new Error("신청 마감일을 확인해주세요");
    const kinds = CAFE_KINDS[board.slug];
    if (kinds && !kinds.includes(details.kind))
        throw new Error("모집·거래 유형을 선택해주세요");
    if (board.listing && !details.region)
        throw new Error("모집·거래 글의 지역을 선택해주세요");
    const side = board.slug === "jobs" ? jobSide(details.kind) : null;
    if (side) {
        if (!CITY_DISTRICTS[details.region] || !CITY_DISTRICTS[details.region].includes(details.district))
            throw new Error("구인구직 지역(시·도와 시·군·구)을 다시 선택해주세요");
        const missing = JOB_REQUIRED[side].find(key => !details[key]);
        if (missing)
            throw new Error(`${detailLabel(missing, details.kind)}을(를) 입력해주세요`);
        if (!(JOB_ROLES as readonly string[]).includes(details.role))
            throw new Error("직급을 다시 선택해주세요");
    }
    return { board: board.slug, title, body, details };
}
const SELECT = `SELECT p.*, u.name AS author_name,
  (SELECT COUNT(*) FROM cafe_reactions r WHERE r.post_id=p.id AND r.kind='like') AS like_count,
  (SELECT COUNT(*) FROM cafe_comments c WHERE c.post_id=p.id AND c.deleted_at IS NULL) AS comment_count,
  EXISTS(SELECT 1 FROM cafe_reactions r WHERE r.post_id=p.id AND r.kind='like' AND r.user_id=?) AS liked,
  EXISTS(SELECT 1 FROM cafe_reactions r WHERE r.post_id=p.id AND r.kind='save' AND r.user_id=?) AS saved
  FROM cafe_posts p JOIN users u ON u.id=p.author_id`;
function hydrate(row: Record<string, unknown>): CafePost {
    const photos = db.prepare("SELECT filename FROM cafe_images WHERE post_id=? ORDER BY filename").all(row.id as number) as {
        filename: string;
    }[];
    return { ...row, details: { ...EMPTY_CAFE_DETAILS, ...JSON.parse(row.details as string) }, photos: photos.map((p) => `/api/cafe/photos/${p.filename}`), liked: !!row.liked, saved: !!row.saved } as CafePost;
}
export function getCafePost(id: number, userId = "") {
    const row = db.prepare(`${SELECT} WHERE p.id=? AND p.deleted_at IS NULL`).get(userId, userId, id);
    return row ? hydrate(row) : null;
}
export function listCafePosts(sp: URLSearchParams, userId = "", excludedBoards: string[] = []) {
    const conditions = ["p.deleted_at IS NULL"];
    const args: (string | number)[] = [userId, userId];
    if(excludedBoards.length) { conditions.push(`p.board NOT IN (${excludedBoards.map(()=>'?').join(',')})`);args.push(...excludedBoards); }
    const board = sp.get("board") || "all";
    if (board !== "all") {
        if (!findCafeBoard(board))
            throw new Error("존재하지 않는 게시판이에요");
        conditions.push("p.board=?");
        args.push(board);
    }
    // 큰 분류(소통·기술·교육 등)로 묶어 보기
    const group = sp.get("group");
    if (group && board === "all") {
        const slugs = CAFE_BOARDS.filter(b => b.group === group).map(b => b.slug);
        if (!slugs.length)
            throw new Error("존재하지 않는 분류예요");
        conditions.push(`p.board IN (${slugs.map(() => "?").join(",")})`);
        args.push(...slugs);
    }
    // 주제(시술 노하우 등)로 묶인 게시판 함께 보기
    const topic = sp.get("topic");
    if (topic && board === "all") {
        const found = findCafeTopic(topic);
        if (!found)
            throw new Error("존재하지 않는 주제예요");
        conditions.push(`p.board IN (${found.boards.map(() => "?").join(",")})`);
        args.push(...found.boards);
    }
    const q = (sp.get("q") || "").trim().slice(0, 100);
    if (q) {
        conditions.push("(instr(p.title,?)>0 OR instr(p.body,?)>0 OR (p.board!='anonymous' AND instr(u.name,?)>0))");
        args.push(q, q, q);
    }
    const region = sp.get("region");
    if (region) {
        conditions.push("json_extract(p.details,'$.region')=?");
        args.push(region);
    }
    const district = sp.get("district");
    if (district) {
        conditions.push("json_extract(p.details,'$.district')=?");
        args.push(district);
    }
    // 구인구직 대분류: 구인(…채용) / 구직(…구직)
    const side = sp.get("side");
    if (side === "hire" || side === "seek") {
        conditions.push("json_extract(p.details,'$.kind') LIKE ?");
        args.push(side === "hire" ? "%채용" : "%구직");
    }
    const kind=sp.get('kind');if(kind){conditions.push("json_extract(p.details,'$.kind')=?");args.push(kind);}
    const tag=sp.get('tag');if(tag){conditions.push("instr(json_extract(p.details,'$.tags'),?)>0");args.push(tag.slice(0,50));}
    if (sp.get("open") === "1")
        conditions.push("p.status='open'");
    const scope = sp.get("scope");
    if (scope === "mine") {
        conditions.push("p.author_id=?");
        args.push(userId);
    }
    if (scope === "recent") {
        conditions.push("EXISTS(SELECT 1 FROM cafe_recent r WHERE r.post_id=p.id AND r.user_id=?)");
        args.push(userId);
    }
    if (scope === "saved") {
        conditions.push("EXISTS(SELECT 1 FROM cafe_reactions r WHERE r.post_id=p.id AND r.user_id=? AND r.kind='save')");
        args.push(userId);
    }
    const rawPage = Number(sp.get("page") || 1);
    const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10000) : 1;
    const order = sp.get("sort") === "popular" ? "like_count DESC, comment_count DESC, p.id DESC" : "p.id DESC";
    // 최근 본 글은 고정·노출과 상관없이 마지막으로 본 순서대로 보여준다.
    const orderBy = scope === "recent" ? "(SELECT r.viewed_at FROM cafe_recent r WHERE r.post_id=p.id AND r.user_id=?) DESC, p.id DESC" : `p.pinned DESC,CASE WHEN p.sponsored_until>datetime('now') THEN 1 ELSE 0 END DESC, ${order}`;
    if (scope === "recent")
        args.push(userId);
    const rows = db.prepare(`${SELECT} WHERE ${conditions.join(" AND ")} ORDER BY ${orderBy} LIMIT 21 OFFSET ?`).all(...args, (page - 1) * 20);
    return { items: rows.slice(0, 20).map(hydrate), hasMore: rows.length > 20, page };
}
export function cafeAttendance(userId: string) {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const rows = db.prepare("SELECT day FROM cafe_attendance WHERE user_id=? ORDER BY day DESC").all(userId) as {
        day: string;
    }[];
    const today = rows.some((r) => r.day === day);
    let streak = 0;
    const cursor = new Date(`${day}T00:00:00Z`);
    if (!today)
        cursor.setUTCDate(cursor.getUTCDate() - 1);
    for (const row of rows) {
        if (row.day !== cursor.toISOString().slice(0, 10))
            break;
        streak++;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return { day, today, streak, total: rows.length, visitors: (db.prepare("SELECT COUNT(*) AS n FROM cafe_attendance WHERE day=?").get(day) as {
            n: number;
        }).n };
}
