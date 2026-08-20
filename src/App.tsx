import { Navigate, Route, Routes } from "react-router"
import { useTranslation } from "react-i18next"

import { BottomNavigation } from "./components/BottomNavigation"
import { MobileAppShell } from "./components/MobileAppShell"
import { ActivityRoute } from "./features/activity/ActivityRoute"
import { CreateRoute } from "./features/create/CreateRoute"
import { ExploreRoute } from "./features/explore/ExploreRoute"
import { HomeRoute } from "./features/home/HomeRoute"
import { MyRoute } from "./features/my/MyRoute"
import { SettingsRoute } from "./features/settings/SettingsRoute"
import { useThemePreference } from "./theme/useThemePreference"

export function App() {
  const { t } = useTranslation()
  useThemePreference()
  return (
    <MobileAppShell bottomNavigation={<BottomNavigation />} mainLabel={t(($) => $.shell.mainLabel)}>
      <Routes>
        <Route index element={<HomeRoute />} />
        <Route path="explore" element={<ExploreRoute />} />
        <Route path="create" element={<CreateRoute />} />
        <Route path="activity" element={<ActivityRoute />} />
        <Route path="myaccount" element={<MyRoute />} />
        <Route path="settings" element={<SettingsRoute />} />
        <Route path="my" element={<Navigate replace to="/myaccount" />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </MobileAppShell>
  )
}
