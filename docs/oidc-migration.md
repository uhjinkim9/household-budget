# Mercury Lab OIDC 전환 가이드

## 구조

- 브라우저는 Keycloak Access/Refresh Token을 받거나 저장하지 않는다.
- Nest API가 Authorization Code + PKCE(S256) 교환과 토큰 검증을 담당한다.
- OIDC 토큰은 `SESSION_SECRET`으로 AES-256-GCM 암호화되어 `oidc_sessions`에 저장된다.
- 브라우저에는 host-only `HttpOnly`, `SameSite=Lax` 쿠키만 저장된다. 운영에서는 `Secure`가 강제된다.
- 앱 API 인증은 `budget-access-token` HttpOnly 쿠키를 사용하며 기존 Bearer 인증도 전환 기간 동안 호환한다.
- `users.id`와 Keycloak `sub`는 `user_identity_links`에서 명시적으로 연결한다.
- 가계의 `OWNER`, `MEMBER`, `VIEWER` 권한은 기존 DB를 그대로 사용한다.

## 로컬 실행

1. 루트 `.env`에 `.env.development.example`의 OIDC 값을 복사한다.
2. `SESSION_SECRET`은 최소 32바이트 이상의 무작위 값으로 교체한다.
3. Keycloak 클라이언트의 개발 Redirect URI에 `http://localhost:3000/auth/callback`을 정확히 등록한다.
4. Identity API의 주소와 합의된 내부 계정 연결 경로를 설정한다.
5. 마이그레이션을 실행한다.

```powershell
npm run migration:run -w @budget/api
npm run dev
```

운영에서는 `DB_SYNCHRONIZE=false`, `DB_MIGRATIONS_RUN=true`를 사용한다. `DB_MIGRATIONS_RUN`을 생략해도 migration은 기본 실행되며, 별도 migration Job에서만 실행하려는 배포에서는 API 컨테이너에 `false`를 명시한다. 개발 중 기존 동기화가 필요하면 로컬에서만 `DB_SYNCHRONIZE=true`를 사용할 수 있다.

## 인증 경로

- `GET /api/auth/oidc/login`: state, nonce, PKCE verifier 생성 후 Keycloak 이동
- `GET /auth/callback`: Next callback 브리지
- `GET /api/auth/oidc/callback`: code 교환, 토큰 검증, Identity 동기화
- `POST /api/auth/oidc/link-account`: 기존 비밀번호 재확인 및 계정 연결
- `POST /api/auth/refresh`: 앱 쿠키와 OIDC 세션 갱신
- `POST /api/auth/logout`: 로컬 세션 삭제 및 Keycloak RP-initiated logout URL 반환
- `GET /api/users/me`: 현재 공유가계부 사용자 조회

## 기존 회원 이전

1. 기존 로그인과 OIDC 로그인을 병행한다.
2. OIDC `sub`가 이미 연결되어 있으면 기존 `users.id`로 로그인한다.
3. 같은 이메일의 기존 회원이 있으면 `PENDING` 연결만 만들고 자동 병합하지 않는다.
4. 기존 비밀번호 확인 후 서버가 Identity 내부 연결 API를 멱등성 키와 함께 호출한다.
5. 외부 연결 성공 후 하나의 DB 트랜잭션에서 연결 및 이전 상태를 완료한다.
6. 신규 이메일이며 `email_verified=true`이면 새 로컬 사용자와 OIDC 연결을 생성한다.

Identity 내부 연결 API가 준비되지 않았다면 `MERCURY_IDENTITY_ACCOUNT_LINK_PATH`를 비워 둔다. 이 경우 기존 회원 연결은 완료되지 않고 기존 데이터도 변경되지 않는다.

## Keycloak 운영 체크리스트

- Client ID: `household-budget-web`
- Client authentication: Off (Public client)
- Standard Flow: On
- Direct Access Grants: Off
- PKCE method: S256
- Valid Redirect URI: `https://household-budget.mercury-lab.uk/auth/callback` 한 개를 정확히 등록
- Valid Post Logout Redirect URI: `https://household-budget.mercury-lab.uk/`
- Web Origin: `https://household-budget.mercury-lab.uk`
- Default client scopes: `profile`, `email`, `roles`, `mercury-api-audience`
- Audience mapper가 Access Token `aud`에 `mercury-api`를 포함하는지 확인
- Realm role `mercury-user`, `mercury-admin`이 필요한 사용자에게만 포함되는지 확인
- 운영 `OIDC_ISSUER`가 토큰 `iss`와 바이트 단위로 동일한지 확인
- HTTPS 및 운영 쿠키의 `Secure` 확인
- 쿠키에 `Domain=.mercury-lab.uk`가 설정되지 않았는지 확인
- `SESSION_SECRET`, DB 암호, 내부 API 인증값이 저장소와 로그에 노출되지 않았는지 확인
- 다중 API 인스턴스에서 동일한 DB와 `SESSION_SECRET`을 사용하는지 확인

## 장애 시 동작

- state/nonce 불일치 및 만료 code: 로그인 거부 후 로그인 화면으로 복귀
- Identity API 동기화 실패: 로컬 사용자/연결을 만들기 전에 callback 실패
- 다른 중앙 계정에 연결된 기존 회원: unique 제약과 사전 검사로 차단
- 연결 중 외부 API 실패: `FAILED` 상태와 오류 기록, 앱 로그인 발급 안 함
- OIDC Refresh Token 만료 또는 Keycloak 갱신 거부: 앱 Refresh도 401 처리
- 브라우저의 동시 401: 프론트에서 Refresh 요청을 하나로 합쳐 처리

## 전환 단계

1. 기존 로그인과 Mercury 통합 로그인 병행
2. 기존 회원의 비밀번호 재확인 연결 제공
3. 연결 완료 회원에게 OIDC 우선 안내
4. 미이전 회원 대응과 복구 절차 확인 후 기존 로그인 종료
