import i18next from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import { resources } from "./resources"
import type { SupportedLanguage } from "./resources"

export const i18n = i18next

const supportedLanguages = ["ko", "ja", "en"] as const satisfies readonly SupportedLanguage[]

let initializationPromise: Promise<typeof i18n> | undefined

export function normalizeDetectedLanguage(language: string | undefined): SupportedLanguage {
  const normalizedLanguage = language?.toLowerCase()

  if (normalizedLanguage?.startsWith("ko")) {
    return "ko"
  }

  if (normalizedLanguage?.startsWith("ja")) {
    return "ja"
  }

  return "en"
}

export async function initializeI18n(): Promise<typeof i18n> {
  if (i18n.isInitialized) {
    return i18n
  }

  initializationPromise ??= i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      debug: false,
      defaultNS: "translation",
      detection: {
        caches: ["localStorage"],
        convertDetectedLanguage: normalizeDetectedLanguage,
        lookupLocalStorage: "i18nextLng",
        order: ["localStorage", "navigator"],
      },
      fallbackLng: "en",
      interpolation: {
        escapeValue: false,
      },
      load: "languageOnly",
      react: {
        useSuspense: false,
      },
      resources,
      supportedLngs: supportedLanguages,
    })
    .then(() => i18n)

  return initializationPromise
}
