import type { HttpsUrl } from "../../types/domain"

export interface Reel {
  readonly reelId: string
  readonly petName: string
  readonly caption: string
  readonly videoUrl: HttpsUrl
  readonly likeCount: number
}

const reelVideoUrls = [
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
] as const satisfies readonly HttpsUrl[]

const reelSeeds = [
  { petName: "Bori", caption: "Zoomies unlocked at the ridge trail! 🐕" },
  { petName: "Miso", caption: "Sunbathing level: expert 🦎☀️" },
  { petName: "Kiki", caption: "Morning concert, encore at noon 🎵" },
  { petName: "Tofu", caption: "Tunnel inspection day 42. Approved." },
  { petName: "Nori", caption: "New bed, first nap. Ten out of ten." },
  { petName: "Pebble", caption: "Snack negotiation in progress." },
] as const

export function getReels(): readonly Reel[] {
  return reelSeeds.map((seed, index) => {
    const videoUrl = reelVideoUrls[index % reelVideoUrls.length]

    if (videoUrl === undefined) {
      throw new Error("Reel video source is missing.")
    }

    return {
      reelId: `reel_${index + 1}`,
      petName: seed.petName,
      caption: seed.caption,
      videoUrl,
      likeCount: 12 + index * 7,
    }
  })
}
