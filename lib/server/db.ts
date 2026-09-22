import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const g = globalThis as unknown as { __mentorDb?: DatabaseSync };

function open() {
  const db = new DatabaseSync(path.join(DATA_DIR, "mentor.sqlite"));
  // 빌드 워커 등 여러 프로세스가 동시에 열어도 잠금 대기하도록 가장 먼저 설정한다.
  db.exec("PRAGMA busy_timeout = 10000");
  db.exec(`
    PRAGMA journal_mode = WAL;

    -- role: member | admin. expert_status: none | pending | approved | rejected
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      pw_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      expert_status TEXT NOT NULL DEFAULT 'none',
      expert_bio TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      asker_id TEXT NOT NULL REFERENCES users(id),
      asker_name TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      hair_type TEXT NOT NULL DEFAULT '-',
      product TEXT NOT NULL DEFAULT '-',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id TEXT NOT NULL REFERENCES questions(id),
      author_id TEXT NOT NULL REFERENCES users(id),
      author_name TEXT NOT NULL,
      is_expert INTEGER NOT NULL DEFAULT 0,
      body TEXT NOT NULL,
      accepted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_answers_q ON answers(question_id);

    -- 복식부기 코인 원장. 잔액은 항상 이 원장에서 계산한다.
    -- account: user:<id> | earn:<id>(전문가 수익) | platform:cash | platform:revenue | platform:promo
    --          | platform:withdraw_hold(출금 신청 보류) | platform:payout(지급 완료)
    CREATE TABLE IF NOT EXISTS coin_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_group TEXT NOT NULL,
      account TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('debit','credit')),
      amount INTEGER NOT NULL CHECK (amount > 0),
      user_id TEXT,
      type TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_coin_ledger_account ON coin_ledger(account);

    CREATE TABLE IF NOT EXISTS coin_charges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      amount_krw INTEGER NOT NULL,
      coins INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      provider TEXT NOT NULL DEFAULT 'manual',
      provider_order_id TEXT,
      provider_response TEXT,
      admin_note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      processed_at TEXT
    );

    -- 상담 세션. 질문자(asker)가 시작비를 내면 열리고, 승인된 전문가가 참여(claim)하면 정산이 시작된다.
    -- status: open | ended | cancelled
    CREATE TABLE IF NOT EXISTS consultations (
      room_id TEXT PRIMARY KEY,
      asker_id TEXT NOT NULL,
      asker_name TEXT NOT NULL,
      fee INTEGER NOT NULL,
      expert_id TEXT,
      expert_name TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT
    );

    -- 질문 하나가 곧 채팅방. attachment_type: NULL | 'image' | 'file' | 'call'
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      body TEXT NOT NULL,
      attachment_type TEXT,
      attachment_url TEXT,
      attachment_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, id);

    -- 전문가 출금 신청. status: pending | paid | rejected
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      amount INTEGER NOT NULL,
      bank_info TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      processed_at TEXT
    );

    -- 고객센터. category: complaint | refund | report | other. target_user_id는 신고 대상.
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      target_user_id TEXT REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      admin_note TEXT,
      refund_coins INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      processed_at TEXT
    );

    -- 종료된 통화. 한쪽이 종료하면 기록하고, 상대 쪽은 요금 확인(tick)에서 이를 보고 함께 종료한다.
    CREATE TABLE IF NOT EXISTS call_ends (
      call_url TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      ended_by TEXT NOT NULL,
      ended_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 앱 안 알림. link는 눌렀을 때 이동할 경로.
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      link TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read_at, id);

    CREATE TABLE IF NOT EXISTS question_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id TEXT NOT NULL REFERENCES questions(id),
      url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_qimg_q ON question_images(question_id);

    -- 상담 후기: 상담(room) 하나당 질문자가 1건. 종료된 상담만.
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL UNIQUE,
      expert_id TEXT NOT NULL REFERENCES users(id),
      asker_id TEXT NOT NULL REFERENCES users(id),
      asker_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_expert ON reviews(expert_id);
  `);
  // 신고 누적 자동 정지용 컬럼 (이미 있으면 무시)
  try { db.exec(`ALTER TABLE users ADD COLUMN suspended_at TEXT`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN suspended_reason TEXT`); } catch {}
  try { db.exec(`ALTER TABLE coin_charges ADD COLUMN depositor TEXT`); } catch {}
  return db;
}

export const db: DatabaseSync = (g.__mentorDb ??= open());

// 직급(원장/디자이너/인턴) · 휴대폰 인증 · 직급 게시판 · 구인구직.
// 개발 서버에서 기존 연결이 캐시돼도 새 컬럼/테이블이 생기도록 open() 밖에서 매번 실행한다(diary 테이블과 동일한 이유).
try { db.exec(`ALTER TABLE users ADD COLUMN phone TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN position TEXT`); } catch {}
// 기존 회원(가입 당시 phone이 없던 계정)은 NULL을 허용하고, 값이 있으면 중복을 막는다.
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL`);

db.exec(`
  -- 휴대폰 인증번호(중복가입 방지용). 실제 SMS 연동 전이라 인증번호는 API 응답으로 그대로 돌려준다(개발/테스트용).
  CREATE TABLE IF NOT EXISTS phone_verifications (
    phone TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- 직급별 게시판(원장/디자이너/인턴). 같은 직급 회원(과 관리자)만 조회·작성할 수 있다.
  CREATE TABLE IF NOT EXISTS position_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    author_id TEXT NOT NULL REFERENCES users(id),
    author_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_position_posts ON position_posts(position, id);

  -- 구인구직: 대분류(채용/구직) · 도시 · 지역(구/시/군)으로 나눈 글.
  CREATE TABLE IF NOT EXISTS job_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('hire','seek')),
    city TEXT NOT NULL,
    district TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    author_id TEXT NOT NULL REFERENCES users(id),
    author_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_job_posts_loc ON job_posts(type, city, district, id);
`);

// 개인 일기장(본인만 열람). 연결이 개발 서버에서 캐시돼도 새 테이블이 생기도록 open() 밖에서 매번 실행한다(IF NOT EXISTS).
// date는 'YYYY-MM-DD'(사용자 로컬 날짜). 사진은 파일명만 저장하고, 조회는 항상 user_id로 걸러낸다.
db.exec(`
  CREATE TABLE IF NOT EXISTS diary_entries (
    user_id TEXT NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, date)
  );
  CREATE TABLE IF NOT EXISTS diary_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    filename TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_diary_images_day ON diary_images(user_id, date);
`);
