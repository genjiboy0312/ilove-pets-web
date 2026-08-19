export const resources = {
  en: {
    translation: {
      app: {
        title: "iLove Pets",
      },
      shell: {
        bannerLabel: "App readiness",
        mainLabel: "iLove Pets app shell",
      },
      setup: {
        label: "Frontend foundation ready",
        bodyLead:
          "A warm mobile app shell is ready, so the next pet community screens can be attached reliably",
        bodyNowrap: "and safely.",
        checklist: {
          reactViteLabel: "React/Vite",
          reactViteText: "Confirms the fast development server and production build foundation.",
          themeLabel: "theme tokens",
          themeText: "Uses the color, spacing, and typography contract from DESIGN.md.",
          i18nLabel: "i18n readiness",
          i18nText: "Keeps a Korean-first structure ready for multilingual expansion.",
          routingLabel: "routing readiness",
          routingText: "Provides a single app shell baseline before real routes are added.",
        },
      },
      theme: {
        legend: "Theme preference",
        options: {
          system: "System",
          light: "Light",
          dark: "Dark",
        },
      },
    },
  },
  ja: {
    translation: {
      app: {
        title: "iLove Pets",
      },
      shell: {
        bannerLabel: "アプリ準備状況",
        mainLabel: "iLove Pets アプリシェル",
      },
      setup: {
        label: "フロントエンド基盤の準備が完了しました",
        bodyLead: "あたたかなモバイルアプリシェルが整い、次のペットコミュニティ画面を安定して",
        bodyNowrap: "追加できます。",
        checklist: {
          reactViteLabel: "React/Vite",
          reactViteText: "高速な開発サーバーと本番ビルド基盤を確認します。",
          themeLabel: "theme tokens",
          themeText: "DESIGN.md の色、余白、タイポグラフィ契約を使用します。",
          i18nLabel: "i18n readiness",
          i18nText: "韓国語優先の文言と今後の多言語拡張構造を保ちます。",
          routingLabel: "routing readiness",
          routingText: "実際のルート追加前にも単一アプリシェルの基準点を提供します。",
        },
      },
      theme: {
        legend: "テーマ設定",
        options: {
          system: "システム",
          light: "ライト",
          dark: "ダーク",
        },
      },
    },
  },
  ko: {
    translation: {
      app: {
        title: "iLove Pets",
      },
      shell: {
        bannerLabel: "앱 준비 상태",
        mainLabel: "iLove Pets 앱 셸",
      },
      setup: {
        label: "프론트엔드 기반 준비 완료",
        bodyLead:
          "따뜻한 모바일 앱 셸이 준비되었고, 다음 단계의 반려동물 커뮤니티 화면을 안정적으로",
        bodyNowrap: "붙일 수 있습니다.",
        checklist: {
          reactViteLabel: "React/Vite",
          reactViteText: "빠른 개발 서버와 프로덕션 빌드 기반을 확인합니다.",
          themeLabel: "theme tokens",
          themeText: "DESIGN.md의 색상, 간격, 타이포그래피 계약을 사용합니다.",
          i18nLabel: "i18n readiness",
          i18nText: "한국어 우선 문구와 이후 다국어 확장을 위한 구조를 유지합니다.",
          routingLabel: "routing readiness",
          routingText: "실제 라우트 추가 전에도 단일 앱 셸 기준점을 제공합니다.",
        },
      },
      theme: {
        legend: "테마 설정",
        options: {
          system: "시스템",
          light: "라이트",
          dark: "다크",
        },
      },
    },
  },
} as const

export type SupportedLanguage = keyof typeof resources
