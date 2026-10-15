import { useState } from "react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useAuth } from "../auth/AuthContext"
import { SocialFeed } from "./SocialFeed"
import { Stories } from "./Stories"
import { readFeedChoice, saveFeedChoice } from "./feedPreferences"
function SessionHome({
  owner,
  children,
}: {
  readonly owner: string | null
  readonly children: ReactNode
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<"local" | "public">(() =>
    readFeedChoice(owner, "mode", "local") === "public" ? "public" : "local",
  )
  const choose = (value: "local" | "public") => {
    setMode(value)
    saveFeedChoice(owner, "mode", value)
  }
  return (
    <>
      <Stories owner={owner} />
      <div className="social-tabs" role="group" aria-label={t(($) => $.social.public)}>
        <button
          type="button"
          aria-pressed={mode === "local"}
          onClick={() => {
            choose("local")
          }}
        >
          {t(($) => $.social.local)}
        </button>
        <button
          type="button"
          aria-pressed={mode === "public"}
          onClick={() => {
            choose("public")
          }}
        >
          {t(($) => $.social.public)}
        </button>
      </div>
      {mode === "local" ? children : <SocialFeed owner={owner} />}
    </>
  )
}
export function SocialHome({ children }: { readonly children: ReactNode }) {
  const auth = useAuth()
  const owner = auth.user?.id ?? null
  return (
    <SessionHome key={owner ?? "anonymous"} owner={owner}>
      {children}
    </SessionHome>
  )
}
