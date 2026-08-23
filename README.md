# Mercury Lab Household Budget Manager

가계(워크스페이스)별로 거래, 정기 지출, 잔액, 결제 수단과 카드 실적을 관리하는 모노레포입니다.

## 시작하기

1. `.env.example`을 `.env`로 복사합니다.
2. `docker compose up -d`로 PostgreSQL을 실행합니다. 다른 프로젝트 DB와 충돌하지 않도록 호스트의 `5433` 포트를 사용합니다.
3. `npm install` 후 `npm run dev`를 실행합니다.
4. 웹은 `http://localhost:3000`, API 문서는 `http://localhost:4000/docs`입니다.

웹은 API 연결 전에도 데모 데이터로 대시보드를 표시합니다. 캘린더는 `C:/workspace/calendar-mercury-lab`을 로컬 패키지로 참조합니다.
