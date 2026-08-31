import { useTranslation } from "react-i18next"

import { ActivityList } from "./ActivityList"

export function ActivityRoute() {
  const { t } = useTranslation()

  return (
    <section className="activity-screen" aria-labelledby="activity-route-title">
      <div className="activity-screen__heading-group">
        <p className="activity-screen__eyebrow">iLove Pets</p>
        <h1 className="activity-screen__title" id="activity-route-title">
          {t(($) => $.activity.heading)}
        </h1>
      </div>

      <ActivityList />
    </section>
  )
}
