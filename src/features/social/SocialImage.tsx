import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { socialImage } from "./socialApi"
export function SocialImage({
  owner,
  asset,
  alt,
  onReady,
  placeholder,
}: {
  readonly owner: string | null
  readonly asset: string
  readonly alt: string
  readonly onReady?: () => void
  readonly placeholder?: string
}) {
  const { t } = useTranslation()
  const [image, setImage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | undefined
    void socialImage(owner, asset, controller.signal)
      .then((blob) => {
        if (!controller.signal.aborted) {
          objectUrl = URL.createObjectURL(blob)
          setImage(objectUrl)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [owner, asset])
  return image ? (
    <img
      className="social-image"
      src={image}
      alt={alt}
      onLoad={onReady}
      onError={() => {
        setImage(null)
        setFailed(true)
      }}
      referrerPolicy="no-referrer"
    />
  ) : placeholder ? (
    <span>{placeholder}</span>
  ) : (
    <p role="status">{t(failed ? ($) => $.social.storyEmpty : ($) => $.social.loading)}</p>
  )
}
