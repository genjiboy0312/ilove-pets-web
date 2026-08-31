import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { i18n, initializeI18n } from "../../i18n/i18n"
import { CommunityRoute } from "./CommunityRoute"
import { getCommunityPosts } from "./communityData"
import { getHospitals } from "./hospitalData"
import { HospitalMap } from "./HospitalMap"

const leafletMocks = vi.hoisted(() => {
  interface MockMap {
    readonly remove: () => void
    readonly setView: () => MockMap
  }

  interface MockLayer {
    readonly addTo: () => MockLayer
  }

  interface MockMarker {
    readonly addTo: () => MockMarker
    readonly bindPopup: () => MockMarker
  }

  const remove = vi.fn()
  const setView = vi.fn(() => mapInstance)

  const mapInstance: MockMap = { remove, setView }

  const addTileLayerTo = vi.fn(() => tileLayerInstance)

  const tileLayerInstance: MockLayer = { addTo: addTileLayerTo }

  const map = vi.fn(() => mapInstance)
  const tileLayer = vi.fn(() => tileLayerInstance)
  const divIcon = vi.fn(() => ({ options: {} as const }))

  const markerInstances: MockMarker[] = []

  const marker = vi.fn(() => {
    const markerInstance: MockMarker = {
      addTo: vi.fn(() => markerInstance),
      bindPopup: vi.fn(() => markerInstance),
    }
    markerInstances.push(markerInstance)
    return markerInstance
  })

  return {
    addTileLayerTo,
    bindPopupCalls: () => markerInstances.map((markerInstance) => markerInstance.bindPopup),
    divIcon,
    map,
    marker,
    markerInstances,
    remove,
    setView,
    tileLayer,
  }
})

vi.mock("leaflet", () => ({
  divIcon: leafletMocks.divIcon,
  map: leafletMocks.map,
  marker: leafletMocks.marker,
  tileLayer: leafletMocks.tileLayer,
}))

describe("hospitalData", () => {
  it("returns Seoul hospital markers sorted by distance", () => {
    const hospitals = getHospitals()

    expect(hospitals).toHaveLength(5)
    expect(hospitals.map((hospital) => hospital.distanceKm)).toEqual([1.2, 2.8, 5.4, 6.7, 8.9])
    expect(hospitals.every((hospital) => hospital.latitude > 37 && hospital.longitude > 126)).toBe(true)
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
    const firstBindPopup = leafletMocks.bindPopupCalls()[0]

    if (firstBindPopup === undefined) {
      throw new Error("Expected at least one hospital marker popup.")
    }

    expect(firstBindPopup).toHaveBeenCalledWith(
      expect.stringContaining("서울숲 동물병원"),
      { className: "hospital-map__popup" },
    )

    unmount()

    expect(leafletMocks.remove).toHaveBeenCalledTimes(1)
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
