export interface Hospital {
  readonly name: string
  readonly address: string
  readonly hours: string
  readonly distanceKm: number
  readonly latitude: number
  readonly longitude: number
}

const hospitals = [
  {
    name: "서울숲 동물병원",
    address: "서울 성동구 왕십리로 63",
    hours: "09:30-20:00",
    distanceKm: 1.2,
    latitude: 37.5446,
    longitude: 127.0374,
  },
  {
    name: "남산 24시 동물의료센터",
    address: "서울 중구 퇴계로 100",
    hours: "24시간 진료",
    distanceKm: 2.8,
    latitude: 37.5599,
    longitude: 126.9871,
  },
  {
    name: "홍대 반려동물 클리닉",
    address: "서울 마포구 와우산로 94",
    hours: "10:00-21:00",
    distanceKm: 5.4,
    latitude: 37.5527,
    longitude: 126.9247,
  },
  {
    name: "강남 펫케어 동물병원",
    address: "서울 강남구 테헤란로 152",
    hours: "09:00-22:00",
    distanceKm: 6.7,
    latitude: 37.5007,
    longitude: 127.0365,
  },
  {
    name: "잠실 온동물병원",
    address: "서울 송파구 올림픽로 240",
    hours: "10:00-19:30",
    distanceKm: 8.9,
    latitude: 37.5112,
    longitude: 127.0982,
  },
] as const satisfies readonly Hospital[]

export function getHospitals(): readonly Hospital[] {
  return [...hospitals].sort((first, second) => first.distanceKm - second.distanceKm)
}
