import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { Heart, MessageCircle, Share2 } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { socialComments, socialPeople, socialPosts, socialWrite } from "./socialApi"
import type { SocialComment, SocialPerson, SocialPost } from "./socialApi"
import { SocialImage } from "./SocialImage"

export function FollowButton({
  owner,
  target,
  following,
  changed,
}: {
  readonly owner: string
  readonly target: string
  readonly following: boolean
  readonly changed: () => void
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  if (owner === target) return null
  return (
    <span>
      <button
        className="social-follow"
        type="button"
        aria-pressed={following}
        disabled={busy}
        onClick={() => {
          setBusy(true)
          setError(false)
          void socialWrite(owner, "set_follow", { p_target: target, p_follow: !following })
            .then(() => {
              changed()
              window.dispatchEvent(new Event("social-follow-changed"))
            })
            .catch(() => {
              setError(true)
            })
            .finally(() => {
              setBusy(false)
            })
        }}
      >
        {t(following ? ($) => $.social.following : ($) => $.social.follow)}
      </button>
      {error ? <span role="alert">{t(($) => $.social.error)}</span> : null}
    </span>
  )
}
export function SocialCard({
  post,
  owner,
  refresh,
  detail = false,
}: {
  readonly post: SocialPost
  readonly owner: string | null
  readonly refresh: () => void
  readonly detail?: boolean
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [shareUrl, setShareUrl] = useState("")
  return (
    <article className="social-card">
      <header className="social-card__header">
        <span className="social-avatar" aria-hidden="true">
          {post.pet.slice(0, 1)}
        </span>
        <div>
          <strong>{post.pet}</strong>
          <small>@{post.username}</small>
        </div>
        {owner ? (
          <FollowButton
            owner={owner}
            target={post.owner}
            following={post.following}
            changed={refresh}
          />
        ) : null}
      </header>
      <Link to={`/posts/${post.id}`} aria-label={`${t(($) => $.social.open)} · ${post.pet}`}>
        <SocialImage
          key={`${owner ?? "anon"}:${post.asset}`}
          owner={owner}
          asset={post.asset}
          alt={post.pet}
        />
      </Link>
      <p className="social-content">{post.content}</p>
      <time dateTime={post.created}>{new Date(post.created).toLocaleDateString()}</time>
      <div className="social-actions">
        {owner ? (
          <button
            type="button"
            aria-label={t(post.liked ? ($) => $.social.unlike : ($) => $.social.like)}
            aria-pressed={post.liked}
            disabled={busy}
            onClick={() => {
              setBusy(true)
              setNotice("")
              void socialWrite(owner, "set_post_like", { p_post: post.id, p_liked: !post.liked })
                .then(refresh)
                .catch(() => {
                  setNotice(t(($) => $.social.error))
                })
                .finally(() => {
                  setBusy(false)
                })
            }}
          >
            <Heart size={21} fill={post.liked ? "currentColor" : "none"} />
            <span>{post.likes}</span>
          </button>
        ) : (
          <Link to="/auth">{t(($) => $.social.signIn)}</Link>
        )}
        <Link to={`/posts/${post.id}`}>
          <MessageCircle size={21} />
          {post.comments}
        </Link>
        <button
          type="button"
          aria-label={t(($) => $.social.share)}
          onClick={() => {
            const url = `${window.location.origin}/posts/${post.id}`
            void Promise.resolve()
              .then(() => navigator.clipboard.writeText(url))
              .then(() => {
                setNotice(t(($) => $.social.copied))
              })
              .catch(() => {
                setNotice(t(($) => $.social.copyError))
                setShareUrl(url)
              })
          }}
        >
          <Share2 size={21} />
        </button>
      </div>
      {notice ? <p role="status">{notice}</p> : null}
      {shareUrl ? (
        <input
          readOnly
          aria-label={t(($) => $.social.share)}
          value={shareUrl}
          onFocus={(e) => {
            e.target.select()
          }}
        />
      ) : null}
      {detail ? <Comments owner={owner} post={post} changed={refresh} /> : null}
    </article>
  )
}
function Comments({
  owner,
  post,
  changed,
}: {
  readonly owner: string | null
  readonly post: SocialPost
  readonly changed: () => void
}) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<SocialComment[]>([])
  const [text, setText] = useState("")
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [more, setMore] = useState(false)
  const id = useRef(crypto.randomUUID())
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    void socialComments(owner, post.id)
      .then((data) => {
        if (active) {
          setRows(data)
          setMore(data.length === 30)
        }
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [owner, post.id, revision])
  const reload = () => {
    setRevision((v) => v + 1)
    changed()
  }
  return (
    <section className="social-comments">
      <h2>{t(($) => $.social.comments)}</h2>
      {error ? <p role="alert">{t(($) => $.social.error)}</p> : null}
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            <strong>@{row.username}</strong>
            <p>{row.content}</p>
            {owner && (owner === row.owner || owner === post.owner) ? (
              <button
                className="local-button"
                type="button"
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  void socialWrite(owner, "delete_social_comment", { p_id: row.id })
                    .then(reload)
                    .catch(() => {
                      setError(true)
                    })
                    .finally(() => {
                      setBusy(false)
                    })
                }}
              >
                {t(($) => $.social.remove)}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {more ? (
        <button
          className="local-button"
          disabled={busy}
          type="button"
          onClick={() => {
            const last = rows.at(-1)
            if (!last) return
            setBusy(true)
            void socialComments(owner, post.id, { p_before: last.created, p_before_id: last.id })
              .then((data) => {
                setRows((current) => [...current, ...data])
                setMore(data.length === 30)
              })
              .catch(() => {
                setError(true)
              })
              .finally(() => {
                setBusy(false)
              })
          }}
        >
          {t(($) => $.social.more)}
        </button>
      ) : null}
      {owner ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (busy || !text.trim()) return
            setBusy(true)
            setError(false)
            void socialWrite(owner, "save_social_comment", {
              p_id: id.current,
              p_post: post.id,
              p_content: text.trim(),
            })
              .then(() => {
                setText("")
                id.current = crypto.randomUUID()
                reload()
              })
              .catch(() => {
                setError(true)
              })
              .finally(() => {
                setBusy(false)
              })
          }}
        >
          <label>
            {t(($) => $.social.comment)}
            <textarea
              className="my-pet-form__input"
              maxLength={500}
              required
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                id.current = crypto.randomUUID()
              }}
              disabled={busy}
            />
          </label>
          <button className="local-button" disabled={busy || !text.trim()} type="submit">
            {t(($) => $.social.send)}
          </button>
        </form>
      ) : (
        <Link to="/auth">{t(($) => $.social.signIn)}</Link>
      )}
    </section>
  )
}
export function SocialFeed({ owner }: { readonly owner: string | null }) {
  const { t } = useTranslation()
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [people, setPeople] = useState<SocialPerson[]>([])
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const refresh = () => {
    setRevision((v) => v + 1)
  }
  useEffect(() => {
    let active = true
    setLoading(true)
    void Promise.all([socialPosts(owner), socialPeople(owner, query)])
      .then(([items, users]) => {
        if (active) {
          setPosts(items)
          setPeople(users)
          setMore(items.length === 20)
          setError(false)
        }
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [owner, query, revision])
  return (
    <section className="social-feed">
      <div className="social-toolbar">
        <h2>{t(($) => $.social.public)}</h2>
        <button className="local-button" type="button" disabled={loading} onClick={refresh}>
          {t(($) => $.social.retry)}
        </button>
        <Link to="/cloud">{t(($) => $.social.cloud)}</Link>
      </div>
      {loading ? <p role="status">{t(($) => $.social.loading)}</p> : null}
      {error ? <p role="alert">{t(($) => $.social.error)}</p> : null}
      {!loading && !error && posts.length === 0 ? <p>{t(($) => $.social.empty)}</p> : null}
      {posts.map((post) => (
        <SocialCard key={post.id} owner={owner} post={post} refresh={refresh} />
      ))}
      {more ? (
        <button
          className="local-button"
          type="button"
          disabled={busy}
          onClick={() => {
            const last = posts.at(-1)
            if (!last) return
            setBusy(true)
            void socialPosts(owner, { p_before: last.created, p_before_id: last.id })
              .then((data) => {
                setPosts((current) => [...current, ...data])
                setMore(data.length === 20)
              })
              .catch(() => {
                setError(true)
              })
              .finally(() => {
                setBusy(false)
              })
          }}
        >
          {t(($) => $.social.more)}
        </button>
      ) : null}
      {owner ? (
        <section className="social-people">
          <h2>{t(($) => $.social.people)}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setQuery(search)
            }}
          >
            <label>
              {t(($) => $.social.search)}
              <input
                className="my-pet-form__input"
                value={search}
                maxLength={30}
                onChange={(e) => {
                  setSearch(e.target.value)
                }}
              />
            </label>
            <button className="local-button" type="submit">
              {t(($) => $.social.search)}
            </button>
          </form>
          {people.map((person) => (
            <div className="social-person" key={person.id}>
              <span>
                {person.name}
                <small>@{person.username}</small>
              </span>
              <FollowButton
                owner={owner}
                target={person.id}
                following={person.following}
                changed={refresh}
              />
            </div>
          ))}
        </section>
      ) : null}
    </section>
  )
}
function PostDetail({ id, owner }: { readonly id: string; readonly owner: string | null }) {
  const { t } = useTranslation()
  const [post, setPost] = useState<SocialPost | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => {
    setRevision((v) => v + 1)
  }, [])
  useEffect(() => {
    let active = true
    void socialPosts(owner, { p_id: id })
      .then((data) => {
        if (active) {
          setPost(data[0] ?? null)
          setState("ready")
        }
      })
      .catch(() => {
        if (active) {
          setPost(null)
          setState("error")
        }
      })
    return () => {
      active = false
    }
  }, [id, owner, revision])
  return (
    <section className="social-detail">
      <Link to="/">← iLove Pets</Link>
      {state === "loading" ? (
        <p role="status">{t(($) => $.social.loading)}</p>
      ) : state === "error" ? (
        <p role="alert">{t(($) => $.social.error)}</p>
      ) : post ? (
        <SocialCard owner={owner} post={post} refresh={refresh} detail />
      ) : (
        <p>{t(($) => $.social.unavailable)}</p>
      )}
    </section>
  )
}
export function SocialPostRoute() {
  const { postId } = useParams()
  const auth = useAuth()
  const owner = auth.user?.id ?? null
  return <PostDetail key={`${owner ?? "anon"}:${postId ?? ""}`} id={postId ?? ""} owner={owner} />
}
