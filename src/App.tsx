import { RouteBoundary } from "./components/RouteBoundary"
import { lazy, Suspense } from "react"
import { Navigate, Route, Routes, Link, useLocation } from "react-router"
import { useTranslation } from "react-i18next"

import { BottomNavigation } from "./components/BottomNavigation"
import { MobileAppShell } from "./components/MobileAppShell"
import { HomeRoute } from "./features/home/HomeRoute"
import { useThemePreference } from "./theme/useThemePreference"
import { AuthProvider } from "./features/auth/AuthProvider"

const ActivityRoute = lazy(() =>
  import("./features/activity/ActivityRoute").then((module) => ({ default: module.ActivityRoute })),
)
const CommunityRoute = lazy(() =>
  import("./features/community/CommunityRoute").then((module) => ({
    default: module.CommunityRoute,
  })),
)
const CreateRoute = lazy(() =>
  import("./features/create/CreateRoute").then((module) => ({ default: module.CreateRoute })),
)
const ExploreRoute = lazy(() =>
  import("./features/explore/ExploreRoute").then((module) => ({ default: module.ExploreRoute })),
)
const MyRoute = lazy(() =>
  import("./features/my/MyRoute").then((module) => ({ default: module.MyRoute })),
)
const SettingsRoute = lazy(() =>
  import("./features/settings/SettingsRoute").then((module) => ({ default: module.SettingsRoute })),
)
const AuthRoute = lazy(() =>
  import("./features/auth/AuthRoute").then((module) => ({ default: module.AuthRoute })),
)
const AuthCallback = lazy(() =>
  import("./features/auth/AuthCallback").then((module) => ({ default: module.AuthCallback })),
)
const CloudRoute = lazy(() =>
  import("./features/cloud/CloudRoute").then((module) => ({ default: module.CloudRoute })),
)
const SocialPostRoute = lazy(() =>
  import("./features/social/SocialFeed").then((module) => ({ default: module.SocialPostRoute })),
)
const PublicProfileRoute = lazy(() =>
  import("./features/social/ProfilePanel").then((module) => ({
    default: module.PublicProfileRoute,
  })),
)
const ImportRoute = lazy(() =>
  import("./features/import/ImportRoute").then((module) => ({ default: module.ImportRoute })),
)

export function App() {
  const { t } = useTranslation()
  const location = useLocation()
  useThemePreference()
  return (
    <AuthProvider>
      <MobileAppShell
        bottomNavigation={<BottomNavigation />}
        mainLabel={t(($) => $.shell.mainLabel)}
      >
        <RouteBoundary
          key={location.pathname}
          fallback={
            <section role="alert">
              <h1>{t(($) => $.operations.loadError)}</h1>
              <p>{t(($) => $.operations.loadHint)}</p>
              <Link to="/">{t(($) => $.home.heading)}</Link>
              <button
                className="local-button"
                type="button"
                onClick={() => {
                  window.location.reload()
                }}
              >
                {t(($) => $.social.retry)}
              </button>
            </section>
          }
        >
          <Suspense fallback={<p role="status">{t(($) => $.social.loading)}</p>}>
            <Routes>
              <Route path="cloud" element={<CloudRoute />} />
              <Route path="posts/:postId" element={<SocialPostRoute />} />
              <Route path="users/:username" element={<PublicProfileRoute />} />
              <Route path="auth" element={<AuthRoute />} />
              <Route path="auth/callback" element={<AuthCallback />} />
              <Route path="auth/reset-password" element={<AuthCallback recovery />} />
              <Route index element={<HomeRoute />} />
              <Route path="explore" element={<ExploreRoute />} />
              <Route path="community" element={<CommunityRoute />} />
              <Route path="create" element={<CreateRoute />} />
              <Route path="activity" element={<ActivityRoute />} />
              <Route path="myaccount" element={<MyRoute />} />
              <Route path="myaccount/import" element={<ImportRoute />} />
              <Route path="settings" element={<SettingsRoute />} />
              <Route path="my" element={<Navigate replace to="/myaccount" />} />
              <Route path="*" element={<Navigate replace to="/" />} />
            </Routes>
          </Suspense>
        </RouteBoundary>
      </MobileAppShell>
    </AuthProvider>
  )
}
