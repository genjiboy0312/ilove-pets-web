import { CirclePlus, Compass, House, UserRound, UsersRound } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { NavLink } from "react-router"

interface NavigationItem {
  readonly end: boolean
  readonly Icon: LucideIcon
  readonly labelKey: "home" | "explore" | "create" | "community" | "my"
  readonly to: "/" | "/explore" | "/create" | "/community" | "/myaccount"
}

const navigationItems = [
  { to: "/", labelKey: "home", Icon: House, end: true },
  { to: "/explore", labelKey: "explore", Icon: Compass, end: true },
  { to: "/create", labelKey: "create", Icon: CirclePlus, end: true },
  { to: "/community", labelKey: "community", Icon: UsersRound, end: false },
  { to: "/myaccount", labelKey: "my", Icon: UserRound, end: true },
] as const satisfies readonly NavigationItem[]

function getNavigationClassName(isActive: boolean): string {
  return isActive
    ? "bottom-navigation__link bottom-navigation__link--active"
    : "bottom-navigation__link"
}

export function BottomNavigation() {
  const { t } = useTranslation()

  return (
    <nav className="bottom-navigation" aria-label={t(($) => $.navigation.ariaLabel)}>
      <div className="bottom-navigation__items">
        {navigationItems.map(({ Icon, end, labelKey, to }) => (
          <NavLink
            className={({ isActive }) => getNavigationClassName(isActive)}
            end={end}
            key={to}
            to={to}
          >
            <Icon
              aria-hidden="true"
              className="bottom-navigation__icon"
              size={20}
              strokeWidth={2.1}
            />
            <span className="bottom-navigation__label">
              {t(($) => $.navigation.items[labelKey])}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
