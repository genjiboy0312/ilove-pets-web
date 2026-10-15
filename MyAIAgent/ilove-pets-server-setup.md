# S1 서버 연결 설정

후속 S2 클라우드 기록 코드는 [S2 적용 안내](./ilove-pets-cloud-setup.md)에 정리했다. S2 SQL·충돌 HTTP 상태 수정 SQL 적용과 사진 함수 배포를 마쳤고 실제 두 계정/익명 DB·Storage 검사도 통과했다. 아래는 연결 과정의 기록이며, 이메일/복구·SMTP와 공개 프런트엔드 반영은 별도로 확인한다.

앱 주소: <https://ilove-pets-web.pages.dev/>. 현재 작업본에는 Google·이메일/비밀번호 인증 화면, PKCE 콜백, 비밀번호 재설정, DB 마이그레이션과 로컬 권한 테스트가 준비되어 있다. 2026-10-15 사용자가 Supabase 개발 프로젝트를 생성했고 로컬 `.env.local`에 공개 연결 설정을 저장했다. 실제 DB 적용·Google/SMTP 설정·이 작업본의 공개 배포는 아직 수행하지 않았다.

개발 Project URL: <https://rdpfrblrzqphhievlihq.supabase.co>. 공개 키로 Auth settings HTTP 200 응답을 확인했다. 이메일 provider는 활성, Google provider는 비활성이다. 이후 사용자가 SQL Editor에서 마이그레이션 성공 화면을 전달했다. 6개 테이블의 REST 조회가 미생성 오류 대신 비로그인 권한 거절(401/42501)을 반환함을 확인했다. 로그인 사용자 권한·Storage 정책 전체의 실제 동작은 별도 검증이 필요하다. 가입·메일 발송·실제 사용자 로그인은 아직 실행하지 않았다.

이후 사용자가 Auth 복귀 URL 6개와 Google OAuth client 설정·테스트 계정 추가를 완료했다. Google provider 활성(`google: true`)과 PKCE authorize 요청의 HTTP 302 → `accounts.google.com`, Google 측 callback이 이 프로젝트의 `/auth/v1/callback`인 것을 읽기 전용으로 확인했다. 실제 Google 로그인 완료·세션 복귀는 아직 사용자 브라우저에서 확인해야 한다.

2026-10-15 사용자가 Google 인증 후 로그인 완료를 보고했다. 실제 계정 로그인 성공은 사용자 확인 근거이며 자동화 검증과 구분한다. 새로고침 후 세션 유지·로그아웃·계정 전환, 이메일 확인/복구와 SMTP 발송, 인증 사용자 간 DB/Storage HTTP 권한 검증은 아직 남아 있다.

추가 사용자 확인으로 새로고침 후 세션 유지와 로그아웃 후 Google 재로그인까지 통과했다. 다른 계정으로의 전환·데이터 격리, 이메일 확인/복구와 SMTP, DB/Storage HTTP 권한 검증은 계속 대기다.

## 1. Supabase 개발 프로젝트

전용 개발 프로젝트를 생성한다. Project URL과 publishable key만 프론트엔드에 사용한다. `.env.example`을 `.env.local`로 복사해 아래 두 값을 설정한다. 실제 키는 Git에 넣지 않는다.

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
```

Cloudflare Pages의 빌드 환경 변수에도 같은 공개 값을 등록하고 재빌드해야 반영된다. `service_role`, `sb_secret_*`, Google client secret, SMTP 비밀번호는 `VITE_*`에 넣지 않는다. 설정이 없으면 로그인 버튼을 비활성화하고 기존 로컬 기능을 계속 제공한다.

## 2. 데이터베이스

개발 프로젝트 SQL Editor에서 `supabase/migrations/202610140001_server_foundation.sql`을 적용한다. 기존 서비스 DB를 대상으로 사용하지 않는다. 이 파일은 Supabase의 기존 `auth`·`storage` 스키마가 있는 새 프로젝트를 전제로 한다.

`profiles`, `pets`, `media_assets`, `posts`, `growth_records`, `cleanup_jobs`, 비공개 `pet-media` 버킷을 생성한다. 일반 클라이언트는 자기 데이터만 조회한다. 직접 테이블 쓰기는 차단하고 아래 RPC를 사용한다.

- 이메일 확인된 로그인 세션에서 `ensure_profile()`로 프로필 생성. 현재 인증 UI와 별개이며 S2 데이터 연결 시 첫 요청에 호출한다.
- `update_profile`, `create_pet`, `save_growth_record`, `reserve_media`로 제한된 쓰기 실행.
- 사진 예약에는 계정·전체 용량 및 진행 중 업로드 수 제한을 적용한다. 크기 축소 신고 우회를 막기 위해 예약마다 버킷 최대 크기인 5MiB를 선점하고 요청 크기는 `expected_bytes`로 따로 기록한다. 서버 완료 처리에서 실제 파일과 요청 크기를 대조한 뒤 사용량을 정산할 예정이다. 클라이언트의 ready 전환·덮어쓰기·삭제는 허용하지 않는다.
- 게시물 공개 쓰기, 업로드 완료·정리 서버 함수, 계정 삭제 처리와 데이터 UI 연결은 후속 단계다.

`tests/server`의 Auth/Storage 스키마는 로컬 테스트용 모형이다. 해당 파일을 실제 프로젝트에 실행하지 않는다.

## 3. Auth URL

Authentication → URL Configuration에 설정한다.

```text
Site URL:
https://ilove-pets-web.pages.dev

Redirect URLs:
https://ilove-pets-web.pages.dev/auth/callback
https://ilove-pets-web.pages.dev/auth/reset-password
http://127.0.0.1:5173/auth/callback
http://127.0.0.1:5173/auth/reset-password
http://127.0.0.1:5174/auth/callback
http://127.0.0.1:5174/auth/reset-password
```

운영 허용 목록에 임의의 전체 wildcard를 넣지 않는다. 개발 URL은 개발 프로젝트에서만 유지한다. PKCE 이메일 링크는 요청한 브라우저에서 열어야 한다. 앱은 코드 교환 성공·실패 모두 URL의 인증 파라미터를 지우며 인증 경로와 외부 API 응답을 PWA 캐시에 저장하지 않는다.

## 4. Google과 이메일

Google Cloud에서 웹 OAuth client를 생성한다. Authorized JavaScript origins에 앱 origin을, Authorized redirect URIs에는 Supabase Google provider 화면의 `https://YOUR_PROJECT.supabase.co/auth/v1/callback`을 등록한다. Google의 callback은 앱의 `/auth/callback`과 다르다. client ID와 secret은 Supabase provider 설정에 직접 저장한다. 테스트 모드라면 테스트 계정도 등록한다. [공식 Google 설정](https://supabase.com/docs/guides/auth/social-login/auth-google).

Email provider와 이메일 확인을 켜고 최소 비밀번호 길이를 12자로 설정한다. 운영 이메일 발송에는 Custom SMTP를 설정한다. 발신 도메인 검증 및 발송 한도도 확인한다. 기본 제공 발송으로 일반 사용자 가입이 모두 가능하다고 가정하지 않는다. 이메일 링크 템플릿은 PKCE 기본 ConfirmationURL을 유지하거나 현재 앱의 `token_hash`·`type=signup/recovery/email` 콜백에 맞춰 설정한다. [비밀번호 인증](https://supabase.com/docs/guides/auth/passwords), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## 5. 검증과 남은 출시 조건

```powershell
npm run test:run
npm run test:server
npm run typecheck
npm run lint
npm run format:check
npm run smoke:preview
```

`test:server`는 PGlite의 실제 PostgreSQL 엔진에서 SQL/RLS/권한을 검사한다. Auth JWT 게이트웨이·Storage HTTP·Google·SMTP까지 실행하는 통합 테스트는 아니다. 개발 프로젝트에서 A/B/익명 세션으로 동일한 접근 거절을 확인하고, Google 로그인·이메일 확인·만료 링크·복구·로그아웃·다른 계정 로그인·새로고침을 실제로 검증해야 S1 완료다.

서버 이미지 PoC인 `supabase/functions/_shared/imageValidation.mjs`는 ImageMagick WASM을 초기화한 호출자에서 사용한다. JPEG/PNG/WebP 실제 디코딩, 5MiB·4096px·800만 화소 제한, 단일 프레임 확인, 메타데이터 제거, 최대 1600px WebP 재인코딩을 수행한다. 테스트는 Node 환경에서 실행했다. 아직 HTTP endpoint나 Supabase Edge 배포가 아니며 Edge 런타임 WASM 초기화·메모리/시간 예산·대표 모바일 사진·손상/다중 프레임 표본을 배포 환경에서 추가 확인해야 한다. 전용 함수의 import map에서 npm 패키지 버전을 고정하고 WASM을 번들에 포함할 예정이다. 실패한 사진을 ready로 전환하는 경로는 현재 없다.

로그인만으로 기존 브라우저 데이터가 계정 데이터로 업로드되거나 삭제되지 않는다. 펫·사진·기록 클라우드 저장은 S2, 로컬 자료의 명시적 이전은 S4에서 연결한다.
