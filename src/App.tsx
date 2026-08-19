import { Navigate, Route, Routes } from "react-router"
import { useTranslation } from "react-i18next"

import { BottomNavigation } from "./components/BottomNavigation"
import { MobileAppShell } from "./components/MobileAppShell"
import { ThemePreferenceControls } from "./components/ThemePreferenceControls"
import { ActivityRoute } from "./features/activity/ActivityRoute"
import { CreateRoute } from "./features/create/CreateRoute"
import { ExploreRoute } from "./features/explore/ExploreRoute"
import { HomeRoute } from "./features/home/HomeRoute"
import { MyRoute } from "./features/my/MyRoute"
import { SettingsRoute } from "./features/settings/SettingsRoute"

export function App() {
  const { t } = useTranslation()

  return (
    <MobileAppShell
      bannerLabel={t(($) => $.shell.bannerLabel)}
      bottomNavigation={<BottomNavigation />}
      headerControls={<ThemePreferenceControls />}
      mainLabel={t(($) => $.shell.mainLabel)}
    >
      <Routes>
        <Route index element={<HomeRoute />} />
        <Route path="explore" element={<ExploreRoute />} />
        <Route path="create" element={<CreateRoute />} />
        <Route path="activity" element={<ActivityRoute />} />
        <Route path="my" element={<MyRoute />} />
        <Route path="settings" element={<SettingsRoute />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </MobileAppShell>
  )
}
