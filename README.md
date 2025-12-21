# URL Monitor & Slack Notification Service

실시간으로 웹사이트를 모니터링하고 새로운 게시글이 올라울 때마다 Slack으로 알림을 받는 서비스입니다.

## 🚀 주요 기능

- ✅ URL 모니터링 및 새 게시글 자동 감지
- ✅ Slack 웹훅을 통한 실시간 알림
- ✅ 업데이트 주기 설정 (매시간/매일/매주)
- ✅ SQLite 데이터베이스로 게시글 추적
- ✅ 중복 알림 방지

## 📋 요구사항

- Node.js 14.0 이상
- npm 또는 yarn

## 🛠️ 설치 방법

1. **의존성 설치**
```bash
cd url-monitor-service
npm install
```

2. **환경 변수 설정 (선택사항)**
```bash
cp .env.example .env
```

`.env` 파일을 편집하여 기본 설정을 변경할 수 있습니다.

## 🎯 사용 방법

1. **서버 시작**
```bash
npm start
```

2. **웹 브라우저에서 접속**
```
http://localhost:3000
```

3. **모니터 추가**
   - URL 입력
   - 업데이트 주기 선택
   - Slack Webhook URL 입력 (선택사항)
   - "모니터 추가" 버튼 클릭

4. **Slack Webhook URL 설정 (선택사항)**
   - Slack 워크스페이스에서 Incoming Webhook 생성
   - 생성된 URL을 모니터 추가 시 입력
   - 비워두면 콘솔에 로그가 출력됩니다

## 📡 API 엔드포인트

### 모니터 관리

- `GET /api/monitors` - 모든 모니터 조회
- `GET /api/monitors/:id` - 특정 모니터 조회
- `POST /api/monitors` - 새 모니터 추가
- `DELETE /api/monitors/:id` - 모니터 삭제
- `POST /api/monitors/:id/check` - 수동으로 모니터 확인

### 요청 예시

**새 모니터 추가**
```json
POST /api/monitors
{
  "url": "https://www.kofia.or.kr/brd/m_96/list.do",
  "interval": "daily",
  "slackWebhook": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
}
```

## 🔧 업데이트 주기 옵션

- `hourly` - 매시간 (정각)
- `daily` - 매일 오전 9시
- `weekly` - 매주 월요일 오전 9시
- `every-5-min` - 5분마다 (테스트용)

## 📁 프로젝트 구조

```
url-monitor-service/
├── public/              # 프론트엔드 파일
│   ├── index.html      # 메인 HTML
│   ├── style.css       # 스타일시트
│   └── app.js          # 프론트엔드 JavaScript
├── database.js         # SQLite 데이터베이스 관리
├── monitor.js          # URL 모니터링 로직
├── scheduler.js        # 스케줄링 시스템
├── slack.js            # Slack 알림
├── server.js           # Express 서버
├── package.json        # 프로젝트 설정
└── monitors.db         # SQLite 데이터베이스 (자동 생성)
```

## 🎨 기술 스택

- **Backend**: Node.js, Express
- **Database**: SQLite (better-sqlite3)
- **Scheduling**: node-cron
- **Web Scraping**: Axios, Cheerio
- **Notifications**: Slack Webhook API
- **Frontend**: Vanilla JavaScript, Modern CSS

## 📝 예제: KOFIA 채용공고 모니터링

```javascript
// 모니터 설정
URL: https://www.kofia.or.kr/brd/m_96/list.do
업데이트 주기: 매일
Slack Webhook: (선택사항)
```

서비스가 매일 오전 9시에 자동으로 해당 페이지를 확인하고, 새로운 채용공고가 올라오면 Slack으로 알림을 보냅니다.

## 🐛 문제 해결

**서버가 시작되지 않는 경우**
- Node.js 버전 확인: `node --version`
- 포트 3000이 이미 사용 중인지 확인
- `.env` 파일에서 다른 포트 설정

**모니터링이 작동하지 않는 경우**
- 서버 콘솔에서 에러 메시지 확인
- URL이 올바른지 확인
- 대상 웹사이트의 HTML 구조가 변경되었을 수 있음

**Slack 알림이 오지 않는 경우**
- Webhook URL이 올바른지 확인
- Slack 워크스페이스 권한 확인
- 콘솔 로그에서 에러 메시지 확인

## 📄 라이선스

MIT License

## 🤝 기여

이슈와 풀 리퀘스트를 환영합니다!
