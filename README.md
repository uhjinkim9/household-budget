# Mercury Lab Household Budget Manager

가계(워크스페이스)별로 거래, 정기 지출, 잔액, 결제 수단과 카드 실적을 관리하는 모노레포입니다.

## 시작하기

1. `.env.example`을 `.env`로 복사합니다.
2. `docker compose up -d`로 PostgreSQL을 실행합니다. 다른 프로젝트 DB와 충돌하지 않도록 호스트의 `5433` 포트를 사용합니다.
3. `npm install` 후 `npm run dev`를 실행합니다.
4. 웹은 `http://localhost:3000`, API 문서는 `http://localhost:4000/docs`입니다.

웹은 API 연결 전에도 데모 데이터로 대시보드를 표시합니다. 캘린더는 `C:/workspace/calendar-mercury-lab`을 로컬 패키지로 참조합니다.

## 배포

프론트엔드와 API는 루트 `Dockerfile`에서 하나의 이미지로 빌드됩니다. 컨테이너는 3000 포트만 공개하며 `/api`와 `/docs` 요청을 내부 API 프로세스로 전달합니다.

```bash
docker build -t household-budget .
docker run --rm -p 3000:3000 --env-file .env household-budget
```

`main` 브랜치에 push하면 GitHub Actions가 `ghcr.io/<owner>/household-budget` 이미지를 빌드하고, `uhjinkim9/helm-chart` 저장소의 `charts/namespace-household-budget/household-budget/values.yaml`에서 `.image.tag`를 갱신합니다. 저장소에는 다음 GitHub Actions secret이 필요합니다.

- `GITOPS_TOKEN`: Helm 저장소를 수정할 수 있는 토큰
- `DISCORD_WEBHOOK`: 배포 결과 알림 webhook

Helm Deployment에는 최소한 `DATABASE_URL`, `JWT_SECRET`, `API_KEY_ENCRYPTION_SECRET`을 secret으로 주입하고 서비스의 target port를 3000으로 지정해야 합니다. 운영 환경에서는 `DB_SYNCHRONIZE=false` 사용을 권장합니다.
