# Mercury Lab Household Budget Manager

가계(워크스페이스)별로 거래, 정기 지출, 잔액, 결제 수단과 카드 실적을 관리하는 모노레포입니다.

## 시작하기

1. `.env.example`을 `.env`로 복사합니다.
2. `docker compose up -d`로 PostgreSQL을 실행합니다. 다른 프로젝트 DB와 충돌하지 않도록 호스트의 `5433` 포트를 사용합니다.
3. `npm install` 후 `npm run dev`를 실행합니다.
4. 웹은 `http://localhost:3000`, API 문서는 `http://localhost:4000/docs`입니다.

웹은 API 연결 전에도 데모 데이터로 대시보드를 표시합니다. 캘린더는 `C:/workspace/calendar-mercury-lab`을 로컬 패키지로 참조합니다.

## 배포

프론트엔드와 API는 독립 이미지로 빌드되며 동일한 릴리스 태그로 함께 배포됩니다.

```bash
docker build -f apps/api/Dockerfile -t household-budget-api .
docker build -f apps/web/Dockerfile -t household-budget-web .
docker run --rm -p 4000:4000 --env-file .env household-budget-api
docker run --rm -p 3000:3000 household-budget-web
```

`main` 브랜치에 push하면 GitHub Actions가 `ghcr.io/<owner>/household-budget-api`와 `ghcr.io/<owner>/household-budget-web` 이미지를 빌드하고, `uhjinkim9/helm-chart` 저장소의 `charts/namespace-household-budget/household-budget/values.yaml`에서 두 이미지 태그를 함께 갱신합니다. 저장소에는 다음 GitHub Actions secret이 필요합니다.

- `GITOPS_TOKEN`: Helm 저장소를 수정할 수 있는 토큰
- `DISCORD_WEBHOOK`: 배포 결과 알림 webhook

Helm Deployment에는 최소한 `DATABASE_URL`, `JWT_SECRET`, `API_KEY_ENCRYPTION_SECRET`을 secret으로 주입하고 서비스의 target port를 3000으로 지정해야 합니다. 운영 환경에서는 `DB_SYNCHRONIZE=false` 사용을 권장합니다.

## 오픈뱅킹 계좌 연결

금융결제원 개발자 포털에서 발급한 값은 API 컨테이너에만 주입합니다.

```text
OPEN_BANKING_CLIENT_ID
OPEN_BANKING_CLIENT_SECRET
OPEN_BANKING_REDIRECT_URI
```

개발자 포털 테스트베드는 기본적으로 `https://testapi.openbanking.or.kr`을 사용합니다. 운영 승인을 받은 뒤에는 `OPEN_BANKING_BASE_URL=https://openapi.openbanking.or.kr`로 변경합니다. 잔액조회에는 발급된 10자리 이용기관 코드를 `OPEN_BANKING_USE_ORG_CODE`로 추가해야 합니다.

Callback URL:

```text
https://household-budget.mercury-lab.uk/api/integrations/open-banking/oauth/callback
```

Access Token과 Refresh Token은 사용자별로 DB에 AES-256-GCM 암호화 저장되며 브라우저로 반환하지 않습니다.
