# FisheryLink (수협 조합원 어업 자문)

수협 조합원이 양식·어선어업·가공·경영 중 막힌 문제를 올리고, 검증된 어업 전문가에게 답을 받는 자문 서비스.
무료 Q&A + 유료 1:1 상담(채팅·보이스톡·페이스톡), 코인 결제·전문가 정산을 포함합니다.

- 상위 폴더의 [미용 SOS(mentor)](../README.md) 플랫폼을 복제해 어업 분야로 바꾼 별도 앱 (자체 `package.json`·DB 사용)
- Next.js 16 (App Router) + Tailwind 4, 내장 `node:sqlite` (Node 22.6+ / 24 권장)
- 통화: Daily.co, 결제: 무통장입금(관리자 승인) + 토스페이먼츠(선택)

## 어업 분야 도감

모든 분야는 [lib/fisheries.ts](lib/fisheries.ts) 한 곳에 정리되어 있고, 질문 분야 검증·분야 선택 화면·도감·전문가 전문 분야가 모두 이 목록을 씁니다.
품목마다 주산지, 양식·조업 방식, 소개, 조합원이 자주 묻는 주제를 담았습니다.

| 분야 | 품목·업종 |
|---|---|
| 🐟 해면양식 · 어류 | 광어(넙치), 우럭(조피볼락), 참돔, 돌돔, 감성돔, 숭어, 농어, 방어, 참다랑어, 강도다리, 능성어·자바리, 쥐치, 연어 |
| 🦪 해면양식 · 패류 | 굴, 전복, 홍합, 가리비, 바지락, 꼬막, 피조개, 키조개, 개조개·맛조개 |
| 🌿 해면양식 · 해조류 | 김, 미역, 다시마, 톳, 매생이, 파래·감태, 꼬시래기·모자반 |
| 🪸 해면양식 · 멍게·해삼 등 | 멍게(우렁쉥이), 미더덕, 해삼, 성게, 개불 |
| 🦐 갑각류 양식 | 흰다리새우, 대하, 보리새우, 꽃게 |
| 🏞️ 내수면 양식 | 뱀장어, 메기, 송어, 향어, 잉어·붕어, 미꾸라지, 쏘가리·동자개, 철갑상어, 큰징거미새우·다슬기, 자라 |
| 🚢 연근해 어선어업 | 대형선망, 기선권현망, 안강망, 자망, 통발, 채낚기, 연승, 저인망·트롤, 정치망, 연안복합, 잠수기, 낚시어선업 |
| 🌏 원양어업 | 참치 선망, 참치 연승, 원양 트롤(크릴), 원양 오징어 채낚기 |
| 🤿 마을어업 · 맨손 | 해녀(나잠), 갯벌 맨손어업, 어촌계 공동어장, 자연산 해조류 채취 |
| 🏭 수산가공 · 유통 | 위판·공판, 건조 가공, 젓갈·액젓, 냉동·선어 유통, 김 가공, 위생·인증(HACCP·이력제), 수출, 온라인 직판 |
| 📋 경영 · 제도 | 어업 면허·허가, 양식수산물 재해보험, 어선·어선원 보험, 면세유, 수산정책자금, 수산공익직불제, 귀어·후계어업인, 선원·외국인 근로자, 어선 안전·검사, 세무·회계 |
| 🔬 양식 기술 공통 | 질병·방역, 수질·해양 재해(적조·고수온), 사료·영양, 종자·육종, 양식 시설·장비(RAS·바이오플락), 스마트 양식 |

분야를 더하거나 고칠 때는 `lib/fisheries.ts`만 수정하면 됩니다. 질문에는 품목 `id`가, 전문가에게는 분야 그룹 `id`가 저장되므로 이미 쓰인 `id`는 바꾸지 마세요.

## 화면

| 경로 | 내용 |
|---|---|
| `/` | 질문 목록 (분야 그룹별 필터) |
| `/fields` | 어업 분야 도감 (검색: 품목·지역·주제) |
| `/fields/<품목 id>` | 품목 소개, 자주 묻는 주제, 그 품목의 질문, '이 분야 질문하기' |
| `/ask?field=<품목 id>` | 질문 작성 (분야 → 품목 선택, 양식장·어장 정보, 현재 상태, 사진) |
| `/experts`, `/experts/<id>` | 전문 분야별 검증 전문가 목록·프로필 |
| `/expert` | 전문가 신청(전문 분야 선택) / 전문가 센터(수익·출금) |
| `/chat/<질문 id>` | 유료 1:1 상담 |
| `/coins`, `/support`, `/admin` | 코인 충전, 고객센터, 관리자 |

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

같은 서버에서 mentor 앱과 함께 띄울 때는 `PORT`를 다르게 주세요. DB 파일(`data/fisherylink.sqlite`)과 세션 쿠키(`fisherylink_session`)는 mentor와 분리되어 있습니다.

## 문서

- [사용자 매뉴얼 (PDF)](docs/FisheryLink_사용자매뉴얼.pdf) · [원본](docs/user-manual.md)
- [관리자 매뉴얼 (PDF)](docs/FisheryLink_관리자매뉴얼.pdf) · [원본](docs/admin-manual.md)
- PDF 재생성: `python scripts/build-manuals.py` (`pip install markdown`, Edge/Chrome 필요)

## 구조

| 경로 | 내용 |
|---|---|
| `lib/fisheries.ts` | 어업 분야 도감 데이터 (12개 분야, 92개 품목·업종) |
| `app/` | 화면(페이지)과 API 라우트 (`app/api/**`) |
| `lib/server/` | DB, 인증, 코인 원장·정산, 상담, 통화, 알림 |
| `lib/server/pricing.ts` | 요금·정산 비율 등 정책 값 (한 곳) |
| `scripts/` | 관리자 지정, 시드, 통합 테스트(`e2e*.mjs`), 매뉴얼 PDF 빌드 |
| `data/` | SQLite DB와 업로드 (git 제외) |

## 테스트

통합 테스트는 운영 DB를 오염시키지 않도록 **별도 `DATA_DIR`로 띄운 서버**에서만 실행하세요.

```bash
DATA_DIR=/tmp/fisherylink-test PORT=3005 node server.mjs --prod
DATA_DIR=/tmp/fisherylink-test node scripts/e2e.mjs http://localhost:3005
```

## 주의

- `.env.local`, `data/`, 인증서 파일은 저장소에 포함되지 않습니다.
- 공개 서버에서 `DEMO_SIGNUP_COINS`(가입 보너스)를 설정하지 마세요.
- `scripts/seed-test.mjs`의 테스트 계정 비밀번호는 알려진 값이므로 운영에서는 정지하세요.
- 요금(`lib/server/pricing.ts`)은 mentor 값을 그대로 가져왔습니다. 수협 정책에 맞게 조정하세요.
