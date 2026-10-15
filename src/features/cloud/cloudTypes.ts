import type { PetCategory } from "../../constants/petCategories"

export interface CloudPet {
  readonly id: string
  readonly name: string
  readonly breed: string
  readonly category: PetCategory
  readonly version: number
}
export interface CloudGrowth {
  readonly id: string
  readonly petId: string
  readonly date: string
  readonly weight: number | null
  readonly note: string
  readonly version: number
}
export interface CloudPost {
  readonly id: string
  readonly petId: string
  readonly assetId: string
  readonly content: string
  readonly version: number
}
export interface CloudAsset {
  readonly id: string
  readonly key: string | null
  readonly status: string
  readonly bytes: number
}
export interface CloudSnapshot {
  readonly mediaReady: boolean
  readonly pets: readonly CloudPet[]
  readonly growth: readonly CloudGrowth[]
  readonly posts: readonly CloudPost[]
  readonly assets: readonly CloudAsset[]
}
export const emptyCloud: CloudSnapshot = {
  mediaReady: false,
  pets: [],
  growth: [],
  posts: [],
  assets: [],
}
