import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { signedCloudImage } from "./cloudApi"

export function CloudImage({
  owner,
  objectKey,
  alt,
}: {
  readonly owner: string
  readonly objectKey: string
  readonly alt: string
}) {
  const { t } = useTranslation()
  const [state, setState] = useState<{ readonly url: string | null; readonly failed: boolean }>({
    url: null,
    failed: false,
  })
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    async function renew() {
      try {
        const url = await signedCloudImage(owner, objectKey)
        if (active) {
          setState({ url, failed: false })
          timer = setTimeout(() => {
            void renew()
          }, 45000)
        }
      } catch {
        if (active) setState({ url: null, failed: true })
      }
    }
    void renew()
    return () => {
      active = false
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [owner, objectKey])
  if (!state.url)
    return <p>{t(state.failed ? ($) => $.cloud.imageError : ($) => $.cloud.imageLoading)}</p>
  return (
    <img
      className="cloud-post__image"
      src={state.url}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => {
        setState({ url: null, failed: true })
      }}
    />
  )
}
