현재 폴더를 루트로 사용하여 새로운 모바일 웹 프로젝트를 초기 구성해줘.

## 프로젝트 개요

프로젝트는 반려동물 사진 중심의 SNS 커뮤니티 서비스다.

사용자가 자신의 반려견, 반려묘, 파충류, 조류, 소동물 등의 프로필을 등록하고 사진 게시물을 올릴 수 있으며, 다른 사용자가 게시물을 보고 좋아요, 댓글, 공유 등을 할 수 있는 구조다.

Instagram과 유사한 사진 중심 SNS UX를 참고하되, 핵심 Entity는 사람뿐 아니라 `Pet` 자체도 포함한다.

현재 단계에서는 **모바일 웹 환경만 개발한다.**

PC 브라우저에서 접속하더라도 PC 전용 UI를 만들지 말고, 모바일 화면 너비로 중앙 정렬하여 표시한다.

향후 별도의 PC responsive mode를 추가할 예정이므로 확장 가능한 구조로 작성한다.

---

## 기술 스택

다음 기술을 사용한다.

* React
* TypeScript
* Vite
* React Router
* i18n
* CSS 기반 Theme System
* ESLint
* Prettier

현재 단계에서는 다음은 연결하지 않는다.

* Supabase
* Database
* Authentication Backend
* 실제 API
* Docker

백엔드 기능이 필요한 부분은 mock data 또는 interface 수준으로 구성한다.

---

## 프로젝트 구조

유지보수와 확장을 고려하여 역할별로 디렉터리를 분리한다.

예시:

```text
src/
├── components/
├── pages/
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

필요하다면 더 좋은 구조로 조정해도 되지만 과도한 추상화는 하지 않는다.

명명 규칙:

* React Component: PascalCase
* Page Component: PascalCase + Page
* Type / Interface: PascalCase
* 함수 / 변수: camelCase
* Hook: useXxx
* 일반 폴더: lowercase 또는 kebab-case
* 상수: UPPER_SNAKE_CASE

---

# 모바일 레이아웃

Mobile First로 구현한다.

기준 콘텐츠 최대 너비는 약 430px로 한다.

모바일에서는 화면 전체를 사용하고, PC 브라우저에서는 모바일 컨테이너를 화면 중앙에 표시한다.

예:

```text
Desktop Browser

┌─────────────────────────────────────┐
│                                     │
│         ┌─────────────────┐         │
│         │                 │         │
│         │   Mobile App    │         │
│         │                 │         │
│         │    max 430px    │         │
│         │                 │         │
│         └─────────────────┘         │
│                                     │
└─────────────────────────────────────┘
```

현재 PC 전용 레이아웃은 구현하지 않는다.

---

# Navigation

하단에 고정 Bottom Navigation을 만든다.

메뉴는 다음 5개다.

1. Home
2. Explore
3. Create Post
4. Activity
5. My

아이콘 + 텍스트 또는 모바일 UX에 적절한 형태로 구성한다.

라우팅도 각각 분리한다.

예:

```text
/
 /explore
 /create
 /activity
 /my
```

Bottom Navigation 때문에 콘텐츠가 가려지지 않도록 safe area와 padding을 고려한다.

iPhone Safari의 `safe-area-inset-bottom`도 고려한다.

---

# Home

Home은 게시물 Feed 중심이다.

상단에는 서비스 Header를 둔다.

그 아래 반려동물 카테고리를 가로 스크롤 방식으로 제공한다.

카테고리 예:

* 전체
* 강아지
* 고양이
* 파충류
* 조류
* 소동물
* 기타

화면 너비보다 카테고리가 많으면 줄바꿈하지 않는다.

Horizontal Scroll / Swipe 방식으로 구현한다.

선택된 카테고리는 Primary Color와 underline 등을 이용해 명확하게 표시한다.

카테고리 데이터는 코드에 반복 작성하지 말고 별도의 constants 또는 type 기반으로 관리한다.

---

# Feed

Home에 mock 게시물을 몇 개 만들어 실제 SNS처럼 확인할 수 있게 한다.

게시물 카드에는 최소 다음 정보가 존재한다.

* Pet 프로필 이미지
* Pet 이름
* 사용자 이름
* 작성 시간
* 게시물 이미지
* 좋아요 버튼
* 댓글 버튼
* 공유 버튼
* 좋아요 수
* 게시글 내용
* 태그

컴포넌트는 재사용 가능하도록 분리한다.

예:

```text
PostCard
PetAvatar
PostActions
CategoryTabs
BottomNavigation
```

단, 필요 이상으로 작은 컴포넌트까지 분리하지 않는다.

---

# Pet 구조

한 명의 User가 여러 Pet을 가질 수 있다는 전제로 Type을 설계한다.

예:

```text
User
 ├── Pet
 ├── Pet
 └── Pet
```

Pet은 최소 다음 개념을 가진다.

* id
* ownerId
* name
* category
* breed
* profileImage
* bio

카테고리는 문자열을 여기저기 직접 사용하는 방식이 아니라 enum 또는 union type 등의 방식으로 관리한다.

예:

```text
DOG
CAT
REPTILE
BIRD
SMALL_ANIMAL
ETC
```

---

# Explore

초기 Explore 화면 골격을 만든다.

다음 영역이 향후 들어갈 수 있도록 구성한다.

* 검색
* 동물 카테고리
* 인기 게시물
* 인기 Pet

현재 실제 검색 로직은 구현하지 않아도 된다.

Mock UI로 구성한다.

---

# Create Post

게시물 작성 화면의 UI 골격을 만든다.

다음 요소를 포함한다.

* 이미지 선택 영역
* Pet 선택
* 내용 입력
* 태그 입력
* 게시 버튼

실제 서버 업로드는 아직 구현하지 않는다.

---

# Activity

활동 화면을 만든다.

Mock Data를 이용해서 다음 알림을 표시한다.

* 좋아요
* 댓글
* 팔로우

---

# My

사용자 프로필 화면을 만든다.

다음 내용을 표시할 수 있는 구조로 만든다.

* 사용자 프로필
* 게시물 수
* 팔로워
* 팔로잉
* 등록된 Pet
* 게시물 Grid

우측 상단에 Settings 진입 버튼을 둔다.

---

# Settings

Settings Page를 별도로 만든다.

설정 구조는 다음과 같다.

```text
Settings

Account
 ├─ Profile
 ├─ Pets
 └─ Account Management

Appearance & Language
 ├─ Theme
 │   ├─ System
 │   ├─ Light
 │   └─ Dark
 │
 └─ Language
     ├─ 한국어
     ├─ 日本語
     └─ English

Notifications
 ├─ Likes
 ├─ Comments
 └─ Follow

Privacy & Security

Service
 ├─ Terms
 ├─ Privacy Policy
 └─ About

Logout
Delete Account
```

현재 Logout/Delete Account는 UI만 구현한다.

---

# Theme

처음부터 Light / Dark / System Theme를 지원할 수 있는 구조로 만든다.

색상을 컴포넌트에 직접 하드코딩하지 않는다.

Semantic Design Token을 사용한다.

예:

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

Light Theme 기본 방향은 다음과 같다.

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

전체적인 디자인 방향은:

* Warm Neutral
* Off-white
* Muted Sage
* Soft Terracotta

이다.

반려동물 사진 자체가 가장 눈에 띄어야 하므로 UI에 지나치게 많은 색을 사용하지 않는다.

전체적으로 깔끔한 현대 모바일 SNS 느낌을 유지한다.

---

# Dark Theme

Dark Theme도 동일한 Semantic Token 구조를 사용한다.

단순히 Light 색상을 반전하지 말고 읽기 편한 Dark Surface 계층을 구성한다.

Dark Theme의 구체적인 색상은 Light Theme와 자연스럽게 연결되도록 적절히 결정한다.

---

# 다국어

처음부터 i18n 구조를 적용한다.

지원 언어:

* 한국어
* 日本語
* English

구조 예:

```text
locales/
├── ko.json
├── ja.json
└── en.json
```

UI 문자열을 JSX에 직접 하드코딩하지 않는다.

다음과 같은 방식으로 접근할 수 있도록 한다.

```tsx
t("navigation.home")
t("navigation.explore")
t("settings.title")
```

최초 실행 시 브라우저 언어를 확인한다.

* ko → 한국어
* ja → 日本語
* 그 외 → English

사용자가 Settings에서 언어를 변경하면 해당 설정을 우선한다.

현재는 localStorage를 사용해서 설정값을 유지해도 된다.

---

# UX

모바일 터치 환경을 우선한다.

특히 다음을 고려한다.

* 충분한 터치 영역
* 자연스러운 스크롤
* Horizontal Category Swipe
* Bottom Navigation
* 모바일 Safe Area
* 이미지 비율
* 긴 일본어/영어 문자열
* 지나치게 작은 글씨 사용 금지

Hover에 의존하는 UX는 만들지 않는다.

---

# 코드 품질

다음을 지켜라.

* TypeScript strict 기준
* `any` 사용 최소화
* 중복 코드 최소화
* UI 문자열 하드코딩 금지
* 색상 하드코딩 최소화
* 재사용 가능한 Type 정의
* 컴포넌트 책임 분리
* 불필요한 상태관리 라이브러리 사용 금지
* 불필요한 dependency 추가 금지
* 과도한 architecture/abstraction 금지

현재 규모에서는 React 기본 state/context로 충분하면 별도 상태관리 라이브러리를 추가하지 않는다.

---

# 중요

현재 폴더가 프로젝트 Root다.

새로운 상위 프로젝트 폴더를 생성하지 말고 **현재 폴더 내부에 직접 프로젝트를 구성한다.**

Git repository를 새로 생성하거나 `.git`을 임의로 변경하지 않는다.

기존 파일이 있다면 먼저 확인하고 필요한 파일만 생성/수정한다.

파일을 무작정 삭제하지 않는다.

---

# 작업 순서

1. 현재 디렉터리 상태 확인
2. 필요한 dependency와 프로젝트 구성 결정
3. React + TypeScript + Vite 환경 구성
4. 기본 디렉터리 구성
5. Theme System 구성
6. i18n 구성
7. Router 구성
8. Mobile Layout 구성
9. Bottom Navigation 구현
10. Home + Category Swipe 구현
11. Mock Feed 구현
12. Explore 구현
13. Create Post 구현
14. Activity 구현
15. My 구현
16. Settings 구현
17. Light/Dark/System 전환 확인
18. 한국어/일본어/영어 전환 확인
19. TypeScript / ESLint 오류 확인
20. production build 확인

완료 후 실제로 프로젝트를 실행 및 build하여 오류가 없는지 확인해라.

마지막에는 다음만 간단히 보고해라.

* 생성/변경한 주요 구조
* 설치한 주요 dependency
* 실행 명령어
* build 결과
* 아직 mock으로 남아 있는 기능
* 다음 단계에서 Supabase를 연결할 때 변경해야 할 주요 부분
