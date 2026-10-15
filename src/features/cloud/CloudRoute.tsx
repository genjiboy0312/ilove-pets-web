import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { useAuth } from "../auth/AuthContext"
import { CloudWorkspace } from "./CloudWorkspace"

export function CloudRoute() {
  const { t } = useTranslation()
  const auth = useAuth()
  if (auth.status === "loading") return <p role="status">{t(($) => $.auth.loading)}</p>
  if (auth.status !== "ready" || auth.user === null)
    return (
      <section className="cloud-screen">
        <h1>{t(($) => $.cloud.title)}</h1>
        <Link className="local-button" to="/auth">
          {t(($) => $.cloud.signIn)}
        </Link>
      </section>
    )
  return <CloudWorkspace key={auth.user.id} owner={auth.user.id} />
}
