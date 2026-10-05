import { hospitals } from "./hospitalDataset"

export interface Hospital {
  readonly name: string
  readonly address: string
  readonly hours: string
  readonly contactLabel: string
  readonly contactHref: `tel:${string}`
  readonly isNightEmergencyAvailable: boolean
  readonly distanceKm: number
  readonly latitude: number
  readonly longitude: number
  readonly si: string
  readonly gu: string
  readonly dong: string
}

export interface HospitalRegionFilter {
  readonly si?: string
  readonly gu?: string
  readonly dong?: string
  readonly nightOnly?: boolean
}

function uniqueOptions(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values))
}

export function getSis(): readonly string[] {
  return uniqueOptions(hospitals.map((hospital) => hospital.si))
}

export function getGus(si: string): readonly string[] {
  return uniqueOptions(
    hospitals.filter((hospital) => hospital.si === si).map((hospital) => hospital.gu),
  )
}

export function getDongs(si: string, gu: string): readonly string[] {
  return uniqueOptions(
    hospitals
      .filter((hospital) => hospital.si === si && hospital.gu === gu)
      .map((hospital) => hospital.dong),
  )
}

export function getHospitals(filter: HospitalRegionFilter = {}): readonly Hospital[] {
  return [...hospitals]
    .filter(
      (hospital) =>
        (filter.si === undefined || hospital.si === filter.si) &&
        (filter.gu === undefined || hospital.gu === filter.gu) &&
        (filter.dong === undefined || hospital.dong === filter.dong) &&
        (filter.nightOnly !== true || hospital.isNightEmergencyAvailable),
    )
    .sort((first, second) => first.distanceKm - second.distanceKm)
}
