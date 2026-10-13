import { useTranslation } from "react-i18next"

export function ContentOriginLabel({ local }: { readonly local: boolean }) {
  const { t } = useTranslation()
  return (
    <span className="content-origin" data-local={local}>
      {t(local ? ($) => $.storage.local : ($) => $.storage.demo)}
    </span>
  )
}
