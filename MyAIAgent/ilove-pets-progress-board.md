# iLove Pets 진행 현황 보드

마지막 업데이트: 2026-10-14
출처 계획: [MyAIAgent/ilove-pets-planning.md](./ilove-pets-planning.md)
후속 계획: [MyAIAgent/ilove-pets-next-plan.md](./ilove-pets-next-plan.md)

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
- [x] 댓글, 공유, 설정 정보 시트를 body 포털 기반 뷰포트 중앙 모달로 통일했다.
- [x] Leaflet 기반 커뮤니티 병원 지도에 시·구·동 필터, 야간 응급 필터, 데모 연락처·진료 시간 목록을 연결했다.
- [x] PWA 서비스 워커는 네트워크 우선 캐시와 즉시 활성화(`skipWaiting`)로 최신 앱 셸 갱신을 우선한다.
- [x] 첫 사용자 로컬 마일스톤: 내 펫 등록, 사진 포함 게시, Home/My/detail 반영, 새로고침 후 유지가 브라우저 로컬 저장 범위로 구현되어 있다.
## 프론트엔드 MVP 작업 단계

1. [x] React, TypeScript, Vite 스캐폴드와 품질 도구 구성
2. [x] 폴더 구조, 도메인 타입, 상수, mock data 준비
3. [x] theme, i18n, 모바일 앱 shell 구성
4. [x] React Router와 하단 Bottom Navigation 구성
5. [x] Home, 카테고리 swipe, mock feed 구현
6. [x] Explore, Create, Activity, My, Settings 화면 구현
7. [x] theme 전환, 언어 전환, 수동 확인, TypeScript, ESLint, build 검증
8. [x] 커뮤니티 병원 지도 필터와 야간 응급 데모 목록 검증

## 팝업 UX 개선 (2026-08-22)

1. [x] 댓글 팝업이 스크롤 위치와 무관하게 뷰포트 정중앙에 표시되도록 수정 (키프레임 잔여 transform 제거 + body 포털)
2. [x] 댓글 팝업 크기를 댓글 수와 무관하게 고정하고 이미지 영역 비율을 2배로 확대했다.
3. [x] 공유 시트에 카카오톡/인스타그램/X/페이스북 대상 버튼을 추가했다.
4. [x] X·페이스북은 공유 인텐트로 연결하고, 카카오톡·인스타그램은 링크 복사 폴백으로 동작하게 했다.
5. [x] 설정의 개인정보·서비스 하위 항목 시트를 동일한 중앙 모달로 전환했다.
6. [x] 설정 테마/언어를 현재값 표시 행 + 리스트박스 선택 시트로 전환했다.

## 병원 지도 및 PWA 갱신 (2026-10-06)

1. [x] 병원 지도는 Cesium이 아니라 기존 Leaflet 구현을 유지한다.
2. [x] 시·구·동 필터와 야간 응급 필터가 지도 핀 수와 병원 목록 수를 함께 갱신한다.
3. [x] 병원 연락처와 진료 시간은 검증된 실제 정보가 아니라 데모 샘플임을 화면과 README에 명시했다.
4. [x] 홈, 탐색, 커뮤니티의 활동 하트 버튼은 URL 이동 없이 활동 팝업을 연다.
5. [x] 서비스 워커에 즉시 활성화를 추가하고, preview에서 현재 `/sw.js`가 네트워크 우선 로직과 `skipWaiting`을 포함함을 확인했다.

## 첫 사용자 로컬 마일스톤 (2026-10-10)

1. [x] My 화면에서 이름·카테고리·품종 기반 펫 등록을 제공한다.
2. [x] 선택한 펫은 Create의 펫 선택지에 즉시 나타난다.
3. [x] Create는 JPEG/PNG/WebP, 5MB 이하, 디코딩 가능한 이미지 파일만 받는다.
4. [x] 사진 Blob은 IndexedDB에 저장하고, 메타데이터와 작성 초안은 localStorage에 저장한다.
5. [x] 로컬 게시물은 Home 피드에 최신순으로 합쳐지고 기존 카테고리 필터를 따른다.
6. [x] My 게시물 그리드와 상세/댓글 팝업에서 로컬 게시물을 열 수 있다.
7. [x] 서버 없는 로컬 게시물은 공개 공유를 제공하지 않고 “이 기기 전용”으로 표시한다.
8. [x] ko/en/ja 문구에 로컬 전용, 사이트 데이터 삭제 시 삭제, 사진 초안 재선택 필요 범위를 명시했다.
9. [-] 로그인, 공개 URL 공유, 다른 기기 동기화는 서버 연동 단계 전까지 범위 밖이다.

## 후속 진행 계획 (2026-10-13)

`e6e287c`에서 시작한 로컬 기능 변경에 대해 P0와 P1을 실행했다. 아래 기능·검증 완료 항목은 2026-10-13 현재 작업본 검사 결과다. 커밋 결과는 Git 이력에서 확인한다.

- [x] 현재 소스·테스트·기존 계획을 비교해 후속 계획을 갱신했다.
- [x] **P0: 로컬 작성·관리 마일스톤 검증 및 확정** — 전체 검사, 정규 브라우저 테스트, 저장 실패/다중 탭, 문서 정합성과 변경 리뷰 완료.
- [x] 펫/게시물 수정·삭제, 좋아요·댓글 저장, Explore 연결, 성장 기록 입력·삭제·달력, 초기화·복구의 브라우저 흐름을 검증했다.
- [x] Vitest worker 제한(`maxWorkers: 2`)에서 전체 테스트가 통과하고 로컬 QA 흐름을 정규 Playwright 테스트에 편입했다.
- [x] **P1: 로컬 데이터 백업·복원** — 사진 포함 JSON 백업, 복원 미리보기, 교체 확인, 취소·실패 시 기존 데이터 보존 구현·검증.
- [x] **P2: 성장 기록 수정·달력 사용성** — 기록 수정/취소, 목록/차트/달력 일치, 오늘 이동과 날짜 경계 검증.
- [x] **P3: 첫 사용 흐름·저장 상태 안내** — 등록부터 첫 게시까지 연결, 로컬/데모 구분, 사진·저장 공간 안내와 사진 스냅샷 조회 개선.
- [-] 로그인·서버·공개 URL·기기 간 동기화는 별도 마일스톤으로 유지한다.

상세 범위와 완료 기준은 후속 계획에 기록한다. 아래 기존 단계와 검증 수치는 이전 진행 기록이며 현재 미커밋 변경의 최신 검증 결과로 해석하지 않는다.

## P2·P3 실행 검증 (2026-10-14)

- [x] TypeScript, 전체 ESLint, 전체 Prettier, production build 통과.
- [x] Vitest 31개 파일 / 173개 테스트, Chromium Playwright 60개 테스트 통과.
- [x] 성장 기록 수정/취소/삭제, ID 보존, 날짜 변경 후 달력·차트·목록 일치, 새로고침 유지와 다른 펫 기록 보존 확인.
- [x] 관찰 기록은 사용자의 로컬 날짜 기준 오늘까지 저장한다. 윤년·월말·연말·미래 날짜 거부와 오늘 이동을 검증했다.
- [x] Create에서 첫 펫 등록 링크 → My 등록 → 첫 게시 안내 → Create 선택까지 브라우저로 재현했다.
- [x] Home/Explore/My/상세에 데모와 로컬 구분을 표시하고, 복원된 게시물은 ID 접두사가 아니라 실제 저장 데이터 소속으로 댓글 저장·상세 표시를 판단한다.
- [x] My에 실제 로컬 데이터 수, IndexedDB 사진 수·용량, 지원 시 캐시 포함 브라우저 저장 공간 추정, 재확인과 백업 우선 오류 대응 안내를 추가했다.
- [x] 사진 로드는 메타데이터 공유 락 안에서 단일 IndexedDB 트랜잭션으로 서로 다른 사진 키를 조회한다. 읽은 Blob 스냅샷으로 URL을 만든다.
- [x] 200개 게시물 / 640×480 사진 1개 재사용 시나리오 측정: 최종 실행 피드 표시 1,912ms, DB 열기 4회, 생성 Blob URL 200개 모두 화면 이동 시 해제. 시간은 로컬 실행의 단일 측정이며 실제 모바일 성능이나 서로 다른 대용량 사진 200개의 보장이 아니다.
- [x] 기능별 커밋: `39a455f` 성장 수정·달력, `42c5a7a` 첫 사용·저장 안내, `dbd0c2a` 사진 스냅샷·URL 검증. 진행 문서는 별도 커밋으로 관리한다.
- [-] 외부 배포는 사용자 선택에 따라 이번 범위에서 제외한다. 서버·로그인·공개 공유·동기화도 별도 마일스톤이다.

증거: `tests/growth-edit.spec.ts`, `tests/local-usage.spec.ts`, `test-results/local-performance.json`, `test-results/local-storage-summary.png` 및 기존 다국어·테마·화면 크기 스크린샷. 테스트 결과 파일은 Git 제외 경로다.

## P0·P1 실행 검증 (2026-10-13)

- [x] TypeScript, 전체 ESLint, 전체 Prettier, production build 통과. 검사는 저장소의 Node CLI로 실행했으며 npm 스크립트와 같은 설정을 사용했다.
- [x] Vitest 28개 파일 / 167개 테스트 통과. 과거 worker 타임아웃은 현재 제한 설정에서 재현되지 않았다.
- [x] Chromium Playwright 전체 57개 테스트 통과. 375/768/1280px × ko/en/ja × light/dark에서 성장 편집과 백업 화면의 가로 넘침·포커스를 확인했다.
- [x] 백업 다운로드 → 새 브라우저 복원 → 사진·댓글·좋아요·성장 기록 → 새로고침 후 유지 확인.
- [x] 손상 파일·지원하지 않는 버전·중복/잘못된 기록·누락 사진·디코딩 실패·용량 제한은 복원 준비 단계에서 거절한다. 저장 실패는 기존 메타데이터·사진을 보존한다.
- [x] 실제 두 탭 동시 펫 등록에서 두 데이터가 모두 유지되는 것을 확인했다. 교체 복원은 Web Locks가 없으면 실행하지 않는다. 일반 쓰기의 미지원 브라우저 폴백은 같은 탭 내 직렬화까지만 보장한다.
- [x] 사진 삭제/복원 정리 실패로 남은 참조 없는 Blob을 다음 로드에서 재정리한다. 메타데이터를 일부 복구해 읽은 경우 사진을 자동 정리하지 않는다.
- [x] 5174 서버 중단을 확인하고 preview를 재실행했다. 현재 홈 정상 표시와 앱 시작 오류 없음 확인.
- [x] 앱 번들과 독립적으로 워커를 갱신하고 시작 실패 시 안내/재시도를 제공한다. 선택적 외부 폰트 실패는 부팅을 막지 않으며, 오프라인 탐색은 캐시를 사용하고 누락 JS에는 HTML을 반환하지 않는다.
- [x] README의 Community 내비게이션, 원본 기획서의 기존 구현 상태와 백업 제한을 현재 동작에 맞췄다.
- [-] 현재 실측은 Chromium 범위다. 기존 큰 단일 번들 빌드 경고는 기능 실패가 아니며 성능 측정 후 P3에서 다룬다.

브라우저 증거: `test-results/home-recovered.png`, `test-results/local-backup-panel.png`, `test-results/local-growth-calendar.png`, `test-results/local-editor-{language}-{width}-{theme}.png`, `test-results/backup-{language}-{width}-{theme}.png`. 테스트 산출물은 Git 제외 경로다.

## 기존 액션 큐 기록

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

- [-] Supabase 또는 실제 백엔드
- [-] 원격 Database
- [-] Authentication Backend
- [-] 실제 API와 공개 공유 URL
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
- [x] Stage 6 React Doctor 100점을 확인했다.
- [x] 댓글/공유/설정 시트가 백드포스=뷰포트, 중앙 정렬 조건을 Playwright 실측으로 통과했다.
- [x] 테마/언어 리스트박스에서 선택 즉시 적용, 시트 닫힘, 행 값 갱신을 Playwright로 확인했다.
- [x] 팝업 UX 개선 후 Vitest 102개, TypeScript, production build가 통과했다.
- [x] 2026-10-06 `npm run typecheck`, 변경 파일 대상 ESLint/Prettier, `npm run test:run` 121개, `npm run smoke:preview` 31개가 통과했다.
- [x] 2026-10-06 preview `http://127.0.0.1:5174/community`에서 병원 지도 초기 18곳, 강남구 3곳, 강남구+야간 2곳, 지도 팝업·목록 `tel:` 링크를 Playwright로 확인했다.
- [x] 2026-10-06 preview에서 명시적 dark와 system-dark가 중립 회색 토큰(`#141414`, `#1d1d1d`, `#d6d6d6`)으로 적용됨을 Playwright로 확인했다.

## 업데이트 규칙

- 의미 있는 작업 단위가 끝날 때마다 이 보드를 갱신한다.
- 완료된 항목만 `[x]`로 바꾼다.
- 진행 중인 항목은 하나의 주 작업만 `[>]`로 표시한다.
- 결정이 필요한 항목은 `[?]`, 작업을 막는 항목은 `[!]`로 분리한다.
- 자세한 기능 요구사항은 이 문서에 복사하지 말고 출처 계획 문서를 참조한다.
