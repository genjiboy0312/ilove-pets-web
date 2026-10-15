import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import type { CloudRun } from "../cloud/CloudForms"
import { socialWrite } from "./socialApi"
export function PublishControl({
  owner,
  id,
  version,
  visibility,
  run,
  busy,
}: {
  readonly owner: string
  readonly id: string
  readonly version: number
  readonly visibility: string
  readonly run: CloudRun
  readonly busy: boolean
}) {
  const { t } = useTranslation()
  const [confirm, setConfirm] = useState(false)
  const isPublic = visibility === "public"
  const save = () => {
    void run(() =>
      socialWrite(owner, "set_post_visibility", {
        p_id: id,
        p_public: !isPublic,
        p_expected_version: version,
      }),
    ).then((ok) => {
      if (ok) setConfirm(false)
    })
  }
  return (
    <div className="social-publish">
      <p>{t(isPublic ? ($) => $.social.publicState : ($) => $.social.privateState)}</p>
      {isPublic ? <Link to={`/posts/${id}`}>{t(($) => $.social.open)}</Link> : null}
      {confirm ? (
        <>
          <p>{t(($) => $.social.publicNotice)}</p>
          <button className="local-button" type="button" disabled={busy} onClick={save}>
            {t(($) => $.social.confirmPublic)}
          </button>
          <button
            className="local-button"
            type="button"
            disabled={busy}
            onClick={() => {
              setConfirm(false)
            }}
          >
            {t(($) => $.social.cancel)}
          </button>
        </>
      ) : (
        <button
          className="local-button"
          type="button"
          disabled={busy}
          onClick={() => {
            if (isPublic) save()
            else setConfirm(true)
          }}
        >
          {t(isPublic ? ($) => $.social.privatePost : ($) => $.social.publishPost)}
        </button>
      )}
    </div>
  )
}
