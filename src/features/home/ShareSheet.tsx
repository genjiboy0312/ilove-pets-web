import { useEffect, useId, useState } from "react"
import { useTranslation } from "react-i18next"

interface ShareSheetProps {
  readonly onClose: () => void
  readonly onCopied: () => void
}

export function ShareSheet({ onClose, onCopied }: ShareSheetProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const [isCopyPending, setIsCopyPending] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  async function handleCopyLink() {
    setIsCopyPending(true)

    try {
      await navigator.clipboard.writeText(window.location.href)
      onCopied()
      onClose()
    } catch {
      // Clipboard access is not available in this browser context.
    } finally {
      setIsCopyPending(false)
    }
  }

  return (
    <div className="share-sheet__backdrop" onMouseDown={onClose}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="share-sheet"
        onMouseDown={(event) => {
          event.stopPropagation()
        }}
        role="dialog"
      >
        <header className="share-sheet__header">
          <h2 className="share-sheet__title" id={titleId}>
            {t(($) => $.home.share.heading)}
          </h2>
          <button
            aria-label={t(($) => $.home.comments.close)}
            className="share-sheet__close"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </header>

        <div className="share-sheet__body">
          <button
            className="share-sheet__action"
            disabled={isCopyPending}
            onClick={() => {
              void handleCopyLink()
            }}
            type="button"
          >
            {t(($) => $.home.share.copyLink)}
          </button>
        </div>
      </div>
    </div>
  )
}
