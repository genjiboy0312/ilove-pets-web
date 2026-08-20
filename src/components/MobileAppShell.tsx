import type { ReactNode } from "react"

interface MobileAppShellProps {
  readonly bottomNavigation?: ReactNode
  readonly children: ReactNode
  readonly mainLabel: string
}

export function MobileAppShell({ bottomNavigation, children, mainLabel }: MobileAppShellProps) {
  return (
    <div className="app-canvas">
      <main className="app-shell__main" aria-label={mainLabel}>
        {children}
      </main>
      {bottomNavigation}
    </div>
  )
}
