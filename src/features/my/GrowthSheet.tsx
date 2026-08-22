import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { PetId } from "../../types/domain"
import { SettingsSheet } from "../settings/SettingsSheet"
import { getPetGrowth } from "./myData"

const CHART_WIDTH = 260
const CHART_HEIGHT = 96

interface GrowthSheetProps {
  readonly onClose: () => void
  readonly petId: PetId
  readonly petName: string
}

export function GrowthSheet({ onClose, petId, petName }: GrowthSheetProps) {
  const { t } = useTranslation()
  const growth = useMemo(() => getPetGrowth(petId), [petId])

  const weights = growth.weights
  const weightValues = weights.map((point) => point.weightKg)
  const minWeight = Math.min(...weightValues)
  const maxWeight = Math.max(...weightValues)
  const span = maxWeight - minWeight || 1
  const polylinePoints = weights
    .map((point, index) => {
      const x =
        weights.length === 1 ? CHART_WIDTH / 2 : (index / (weights.length - 1)) * CHART_WIDTH
      const y =
        CHART_HEIGHT - ((point.weightKg - minWeight) / span) * (CHART_HEIGHT - 12) - 6

      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  return (
    <SettingsSheet onClose={onClose} title={petName}>
      <section aria-label={t(($) => $.my.growthChartLabel)}>
        <svg
          aria-hidden="true"
          className="growth-chart"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        >
          <polyline
            className="growth-chart__line"
            fill="none"
            points={polylinePoints}
            strokeWidth="2.5"
          />
        </svg>
        <div aria-hidden="true" className="growth-chart__labels">
          <span>{weights[0]?.month}</span>
          <span>{weights.at(-1)?.month}</span>
        </div>
      </section>

      <section aria-label={t(($) => $.my.careEventsLabel)}>
        <h3 className="growth-events__heading">{t(($) => $.my.careEventsLabel)}</h3>
        {growth.events.length === 0 ? (
          <p className="growth-events__empty">{t(($) => $.my.noCareEvents)}</p>
        ) : (
          <ul className="growth-events">
            {growth.events.map((event) => (
              <li className="growth-events__item" key={event.eventId}>
                <time className="growth-events__date" dateTime={event.date}>
                  {event.date.slice(0, 10)}
                </time>
                <span className="growth-events__label">{event.label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SettingsSheet>
  )
}
