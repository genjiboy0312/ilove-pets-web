import { useEffect, useId, useState } from "react"
import { Link2 } from "lucide-react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"

function KakaoIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <ellipse cx="12" cy="10" rx="9.5" ry="7" />
      <path d="M8.5 15.5 7 20l5.5-3.2Z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect height="20" rx="5" ry="5" width="20" x="2" y="2" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

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

  function openShareWindow(href: string) {
    window.open(href, "_blank", "noopener,noreferrer")
    onClose()
  }

  function handleXShare() {
    const url = encodeURIComponent(window.location.href)
    const text = encodeURIComponent("iLove Pets")

    openShareWindow(`https://twitter.com/intent/tweet?url=${url}&text=${text}`)
  }

  function handleFacebookShare() {
    const url = encodeURIComponent(window.location.href)

    openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${url}`)
  }

  function handleKakaoShare() {
    // Direct KakaoTalk sharing requires a Kakao JS SDK app key; copy the link for manual pasting.
    void handleCopyLink()
  }

  function handleInstagramShare() {
    // Instagram exposes no web sharing endpoint; copy the link for manual pasting.
    void handleCopyLink()
  }

  return createPortal(
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

        <div className="share-sheet__targets" role="group">
          <button
            className="share-sheet__target"
            onClick={handleKakaoShare}
            type="button"
          >
            <span className="share-sheet__target-icon share-sheet__target-icon--kakao">
              <KakaoIcon />
            </span>
            <span className="share-sheet__target-label">{t(($) => $.home.share.kakao)}</span>
          </button>
          <button
            className="share-sheet__target"
            onClick={handleInstagramShare}
            type="button"
          >
            <span className="share-sheet__target-icon share-sheet__target-icon--instagram">
              <InstagramIcon />
            </span>
            <span className="share-sheet__target-label">{t(($) => $.home.share.instagram)}</span>
          </button>
          <button
            className="share-sheet__target"
            onClick={handleXShare}
            type="button"
          >
            <span className="share-sheet__target-icon share-sheet__target-icon--x">
              <XIcon />
            </span>
            <span className="share-sheet__target-label">{t(($) => $.home.share.x)}</span>
          </button>
          <button
            className="share-sheet__target"
            onClick={handleFacebookShare}
            type="button"
          >
            <span className="share-sheet__target-icon share-sheet__target-icon--facebook">
              <FacebookIcon />
            </span>
            <span className="share-sheet__target-label">{t(($) => $.home.share.facebook)}</span>
          </button>
        </div>

        <div className="share-sheet__body">
          <button
            className="share-sheet__action"
            disabled={isCopyPending}
            onClick={() => {
              void handleCopyLink()
            }}
            type="button"
          >
            <Link2 aria-hidden="true" size={18} strokeWidth={2.1} />
            {t(($) => $.home.share.copyLink)}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
