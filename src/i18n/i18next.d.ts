import "i18next"

import type { resources } from "./resources"

declare module "i18next" {
  interface CustomTypeOptions {
    readonly defaultNS: "translation"
    readonly enableSelector: true
    readonly resources: (typeof resources)["en"]
  }
}
