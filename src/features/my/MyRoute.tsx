import { Settings } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { ThumbImage } from "../../components/ThumbImage"
import type { ImageSourceUrl, PetId, PostId } from "../../types/domain"
import { CommentDialog } from "../home/CommentDialog"
import { useLocalContent } from "../local/useLocalContent"
import { SettingsSheet } from "../settings/SettingsSheet"
import { LocalPostEditor } from "./LocalPostEditor"
import { LocalDataControls } from "./LocalDataControls"
import { LocalBackupControls } from "./LocalBackupControls"
import { GrowthSheet } from "./GrowthSheet"
import { MyCollapsibleSection } from "./MyCollapsibleSection"
import { MyPetList } from "./MyPetList"
import { MyPostGrid } from "./MyPostGrid"
import { PetRegistrationForm } from "./PetRegistrationForm"
import { getFollowers, getFollowing, getMyProfile } from "./myData"
import { usePetRegistrationForm } from "./usePetRegistrationForm"

interface ActivePost {
  readonly postId: PostId
  readonly imageUrl: ImageSourceUrl
}

export function MyRoute() {
  const { t } = useTranslation()
  const [isPetsOpen, setIsPetsOpen] = useState(true)
  const [isPostsOpen, setIsPostsOpen] = useState(true)
  const [openSheet, setOpenSheet] = useState<"followers" | "following" | null>(null)
  const [activeGrowthPetId, setActiveGrowthPetId] = useState<PetId | null>(null)
  const [activePost, setActivePost] = useState<ActivePost | null>(null)
  const [editingPostId, setEditingPostId] = useState<PostId | null>(null)
  const localContent = useLocalContent()
  const editingPost = localContent.content.posts.find((post) => post.postId === editingPostId)
  const growthPet = localContent.content.pets.find((pet) => pet.petId === activeGrowthPetId)
  const profile = getMyProfile(localContent.content)
  const petForm = usePetRegistrationForm(t)
  const connections = openSheet === "followers" ? getFollowers() : getFollowing()

  return (
    <section className="my-screen" aria-labelledby="my-route-title">
      <header className="my-screen__header">
        <div className="my-screen__heading-group">
          <p className="my-screen__eyebrow">iLove Pets</p>
          <h1 className="my-screen__title" id="my-route-title">
            {t(($) => $.my.heading)}
          </h1>
        </div>
        <Link
          aria-label={t(($) => $.my.settings)}
          className="my-screen__settings-link"
          to="/settings"
        >
          <Settings
            aria-hidden="true"
            className="my-screen__settings-icon"
            size={18}
            strokeWidth={2.1}
          />
        </Link>
      </header>

      <div className="my-profile">
        <ThumbImage
          alt={profile.displayName}
          className="my-profile__avatar"
          height={72}
          src={profile.avatarUrl}
          width={72}
        />
        <div className="my-profile__identity">
          <h2 className="my-profile__name">{profile.displayName}</h2>
          <p className="my-profile__username">@{profile.username}</p>
          <p className="my-profile__bio">{profile.bio}</p>
        </div>
      </div>

      <ul className="my-stats">
        <li className="my-stats__item">{t(($) => $.my.posts, { count: profile.posts.length })}</li>
        <li className="my-stats__item">
          <button
            className="my-stats__button"
            onClick={() => {
              setOpenSheet("followers")
            }}
            type="button"
          >
            {t(($) => $.my.followers, { count: profile.followerCount })}
          </button>
        </li>
        <li className="my-stats__item">
          <button
            className="my-stats__button"
            onClick={() => {
              setOpenSheet("following")
            }}
            type="button"
          >
            {t(($) => $.my.following, { count: profile.followingCount })}
          </button>
        </li>
      </ul>

      {localContent.status === "ready" && localContent.content.pets.length === 0 ? (
        <p className="my-pet-form__hint">{t(($) => $.manage.firstPet)}</p>
      ) : null}
      {localContent.content.pets.length > 0 && localContent.content.posts.length === 0 ? (
        <div>
          <p>{t(($) => $.manage.firstPost)}</p>
          <Link to="/create" className="local-button">
            {t(($) => $.manage.createPost)}
          </Link>
        </div>
      ) : null}
      <PetRegistrationForm form={petForm} />
      {localContent.errorMessage === null ? null : (
        <p className="my-section__empty" role="alert">
          {t(($) => $.manage.storageProblem)}
        </p>
      )}

      <MyCollapsibleSection
        contentId="my-pets-content"
        isOpen={isPetsOpen}
        onToggle={() => {
          setIsPetsOpen((isOpen) => !isOpen)
        }}
        title={t(($) => $.my.petsLabel)}
        titleId="my-pets-title"
      >
        <MyPetList onPetClick={setActiveGrowthPetId} pets={profile.pets} />
      </MyCollapsibleSection>

      <MyCollapsibleSection
        contentId="my-posts-content"
        isOpen={isPostsOpen}
        onToggle={() => {
          setIsPostsOpen((isOpen) => !isOpen)
        }}
        title={t(($) => $.my.gridLabel)}
        titleId="my-posts-title"
      >
        <MyPostGrid onPostClick={setActivePost} onEdit={setEditingPostId} posts={profile.posts} />
      </MyCollapsibleSection>

      <LocalBackupControls />
      <LocalDataControls />
      {editingPost === undefined ? null : (
        <LocalPostEditor
          key={editingPost.postId}
          post={editingPost}
          onClose={() => {
            setEditingPostId(null)
          }}
        />
      )}
      {openSheet === null ? null : (
        <SettingsSheet
          onClose={() => {
            setOpenSheet(null)
          }}
          title={t(
            openSheet === "followers" ? ($) => $.my.followersList : ($) => $.my.followingList,
          )}
        >
          <ul className="my-connection-list" role="list">
            {connections.map((connection) => (
              <li className="my-connection" key={connection.userId}>
                <ThumbImage
                  alt=""
                  className="my-connection__avatar"
                  height={40}
                  src={connection.avatarUrl}
                  width={40}
                />
                <div className="my-connection__identity">
                  <p className="my-connection__name">{connection.displayName}</p>
                  <p className="my-connection__username">@{connection.username}</p>
                </div>
              </li>
            ))}
          </ul>
        </SettingsSheet>
      )}

      {activeGrowthPetId === null ? null : (
        <GrowthSheet
          onClose={() => {
            setActiveGrowthPetId(null)
          }}
          key={activeGrowthPetId}
          {...(growthPet === undefined ? {} : { localPet: growthPet })}
          hasPosts={localContent.content.posts.some((post) => post.petId === activeGrowthPetId)}
          petId={activeGrowthPetId}
          petName={profile.pets.find((pet) => pet.petId === activeGrowthPetId)?.name ?? ""}
        />
      )}
      {activePost === null ? null : (
        <CommentDialog
          onClose={() => {
            setActivePost(null)
          }}
          onCommentAdded={() => {
            setActivePost((current) => current)
          }}
          postId={activePost.postId}
          key={activePost.postId}
          postImageUrl={
            localContent.content.posts.find((post) => post.postId === activePost.postId)
              ?.imageUrl ?? activePost.imageUrl
          }
        />
      )}
    </section>
  )
}
