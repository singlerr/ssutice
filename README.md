# SSU 공지사항 알리미

숭실대학교 컴퓨터학부, 대학 공지사항, 총학생회 공지를 한눈에 보고 브라우저 푸시 알림을 받을 수 있는 웹 앱.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_GITHUB_USERNAME%2Fssutice&env=TURSO_DATABASE_URL,TURSO_AUTH_TOKEN,VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY,VAPID_EMAIL,CRON_SECRET&envDescription=Setup%20guide%20in%20README&project-name=ssutice)

---

## 기능

- 숭실대학교 공지사항 (scatch.ssu.ac.kr)
- 컴퓨터학부 공지사항 (cse.ssu.ac.kr)
- 총학생회 공지사항 (stu.ssu.ac.kr)
- 카테고리별 필터
- 브라우저 웹 푸시 알림 (새 공지 등록 시 자동 알림)
- GitHub Actions로 15분마다 자동 크롤링

---

## 배포 (Vercel + GitHub)

### 1. 사전 준비

#### Turso DB 생성
```bash
npx turso auth login
npx turso db create ssutice
npx turso db show ssutice          # URL 확인
npx turso db tokens create ssutice # Auth Token 생성
```

#### VAPID 키 생성
```bash
node -e "const wp=require('web-push');console.log(wp.generateVAPIDKeys())"
```

### 2. Vercel 배포

위의 **Deploy with Vercel** 버튼 클릭 후 아래 환경변수 입력:

| 변수 | 설명 |
|------|------|
| `TURSO_DATABASE_URL` | `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `VAPID_PUBLIC_KEY` | VAPID 공개키 |
| `VAPID_PRIVATE_KEY` | VAPID 비밀키 |
| `VAPID_EMAIL` | `mailto:your@email.com` |
| `CRON_SECRET` | 임의의 랜덤 문자열 |

### 3. GitHub Actions 스케줄러 설정

배포 완료 후 GitHub 레포 → **Settings → Secrets and variables → Actions**에 추가:

| Secret | 값 |
|--------|----|
| `CRON_SECRET` | Vercel에 입력한 것과 동일한 값 |
| `APP_URL` | `https://your-project.vercel.app` |

이후 15분마다 자동으로 공지사항을 크롤링합니다.

---

## 로컬 개발

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일을 편집하여 실제 값 입력

# 3. 개발 서버 실행
npm run dev

# 4. 수동으로 공지 크롤링 (크론 대신)
curl -H "Authorization: Bearer your-cron-secret" http://localhost:3000/api/scrape
```

---

## 기술 스택

- **Next.js 16** (App Router)
- **Tailwind CSS v4**
- **Turso** (libSQL — SQLite 호환 클라우드 DB)
- **web-push** (VAPID Web Push API)
- **cheerio** (HTML 파싱)
- **GitHub Actions** (15분 간격 스케줄 크롤링)
