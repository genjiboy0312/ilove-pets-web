import { useState } from "react"
import { ArrowDownToLine, ArrowUpRight, Cloud, HardDrive, Plus, Settings } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { useAuth } from "../auth/AuthContext"
import { AuthAccountCard } from "../auth/AuthAccountCard"
import { CloudWorkspace } from "../cloud/CloudWorkspace"
import { CloudPetForm, CloudPostForm } from "../cloud/CloudForms"
import { useCloudWorkspace } from "../cloud/useCloudWorkspace"
import { OwnProfile } from "./ProfilePanel"
import { Stories } from "./Stories"
import { ImportHistory } from "../import/ImportHistory"

function Destinations({
  mode,
  change,
}: {
  readonly mode: "local" | "cloud"
  readonly change: (mode: "local" | "cloud") => void
}) {
  const { t } = useTranslation()
  return (
    <div className="social-tabs" role="group" aria-label={t(($) => $.profile.destination)}>
      <button
        type="button"
        aria-pressed={mode === "local"}
        onClick={() => {
          change("local")
        }}
      >
        <HardDrive size={16} aria-hidden="true" />
        {t(($) => $.profile.local)}
      </button>
      <button
        type="button"
        aria-pressed={mode === "cloud"}
        onClick={() => {
          change("cloud")
        }}
      >
        <Cloud size={16} aria-hidden="true" />
        {t(($) => $.profile.cloud)}
      </button>
    </div>
  )
}
function AccountSession({
  owner,
  children,
}: {
  readonly owner: string | null
  readonly children: ReactNode
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<"local" | "cloud">(owner ? "cloud" : "local")
  return (
    <div className="account-page">
      <Destinations mode={mode} change={setMode} />
      {mode === "local" ? (
        children
      ) : (
        <section className="my-screen account-dashboard">
          <header className="my-screen__header">
            <div className="my-screen__heading-group">
              <p className="my-screen__eyebrow">iLove Pets</p>
              <h1 className="my-screen__title">{t(($) => $.my.heading)}</h1>
            </div>
            <Link
              className="my-screen__settings-link"
              to="/settings"
              aria-label={t(($) => $.my.settings)}
            >
              <Settings size={18} aria-hidden="true" />
            </Link>
          </header>
          {owner ? (
            <>
              <OwnProfile key={owner} owner={owner} />
              <div className="account-quick-actions">
                <Link
                  className="account-quick-action account-quick-action--primary"
                  to="/create?destination=cloud"
                  aria-label={t(($) => $.profile.create)}
                >
                  <span className="account-quick-action__icon">
                    <Plus size={22} aria-hidden="true" />
                  </span>
                  <strong>{t(($) => $.accountUi.write)}</strong>
                  <span>{t(($) => $.accountUi.writeHint)}</span>
                  <ArrowUpRight
                    className="account-quick-action__arrow"
                    size={16}
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  className="account-quick-action"
                  to="/myaccount/import"
                  aria-label={t(($) => $.migration.title)}
                >
                  <span className="account-quick-action__icon">
                    <ArrowDownToLine size={21} aria-hidden="true" />
                  </span>
                  <strong>{t(($) => $.accountUi.import)}</strong>
                  <span>{t(($) => $.accountUi.importHint)}</span>
                  <ArrowUpRight
                    className="account-quick-action__arrow"
                    size={16}
                    aria-hidden="true"
                  />
                </Link>
              </div>
              <section className="account-story-card" aria-labelledby="account-stories-title">
                <h2 id="account-stories-title">{t(($) => $.profile.myStories)}</h2>
                <Stories key={owner} owner={owner} onlyOwn />
              </section>
              <details className="account-records">
                <summary>{t(($) => $.profile.myRecords)}</summary>
                <CloudWorkspace owner={owner} embedded />
              </details>
              <ImportHistory key={`imports:${owner}`} owner={owner} />
              <details className="account-records account-session">
                <summary>{t(($) => $.auth.account)}</summary>
                <AuthAccountCard />
              </details>
            </>
          ) : (
            <AuthAccountCard />
          )}
        </section>
      )}
    </div>
  )
}
export function AccountDestinations({ children }: { readonly children: ReactNode }) {
  const auth = useAuth()
  const owner = auth.user?.id ?? null
  return (
    <AccountSession key={owner ?? "anonymous"} owner={owner}>
      {children}
    </AccountSession>
  )
}
function CloudCreation({ owner }: { readonly owner: string }) {
  const { t } = useTranslation()
  const cloud = useCloudWorkspace(owner)
  return (
    <section className="create-screen">
      <h1>{t(($) => $.profile.create)}</h1>
      <p>{t(($) => $.profile.privateNotice)}</p>
      {cloud.status === "loading" ? <p role="status">{t(($) => $.social.loading)}</p> : null}
      {cloud.error ? (
        <p role="alert">{t(($) => $.cloud.errors[cloud.error ?? "request"])}</p>
      ) : null}
      {cloud.saved ? <p role="status">{t(($) => $.cloud.saved)}</p> : null}
      <Link className="local-button" to="/cloud">
        {t(($) => $.social.cloud)}
      </Link>
      <button
        className="local-button"
        type="button"
        disabled={cloud.busy}
        onClick={() => {
          void cloud.refresh().catch(() => undefined)
        }}
      >
        {t(($) => $.social.retry)}
      </button>
      {cloud.status === "ready" ? (
        <>
          {!cloud.snapshot.mediaReady ? <p>{t(($) => $.cloud.mediaPending)}</p> : null}
          {cloud.snapshot.pets.length === 0 ? <p>{t(($) => $.profile.petFirst)}</p> : null}
          <details open={cloud.snapshot.pets.length === 0}>
            <summary>{t(($) => $.profile.registerPet)}</summary>
            <CloudPetForm owner={owner} busy={cloud.busy} run={cloud.run} close={() => undefined} />
          </details>
          <CloudPostForm
            owner={owner}
            busy={cloud.busy || !cloud.snapshot.mediaReady}
            run={cloud.run}
            close={() => undefined}
            pets={cloud.snapshot.pets}
          />
        </>
      ) : null}
    </section>
  )
}
function CreateSession({
  owner,
  children,
  initial,
}: {
  readonly owner: string | null
  readonly children: ReactNode
  readonly initial: "local" | "cloud"
}) {
  const [mode, setMode] = useState(initial)
  const { t } = useTranslation()
  return (
    <div className="creation-page">
      <Destinations mode={mode} change={setMode} />
      {mode === "local" ? (
        children
      ) : owner ? (
        <CloudCreation key={owner} owner={owner} />
      ) : (
        <section className="create-screen">
          <h1>{t(($) => $.profile.create)}</h1>
          <p>{t(($) => $.profile.privateNotice)}</p>
          <Link className="local-button" to="/auth">
            {t(($) => $.social.signIn)}
          </Link>
        </section>
      )}
    </div>
  )
}
export function CreationDestinations({
  children,
  initial,
}: {
  readonly children: ReactNode
  readonly initial: "local" | "cloud"
}) {
  const auth = useAuth()
  const owner = auth.user?.id ?? null
  return (
    <CreateSession key={`${owner ?? "anonymous"}:${initial}`} owner={owner} initial={initial}>
      {children}
    </CreateSession>
  )
}
