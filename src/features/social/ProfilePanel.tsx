import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { useAuth } from "../auth/AuthContext"
import { cleanupCloudMedia, uploadCloudImage } from "../cloud/cloudApi"
import { FollowButton, SocialFeed } from "./SocialFeed"
import { SocialImage } from "./SocialImage"
import { ProfileIssue, saveSocialProfile, socialProfile, socialWrite } from "./socialApi"
import type { SocialProfile } from "./socialApi"

export function ProfileHeader({
  profile,
  owner,
  refresh,
}: {
  readonly profile: SocialProfile
  readonly owner: string | null
  readonly refresh: () => void
}) {
  const { t } = useTranslation()
  return (
    <section className="account-profile" aria-label={t(($) => $.profile.title)}>
      <div className="account-profile__identity">
        <div className="account-profile__avatar">
          {profile.avatar ? (
            <SocialImage
              key={profile.avatar}
              owner={owner}
              asset={profile.avatar}
              alt={profile.name}
              placeholder={profile.name.slice(0, 1)}
            />
          ) : (
            profile.name.slice(0, 1)
          )}
        </div>
        <div>
          <h2>{profile.name}</h2>
          <p>@{profile.username}</p>
          {owner && owner !== profile.id ? (
            <FollowButton
              owner={owner}
              target={profile.id}
              following={profile.following}
              changed={refresh}
            />
          ) : null}
        </div>
      </div>
      <p className="social-content">{profile.bio}</p>
      <ul className="account-profile__stats">
        <li>{t(($) => $.profile.posts, { count: profile.posts })}</li>
        <li>{t(($) => $.profile.followers, { count: profile.followers })}</li>
        <li>{t(($) => $.profile.following, { count: profile.followingCount })}</li>
      </ul>
    </section>
  )
}
function ProfileEditor({
  profile,
  done,
}: {
  readonly profile: SocialProfile
  readonly done: () => void
}) {
  const { t } = useTranslation()
  const [username, setUsername] = useState(profile.username)
  const [name, setName] = useState(profile.name)
  const [bio, setBio] = useState(profile.bio)
  const [file, setFile] = useState<File | null>(null)
  const [remove, setRemove] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ProfileIssue["kind"] | null>(null)
  const pending = useRef(false)
  const upload = useRef<{ file: File; id: string } | null>(null)
  return (
    <form
      className="account-profile__editor"
      onSubmit={(e) => {
        e.preventDefault()
        if (pending.current) return
        pending.current = true
        setBusy(true)
        setError(null)
        void (async () => {
          let avatar = remove ? null : profile.avatar
          if (file && !remove) {
            try {
              if (upload.current?.file !== file)
                upload.current = {
                  file,
                  id: await uploadCloudImage(profile.id, file, "profile_avatar"),
                }
              avatar = upload.current.id
            } catch {
              throw new ProfileIssue("image")
            }
          }
          await saveSocialProfile(profile.id, {
            p_username: username,
            p_display_name: name,
            p_bio: bio,
            p_avatar: avatar,
            p_expected_version: profile.version,
          })
          await cleanupCloudMedia(profile.id).catch(() => undefined)
          done()
        })()
          .catch((failure: unknown) => {
            setError(failure instanceof ProfileIssue ? failure.kind : "request")
          })
          .finally(() => {
            pending.current = false
            setBusy(false)
          })
      }}
    >
      <p>{t(($) => $.profile.notice)}</p>
      <fieldset disabled={busy}>
        <label>
          {t(($) => $.profile.username)}
          <input
            className="my-pet-form__input"
            required
            pattern="[a-z0-9_]{3,30}"
            minLength={3}
            maxLength={30}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase())
            }}
          />
        </label>
        <label>
          {t(($) => $.profile.name)}
          <input
            className="my-pet-form__input"
            required
            maxLength={100}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
            }}
          />
        </label>
        <label htmlFor="profile-bio">{t(($) => $.profile.bio)}</label>
        <textarea
          id="profile-bio"
          className="my-pet-form__input"
          maxLength={500}
          value={bio}
          onChange={(e) => {
            setBio(e.target.value)
          }}
        />
        <label>
          {t(($) => $.profile.photo)}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={remove}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              upload.current = null
            }}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={remove}
            onChange={(e) => {
              setRemove(e.target.checked)
            }}
          />
          {t(($) => $.profile.removePhoto)}
        </label>
        {error ? <p role="alert">{t(($) => $.profile.errors[error])}</p> : null}
        <button className="local-button" type="submit">
          {t(busy ? ($) => $.social.loading : ($) => $.profile.save)}
        </button>
      </fieldset>
    </form>
  )
}
export function OwnProfile({ owner }: { readonly owner: string }) {
  const { t } = useTranslation()
  const [profile, setProfile] = useState<SocialProfile | null>(null)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      await socialWrite(owner, "ensure_profile")
      const data = await socialProfile(owner)
      if (!controller.signal.aborted) {
        setProfile(data)
        setError(!data)
      }
    })().catch(() => {
      if (!controller.signal.aborted) setError(true)
    })
    return () => {
      controller.abort()
    }
  }, [owner, revision])
  const refresh = () => {
    setRevision((v) => v + 1)
  }
  return (
    <section className="account-profile-panel">
      {error ? <p role="alert">{t(($) => $.social.error)}</p> : null}
      {!profile && !error ? <p role="status">{t(($) => $.social.loading)}</p> : null}
      <button className="local-button" type="button" onClick={refresh}>
        {t(($) => $.social.retry)}
      </button>
      {profile ? (
        <>
          <ProfileHeader profile={profile} owner={owner} refresh={refresh} />
          <Link className="local-button" to={`/users/${profile.username}`}>
            {t(($) => $.profile.open)}
          </Link>
          <details>
            <summary>{t(($) => $.profile.edit)}</summary>
            <ProfileEditor
              key={profile.version}
              profile={profile}
              done={() => {
                setSaved(true)
                refresh()
                window.dispatchEvent(new Event("social-profile-changed"))
              }}
            />
          </details>
          {saved ? <p role="status">{t(($) => $.profile.saved)}</p> : null}
        </>
      ) : null}
    </section>
  )
}
function PublicProfile({
  username,
  owner,
}: {
  readonly username: string
  readonly owner: string | null
}) {
  const { t } = useTranslation()
  const [profile, setProfile] = useState<SocialProfile | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    void socialProfile(owner, username)
      .then((data) => {
        if (active) {
          setProfile(data)
          setStatus("ready")
        }
      })
      .catch(() => {
        if (active) setStatus("error")
      })
    return () => {
      active = false
    }
  }, [owner, username, revision])
  return (
    <section className="public-profile">
      <Link to="/">← iLove Pets</Link>
      <h1>{t(($) => $.profile.title)}</h1>
      {status === "loading" ? (
        <p role="status">{t(($) => $.social.loading)}</p>
      ) : status === "error" ? (
        <p role="alert">{t(($) => $.social.error)}</p>
      ) : profile ? (
        <>
          <ProfileHeader
            profile={profile}
            owner={owner}
            refresh={() => {
              setRevision((v) => v + 1)
            }}
          />
          {owner === profile.id ? (
            <Link className="local-button" to="/myaccount">
              {t(($) => $.profile.edit)}
            </Link>
          ) : null}
          <SocialFeed owner={owner} author={profile.id} showPeople={false} />
        </>
      ) : (
        <p>{t(($) => $.profile.unavailable)}</p>
      )}
    </section>
  )
}
export function PublicProfileRoute() {
  const { username } = useParams()
  const auth = useAuth()
  const owner = auth.user?.id ?? null
  return (
    <PublicProfile
      key={`${owner ?? "anonymous"}:${username ?? ""}`}
      username={username ?? ""}
      owner={owner}
    />
  )
}
