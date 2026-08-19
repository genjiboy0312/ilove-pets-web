import { Settings } from "lucide-react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"

import { ThumbImage } from "../../components/ThumbImage"
import { getMyProfile } from "./myData"

export function MyRoute() {
  const { t } = useTranslation()
  const profile = getMyProfile()

  return (
    <section className="my-screen" aria-labelledby="my-route-title">
      <header className="my-screen__header">
        <div className="my-screen__heading-group">
          <p className="my-screen__eyebrow">iLove Pets</p>
          <h1 className="my-screen__title" id="my-route-title">
            {t(($) => $.my.heading)}
          </h1>
        </div>
        <Link className="my-screen__settings-link" to="/settings">
          <Settings
            aria-hidden="true"
            className="my-screen__settings-icon"
            size={18}
            strokeWidth={2.1}
          />
          <span className="my-screen__settings-label">{t(($) => $.my.settings)}</span>
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
          {t(($) => $.my.followers, { count: profile.followerCount })}
        </li>
        <li className="my-stats__item">
          {t(($) => $.my.following, { count: profile.followingCount })}
        </li>
      </ul>

      <section className="my-section" aria-labelledby="my-pets-title">
        <h2 className="my-section__title" id="my-pets-title">
          {t(($) => $.my.petsLabel)}
        </h2>
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
      </section>

      <section className="my-section" aria-labelledby="my-posts-title">
        <h2 className="my-section__title" id="my-posts-title">
          {t(($) => $.my.gridLabel)}
        </h2>
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
      </section>
    </section>
  )
}
