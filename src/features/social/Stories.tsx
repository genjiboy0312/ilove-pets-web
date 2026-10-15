import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { Plus, X, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { useDialogFocus } from "../../components/useDialogFocus"
import { cleanupCloudMedia, uploadCloudImage } from "../cloud/cloudApi"
import { socialStories, socialWrite } from "./socialApi"
import type { Story } from "./socialApi"
import { SocialImage } from "./SocialImage"

function StoryComposer({ owner, close }: { readonly owner: string; readonly close: () => void }) {
  const { t } = useTranslation()
  const ref = useDialogFocus()
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const id = useRef(crypto.randomUUID())
  const asset = useRef<string | null>(null)
  return (
    <div className="story-overlay">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t(($) => $.social.addStory)}
        className="story-compose"
        onKeyDown={(e) => {
          if (e.key === "Escape" && !busy) close()
        }}
      >
        <button
          className="story-close"
          type="button"
          disabled={busy}
          aria-label={t(($) => $.social.close)}
          onClick={close}
        >
          <X />
        </button>
        <h2>{t(($) => $.social.addStory)}</h2>
        <p>{t(($) => $.social.storyNotice)}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (busy || !file) return
            setBusy(true)
            setError(false)
            void (async () => {
              asset.current ??= await uploadCloudImage(owner, file)
              await socialWrite(owner, "create_story", {
                p_id: id.current,
                p_asset: asset.current,
                p_caption: caption,
              })
              close()
            })()
              .catch(() => {
                setError(true)
              })
              .finally(() => {
                setBusy(false)
              })
          }}
        >
          <fieldset disabled={busy}>
            <label>
              {t(($) => $.social.photo)}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                disabled={asset.current !== null}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null)
                }}
              />
            </label>
            <label>
              {t(($) => $.social.caption)}
              <textarea
                className="my-pet-form__input"
                value={caption}
                maxLength={200}
                onChange={(e) => {
                  setCaption(e.target.value)
                }}
              />
            </label>
            {error ? <p role="alert">{t(($) => $.social.error)}</p> : null}
            <button className="local-button" type="submit" disabled={!file || busy}>
              {t(busy ? ($) => $.social.loading : ($) => $.social.publish)}
            </button>
          </fieldset>
        </form>
      </div>
    </div>
  )
}
function StoryViewer({
  owner,
  stories,
  initial,
  close,
}: {
  readonly owner: string
  readonly stories: readonly Story[]
  readonly initial: number
  readonly close: () => void
}) {
  const { t } = useTranslation()
  const ref = useDialogFocus()
  const [index, setIndex] = useState(initial)
  const [paused, setPaused] = useState(false)
  const [held, setHeld] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const [ready, setReady] = useState("")
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const story = stories[index]
  const gesture = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("keydown", escape)
    return () => {
      window.removeEventListener("keydown", escape)
    }
  }, [close])
  const next = useCallback(() => {
    setError(false)
    if (index + 1 < stories.length) setIndex(index + 1)
    else close()
  }, [index, stories.length, close])
  useEffect(() => {
    const changed = () => {
      setHidden(document.hidden)
    }
    document.addEventListener("visibilitychange", changed)
    return () => {
      document.removeEventListener("visibilitychange", changed)
    }
  }, [])
  useEffect(() => {
    if (!story) return
    let active = true
    void socialWrite(owner, "view_story", { p_id: story.id }).catch(() => {
      if (active) setError(true)
    })
    return () => {
      active = false
    }
  }, [owner, story])
  useEffect(() => {
    if (!story) return
    const expires = setTimeout(next, Math.max(0, new Date(story.expires).getTime() - Date.now()))
    return () => {
      clearTimeout(expires)
    }
  }, [story, next])
  useEffect(() => {
    if (ready !== story?.id || paused || held || hidden) return
    const timer = setTimeout(next, 5000)
    return () => {
      clearTimeout(timer)
    }
  }, [story, ready, paused, held, hidden, next])
  if (!story) return null
  return (
    <div className="story-overlay">
      <div
        ref={ref}
        className="story-viewer"
        role="dialog"
        aria-modal="true"
        aria-label={`${t(($) => $.social.stories)} · ${story.username}`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") next()
          if (e.key === "ArrowLeft") setIndex(Math.max(0, index - 1))
        }}
      >
        <div className="story-progress" aria-hidden="true">
          {stories.map((item, i) => (
            <span key={item.id} className={i <= index ? "is-seen" : ""} />
          ))}
        </div>
        <header>
          <div>
            <strong>@{story.username}</strong>
            <small>
              {new Date(story.created).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
          </div>
          <button
            type="button"
            aria-label={t(paused ? ($) => $.social.play : ($) => $.social.pause)}
            onClick={() => {
              setPaused((v) => !v)
            }}
          >
            {paused ? <Play /> : <Pause />}
          </button>
          <button type="button" aria-label={t(($) => $.social.close)} onClick={close}>
            <X />
          </button>
        </header>
        <div
          className="story-photo"
          onPointerDown={(event) => {
            if (event.target instanceof Element && event.target.closest("button,a,input")) return
            gesture.current = { x: event.clientX, y: event.clientY }
            event.currentTarget.setPointerCapture(event.pointerId)
            setHeld(true)
          }}
          onPointerUp={(event) => {
            const start = gesture.current
            gesture.current = null
            setHeld(false)
            if (start) {
              const dx = event.clientX - start.x,
                dy = event.clientY - start.y
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                if (dx < 0) next()
                else {
                  setError(false)
                  setIndex((v) => Math.max(0, v - 1))
                }
              }
            }
          }}
          onPointerCancel={() => {
            gesture.current = null
            setHeld(false)
          }}
          onPointerLeave={() => {
            setHeld(false)
          }}
        >
          <SocialImage
            key={story.id}
            owner={owner}
            asset={story.asset}
            alt={story.caption || story.username}
            onReady={() => {
              setReady(story.id)
              if (ref.current && !ref.current.contains(document.activeElement))
                ref.current.querySelector("button")?.focus()
            }}
          />
        </div>
        <p className="story-caption">{story.caption}</p>
        <div className="story-controls">
          <button
            type="button"
            disabled={index === 0}
            aria-label={t(($) => $.social.previous)}
            onClick={() => {
              setIndex(Math.max(0, index - 1))
            }}
          >
            <ChevronLeft />
          </button>
          {story.owner === owner ? (
            <>
              <span>{t(($) => $.social.views, { count: story.views ?? 0 })}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  void socialWrite(owner, "delete_story", { p_id: story.id })
                    .then(async () => {
                      await cleanupCloudMedia(owner).catch(() => undefined)
                      close()
                    })
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
            </>
          ) : null}
          <button type="button" aria-label={t(($) => $.social.next)} onClick={next}>
            <ChevronRight />
          </button>
        </div>
        {error ? <p role="alert">{t(($) => $.social.storyEmpty)}</p> : null}
      </div>
    </div>
  )
}
export function Stories({
  owner,
  onlyOwn = false,
}: {
  readonly owner: string | null
  readonly onlyOwn?: boolean
}) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<Story[]>([])
  const [revision, setRevision] = useState(0)
  const [compose, setCompose] = useState(false)
  const [selected, setSelected] = useState<{ items: Story[]; index: number } | null>(null)
  const [error, setError] = useState(false)
  const [now, setNow] = useState(Date.now())
  const refresh = useCallback(() => {
    setSelected(null)
    setCompose(false)
    setRevision((v) => v + 1)
  }, [])
  useEffect(() => {
    const changed = () => {
      setRevision((v) => v + 1)
    }
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    window.addEventListener("social-follow-changed", changed)
    return () => {
      clearInterval(timer)
      window.removeEventListener("social-follow-changed", changed)
    }
  }, [])
  useEffect(() => {
    if (!owner) return
    const controller = new AbortController()
    void (async () => {
      await socialWrite(owner, "ensure_profile")
      await socialWrite(owner, "expire_own_stories")
      await cleanupCloudMedia(owner).catch(() => undefined)
      const data = await socialStories(owner)
      if (!controller.signal.aborted) {
        setRows(data)
        setError(false)
      }
    })().catch(() => {
      if (!controller.signal.aborted) setError(true)
    })
    return () => {
      controller.abort()
    }
  }, [owner, revision])
  const activeRows = rows.filter(
    (row) => new Date(row.expires).getTime() > now && (!onlyOwn || row.owner === owner),
  )
  const groups = new Map<string, Story[]>()
  for (const row of activeRows) {
    const group = groups.get(row.owner) ?? []
    group.push(row)
    groups.set(row.owner, group)
  }
  const ordered = [...groups.values()]
    .map((group) => group.sort((a, b) => a.created.localeCompare(b.created)))
    .sort(
      (a, b) =>
        Number(b[0]?.owner === owner) - Number(a[0]?.owner === owner) ||
        Number(a.every((s) => s.viewed)) - Number(b.every((s) => s.viewed)),
    )
  return (
    <section className="stories" aria-label={t(($) => $.social.stories)}>
      <div className="stories-rail">
        {owner ? (
          <button
            className="story-ring story-ring--add"
            type="button"
            onClick={() => {
              setCompose(true)
            }}
          >
            <span>
              <Plus size={25} />
            </span>
            <small>{t(($) => $.social.addStory)}</small>
          </button>
        ) : (
          <Link className="story-ring story-ring--add" to="/auth">
            <span>
              <Plus size={25} />
            </span>
            <small>{t(($) => $.social.yourStory)}</small>
          </Link>
        )}
        {ordered.map((group) => {
          const first = group[0]
          if (!first) return null
          return (
            <button
              className={`story-ring ${group.every((s) => s.viewed) ? "story-ring--seen" : ""}`}
              key={first.owner}
              type="button"
              onClick={() => {
                const items = ordered.flat()
                const firstUnseen = group.find((s) => !s.viewed) ?? first
                setSelected({ items, index: items.findIndex((s) => s.id === firstUnseen.id) })
              }}
            >
              <span aria-hidden="true">
                <SocialImage
                  key={`${owner ?? "anon"}:${first.asset}`}
                  owner={owner}
                  asset={first.asset}
                  alt=""
                  placeholder={first.name.slice(0, 1)}
                />
              </span>
              <small>{first.owner === owner ? t(($) => $.social.yourStory) : first.name}</small>
            </button>
          )
        })}
      </div>
      {ordered.length === 0 ? (
        <p className="stories-empty">{t(($) => $.social.emptyStories)}</p>
      ) : null}
      {error ? (
        <p role="alert">
          {t(($) => $.social.error)}{" "}
          <button className="local-button" type="button" onClick={refresh}>
            {t(($) => $.social.retry)}
          </button>
        </p>
      ) : null}
      {compose && owner ? <StoryComposer owner={owner} close={refresh} /> : null}
      {selected && owner ? (
        <StoryViewer
          key={selected.items[selected.index]?.id}
          owner={owner}
          stories={selected.items}
          initial={selected.index}
          close={refresh}
        />
      ) : null}
    </section>
  )
}
