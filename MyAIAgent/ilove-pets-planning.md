# iLove Pets 프로젝트 기획서

이 문서는 iLove Pets 웹 서비스의 초기 기획과, 이후 트렌드를 반영한 추가 기획을 함께 담는 원본 기획 문서다.
진행 상황은 [ilove-pets-progress-board.md](./ilove-pets-progress-board.md)에서 별도로 관리한다.

---

# 1. 프로젝트 개요

iLove Pets은 반려동물을 중심으로 한 SNS 커뮤니티 서비스다.

사용자는 자신의 반려동물(강아지, 고양이, 파충류, 조류, 소동물 등)의 일상을 게시물로 올릴 수 있고,
다른 사용자의 게시물에 좋아요·댓글·공유 등으로 반응할 수 있다.

Instagram과 유사한 사진 중심 SNS UX를 차용하되, 핵심 Entity는 사람(User)이 아니라 **Pet 객체**를 다룬다는 점이 차별점이다.

초기 단계에서는 **프론트엔드와 환경을 우선한다.**

- PC 대응 여부: 데스크톱에서도 모바일 UI가 무너지지 않도록, PC에서는 화면 전체 대신 앱 컨테이너를 화면 중앙에 배치해 표시한다.
- PC responsive mode는 범위 밖(보류)이므로 확장 가능성만 염두에 두고 작성한다.

---

# 2. 사용 기술

다음 기술을 사용한다.

* React
* TypeScript
* Vite
* React Router
* i18n (react-i18next)
* CSS 변수 Theme System
* ESLint
* Prettier

초기 단계에서는 아래를 도입하지 않는다.

* Supabase
* Database
* Authentication Backend
* 외부 API
* Docker

이들 영역이 필요한 부분은 mock data 또는 interface 선언으로만 대체한다.

---

# 3. 프로젝트 구조

기능 단위 확장을 용이하게 하기 위해 성격별로 디렉터리를 분리한다.

```text
src/
├── components/
├── features/        # 화면(도메인)별 폴더 — 실제 구현에서 pages/ 를 대체
├── layouts/
├── hooks/
├── services/
├── types/
├── constants/
├── utils/
├── locales/
├── styles/
├── mocks/
└── assets/
```

필요하면 하위 폴더를 추가해도 무방하지만 과잉 추상화는 금지한다.

네이밍 규칙:

| 대상 | 규칙 |
| --- | --- |
| React Component | PascalCase |
| Page Component | PascalCase + Page |
| Type / Interface | PascalCase |
| 함수 / 변수 | camelCase |
| Hook | useXxx |
| 일반 파일 | lowercase 또는 kebab-case |
| 상수 | UPPER_SNAKE_CASE |

---

# 4. 모바일 레이아웃

Mobile First를 원칙으로 한다.

앱 화면 최대 너비는 430px로 한다.

데스크톱에서는 화면 전체를 채우지 않고, PC 브라우저에서도 앱 컨테이너를 화면 중앙에 표시한다.

예:

```text
Desktop Browser

──────────────────────────────────────────────────────────────
│                                                            │
│         ┌─────────────────────────────┐                    │
│         │                             │                    │
│         │        Mobile App           │                    │
│         │                             │                    │
│         │         max 430px           │                    │
│         │                             │                    │
│         └─────────────────────────────┘                    │
│                                                            │
──────────────────────────────────────────────────────────────
```

PC 전용 레이아웃은 고려하지 않는다.

---

# 5. Navigation

하단에 고정 Bottom Navigation을 둔다.

메뉴는 5개다.

1. Home (홈)
2. Explore (탐색)
3. Create Post (작성)
4. Activity (활동)
5. My (내 계정)

아이콘 + 텍스트 UX를 기본 형태로 한다.

라우트는 메뉴 단위로 분리한다.

```text
/
/explore
/create
/activity
/myaccount
```

Bottom Navigation 최하단 콘텐츠가 가려지지 않게 safe area padding을 적용한다.
(iPhone Safari `safe-area-inset-bottom` 활용)

---

# 6. Home

Home은 게시물 Feed가 중심이다.

상단에는 간단한 헤더를 둔다.

그 아래 반려동물 카테고리 필터 스트립을 배치한다.

카테고리: 전체 / 강아지 / 고양이 / 파충류 / 조류 / 소동물 / 기타

화면 너비보다 칩이 길면 줄바꿈하지 않고 Horizontal Scroll(Swipe) 스크롤을 사용한다.
선택 카테고리는 Primary Color로 명확하게 표시하고, 스트립은 스크롤 시 상단에 고정(sticky)되며
글래스 블러 효과로 뒤 콘텐츠와 시각적으로 분리한다.

카테고리 데이터는 코드에 반복 작성하지 않고 constants/type 파일에서 관리한다.

---

# 7. Feed

Home에서 mock 게시물 목록을 볼 수 있게 해 SNS처럼 확장되어 보이게 한다.

게시물 카드(PostCard)의 최소 구성 요소:

* Pet 프로필 이미지
* Pet 이름
* 보호자 이름
* 작성 시간
* 게시물 이미지
* 좋아요 버튼
* 댓글 버튼
* 공유 버튼
* 좋아요 수
* 댓글 수
* 태그

컴포넌트는 성격에 맞게 분리한다: PostCard, PetAvatar, PostActions, CategoryTabs, BottomNavigation.
단, 필요 이상으로 잘게 분리하지 않는다.

---

# 8. Pet 정보

각 User는 여러 Pet을 가질 수 있다는 전제로 Type을 설계한다.

Pet의 최소 데이터:

* id
* ownerId
* name
* category
* breed
* profileImage
* bio

카테고리는 문자열 자유 입력이 아니라 union type으로 제한한다:
DOG / CAT / REPTILE / BIRD / SMALL_ANIMAL / ETC

ID 같은 식별자는 템플릿 리터럴 타입(`post_${string}`)으로 정의해 컴파일 타임에 혼용을 차단한다.

---

# 9. Explore

인스타그램 탐색처럼 **3열 이미지 그리드 + 무한 스크롤**로 구현한다.

들어갈 요소:

* 검색
* 인기 카테고리
* 인기 게시물(이미지 그리드)
* 인기 Pet

검색은 실제 검색 로직 없이 Mock UI로 대체한다.
타일 클릭 시 홈의 댓글 팝업(게시물 상세)을 재사용해 연결한다.

---

# 10. Create Post

게시물 작성 화면은 UI 구현이 우선이다.

포함 요소:

* 이미지 선택 영역
* Pet 선택
* 본문 입력
* 태그 입력
* 게시 버튼

실제 이미지 업로드는 포함하지 않는다.

---

# 11. Activity

활동 화면을 만든다. Mock Data로 활동 알림을 표시한다.

* 좋아요
* 댓글
* 팔로우

---

# 12. My

사용자 정보 화면을 만든다.

표현 가능한 정보:

* 프로필 사진/이름/소개
* 게시물 수
* 팔로워 · 팔로잉 (누르면 유저 목록 팝업)
* 등록 Pet (접었다 펼치기)
* 내 게시물 Grid (접었다 펼치기)

헤더 상단에 Settings 진입 버튼(원형 아이콘)을 둔다.

---

# 13. Settings

Settings Page는 리스트 중심으로 만든다.

```text
Settings

Account
 ├ Profile
 ├ Pets
 └ Account Management

Appearance & Language
 ├ Theme      → System / Light / Dark   (리스트박스 팝업)
 └ Language   → 한국어 / 日本語 / English (리스트박스 팝업)

Notifications
 ├ Likes
 ├ Comments
 └ Follow

Privacy & Security
 └ Privacy Policy

Service
 ├ Terms
 ├ Privacy Policy
 └ About

Logout
Delete Account
```

현재 Logout/Delete Account는 UI만 제공한다.

---

# 14. Theme

처음부터 Light / Dark / System Theme을 지원하는 구조로 만든다.

테마별 색상을 컴포넌트에 하드코딩하지 않고 Semantic Design Token을 사용한다.

```css
--color-background
--color-surface
--color-surface-subtle
--color-primary
--color-primary-soft
--color-accent
--color-text-primary
--color-text-secondary
--color-border
--color-like
```

Light Theme 기본 색상:

```text
Background      #FAF9F6
Surface         #FFFFFF
Surface Subtle  #F4F2ED

Primary         #5F7561
Primary Soft    #E5ECE3

Accent          #D98C68

Text Primary    #242522
Text Secondary  #74766F

Border          #E8E5DF

Like            #E05D62
```

전체적인 느낌: Warm Neutral / Off-white / Muted Sage / Soft Terracotta.
반려동물 사진이 많으므로 UI는 절제된 톤으로 사진을 방해하지 않는다.

---

# 15. Dark Theme

Dark Theme 역시 Semantic Token 교체 방식으로 구현한다.
단순히 Light 색상을 반전시키지 않고 가독성 좋은 Dark Surface 팔레트를 따로 설계한다.
반려동물 사진은 어떤 테마에서도 자연스럽게 보이도록 한다.

---

# 16. 다국어 (i18n)

처음부터 i18n 구조를 적용한다.

지원 언어: 한국어(ko) / 일본어(ja) / English(en)

UI 문자열은 JSX에 하드코딩하지 않고 `t()` 함수로 참조한다.
브라우저 언어를 감지해 기본 언어를 정하고, 설정 화면에서 변경 시 localStorage에 저장해 유지한다.

---

# 17. UX

모바일 터치 환경을 우선한다.

특히 신경 쓸 것:

* 손가락 터치 영역
* 자연스러운 스크롤
* Horizontal Category Swipe
* Bottom Navigation
* iPhone Safe Area
* 이미지 로딩(lazy)
* 날짜 표기/숫자 단위 현지화
* 터치 시 살짝 눌리는 인터랙션

Hover에 의존하는 UX는 피한다.
팝업은 body 포털 + 뷰포트 중앙으로 통일하고 Esc/배경 클릭으로 닫힌다.

---

# 18. 코드 품질

원칙은 간단하다.

* TypeScript strict 모드
* `any` 사용 최소화
* 중복 코드 최소화
* UI 문자열 하드코딩 금지
* 매직 넘버 하드코딩 최소화
* 도메인 데이터는 Type 정의
* 관심사 분리(화면 / 데이터 함수 / 테스트)
* 불필요한 상태관리 라이브러리 추가 금지 (React state/context로 충분)
* 불필요한 dependency 추가 금지
* 불필요한 architecture/abstraction 금지

검증: Vitest 단위 테스트, TypeScript strict, ESLint/Prettier, production build, Playwright 스모크.

---

# 19. 주의

새 프로젝트는 워크스페이스 Root에서 진행한다.
Git repository를 새로 생성하거나 `.git`을 임의로 제거하지 않는다.
기존 계획이 있다면 먼저 확인하고 불필요한 부분은 수정/삭제한다.
계획 문서는 항상 유지보수한다.

---

# 20. 작업 순서 (1차 MVP — 완료)

1~20단계(환경 구성 → 각 화면 → 테마/언어 검증 → build 확인)는 완료했다.
완료 기록은 [ilove-pets-progress-board.md](./ilove-pets-progress-board.md) 참고.

---
---

# 21. 추가 기획 — 트렌드 반영 2차 로드맵 🆕

1차 MVP가 완료됨에 따라, 2025~2026 반려동물 앱/SNS 시장 트렌드를 반영한 추가 기획을 정의한다.
방향성은 세 가지다.

> **① 콘텐츠는 짧고 몰입감 있게 (숏폼)** · **② AI가 돕는 반려 생활** · **③ 오프라인 연결(산책·커뮤니티)**

## 21-1. 숏폼 비디오 피드 (Reels/Shorts 스타일)

현재 가장 강력한 SNS 트렌드는 세로형 숏폼이다.

* 탐색 화면에 **"릴스" 탭** 추가: 스와이프/스크롤로 세로 영상이 끊김 없이 넘어가는 전면 피드
* 반려동물 영상은 체류 시간·공유율이 사진 대비 월등히 높은 콘텐츠
* 프론트엔드 우선 구현: `<video>` 기반 스와이프 스냅(snap scroll) + 재생/음소거 토글, 더블탭 좋아요 하트 파티클
* 백엔드 연동 시: 짧은 클립 업로드(15~60초), 자동 반복 재생, 저화질 선로딩

**우선순위: 상** (프론트엔드 데모만으로도 트렌드 어필 효과가 큼)

## 21-2. AI 기능 — "AI 돌봄 비서"

2025~2026년 소비자 앱의 핵심 트렌드는 "앱 안에 상주하는 AI 어시스턴트"다.

| 기능 | 설명 | 구현 난이도 |
| --- | --- | --- |
| AI 펫 프로필 생성 | 사진 업로드 → 품종/털색 자동 인식, 소개글 자동 작성 초안 | 중 (LLM API 연동) |
| 증상 체크 봇 | "기침을 해요" 입력 → 응급도 가이드 + 동물병원 찾기 안내 | 중 |
| 맞춤 피드 추천 | 조회·좋아요 행동 기반으로 관심 카테고리 가중치 조절 | 하 (프론트 단 실험 가능) |
| 캡션·해시태그 자동 완성 | 작성 화면에서 사진 기반 문구 추천 | 하 |

프론트엔드 데모 단계에서는 **작성 화면의 "AI 캡션 추천" 버튼(UI)** 과
설정의 "AI 기능 on/off" 토글로 트렌드를 먼저 반영하고, 실제 API는 백엔드 단계에서 붙인다.

**우선순위: 중상** (UI 선행 구현 가능)

## 21-3. 산책 · 위치 기반 (오프라인 연결)

반려인 앱의 강한 니즈는 "우리 동네 반려인과의 연결"이다.

* **산책 기록**: GPS 경로 기록 → 거리/시간 저장, 반려동물별 산책 히스토리
* **산책 코스 공유**: 자주 다니는 코스를 게시물로 공유 (지도 썸네일)
* **근처 반려인**: 같은 카테고리/지역의 반려인·모임 추천 (위치 권한 기반)
* 프론트엔드 데모: 지도 라이브러리(Leaflet/Kakao Map) mock 코스 표시

**우선순위: 중** (백엔드 의존도가 높아 Phase 3 배치)

## 21-4. 반려동물 성장 기록 & 데이터 시각화

단순 SNS를 넘어 "반려동물 생활 기록 앱" 요소를 결합하면 이탈률이 낮아진다.

* 체중/식사/간식/예방접종/미용 기록 캘린더
* 성장 그래프(월령별 평균 비교)
* 접종 D-day 알림
* 마이페이지 펫 카드를 누르면 **펫 상세 타임라인**으로 진입

프론트엔드 데모: mock 데이터 기반 캘린더 UI + SVG 라인 차트.

**우선순위: 중**

## 21-5. 펫 커머스 연동 (수익화 후보)

* 게시물 해시태그(#사료, #장난감) ↔ 제휴 상품 링크 카드
* "이 게시물의 제품" 섹션 → 외부 쇼핑몰 딥링크
* 커뮤니티 신뢰 기반이므로 광고 강노출은 지양, 큐레이션형 추천만

**우선순위: 하 (Phase 3 이후 검토)**

## 21-6. 커뮤니티 게시판

사진 중심 피드와 별개로 **글 중심 커뮤니티**(자유/정보 공유/임보·입양/질문)를 둔다.

* 입양·임보 게시판은 반려동물 SNS에서 참여율·호감도가 가장 높은 영역
* 카테고리 필터와 동일한 칩 UX 재사용 가능
* 프론트엔드 데모: 게시판 리스트 + 상세 뷰 (mock)

**우선순위: 중상**

## 21-7. 온보딩 & 리텐션

* 첫 실행 3페이지 온보딩(서비스 소개 → 관심 카테고리 선택 → 대표 펫 등록)
* 데일리 미션("오늘 산책 인증하기") + 배지 시스템
* PWA 설치 유도(홈 화면 추가 배너)

**우선순위: 중**

## 21-8. 기술 트렌드 반영 (엔지니어링)

| 항목 | 내용 |
| --- | --- |
| PWA | manifest + service worker로 오프라인 열람/홈 화면 추가 지원 |
| 성능 | AVIF/WebP 이미지, 반응형 srcset, 피드 가상화(virtualized list)로 긴 피드 렌더링 최적화 |
| Core Web Vitals | LCP/CLS/INP 예산 설정 및 Playwright 성능 측정 추가 |
| 접근성 심화 | 키보드 포커스 링 전체 점검, 색상 대비 4.5:1 상시 검증, 스크린리더 시나리오 테스트 |
| 디자인 시스템 문서화 | 토큰·컴포넌트 카탈로그 정리 (Storybook 도입 검토) |
| 국제화 확장 | en/ja 외 추가 후보: zh-TW (반려문화 성장 시장) |

---

# 22. 우선순위 매트릭스

| 기능 | 임팩트 | 공수 | 시기 | 비고 |
| --- | --- | --- | --- | --- |
| 숏폼 릴스 피드 | ★★★ | ★★ | Phase 2-1 | 트렌드 어필 최강 |
| AI 캡션 추천 (UI) | ★★ | ★ | Phase 2-1 | 데모로 즉시 가능 |
| 성장 기록 캘린더 | ★★★ | ★★ | Phase 2-2 | 리텐션 핵심 |
| 커뮤니티 게시판 | ★★★ | ★★ | Phase 2-2 | 입양·임보 콘텐츠 |
| 산책 기록/지도 | ★★★ | ★★★ | Phase 3 | 백엔드 필요 |
| AI 건강 봇 | ★★ | ★★★ | Phase 3 | LLM API 연동 |
| 펫 커머스 링크 | ★★ | ★ | Phase 3+ | 수익화 검토 |
| PWA | ★★ | ★ | Phase 2-3 | 설치형 경험 |

---

# 23. 차기 스프린트 제안 (프론트엔드 데모 범위)

백엔드 없이 바로 진행 가능한 순서:

1. **숏폼 릴스 피드** — 탐색에 릴스 탭, 스냅 스크롤 영상 플레이어(mock 영상 소스)
2. **AI 캡션 추천 버튼** — 작성 화면에 추천 문구 UI (더미 응답)
3. **성장 기록 캘린더** — 마이페이지 펫 상세에 mock 캘린더 + 차트
4. **커뮤니티 게시판** — 별도 라우트(`/community`) 리스트 + 상세 (mock)
5. **PWA 기본 세팅** — manifest + 아이콘

각 스프린트 종료 시 progress-board를 갱신하고 production build를 검증한다.
