import type { ReactNode } from "react"

interface MobileAppShellProps {
  readonly bannerLabel: string
  readonly bottomNavigation?: ReactNode
  readonly children: ReactNode
  readonly headerControls?: ReactNode
  readonly mainLabel: string
}

export function MobileAppShell({
  bannerLabel,
  bottomNavigation,
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
      {bottomNavigation}
    </div>
  )
}
