# 미용 SOS (mentor)

미용인이 시술·매장 운영 중 막힌 문제를 올리고, 검증된 현직 전문가에게 답을 받는 서비스.
무료 Q&A + 유료 1:1 상담(채팅·보이스톡·페이스톡), 코인 결제·전문가 정산을 포함합니다.

- Next.js 16 (App Router) + Tailwind 4, 내장 `node:sqlite` (Node 22.6+ / 24 권장)
- 통화: Daily.co, 결제: 무통장입금(관리자 승인) + 토스페이먼츠(선택)
- 포레스트클럽의 채팅·통화·코인 정책을 이식

## 빠른 시작

```bash
npm install
cp .env.example .env.local     # 값 채우기 (DAILY_API_KEY, BANK_INFO 등)
npm run dev                    # 개발 서버 http://localhost:3000
```

운영(HTTPS 직접 서비스):

```bash
npm run build
npm run serve                  # server.mjs --prod, PORT/HTTPS_CERT_PATH/HTTPS_KEY_PATH 사용
npm run make-admin -- <아이디>  # 가입한 회원을 관리자로 지정
```

## 문서

- [사용자 매뉴얼 (PDF)](docs/미용SOS_사용자매뉴얼.pdf) · [원본](docs/user-manual.md)
- [관리자 매뉴얼 (PDF)](docs/미용SOS_관리자매뉴얼.pdf) · [원본](docs/admin-manual.md)
- PDF 재생성: `python scripts/build-manuals.py` (`pip install markdown`, Edge/Chrome 필요)

## 구조

| 경로 | 내용 |
|---|---|
| `app/` | 화면(페이지)과 API 라우트 (`app/api/**`) |
| `lib/server/` | DB, 인증, 코인 원장·정산, 상담, 통화, 알림 |
| `lib/server/pricing.ts` | 요금·정산 비율 등 정책 값 (한 곳) |
| `scripts/` | 관리자 지정, 시드, 통합 테스트(`e2e*.mjs`), 매뉴얼 PDF 빌드 |
| `data/` | SQLite DB와 업로드 (git 제외) |

## 테스트

통합 테스트는 운영 DB를 오염시키지 않도록 **별도 `DATA_DIR`로 띄운 서버**에서만 실행하세요.

```bash
DATA_DIR=/tmp/mentor-test PORT=3005 node server.mjs --prod
DATA_DIR=/tmp/mentor-test node scripts/e2e.mjs http://localhost:3005
```

## 주의

- `.env.local`, `data/`, 인증서 파일은 저장소에 포함되지 않습니다.
- 공개 서버에서 `DEMO_SIGNUP_COINS`(가입 보너스)를 설정하지 마세요.
- `scripts/seed-test.mjs`의 테스트 계정 비밀번호는 알려진 값이므로 운영에서는 정지하세요.
