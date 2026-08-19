# iLove Pets Design Contract

## 0. Research Log

- Embedded shortlist: Airbnb, Notion, Pinterest. Notion offers calm documentation clarity, Pinterest offers photography-first discovery patterns, and Airbnb offers warm trust, approachable cards, and mobile navigation density. Pick: `taste-skill` + Airbnb-inspired direction because iLove Pets is warm, approachable, photography-first, and mobile navigation-heavy. Airbnb is inspiration only. Do not copy Airbnb colors, logo, text, layout signatures, or proprietary assets.
- Lazyweb log: queries run were `pet social mobile feed` and `pet profile social community mobile`. Returned result descriptions mentioned Camlist, Bluesky, Truth Social, and similar social/community apps. Signed screenshot retrieval was interrupted, so 0 screenshots were viewed. Use only high-level future anatomy from this lane: single-column feed, category filters, and bottom navigation. Do not extract visual tokens from Lazyweb.
- Imagen log: skipped because no image-generation tool is available in this environment.
- Source-plan lock: Warm Neutral, Off-white, Muted Sage, Soft Terracotta. Later product screens make pet photos the highest-salience content. Signature for Stage 1: a calm 430px mobile canvas with sage navigation state and terracotta social feedback.

## 1. Atmosphere & Identity

iLove Pets는 반려동물 사진을 중심에 두는 따뜻한 모바일 커뮤니티다. UI는 사진보다 앞서지 않고, 사용자가 안심하고 둘러볼 수 있는 조용한 배경과 명확한 상태 표현을 제공한다.

- Personality: warm, calm, friendly, trustworthy, lightly social.
- Visual density: mobile-first and breathable. Stage 1 must feel like a ready app shell, not a dashboard or generic SaaS card stack.
- Signature contrast: muted sage for app readiness and navigation state, soft terracotta for social feedback and warm emphasis.
- Photo priority: future images receive the strongest salience. Chrome, borders, shadows, and accents stay restrained so photos can dominate later.
- Stage 1 scope: only a semantic scaffold-ready status screen. No feed design, route design, mock posts, bottom-nav primitive, profile primitive, or category UI is defined yet.

## 2. Color

All CSS color values must come from these variables. Components may use semantic aliases only, never direct hex values.

### Light Theme

```css
:root {
  --color-background: #faf9f6;
  --color-surface: #ffffff;
  --color-surface-subtle: #f4f2ed;
  --color-surface-elevated: #ffffff;
  --color-primary: #5f7561;
  --color-primary-soft: #e5ece3;
  --color-accent: #d98c68;
  --color-accent-soft: #f6e2d7;
  --color-text-primary: #242522;
  --color-text-secondary: #6c6e68;
  --color-text-inverse: #faf9f6;
  --color-border: #e8e5df;
  --color-border-strong: #d7d2c8;
  --color-like: #e05d62;
  --color-focus: #7a5a38;
  --color-success: #4f7256;
  --color-success-soft: #e5ece3;
  --color-warning: #a66a2d;
  --color-warning-soft: #f7e9d8;
  --color-error: #b9474d;
  --color-error-soft: #f9dedf;
  --color-info: #596f7c;
  --color-info-soft: #e4eaed;
}
```

### Dark Theme

```css
:root[data-theme="dark"] {
  --color-background: #171814;
  --color-surface: #20211d;
  --color-surface-subtle: #2a2b26;
  --color-surface-elevated: #272923;
  --color-primary: #a7bea7;
  --color-primary-soft: #2f3a30;
  --color-accent: #e4a07e;
  --color-accent-soft: #493025;
  --color-text-primary: #f4f2ed;
  --color-text-secondary: #bdb8ad;
  --color-text-inverse: #171814;
  --color-border: #3a3b34;
  --color-border-strong: #555649;
  --color-like: #f0787d;
  --color-focus: #f0b98e;
  --color-success: #a7bea7;
  --color-success-soft: #2f3a30;
  --color-warning: #e2b26f;
  --color-warning-soft: #463621;
  --color-error: #f08a8e;
  --color-error-soft: #4a2729;
  --color-info: #a8bac4;
  --color-info-soft: #29363d;
}
```

Usage rules:

- `--color-background`: app viewport outside and behind the mobile canvas.
- `--color-surface`: main Stage 1 canvas.
- `--color-surface-subtle`: quiet section bands and status details.
- `--color-surface-elevated`: the single elevated `SetupStatus` surface.
- `--color-primary`: ready/active app state, future selected navigation.
- `--color-accent`: warm emphasis, future social feedback accent.
- `--color-like`: future like state only. Stage 1 may document it but should not use it unless referencing future social feedback.
- `--color-focus`: visible keyboard focus ring.
- Status tokens map to success, warning, error, and info messages only.

## 3. Typography

Typography must read well in Korean, Japanese, and English. Body text cannot be smaller than 14px.

Future self-hosted stack:

```css
--font-sans: "Pretendard Variable", "Noto Sans KR", "Noto Sans JP", system-ui, sans-serif;
--font-display: "Pretendard Variable", "Noto Sans KR", "Noto Sans JP", system-ui, sans-serif;
```

Stage 1 accepted fallback:

```css
--font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-display: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Type scale:

```css
--font-size-caption: 0.75rem; /* 12px, metadata only */
--font-size-small: 0.875rem; /* 14px */
--font-size-body: 1rem; /* 16px */
--font-size-title: 1.25rem; /* 20px */
--font-size-heading: 1.5rem; /* 24px */
--line-height-tight: 1.2;
--line-height-normal: 1.55;
--line-height-loose: 1.7;
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 650;
--font-weight-bold: 750;
```

Roles:

- App title: `--font-size-heading`, `--line-height-tight`, `--font-weight-bold`.
- Section title: `--font-size-title`, `--line-height-tight`, `--font-weight-semibold`.
- Body: `--font-size-body`, `--line-height-normal`, `--font-weight-regular`.
- Status label: `--font-size-small`, `--line-height-normal`, `--font-weight-semibold`.
- Caption: `--font-size-caption`, `--line-height-normal`, `--font-weight-medium`, never for primary instructions.

## 4. Spacing & Layout

Base spacing is 4px. Every layout value must use this scale or a named layout variable.

```css
--space-0: 0;
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-5: 1.25rem; /* 20px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-10: 2.5rem; /* 40px */
--space-12: 3rem; /* 48px */
--size-app-max: 430px;
--size-touch-min: 44px;
--gutter-mobile: var(--space-4);
--safe-top: env(safe-area-inset-top, 0px);
--safe-right: env(safe-area-inset-right, 0px);
--safe-bottom: env(safe-area-inset-bottom, 0px);
--safe-left: env(safe-area-inset-left, 0px);
```

Layout rules:

- Mobile uses full viewport width with 16px gutters.
- Larger viewports center the app canvas at `--size-app-max`; no desktop-specific UI in Stage 1.
- The app canvas must respect safe areas: top and bottom padding add `--safe-top` and `--safe-bottom` where content could collide with browser chrome.
- Minimum interactive target is `--size-touch-min` in both dimensions.
- Stage 1 status content sits in a single vertical flow: app identity, scaffold state, next-step note. No nested card stacks.
- Future bottom navigation must reserve bottom safe-area space, but its primitive is not defined in this contract.

## 5. Components

Only Stage 1 primitives are defined here. Later agents must not invent feed, navigation, post, profile, category, or route primitives from this document; those require a future design extension.

### AppCanvas

Purpose: centered mobile viewport shell for every screen.

Structure:

- Root landmark: `main` or a single app shell containing `main`.
- Width: `min(100%, var(--size-app-max))`.
- Min height: dynamic viewport height, with safe-area padding.
- Background: `--color-surface` inside, `--color-background` outside.
- Gutters: `--gutter-mobile` plus safe left/right.

States:

- Default: calm off-white app body.
- Dark: preserves the same structure with dark surface hierarchy.
- Loading is not an `AppCanvas` state; child components own loading status.

Accessibility:

- Provides the primary landmark for screen readers.
- Does not trap focus.
- Does not depend on hover.

Motion:

- Initial appearance may use opacity from 0 to 1 and translateY from 4px to 0.
- Disable transform when `prefers-reduced-motion: reduce` is active.

### SetupStatus

Purpose: Stage 1 scaffold-ready status surface that tells developers and testers the app shell, theme contract, and i18n direction are ready for implementation.

Structure:

- Container surface using `--color-surface-elevated`.
- Small status label using `--color-primary` or status semantic token.
- Primary heading using display role.
- Short body copy in Korean-first wording with English/Japanese readiness allowed through i18n later.
- Optional compact checklist of scaffold areas only: theme, i18n, routing, mobile canvas. No mock social data.

States:

- `ready`: primary sage label, success semantic support if needed.
- `pending`: warning semantic label for incomplete scaffold work.
- `error`: error semantic label only for real setup failure.

Accessibility:

- Status text must be real text, not icon-only.
- If status changes after load, expose it through `role="status"` or an aria-live polite region.
- Checklist items must be semantic list items.
- Focusable controls, if added later, must meet 44px target and visible focus.

Motion:

- State changes may fade or shift opacity only.
- No decorative bounce, confetti, shimmer, or looping motion.

Layout:

- Single elevated surface with internal padding `--space-5` or `--space-6`.
- Gap between label, heading, body, and checklist uses `--space-2` to `--space-4`.
- Max text measure stays within the mobile canvas gutters.

## 6. Motion & Interaction

Stage 1 motion intensity is 3/10: calm, short, and purposeful.

```css
--duration-fast: 120ms;
--duration-base: 180ms;
--duration-slow: 260ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-emphasis: cubic-bezier(0.2, 0, 0, 1);
```

Rules:

- Animate only `opacity`, `transform`, and non-layout visual feedback.
- Use motion to clarify entry, status change, press feedback, or focus context.
- Respect `prefers-reduced-motion: reduce` by removing transforms and shortening transitions to near-instant opacity changes.
- Hover cannot be required because the product is mobile-first.
- Press feedback may use a 1px to 2px downward transform or subtle opacity change, but only on interactive controls.
- No decorative motion, parallax, purple/blue gradient animation, or loading shimmer in Stage 1.

## 7. Depth & Surface

Depth is mixed but restrained. Default UI relies on tonal shifts and hairline borders, not heavy cards.

```css
--radius-small: 0.5rem; /* 8px */
--radius-medium: 0.875rem; /* 14px */
--radius-large: 1.25rem; /* 20px */
--radius-pill: 999px;
--border-hairline: 1px;
--shadow-none: none;
--shadow-status: 0 16px 40px rgba(95, 117, 97, 0.14);
```

Rules:

- AppCanvas uses no shadow on mobile. On larger viewports it may use only tonal separation from `--color-background`, not a heavy device mockup.
- SetupStatus is the only Stage 1 elevated surface and may use `--shadow-status`.
- Hairline borders use `--color-border`; stronger separation uses `--color-border-strong`.
- Radius choices: `--radius-large` for SetupStatus, `--radius-medium` for future medium surfaces, `--radius-pill` for future chips or labels.
- No glassmorphism, frosted blur, neon glow, generic SaaS cards, or decorative gradient meshes in Stage 1.

## 8. Accessibility Constraints & Accepted Debt

Accessibility requirements:

- Meet WCAG 2.2 AA for text contrast, focus visibility, keyboard access, target size, and meaningful structure.
- Provide screen-reader landmarks: one primary `main`, clear headings, and semantic lists for status/checklist content.
- Keyboard users must see `--color-focus` outlines with at least 2px thickness and sufficient offset.
- Support 200% zoom without horizontal scrolling inside normal text content.
- CJK overflow must be handled with sensible wrapping: `overflow-wrap: anywhere` only for narrow metadata or technical strings, and normal line breaking for Korean/Japanese body text.
- Honor `color-scheme`, theme choice, and `prefers-reduced-motion`.
- Do not rely on color alone for ready, pending, error, like, or active states. Pair color with text, shape, or position.
- Touch targets must be at least 44px.

Accepted debt:

- Critical debt: none accepted for Stage 1.
- Minor debt: Stage 1 may use the system-font fallback stack until self-hosted CJK-capable fonts are added. Exit: in Phase 3, add self-hosted Pretendard Variable plus Noto Sans KR and Noto Sans JP fallback files, define `@font-face`, verify Korean/Japanese/English rendering, then remove this debt.
