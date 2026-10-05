import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { i18n, initializeI18n } from "../../i18n/i18n"
import { CommunityRoute } from "./CommunityRoute"
import { getCommunityPosts } from "./communityData"
import { getDongs, getGus, getHospitals, getSis } from "./hospitalData"
import { HospitalMap } from "./HospitalMap"

const leafletMocks = vi.hoisted(() => {
  interface MockMap {
    readonly fitBounds: () => MockMap
    readonly panTo: () => MockMap
    readonly remove: () => void
    readonly setView: () => MockMap
  }

  interface MockBounds {
    readonly kind: "bounds"
  }

  interface MockLayer {
    readonly addTo: () => MockLayer
  }

  interface MockMarker {
    readonly addTo: () => MockMarker
    readonly bindPopup: () => MockMarker
    readonly remove: () => void
  }

  const fitBounds = vi.fn(() => mapInstance)
  const panTo = vi.fn(() => mapInstance)
  const remove = vi.fn()
  const setView = vi.fn(() => mapInstance)

  const mapInstance: MockMap = { fitBounds, panTo, remove, setView }

  const addTileLayerTo = vi.fn(() => tileLayerInstance)

  const tileLayerInstance: MockLayer = { addTo: addTileLayerTo }

  const map = vi.fn(() => mapInstance)
  const tileLayer = vi.fn(() => tileLayerInstance)
  const divIcon = vi.fn(() => ({ options: {} as const }))
  const latLngBounds = vi.fn((): MockBounds => ({ kind: "bounds" }))

  const markerInstances: MockMarker[] = []

  const marker = vi.fn(() => {
    const markerInstance: MockMarker = {
      addTo: vi.fn(() => markerInstance),
      bindPopup: vi.fn(() => markerInstance),
      remove: vi.fn(),
    }
    markerInstances.push(markerInstance)
    return markerInstance
  })

  return {
    addTileLayerTo,
    bindPopupCalls: () => markerInstances.map((markerInstance) => markerInstance.bindPopup),
    divIcon,
    fitBounds,
    latLngBounds,
    map,
    marker,
    markerInstances,
    panTo,
    remove,
    setView,
    tileLayer,
  }
})

vi.mock("leaflet", () => ({
  divIcon: leafletMocks.divIcon,
  latLngBounds: leafletMocks.latLngBounds,
  map: leafletMocks.map,
  marker: leafletMocks.marker,
  tileLayer: leafletMocks.tileLayer,
}))

describe("hospitalData", () => {
  it("returns Seoul hospital markers sorted by distance", () => {
    const hospitals = getHospitals()

    expect(hospitals).toHaveLength(18)
    expect(hospitals.every((hospital) => hospital.contactLabel.startsWith("데모 전화"))).toBe(true)
    expect(hospitals.every((hospital) => hospital.contactHref.startsWith("tel:02-0000-"))).toBe(
      true,
    )
    for (let index = 1; index < hospitals.length; index += 1) {
      const previousHospital = hospitals[index - 1]
      const currentHospital = hospitals[index]

      if (previousHospital === undefined || currentHospital === undefined) {
        throw new Error("Expected hospital distance comparison pair.")
      }

      expect(previousHospital.distanceKm).toBeLessThanOrEqual(currentHospital.distanceKm)
    }
    expect(hospitals.every((hospital) => hospital.latitude > 37 && hospital.longitude > 126)).toBe(
      true,
    )
  })

  it("keeps region option helpers consistent with the hospital dataset", () => {
    const hospitals = getHospitals()

    expect(getSis()).toEqual(["서울"])

    getSis().forEach((si) => {
      expect(
        getGus(si).every((gu) =>
          hospitals.some((hospital) => hospital.si === si && hospital.gu === gu),
        ),
      ).toBe(true)

      getGus(si).forEach((gu) => {
        expect(
          getDongs(si, gu).every((dong) =>
            hospitals.some(
              (hospital) => hospital.si === si && hospital.gu === gu && hospital.dong === dong,
            ),
          ),
        ).toBe(true)
      })
    })
  })
})

describe("HospitalMap", () => {
  beforeEach(async () => {
    await initializeI18n()
    await i18n.changeLanguage("ko")
    leafletMocks.map.mockClear()
    leafletMocks.tileLayer.mockClear()
    leafletMocks.marker.mockClear()
    leafletMocks.divIcon.mockClear()
    leafletMocks.setView.mockClear()
    leafletMocks.fitBounds.mockClear()
    leafletMocks.panTo.mockClear()
    leafletMocks.latLngBounds.mockClear()
    leafletMocks.remove.mockClear()
    leafletMocks.addTileLayerTo.mockClear()
    leafletMocks.markerInstances.splice(0)
  })

  afterEach(() => {
    cleanup()
  })

  it("initializes Leaflet markers and removes the map on unmount", () => {
    const { unmount } = render(<HospitalMap />)

    expect(screen.getByRole("heading", { level: 2, name: "동물병원 지도" })).toBeInTheDocument()
    expect(leafletMocks.map).toHaveBeenCalledTimes(1)
    expect(leafletMocks.setView).toHaveBeenCalledWith([37.5665, 126.978], 12)
    expect(leafletMocks.tileLayer).toHaveBeenCalledTimes(1)
    expect(leafletMocks.addTileLayerTo).toHaveBeenCalledTimes(1)
    expect(leafletMocks.marker).toHaveBeenCalledTimes(getHospitals().length)
    expect(screen.getByRole("list", { name: "동물병원 목록" })).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: /^데모 전화/ })).toHaveLength(getHospitals().length)
    const firstHospital = getHospitals()[0]
    const firstBindPopup = leafletMocks.bindPopupCalls()[0]

    if (firstHospital === undefined || firstBindPopup === undefined) {
      throw new Error("Expected at least one hospital marker popup.")
    }

    expect(firstBindPopup).toHaveBeenCalledWith(expect.stringContaining(firstHospital.name), {
      className: "hospital-map__popup",
    })
    expect(firstBindPopup).toHaveBeenCalledWith(
      expect.stringContaining(firstHospital.contactHref),
      { className: "hospital-map__popup" },
    )

    unmount()

    expect(leafletMocks.remove).toHaveBeenCalledTimes(1)
  })

  it("filters markers by selected district and fits the map to the filtered hospitals", () => {
    render(<HospitalMap />)
    fireEvent.change(screen.getByLabelText("시"), { target: { value: "서울" } })
    leafletMocks.marker.mockClear()
    leafletMocks.fitBounds.mockClear()
    leafletMocks.latLngBounds.mockClear()
    leafletMocks.markerInstances.splice(0)

    fireEvent.change(screen.getByLabelText("구"), { target: { value: "강남구" } })

    const filteredHospitals = getHospitals({ si: "서울", gu: "강남구" })
    const firstFilteredHospital = filteredHospitals[0]
    const firstBindPopup = leafletMocks.bindPopupCalls()[0]

    expect(screen.getByText("서울 지역 동물병원 3곳")).toBeInTheDocument()
    expect(leafletMocks.marker).toHaveBeenCalledTimes(filteredHospitals.length)
    expect(leafletMocks.latLngBounds).toHaveBeenCalledTimes(1)
    expect(leafletMocks.fitBounds).toHaveBeenCalledTimes(1)

    if (firstFilteredHospital === undefined || firstBindPopup === undefined) {
      throw new Error("Expected filtered hospital marker popup.")
    }

    expect(firstBindPopup).toHaveBeenCalledWith(
      expect.stringContaining(firstFilteredHospital.name),
      { className: "hospital-map__popup" },
    )
  })

  it("filters markers and list items to night emergency demo hospitals", () => {
    render(<HospitalMap />)
    leafletMocks.marker.mockClear()
    leafletMocks.fitBounds.mockClear()
    leafletMocks.latLngBounds.mockClear()
    leafletMocks.markerInstances.splice(0)

    fireEvent.click(screen.getByRole("button", { name: "야간 응급만 보기" }))

    const nightHospitals = getHospitals({ nightOnly: true })

    expect(
      screen.getByText(`서울 지역 동물병원 ${nightHospitals.length.toString()}곳`),
    ).toBeInTheDocument()
    expect(leafletMocks.marker).toHaveBeenCalledTimes(nightHospitals.length)
    expect(screen.getAllByText("야간 진료")).toHaveLength(nightHospitals.length)
    expect(screen.queryByText("서울숲 동물병원")).not.toBeInTheDocument()
    expect(screen.getByText("남산 24시 동물의료센터")).toBeInTheDocument()
  })

  it("switches the community route between board and hospital map", () => {
    render(
      <MemoryRouter>
        <CommunityRoute />
      </MemoryRouter>,
    )

    expect(screen.getByRole("list", { name: "커뮤니티 게시물" })).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(getCommunityPosts().length)

    fireEvent.click(screen.getByRole("button", { name: "병원 지도" }))

    expect(screen.queryByRole("list", { name: "커뮤니티 게시물" })).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "동물병원 지도" })).toBeInTheDocument()
    expect(leafletMocks.map).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: "게시판" }))

    expect(screen.getByRole("list", { name: "커뮤니티 게시물" })).toBeInTheDocument()
    expect(leafletMocks.remove).toHaveBeenCalledTimes(1)
  })
})
