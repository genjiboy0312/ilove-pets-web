import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { cloudMutation, cleanupCloudMedia } from "./cloudApi"
import { CloudGrowthForm, CloudPetForm, CloudPostForm } from "./CloudForms"
import type { CloudRun } from "./CloudForms"
import { CloudImage } from "./CloudImage"
import type { CloudGrowth, CloudPet, CloudPost } from "./cloudTypes"
import { useCloudWorkspace } from "./useCloudWorkspace"
import { PublishControl } from "../social/PublishControl"

function DeleteControl({
  busy,
  run,
  action,
}: {
  readonly busy: boolean
  readonly run: CloudRun
  readonly action: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [armed, setArmed] = useState(false)
  return (
    <span className="local-editor__actions">
      <button
        className="local-button"
        type="button"
        disabled={busy}
        onClick={() => {
          if (!armed) setArmed(true)
          else
            void run(action).then((ok) => {
              if (ok) setArmed(false)
            })
        }}
      >
        {t(armed ? ($) => $.cloud.confirm : ($) => $.cloud.remove)}
      </button>
      {armed ? (
        <button
          className="local-button"
          type="button"
          disabled={busy}
          onClick={() => {
            setArmed(false)
          }}
        >
          {t(($) => $.cloud.cancel)}
        </button>
      ) : null}
    </span>
  )
}
export function CloudWorkspace({
  owner,
  embedded = false,
}: {
  readonly owner: string
  readonly embedded?: boolean
}) {
  const { t } = useTranslation()
  const cloud = useCloudWorkspace(owner)
  const { snapshot, busy, run } = cloud
  const [editingPet, setEditingPet] = useState<CloudPet | null>(null)
  const [editingGrowth, setEditingGrowth] = useState<CloudGrowth | null>(null)
  const [editingPost, setEditingPost] = useState<CloudPost | null>(null)
  const [postLimit, setPostLimit] = useState(20)
  const used = new Set(snapshot.posts.map((post) => post.assetId))
  const unused = snapshot.assets.filter(
    (asset) =>
      !used.has(asset.id) &&
      !snapshot.storyAssets?.includes(asset.id) &&
      asset.status !== "deleted",
  )
  const petName = (id: string) =>
    snapshot.pets.find((pet) => pet.id === id)?.name ?? t(($) => $.cloud.pet)
  return (
    <section className="cloud-screen" aria-labelledby="cloud-title">
      {embedded ? (
        <h2 id="cloud-title">{t(($) => $.cloud.title)}</h2>
      ) : (
        <h1 id="cloud-title">{t(($) => $.cloud.title)}</h1>
      )}
      <p>{t(($) => $.cloud.notice)}</p>
      {!embedded ? (
        <Link className="local-button" to="/myaccount">
          {t(($) => $.cloud.back)}
        </Link>
      ) : null}
      <button
        className="local-button"
        type="button"
        disabled={busy}
        onClick={() => {
          void cloud.refresh().catch(() => undefined)
        }}
      >
        {t(($) => $.cloud.refresh)}
      </button>
      {cloud.status === "loading" ? <p role="status">{t(($) => $.cloud.loading)}</p> : null}
      {cloud.error ? (
        <p role="alert">{t(($) => $.cloud.errors[cloud.error ?? "request"])}</p>
      ) : null}
      {busy ? (
        <p role="status">{t(($) => $.cloud.saving)}</p>
      ) : cloud.saved ? (
        <p role="status">{t(($) => $.cloud.saved)}</p>
      ) : null}
      {cloud.status === "ready" ? (
        <>
          <section className="cloud-section" aria-labelledby="cloud-pets-title">
            <h2 id="cloud-pets-title">{t(($) => $.cloud.pets)}</h2>
            <CloudPetForm
              key={editingPet?.id ?? "new"}
              owner={owner}
              busy={busy}
              run={run}
              {...(editingPet ? { pet: editingPet } : {})}
              close={() => {
                setEditingPet(null)
              }}
            />
            {snapshot.pets.length === 0 ? (
              <p>{t(($) => $.cloud.empty)}</p>
            ) : (
              <ul className="cloud-list">
                {snapshot.pets.map((pet) => (
                  <li key={pet.id}>
                    <strong>{pet.name}</strong>
                    <p>{pet.breed}</p>
                    <button
                      type="button"
                      className="local-button"
                      disabled={busy}
                      onClick={() => {
                        setEditingPet(pet)
                      }}
                    >
                      {t(($) => $.cloud.edit)}
                    </button>
                    <DeleteControl
                      key={pet.version}
                      busy={busy}
                      run={run}
                      action={() =>
                        cloudMutation(owner, "delete_pet", {
                          p_id: pet.id,
                          p_expected_version: pet.version,
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
          {snapshot.pets.length === 0 ? (
            <p>{t(($) => $.cloud.choosePet)}</p>
          ) : (
            <>
              <section className="cloud-section" aria-labelledby="cloud-posts-title">
                <h2 id="cloud-posts-title">{t(($) => $.cloud.posts)}</h2>
                {!snapshot.mediaReady ? <p>{t(($) => $.cloud.mediaPending)}</p> : null}
                <CloudPostForm
                  key={editingPost?.id ?? "new"}
                  owner={owner}
                  busy={busy || (!snapshot.mediaReady && editingPost === null)}
                  run={run}
                  pets={snapshot.pets}
                  {...(editingPost ? { post: editingPost } : {})}
                  close={() => {
                    setEditingPost(null)
                  }}
                />
                {snapshot.posts.length === 0 ? (
                  <p>{t(($) => $.cloud.empty)}</p>
                ) : (
                  <ul className="cloud-list">
                    {snapshot.posts.slice(0, postLimit).map((post) => {
                      const asset = snapshot.assets.find((item) => item.id === post.assetId)
                      return (
                        <li key={post.id}>
                          <h3>{petName(post.petId)}</h3>
                          {asset?.key && asset.status === "ready" ? (
                            <CloudImage
                              key={asset.key}
                              owner={owner}
                              objectKey={asset.key}
                              alt={petName(post.petId)}
                            />
                          ) : null}
                          <p className="cloud-post__text">{post.content}</p>
                          <PublishControl
                            key={post.version}
                            owner={owner}
                            id={post.id}
                            version={post.version}
                            visibility={post.visibility ?? "private"}
                            run={run}
                            busy={busy}
                          />
                          <button
                            type="button"
                            className="local-button"
                            disabled={busy}
                            onClick={() => {
                              setEditingPost(post)
                            }}
                          >
                            {t(($) => $.cloud.edit)}
                          </button>
                          <DeleteControl
                            key={post.version}
                            busy={busy}
                            run={run}
                            action={async () => {
                              await cloudMutation(owner, "delete_private_post", {
                                p_id: post.id,
                                p_expected_version: post.version,
                              })
                              // A deletion remains committed if physical cleanup fails; its quota stays charged.
                              try {
                                await cleanupCloudMedia(owner)
                              } catch {
                                /* The cleanup control provides an explicit retry. */
                              }
                            }}
                          />
                        </li>
                      )
                    })}
                  </ul>
                )}
                {snapshot.posts.length > postLimit ? (
                  <button
                    className="local-button"
                    type="button"
                    onClick={() => {
                      setPostLimit((value) => value + 20)
                    }}
                  >
                    {t(($) => $.cloud.more)}
                  </button>
                ) : null}
              </section>
              <section className="cloud-section" aria-labelledby="cloud-growth-title">
                <h2 id="cloud-growth-title">{t(($) => $.cloud.records)}</h2>
                <CloudGrowthForm
                  key={editingGrowth?.id ?? "new"}
                  owner={owner}
                  busy={busy}
                  run={run}
                  pets={snapshot.pets}
                  {...(editingGrowth ? { record: editingGrowth } : {})}
                  close={() => {
                    setEditingGrowth(null)
                  }}
                />
                {snapshot.growth.length === 0 ? (
                  <p>{t(($) => $.cloud.empty)}</p>
                ) : (
                  <ul className="cloud-list">
                    {[...snapshot.growth]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((record) => (
                        <li key={record.id}>
                          <strong>
                            {petName(record.petId)} · {record.date}
                          </strong>
                          <p>{record.weight === null ? null : `${record.weight.toString()} kg`}</p>
                          <p className="cloud-post__text">{record.note}</p>
                          <button
                            className="local-button"
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setEditingGrowth(record)
                            }}
                          >
                            {t(($) => $.cloud.edit)}
                          </button>
                          <DeleteControl
                            key={record.version}
                            busy={busy}
                            run={run}
                            action={() =>
                              cloudMutation(owner, "delete_growth_record", {
                                p_id: record.id,
                                p_expected_version: record.version,
                              })
                            }
                          />
                        </li>
                      ))}
                  </ul>
                )}
              </section>
            </>
          )}
          <section className="cloud-section" aria-labelledby="cloud-cleanup-title">
            <h2 id="cloud-cleanup-title">{t(($) => $.cloud.reserved)}</h2>
            <p>
              {(snapshot.assets.reduce((sum, asset) => sum + asset.bytes, 0) / 1048576).toFixed(1)}{" "}
              MiB / 50 MiB
            </p>
            <button
              className="local-button"
              type="button"
              disabled={busy || !snapshot.mediaReady}
              onClick={() => {
                void run(() => cleanupCloudMedia(owner))
              }}
            >
              {t(($) => $.cloud.cleanup)}
            </button>
            <ul className="cloud-list">
              {unused.map((asset) => (
                <li key={asset.id}>
                  <span>{(asset.bytes / 1048576).toFixed(1)} MiB</span>
                  <button
                    className="local-button"
                    type="button"
                    disabled={busy || asset.status === "processing" || asset.status === "deleting"}
                    onClick={() => {
                      void run(async () => {
                        await cloudMutation(owner, "discard_media", { p_id: asset.id })
                        try {
                          await cleanupCloudMedia(owner)
                        } catch {
                          /* Keep the cleanup queue for the retry button. */
                        }
                      })
                    }}
                  >
                    {t(($) => $.cloud.discard)}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </section>
  )
}
