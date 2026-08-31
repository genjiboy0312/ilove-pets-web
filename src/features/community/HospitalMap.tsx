import * as L from "leaflet"
import "leaflet/dist/leaflet.css"
import { MapPinned } from "lucide-react"
import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"

import { getHospitals } from "./hospitalData"

const seoulCenter: [number, number] = [37.5665, 126.978]

const hospitalMarkerIcon = L.divIcon({
  className: "hospital-map__marker",
  html: '<span class="hospital-map__marker-dot" aria-hidden="true"></span>',
  iconAnchor: [12, 24],
  iconSize: [24, 24],
  popupAnchor: [0, -22],
})

function createPopupHtml(hospital: ReturnType<typeof getHospitals>[number]): string {
  return `<strong>${hospital.name}</strong><span>${hospital.address}</span><span>${hospital.hours}</span><span>${hospital.distanceKm.toFixed(1)}km</span>`
}

export function HospitalMap() {
  const { t } = useTranslation()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    const container = mapContainerRef.current

    if (container === null || mapRef.current !== null) {
      return
    }

    const map = L.map(container, {
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView(seoulCenter, 12)

    mapRef.current = map

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    getHospitals().forEach((hospital) => {
      L.marker([hospital.latitude, hospital.longitude], { icon: hospitalMarkerIcon })
        .addTo(map)
        .bindPopup(createPopupHtml(hospital), { className: "hospital-map__popup" })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

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
            {t(($) => $.community.hospitalMapCount, { count: getHospitals().length })}
          </p>
        </div>
      </div>
      <div className="hospital-map__canvas" ref={mapContainerRef} />
    </section>
  )
}
