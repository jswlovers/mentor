// 컬러핏 Q&A: 학습한 지식 베이스(color_knowledge)에서 질문과 가장 관련 있는 항목을 찾아 답한다.
// colorAi.ts 와 마찬가지로 외부 AI API는 쓰지 않는다. 키워드·글자쌍(bigram) 겹침으로 점수를 매긴다.
import { db } from "./db";
import { KNOWLEDGE_ENTRIES, KNOWLEDGE_SOURCES } from "./colorKnowledgeSeed";

// 시드 파일 내용을 DB에 반영한다. 시드에서 빠진 항목은 같은 출처 안에서만 지운다.
function syncSeed() {
  const upsertSource = db.prepare(
    `INSERT INTO color_knowledge_sources (id, title, author, url, note) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, author = excluded.author, url = excluded.url, note = excluded.note`,
  );
  const upsertEntry = db.prepare(
    `INSERT INTO color_knowledge (id, source_id, title, keywords, summary, points, page, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET source_id = excluded.source_id, title = excluded.title, keywords = excluded.keywords,
       summary = excluded.summary, points = excluded.points, page = excluded.page, ts = excluded.ts, updated_at = datetime('now')`,
  );
  const existing = db.prepare(`SELECT id FROM color_knowledge WHERE source_id = ?`);
  const remove = db.prepare(`DELETE FROM color_knowledge WHERE id = ?`);

  db.exec("BEGIN");
  try {
    for (const s of KNOWLEDGE_SOURCES) {
      upsertSource.run(s.id, s.title, s.author, s.url, s.note);
      const keep = new Set(KNOWLEDGE_ENTRIES.filter((e) => e.sourceId === s.id).map((e) => e.id));
      for (const row of existing.all(s.id) as { id: string }[]) if (!keep.has(row.id)) remove.run(row.id);
    }
    for (const e of KNOWLEDGE_ENTRIES) {
      upsertEntry.run(e.id, e.sourceId, e.title, JSON.stringify(e.keywords), e.summary, JSON.stringify(e.points), e.page ?? null, e.ts ?? null);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

const g = globalThis as unknown as { __colorKnowledgeSynced?: boolean };
if (!g.__colorKnowledgeSynced) {
  syncSeed();
  g.__colorKnowledgeSynced = true;
}

type Row = {
  id: string;
  source_id: string;
  title: string;
  keywords: string;
  summary: string;
  points: string;
  page: string | null;
  ts: number | null;
  source_title: string;
  source_author: string;
  source_url: string;
};

export type KnowledgeAnswer = {
  id: string;
  title: string;
  summary: string;
  points: string[];
  page: string | null;
  source: { title: string; author: string; url: string };
};

const allStmt = db.prepare(
  `SELECT k.*, s.title AS source_title, s.author AS source_author, s.url AS source_url
   FROM color_knowledge k JOIN color_knowledge_sources s ON s.id = k.source_id ORDER BY k.rowid`,
);
const logStmt = db.prepare(
  `INSERT INTO color_knowledge_questions (user_id, question, top_entry_id, matched) VALUES (?, ?, ?, ?)`,
);

function toAnswer(r: Row): KnowledgeAnswer {
  const url = r.ts != null ? `${r.source_url}${r.source_url.includes("?") ? "&" : "?"}t=${r.ts}s` : r.source_url;
  return {
    id: r.id,
    title: r.title,
    summary: r.summary,
    points: JSON.parse(r.points),
    page: r.page,
    source: { title: r.source_title, author: r.source_author, url },
  };
}

// 같은 뜻의 다른 표기를 하나로 맞춘다.
const SYNONYMS: [RegExp, string][] = [
  [/포일/g, "호일"],
  [/블렌드|블렌딩|블랜딩/g, "블랜드"],
  [/서피스|써피스/g, "surface"],
  [/쉐도우|섀도/g, "섀도우"],
  [/블리치|브릿지|브리지|블리칭/g, "탈색"],
  [/가르마/g, "파트"],
  [/하이라이팅/g, "하이라이트"],
  [/로우라이팅/g, "로우라이트"],
  [/컷트/g, "커트"],
];

// 질문에서 흔히 나오지만 의미 없는 글자쌍
const STOP_BIGRAMS = new Set([
  "하는", "어떻", "떻게", "무엇", "뭐야", "뭔가", "알려", "려줘", "해줘", "인가", "나요", "어요", "까요", "니다", "있나",
  "하면", "에서", "으로", "는지", "은지", "이랑", "해요", "되나", "할때", "하나", "주세", "세요", "좋아", "좋은", "싶어",
]);

function normalize(text: string) {
  let t = text.toLowerCase();
  for (const [re, to] of SYNONYMS) t = t.replace(re, to);
  return t;
}

const compact = (t: string) => t.replace(/[^0-9a-z가-힣/%]/g, "");

function bigrams(t: string) {
  const c = compact(t);
  const set = new Set<string>();
  for (let i = 0; i < c.length - 1; i++) {
    const bg = c.slice(i, i + 2);
    if (!STOP_BIGRAMS.has(bg)) set.add(bg);
  }
  return set;
}

function keywordHit(qSpaced: string, qCompact: string, keyword: string) {
  const k = compact(normalize(keyword));
  if (!k) return false;
  // 짧은 영문 약어(os, hl 등)는 다른 단어 안에 섞여 매칭되지 않게 단어 경계로만 본다.
  if (/^[a-z/%]+$/.test(k) && k.length <= 3) {
    return new RegExp(`(^|[^a-z])${k.replace("/", "\\/")}([^a-z]|$)`).test(qSpaced);
  }
  return qCompact.includes(k);
}

function score(qSpaced: string, qCompact: string, qBigrams: Set<string>, r: Row) {
  let s = 0;
  // 동의어 정규화 후 같아지는 키워드(호일/포일 등)는 한 번만 센다.
  const keywords = new Set((JSON.parse(r.keywords) as string[]).map((k) => compact(normalize(k))));
  for (const k of keywords) {
    if (keywordHit(qSpaced, qCompact, k)) s += k.length >= 3 ? 4 : 3;
  }
  const title = bigrams(normalize(r.title));
  const body = bigrams(normalize(`${r.summary} ${r.points}`));
  let t = 0, b = 0;
  for (const bg of qBigrams) {
    if (title.has(bg)) t++;
    if (body.has(bg)) b++;
  }
  return s + Math.min(t, 4) + Math.min(b, 6) * 0.3;
}

const MIN_SCORE = 3;

export function askKnowledge(question: string, userId: string | null) {
  const qSpaced = normalize(question);
  const qCompact = compact(qSpaced);
  const qBigrams = bigrams(qSpaced);
  const rows = allStmt.all() as Row[];

  const ranked = rows
    .map((r) => ({ r, s: score(qSpaced, qCompact, qBigrams, r) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  const top = ranked[0];
  const matched = !!top && top.s >= MIN_SCORE;
  logStmt.run(userId, question, top?.r.id ?? null, matched ? 1 : 0);

  if (!matched) return { matched: false as const, answer: null, related: ranked.slice(0, 3).map((x) => ({ id: x.r.id, title: x.r.title })) };
  const related = ranked
    .slice(1)
    .filter((x) => x.s >= Math.max(MIN_SCORE, top.s * 0.4))
    .slice(0, 3)
    .map((x) => ({ id: x.r.id, title: x.r.title }));
  return { matched: true as const, answer: toAnswer(top.r), related };
}

export function getKnowledge(id: string) {
  const row = (allStmt.all() as Row[]).find((r) => r.id === id);
  return row ? toAnswer(row) : null;
}

const sourcesStmt = db.prepare(`SELECT id, title, author, url, note FROM color_knowledge_sources ORDER BY rowid`);

export function listKnowledge() {
  const rows = allStmt.all() as Row[];
  const sources = (sourcesStmt.all() as { id: string; title: string; author: string; url: string; note: string }[]).map((s) => ({
    ...s,
    topics: rows.filter((r) => r.source_id === s.id).map((r) => ({ id: r.id, title: r.title })),
  }));
  return { sources };
}
