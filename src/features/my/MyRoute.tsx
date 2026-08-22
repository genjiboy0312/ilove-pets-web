import { ChevronDown, Settings } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"

import { ThumbImage } from "../../components/ThumbImage"
import { SettingsSheet } from "../settings/SettingsSheet"
import { getFollowers, getFollowing, getMyProfile } from "./myData"

export function MyRoute() {
  const { t } = useTranslation()
  const [isPetsOpen, setIsPetsOpen] = useState(true)
  const [isPostsOpen, setIsPostsOpen] = useState(true)
  const [openSheet, setOpenSheet] = useState<"followers" | "following" | null>(null)
  const profile = getMyProfile()
  const followers = getFollowers()
  const following = getFollowing()

  function closeSheet() {
    setOpenSheet(null)
  }

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

      <section className="my-section" aria-labelledby="my-pets-title">
        <h2 className="my-section__title" id="my-pets-title">
          <button
            aria-controls="my-pets-content"
            aria-expanded={isPetsOpen}
            className="my-section__toggle"
            onClick={() => {
              setIsPetsOpen((isOpen) => !isOpen)
            }}
            type="button"
          >
            <span>{t(($) => $.my.petsLabel)}</span>
            <ChevronDown
              aria-hidden="true"
              className={[
                "my-section__toggle-icon",
                isPetsOpen ? "" : "my-section__toggle-icon--closed",
              ]
                .filter(Boolean)
                .join(" ")}
              size={16}
              strokeWidth={2.1}
            />
          </button>
        </h2>
        <div hidden={!isPetsOpen} id="my-pets-content">
        <ul className="my-pet-list">
          {profile.pets.map((pet) => (
            <li className="my-pet-card" key={pet.petId}>
              <ThumbImage
                alt={pet.name}
                className="my-pet-card__avatar"
                height={48}
                src={pet.avatarUrl}
                width={48}
              />
              <div className="my-pet-card__identity">
                <h3 className="my-pet-card__name">{pet.name}</h3>
                <p className="my-pet-card__breed">{pet.breed}</p>
              </div>
            </li>
          ))}
        </ul>
        </div>
      </section>

      <section className="my-section" aria-labelledby="my-posts-title">
        <h2 className="my-section__title" id="my-posts-title">
          <button
            aria-controls="my-posts-content"
            aria-expanded={isPostsOpen}
            className="my-section__toggle"
            onClick={() => {
              setIsPostsOpen((isOpen) => !isOpen)
            }}
            type="button"
          >
            <span>{t(($) => $.my.gridLabel)}</span>
            <ChevronDown
              aria-hidden="true"
              className={[
                "my-section__toggle-icon",
                isPostsOpen ? "" : "my-section__toggle-icon--closed",
              ]
                .filter(Boolean)
                .join(" ")}
              size={16}
              strokeWidth={2.1}
            />
          </button>
        </h2>
        <div hidden={!isPostsOpen} id="my-posts-content">
        {profile.posts.length === 0 ? (
          <p className="my-section__empty">{t(($) => $.my.empty)}</p>
        ) : (
          <ul className="my-post-grid">
            {profile.posts.map((post) => (
              <li className="my-post-grid__item" key={post.postId}>
                <ThumbImage
                  alt={post.petName}
                  className="my-post-grid__image"
                  src={post.imageUrl}
                />
              </li>
            ))}
          </ul>
        )}
        </div>
      </section>

      {openSheet === null ? null : (
        <SettingsSheet
          onClose={closeSheet}
          title={t(
            openSheet === "followers" ? ($) => $.my.followersList : ($) => $.my.followingList,
          )}
        >
          <ul className="my-connection-list" role="list">
            {(openSheet === "followers" ? followers : following).map((connection) => (
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
    </section>
  )
}
