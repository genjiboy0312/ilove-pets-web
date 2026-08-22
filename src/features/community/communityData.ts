import type { IsoDateTimeString } from "../../types/domain"

export type CommunityCategory = "free" | "info" | "adopt"

export interface CommunityPost {
  readonly postId: string
  readonly category: CommunityCategory
  readonly title: string
  readonly authorName: string
  readonly body: string
  readonly commentCount: number
  readonly createdAt: IsoDateTimeString
}

const communityPosts = [
  {
    postId: "community_1",
    category: "free",
    title: "우리 집 댕댕이 자랑합니다 🐕",
    authorName: "Solana Park",
    body: "오늘 산책 코스 처음으로 완주했어요! 다음엔 강아지 친구들과 같이 가고 싶은데 다들 어디 코스 다니세요?",
    commentCount: 4,
    createdAt: "2026-08-20T09:30:00.000Z",
  },
  {
    postId: "community_2",
    category: "info",
    title: "초보 파충류 사육장 온도·습도 세팅 공유",
    authorName: "Arden Lee",
    body: "크레스티드 게코 기준으로 낮 26~28도, 습도 60~70%가 제일 안정적이었습니다. 온습계는 두 개 이상 두세요. 서브스트레이트는 코코칩 추천!",
    commentCount: 7,
    createdAt: "2026-08-19T15:10:00.000Z",
  },
  {
    postId: "community_3",
    category: "adopt",
    title: "[임보 후기] 한 달 임보로 얻은 것들",
    authorName: "Mira Han",
    body: "한 달 동안 아이 케어하면서 배운 점을 정리했습니다. 임보 고민 중이라면 읽어보세요. 생각보다 준비물은 단순하고, 마음만 큼 잘 따라옵니다.",
    commentCount: 12,
    createdAt: "2026-08-18T11:05:00.000Z",
  },
  {
    postId: "community_4",
    category: "free",
    title: "앵무리 종이 울 때마다 이웃 항의가 올까 봐 무서워요",
    authorName: "Arden Lee",
    body: "방음 대책으로 하셨던 팁 공유 부탁드립니다. 커튼+카페트 조합이 젤 효과 있었네요.",
    commentCount: 3,
    createdAt: "2026-08-17T20:40:00.000Z",
  },
  {
    postId: "community_5",
    category: "info",
    title: "동물병원 야간 진료 리스트 (서울 권역)",
    authorName: "Solana Park",
    body: "심야에 갔던 곳들 위주로 정리했습니다. 지역별로 댓글 달아주시면 계속 업데이트할게요.",
    commentCount: 9,
    createdAt: "2026-08-16T13:25:00.000Z",
  },
  {
    postId: "community_6",
    category: "adopt",
    title: "입양 상담 때 꼭 물어봐야 할 질문 7가지",
    authorName: "Mira Han",
    body: "건강 이력, 식성, 성격 트라우마 여부 등 체크리스트를 만들어 봤습니다. 입양 전 하나하나 확인해 보세요.",
    commentCount: 5,
    createdAt: "2026-08-15T08:55:00.000Z",
  },
] as const satisfies readonly CommunityPost[]

export function getCommunityPosts(
  category: CommunityCategory | "all" = "all",
): readonly CommunityPost[] {
  return [...communityPosts]
    .filter((post) => category === "all" || post.category === category)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
}

export function getCommunityCategories(): readonly CommunityCategory[] {
  return ["free", "info", "adopt"]
}

export function getCommunityPostById(postId: string): CommunityPost | undefined {
  return communityPosts.find((post) => post.postId === postId)
}
