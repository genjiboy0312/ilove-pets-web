import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { GrowthRecord } from "../local/localContentTypes"
import { localDate } from "../local/growthDates"

export function GrowthCalendar({ records }: { readonly records: readonly GrowthRecord[] }) {
  const { i18n, t } = useTranslation()
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(() => localDate())
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const days = new Date(year, monthIndex + 1, 0).getDate()
  const dayLabel = new Intl.DateTimeFormat(i18n.language, { weekday: "short" })
  const monthLabel = new Intl.DateTimeFormat(i18n.language, {
    year: "numeric",
    month: "long",
  }).format(month)
  const dateForDay = (day: number) =>
    `${String(year)}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  const selection = records.filter((record) => record.date === selectedDate)
  return (
    <section aria-label={t(($) => $.manage.calendar)} className="growth-calendar">
      <header className="growth-calendar__header">
        <button
          className="local-button"
          aria-label={t(($) => $.manage.previousMonth)}
          type="button"
          onClick={() => {
            setMonth(new Date(year, monthIndex - 1, 1))
            setSelectedDate(null)
          }}
        >
          ‹
        </button>
        <h3 aria-live="polite">{monthLabel}</h3>
        <button
          className="local-button"
          aria-label={t(($) => $.manage.nextMonth)}
          type="button"
          onClick={() => {
            setMonth(new Date(year, monthIndex + 1, 1))
            setSelectedDate(null)
          }}
        >
          ›
        </button>
      </header>
      <button
        className="local-button"
        type="button"
        onClick={() => {
          const now = new Date()
          setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
          setSelectedDate(localDate(now))
        }}
      >
        {t(($) => $.growthEdit.today)}
      </button>
      <div className="growth-calendar__grid">
        {Array.from({ length: 7 }, (_, index) => (
          <span className="growth-calendar__weekday" key={index}>
            {dayLabel.format(new Date(2026, 0, 4 + index))}
          </span>
        ))}
        {Array.from({ length: month.getDay() }, (_, index) => (
          <span aria-hidden="true" key={`blank-${String(index)}`} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const date = dateForDay(index + 1)
          const count = records.filter((record) => record.date === date).length
          return (
            <button
              className="growth-calendar__day"
              type="button"
              key={date}
              aria-label={`${date} (${String(count)})`}
              aria-pressed={selectedDate === date}
              data-has-record={count > 0}
              aria-current={date === localDate() ? "date" : undefined}
              onClick={() => {
                setSelectedDate(date)
              }}
            >
              {index + 1}
              {count > 0 ? <span aria-hidden="true"> •</span> : null}
            </button>
          )
        })}
      </div>
      {selectedDate === null ? null : (
        <div aria-live="polite">
          <h4>{t(($) => $.growthEdit.selected, { date: selectedDate })}</h4>
          {selection.length === 0 ? (
            <p>{t(($) => $.manage.noRecords)}</p>
          ) : (
            <ul>
              {selection.map((record) => (
                <li key={record.id}>
                  {record.weightKg === undefined ? "" : `${String(record.weightKg)} kg `}
                  {record.note}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
