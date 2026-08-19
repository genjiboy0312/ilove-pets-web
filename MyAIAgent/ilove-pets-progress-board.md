# iLove Pets 진행 현황 보드

마지막 업데이트: 2026-08-20
출처 계획: [MyAIAgent/ilove-pets-planning.md](./ilove-pets-planning.md)

## 마커

- `[ ]` 대기
- `[>]` 진행 중
- `[x]` 완료
- `[!]` 차단
- `[?]` 결정 필요
- `[-]` 보류/범위 밖

## 현재 마일스톤

현재 마일스톤은 frontend-only mobile web MVP다. React, TypeScript, Vite 기반의 모바일 웹 앱을 현재 루트 안에 직접 구성한다. 백엔드, 실제 API, 데이터베이스 연결은 이번 마일스톤에 넣지 않는다.

## 현재 저장소 상태

- [x] 저장소와 루트 상태를 점검했다.
- [x] 계획 문서가 있고 검토했다.
- [x] 루트 `.gitignore`가 생성되어 있다.
- [x] 이 진행 현황 보드를 생성했다.
- [x] npm 기반 React, TypeScript, Vite 앱 스캐폴드가 준비되어 있다.
- [x] ESLint, Prettier, Vitest, Playwright 품질 도구가 구성되어 있다.
- [x] Stage 1 앱 셸, 디자인 토큰, light/dark theme 기반이 구현되어 있다.
- [x] production build와 3개 viewport 브라우저 smoke가 통과한다.
- [x] `constants`, `types`, `mocks` 폴더와 Stage 2 데이터 기반이 준비되어 있다.
- [x] system/light/dark theme 상태, ko/ja/en i18n, 모바일 앱 shell이 구성되어 있다.
- [x] React Router와 하단 Bottom Navigation 구성이 완료되어 있다.
- [x] Home, 카테고리 swipe, mock feed 구현을 완료했다.

## 프론트엔드 MVP 작업 단계

1. [x] React, TypeScript, Vite 스캐폴드와 품질 도구 구성
2. [x] 폴더 구조, 도메인 타입, 상수, mock data 준비
3. [x] theme, i18n, 모바일 앱 shell 구성
4. [x] React Router와 하단 Bottom Navigation 구성
5. [x] Home, 카테고리 swipe, mock feed 구현
6. [x] Explore, Create, Activity, My, Settings 화면 구현
7. [x] theme 전환, 언어 전환, 수동 확인, TypeScript, ESLint, build 검증

## 다음 액션 큐

1. [x] 패키지 매니저는 npm으로 확정했다.
2. [x] Vitest와 React Testing Library를 초기 테스트 기반으로 확정했다.
3. [x] Stage 1 스캐폴드, strict 설정, 앱 진입점, production 검증을 완료했다.
4. [x] Stage 2 폴더 경계와 readonly 도메인 타입을 정의했다.
5. [x] 카테고리 상수와 정규화된 mock data를 타입 안전하게 준비했다.
6. [x] Stage 3 theme 상태, i18n 구조, 모바일 앱 shell을 구성했다.
7. [x] Stage 4에서 React Router와 하단 Bottom Navigation을 구성했다.
8. [x] Stage 5에서 Home 카테고리 swipe와 mock feed를 구현했다.
9. [x] Stage 6에서 Explore, Create, Activity, My, Settings 화면을 구현했다.

## 결정 필요와 차단 요소

- [x] 패키지 매니저: npm.
- [x] 테스트 설정: Vitest, React Testing Library, Playwright.
- [x] 아이콘 라이브러리: 실제 아이콘 UI를 구현하는 단계에서 `lucide-react`를 추가한다.
- [x] 현재 Stage 2 작업을 막는 스캐폴드 차단 요소가 없다.

## 보류 또는 범위 밖

- [-] Supabase
- [-] Database
- [-] Authentication Backend
- [-] 실제 API
- [-] Docker
- [-] PC-specific responsive mode

## 검증 근거

- [x] 루트와 계획 문서 기준으로 현재 상태를 요약했다.
- [x] 완료 항목은 저장소 점검, 계획 문서 확인, 루트 `.gitignore` 및 이 진행 보드 생성으로만 제한했다.
- [x] 앱 기능은 아직 구현됐다고 표시하지 않았다.
- [x] 상세 요구사항은 출처 계획 문서로 연결하고, 이 보드는 요약 수준으로 유지했다.
- [x] `npm run format:check`, `npm run typecheck`, `npm run lint`가 통과했다.
- [x] Vitest 단위 테스트 4개와 production Playwright smoke 3개가 통과했다.
- [x] React Doctor 100점, 진단 0건을 확인했다.
- [x] 375px, 768px, 1280px에서 독립 visual QA 두 패스가 모두 PASS했다.
- [x] 체크리스트 텍스트 대비 4.5:1 이상과 한국어 의미 단위 줄바꿈을 회귀 검사했다.
- [x] Stage 2 카테고리, 도메인, mock data 불변식 테스트 8개를 추가했다.
- [x] 전체 Vitest 12개, TypeScript, ESLint, Prettier, production build가 통과했다.
- [x] Pet owner, Post pet, Activity actor/target 참조에 orphan data가 없음을 확인했다.
- [x] Stage 3 i18n, theme runtime, mobile shell 단위 테스트를 포함해 Vitest 25개가 통과했다.
- [x] system/light/dark 저장 상태와 ko/ja/en 감지·fallback을 production Playwright 7개로 확인했다.
- [x] Stage 3 React Doctor 100점, 독립 visual QA 두 패스 PASS를 확인했다.
- [x] Stage 4 React Router 5개 라우트와 고정 Bottom Navigation을 구현했다.
- [x] Stage 4 Vitest 32개, production Playwright 15개, TypeScript, ESLint, Prettier, build가 통과했다.
- [x] Stage 4 React Doctor 100점, 독립 design/CJK visual QA 두 패스 PASS를 확인했다.
- [x] 일본어 375px Bottom Navigation은 `通知` 라벨로 어색한 CJK 분할 없이 표시됨을 확인했다.
- [x] Stage 5 Home 카테고리 swipe, mock feed 카드, 이미지 fallback, ko/ja/en i18n을 구현했다.
- [x] Stage 5 Vitest 47개, production Playwright 23개, TypeScript, ESLint, Prettier, build가 통과했다.
- [x] Stage 5 React Doctor 100점을 확인했다.
- [x] Stage 5 Home 스크린샷을 viewport 캡처로 재생성하고 한국어/일본어 표시를 확인했다.
- [x] Stage 6 Explore, Create, Activity, My, Settings 화면을 구현하고 라우트를 연결했다.
- [x] Stage 6 Vitest 89개, production Playwright 31개, TypeScript, ESLint, Prettier, build가 통과했다.
- [x] Stage 6 React Doctor 100점을 확인했다.

## 업데이트 규칙

- 의미 있는 작업 단위가 끝날 때마다 이 보드를 갱신한다.
- 완료된 항목만 `[x]`로 바꾼다.
- 진행 중인 항목은 하나의 주 작업만 `[>]`로 표시한다.
- 결정이 필요한 항목은 `[?]`, 작업을 막는 항목은 `[!]`로 분리한다.
- 자세한 기능 요구사항은 이 문서에 복사하지 말고 출처 계획 문서를 참조한다.
