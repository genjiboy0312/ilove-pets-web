import { Navigate, Route, Routes } from "react-router"
import { useTranslation } from "react-i18next"

import { BottomNavigation } from "./components/BottomNavigation"
import { MobileAppShell } from "./components/MobileAppShell"
import { ActivityRoute } from "./features/activity/ActivityRoute"
import { CommunityRoute } from "./features/community/CommunityRoute"
import { CreateRoute } from "./features/create/CreateRoute"
import { ExploreRoute } from "./features/explore/ExploreRoute"
import { HomeRoute } from "./features/home/HomeRoute"
import { MyRoute } from "./features/my/MyRoute"
import { SettingsRoute } from "./features/settings/SettingsRoute"
import { useThemePreference } from "./theme/useThemePreference"
import { AuthProvider } from "./features/auth/AuthProvider"
import { AuthRoute } from "./features/auth/AuthRoute"
import { AuthCallback } from "./features/auth/AuthCallback"
import { CloudRoute } from "./features/cloud/CloudRoute"
import { SocialPostRoute } from "./features/social/SocialFeed"

export function App() {
  const { t } = useTranslation()
  useThemePreference()
  return (
    <AuthProvider>
      <MobileAppShell
        bottomNavigation={<BottomNavigation />}
        mainLabel={t(($) => $.shell.mainLabel)}
      >
        <Routes>
          <Route path="cloud" element={<CloudRoute />} />
          <Route path="posts/:postId" element={<SocialPostRoute />} />
          <Route path="auth" element={<AuthRoute />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route path="auth/reset-password" element={<AuthCallback recovery />} />
          <Route index element={<HomeRoute />} />
          <Route path="explore" element={<ExploreRoute />} />
          <Route path="community" element={<CommunityRoute />} />
          <Route path="create" element={<CreateRoute />} />
          <Route path="activity" element={<ActivityRoute />} />
          <Route path="myaccount" element={<MyRoute />} />
          <Route path="settings" element={<SettingsRoute />} />
          <Route path="my" element={<Navigate replace to="/myaccount" />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </MobileAppShell>
    </AuthProvider>
  )
}
