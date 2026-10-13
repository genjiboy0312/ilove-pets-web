import { ChevronDown } from "lucide-react"
import type { ReactNode } from "react"

interface MyCollapsibleSectionProps {
  readonly children: ReactNode
  readonly contentId: string
  readonly isOpen: boolean
  readonly onToggle: () => void
  readonly title: string
  readonly titleId: string
}

export function MyCollapsibleSection({
  children,
  contentId,
  isOpen,
  onToggle,
  title,
  titleId,
}: MyCollapsibleSectionProps) {
  return (
    <section className="my-section" aria-labelledby={titleId}>
      <h2 className="my-section__title" id={titleId}>
        <button
          aria-controls={contentId}
          aria-expanded={isOpen}
          className="my-section__toggle"
          onClick={onToggle}
          type="button"
        >
          <span>{title}</span>
          <ChevronDown
            aria-hidden="true"
            className={["my-section__toggle-icon", isOpen ? "" : "my-section__toggle-icon--closed"]
              .filter(Boolean)
              .join(" ")}
            size={16}
            strokeWidth={2.1}
          />
        </button>
      </h2>
      <div hidden={!isOpen} id={contentId}>
        {children}
      </div>
    </section>
  )
}
