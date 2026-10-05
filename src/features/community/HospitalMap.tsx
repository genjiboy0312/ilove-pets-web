import * as L from "leaflet"
import "leaflet/dist/leaflet.css"
import { MapPinned, Moon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { getDongs, getGus, getHospitals, getSis } from "./hospitalData"

const seoulCenter: [number, number] = [37.5665, 126.978]
const singleHospitalBoundsPadding = 0.006

function createRegionFilter(si: string, gu: string, dong: string, nightOnly: boolean) {
  return {
    ...(si === "" ? {} : { si }),
    ...(gu === "" ? {} : { gu }),
    ...(dong === "" ? {} : { dong }),
    ...(nightOnly ? { nightOnly } : {}),
  }
}

const hospitalMarkerIcon = L.divIcon({
  className: "hospital-map__marker",
  html: '<span class="hospital-map__marker-dot" aria-hidden="true"></span>',
  iconAnchor: [12, 24],
  iconSize: [24, 24],
  popupAnchor: [0, -22],
})

function createPopupHtml(hospital: ReturnType<typeof getHospitals>[number]): string {
  return `<strong>${hospital.name}</strong><span>${hospital.address}</span><span>${hospital.hours}</span><a href="${hospital.contactHref}">${hospital.contactLabel}</a><span>${hospital.distanceKm.toFixed(1)}km</span>`
}

export function HospitalMap() {
  const { t } = useTranslation()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRefs = useRef<L.Marker[]>([])
  const [selectedSi, setSelectedSi] = useState("")
  const [selectedGu, setSelectedGu] = useState("")
  const [selectedDong, setSelectedDong] = useState("")
  const [nightOnly, setNightOnly] = useState(false)
  const filteredHospitals = useMemo(
    () => getHospitals(createRegionFilter(selectedSi, selectedGu, selectedDong, nightOnly)),
    [nightOnly, selectedDong, selectedGu, selectedSi],
  )
  const sis = useMemo(() => getSis(), [])
  const gus = useMemo(() => (selectedSi === "" ? [] : getGus(selectedSi)), [selectedSi])
  const dongs = useMemo(
    () => (selectedSi === "" || selectedGu === "" ? [] : getDongs(selectedSi, selectedGu)),
    [selectedGu, selectedSi],
  )

  useEffect(() => {
    const container = mapContainerRef.current

    if (container === null || mapRef.current !== null) {
      return
    }

    const map = L.map(container, {
      scrollWheelZoom: true,
      zoomControl: true,
    }).setView(seoulCenter, 12)

    mapRef.current = map

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    return () => {
      markerRefs.current.forEach((marker) => {
        marker.remove()
      })
      markerRefs.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current

    if (map === null) {
      return
    }

    markerRefs.current.forEach((marker) => {
      marker.remove()
    })
    markerRefs.current = filteredHospitals.map((hospital) =>
      L.marker([hospital.latitude, hospital.longitude], { icon: hospitalMarkerIcon })
        .addTo(map)
        .bindPopup(createPopupHtml(hospital), { className: "hospital-map__popup" }),
    )

    if (selectedSi === "" && selectedGu === "" && selectedDong === "") {
      return
    }

    if (filteredHospitals.length === 0) {
      map.panTo(seoulCenter)
      return
    }

    const [firstHospital] = filteredHospitals
    const bounds =
      filteredHospitals.length === 1 && firstHospital !== undefined
        ? L.latLngBounds([
            [
              firstHospital.latitude - singleHospitalBoundsPadding,
              firstHospital.longitude - singleHospitalBoundsPadding,
            ],
            [
              firstHospital.latitude + singleHospitalBoundsPadding,
              firstHospital.longitude + singleHospitalBoundsPadding,
            ],
          ])
        : L.latLngBounds(
            filteredHospitals.map((hospital) => [hospital.latitude, hospital.longitude]),
          )

    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 })
  }, [filteredHospitals, nightOnly, selectedDong, selectedGu, selectedSi])

  function handleSiChange(value: string) {
    setSelectedSi(value)
    setSelectedGu("")
    setSelectedDong("")
  }

  function handleGuChange(value: string) {
    setSelectedGu(value)
    setSelectedDong("")
  }

  function resetRegionFilter() {
    setSelectedSi("")
    setSelectedGu("")
    setSelectedDong("")
  }

  return (
    <section className="hospital-map" aria-labelledby="hospital-map-title">
      <div className="hospital-map__summary">
        <div className="hospital-map__summary-icon" aria-hidden="true">
          <MapPinned size={18} strokeWidth={2.1} />
        </div>
        <div>
          <h2 className="hospital-map__title" id="hospital-map-title">
            {t(($) => $.community.hospitalMapSectionLabel)}
          </h2>
          <p className="hospital-map__count">
            {t(($) => $.community.hospitalMapCount, { count: filteredHospitals.length })}
          </p>
        </div>
      </div>
      <div
        aria-label={t(($) => $.community.regionFilterLabel)}
        className="hospital-map__region-filter"
      >
        <label className="hospital-map__region-field">
          <span className="hospital-map__region-label">{t(($) => $.community.siPlaceholder)}</span>
          <select
            className="hospital-map__region-select"
            onChange={(event) => {
              handleSiChange(event.target.value)
            }}
            value={selectedSi}
          >
            <option value="">{t(($) => $.community.allRegions)}</option>
            {sis.map((si) => (
              <option key={si} value={si}>
                {si}
              </option>
            ))}
          </select>
        </label>
        <label className="hospital-map__region-field">
          <span className="hospital-map__region-label">{t(($) => $.community.guPlaceholder)}</span>
          <select
            className="hospital-map__region-select"
            onChange={(event) => {
              handleGuChange(event.target.value)
            }}
            value={selectedGu}
          >
            <option value="">{t(($) => $.community.allDistricts)}</option>
            {gus.map((gu) => (
              <option key={gu} value={gu}>
                {gu}
              </option>
            ))}
          </select>
        </label>
        <label className="hospital-map__region-field">
          <span className="hospital-map__region-label">
            {t(($) => $.community.dongPlaceholder)}
          </span>
          <select
            className="hospital-map__region-select"
            onChange={(event) => {
              setSelectedDong(event.target.value)
            }}
            value={selectedDong}
          >
            <option value="">{t(($) => $.community.allNeighborhoods)}</option>
            {dongs.map((dong) => (
              <option key={dong} value={dong}>
                {dong}
              </option>
            ))}
          </select>
        </label>
        <button className="hospital-map__region-reset" onClick={resetRegionFilter} type="button">
          {t(($) => $.community.resetFilter)}
        </button>
      </div>
      <button
        aria-pressed={nightOnly}
        className="hospital-map__night-filter"
        onClick={() => {
          setNightOnly((current) => !current)
        }}
        type="button"
      >
        <Moon aria-hidden="true" size={16} strokeWidth={2.1} />
        <span>{t(($) => $.community.nightOnlyFilter)}</span>
      </button>
      <p className="hospital-map__notice">{t(($) => $.community.hospitalDemoNotice)}</p>
      <div className="hospital-map__canvas" ref={mapContainerRef} />
      {filteredHospitals.length === 0 ? (
        <p className="hospital-map__empty">{t(($) => $.community.hospitalEmpty)}</p>
      ) : (
        <ul className="hospital-map__list" aria-label={t(($) => $.community.hospitalListLabel)}>
          {filteredHospitals.map((hospital) => (
            <li className="hospital-card" key={`${hospital.gu}-${hospital.dong}-${hospital.name}`}>
              <div className="hospital-card__header">
                <h3 className="hospital-card__title">{hospital.name}</h3>
                {hospital.isNightEmergencyAvailable ? (
                  <span className="hospital-card__badge">{t(($) => $.community.nightBadge)}</span>
                ) : null}
              </div>
              <p className="hospital-card__meta">{hospital.address}</p>
              <p className="hospital-card__meta">
                {t(($) => $.community.hospitalHoursLabel)} {hospital.hours}
              </p>
              <p className="hospital-card__meta">
                {t(($) => $.community.hospitalDistanceLabel, {
                  distance: hospital.distanceKm.toFixed(1),
                })}
              </p>
              <a className="hospital-card__contact" href={hospital.contactHref}>
                {hospital.contactLabel}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
