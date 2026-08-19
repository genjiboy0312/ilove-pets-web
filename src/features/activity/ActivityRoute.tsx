import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { ThumbImage } from "../../components/ThumbImage"
import { getActivities } from "./activityData"

const activityMessageKeys = {
  LIKE: "like",
  COMMENT: "comment",
  FOLLOW: "follow",
} as const

export function ActivityRoute() {
  const { i18n, t } = useTranslation()
  const activities = getActivities()
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      }),
    [i18n.language],
  )

  return (
    <section className="activity-screen" aria-labelledby="activity-route-title">
      <div className="activity-screen__heading-group">
        <p className="activity-screen__eyebrow">iLove Pets</p>
        <h1 className="activity-screen__title" id="activity-route-title">
          {t(($) => $.activity.heading)}
        </h1>
      </div>

      {activities.length === 0 ? (
        <p className="activity-screen__empty">{t(($) => $.activity.empty)}</p>
      ) : (
        <ul className="activity-list" aria-label={t(($) => $.activity.listLabel)}>
          {activities.map((activity) => {
            const postedTime = dateTimeFormatter.format(new Date(activity.createdAt))

            return (
              <li className="activity-item" key={activity.activityId}>
                <ThumbImage
                  alt={activity.actorDisplayName}
                  className="activity-item__avatar"
                  height={44}
                  src={activity.actorAvatarUrl}
                  width={44}
                />
                <div className="activity-item__body">
                  <p className="activity-item__message">
                    {t(($) => $.activity[activityMessageKeys[activity.type]], {
                      actor: activity.actorDisplayName,
                    })}
                  </p>
                  {activity.commentPreview === undefined ? null : (
                    <p className="activity-item__preview">"{activity.commentPreview}"</p>
                  )}
                  <time className="activity-item__time" dateTime={activity.createdAt}>
                    {t(($) => $.activity.postedAt, { time: postedTime })}
                  </time>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
