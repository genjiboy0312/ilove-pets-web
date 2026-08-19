import type { ReactNode } from "react"

interface MobileAppShellProps {
  readonly bannerLabel: string
  readonly children: ReactNode
  readonly headerControls?: ReactNode
  readonly mainLabel: string
}

export function MobileAppShell({
  bannerLabel,
  children,
  headerControls,
  mainLabel,
}: MobileAppShellProps) {
  return (
    <div className="app-canvas">
      <header className="app-shell__header" aria-label={bannerLabel}>
        {headerControls}
      </header>
      <main className="app-shell__main" aria-label={mainLabel}>
        {children}
      </main>
    </div>
  )
}
