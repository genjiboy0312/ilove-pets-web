import { useEffect, useId } from "react"
import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"

interface SettingsSheetProps {
  readonly title: string
  readonly onClose: () => void
  readonly children: ReactNode
}

export function SettingsSheet({ children, onClose, title }: SettingsSheetProps) {
  const { t } = useTranslation()
  const titleId = useId()

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

  return createPortal(
    <div className="settings-sheet__backdrop" onMouseDown={onClose}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="settings-sheet"
        onMouseDown={(event) => {
          event.stopPropagation()
        }}
        role="dialog"
      >
        <header className="settings-sheet__header">
          <h2 className="settings-sheet__title" id={titleId}>
            {title}
          </h2>
          <button
            aria-label={t(($) => $.settings.close)}
            className="settings-sheet__close"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </header>
        <div className="settings-sheet__body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
