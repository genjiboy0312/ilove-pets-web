export const storageMessages = {
  en: {
    storage: {
      title: "Data on this device",
      summary: "Pets: {{pets}} · Posts: {{posts}} · Growth records: {{records}}",
      photos: "Saved photos: {{count}} ({{size}} MB)",
      estimate: "Browser storage estimate: {{used}} MB / {{quota}} MB. This includes caches.",
      unavailable: "Photo storage size is unavailable in this browser.",
      retry: "Check storage again",
      help: "If saving fails, keep your draft and try again. Download a photo backup before clearing site data; delete unneeded posts to free space.",
      demo: "Demo example",
      local: "Saved on this device",
      start: "Register your pet to get started",
      startHint:
        "The pets shown below are demo examples. Register your own pet, then choose it when posting.",
      localHint:
        "Your photos and records stay in this browser. Use backup to move them to another device.",
    },
  },
  ja: {
    storage: {
      title: "この端末のデータ",
      summary: "ペット: {{pets}} · 投稿: {{posts}} · 成長記録: {{records}}",
      photos: "保存写真: {{count}} ({{size}} MB)",
      estimate: "ブラウザ容量の推定: {{used}} MB / {{quota}} MB。キャッシュも含みます。",
      unavailable: "このブラウザでは写真容量を確認できません。",
      retry: "保存容量を再確認",
      help: "保存できない場合は下書きを残して再試行してください。サイトデータを消す前に写真付きバックアップを保存し、不要な投稿を削除して空きを増やしてください。",
      demo: "デモ例",
      local: "この端末に保存",
      start: "自分のペットを登録して始める",
      startHint: "下のペットはデモ例です。自分のペットを登録し、投稿時に選んでください。",
      localHint: "写真と記録はこのブラウザに保存されます。別の端末にはバックアップで移せます。",
    },
  },
  ko: {
    storage: {
      title: "이 기기의 데이터",
      summary: "펫 {{pets}}마리 · 게시물 {{posts}}개 · 성장 기록 {{records}}개",
      photos: "저장된 사진 {{count}}장 ({{size}}MB)",
      estimate: "브라우저 저장 공간 추정: {{used}}MB / {{quota}}MB. 캐시도 포함합니다.",
      unavailable: "이 브라우저에서는 사진 저장 용량을 확인할 수 없습니다.",
      retry: "저장 상태 다시 확인",
      help: "저장 실패 시 초안을 유지하고 다시 시도하세요. 사이트 데이터를 지우기 전에 사진 포함 백업을 다운로드하고, 불필요한 게시물을 삭제해 공간을 확보하세요.",
      demo: "데모 예시",
      local: "이 기기에 저장됨",
      start: "내 펫 등록하고 시작",
      startHint: "아래 펫은 데모 예시입니다. 내 펫을 등록한 뒤 작성 화면에서 선택하세요.",
      localHint: "사진과 기록은 이 브라우저에 저장됩니다. 다른 기기로 옮길 때는 백업을 이용하세요.",
    },
  },
} as const
