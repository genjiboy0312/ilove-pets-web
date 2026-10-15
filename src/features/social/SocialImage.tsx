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
  const [attempt, setAttempt] = useState(0)
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
  }, [owner, asset, attempt])
  return image ? (
    <img
      className="social-image"
      draggable={false}
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
    <div>
      <p role="status">{t(failed ? ($) => $.social.storyEmpty : ($) => $.social.loading)}</p>
      {failed ? (
        <button
          className="local-button"
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setFailed(false)
            setAttempt((v) => v + 1)
          }}
        >
          {t(($) => $.profile.retryImage)}
        </button>
      ) : null}
    </div>
  )
}
