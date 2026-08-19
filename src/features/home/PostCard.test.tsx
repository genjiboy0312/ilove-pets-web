import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { PET_FILTER_ALL } from "../../constants/petCategories"
import { i18n, initializeI18n } from "../../i18n/i18n"
import { getHomeFeedPosts } from "./homeFeedData"
import type { HomeFeedPost } from "./homeFeedData"
import { PostCard } from "./PostCard"

function getFirstHomeFeedPost(): HomeFeedPost {
  const [post] = getHomeFeedPosts(PET_FILTER_ALL)

  if (post === undefined) {
    throw new Error("Expected home feed mock data to include at least one post.")
  }

  return post
}

describe("PostCard", () => {
  beforeEach(async () => {
    // Given: each PostCard test starts from Korean copy and clean language storage.
    localStorage.clear()
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })

  it("renders the selected home feed post as a complete Korean pet card", () => {
    // Given: a real normalized home feed post from Stage 5 mock data.
    const post = getFirstHomeFeedPost()

    // When: the post card is rendered for the feed.
    render(<PostCard post={post} />)

    // Then: the card exposes pet identity, media, copy, tags, and engagement actions.
    const card = screen.getByRole("article")

    expect(within(card).getByRole("img", { name: `${post.petName} 프로필 사진` })).toHaveAttribute(
      "src",
      post.petAvatarUrl,
    )
    expect(within(card).getByText(post.petName)).toBeInTheDocument()
    expect(within(card).getByText(`@${post.ownerUsername}`)).toBeInTheDocument()
    expect(card.querySelector("time")).toHaveAttribute("dateTime", post.createdAt)
    expect(
      within(card).getByRole("img", { name: `${post.petName} 게시물 이미지` }),
    ).toHaveAttribute("src", post.imageUrl)
    expect(within(card).getByText(post.content)).toBeInTheDocument()

    for (const tag of post.tags) {
      expect(within(card).getByText(`#${tag}`)).toBeInTheDocument()
    }

    const likeButton = within(card).getByRole("button", { name: /좋아요/ })
    const commentButton = within(card).getByRole("button", { name: /댓글/ })
    const shareButton = within(card).getByRole("button", { name: /공유/ })

    expect(likeButton).toHaveAttribute("type", "button")
    expect(commentButton).toHaveAttribute("type", "button")
    expect(shareButton).toHaveAttribute("type", "button")
    expect(within(card).getByText(`좋아요 ${post.likeCount.toString()}개`)).toBeInTheDocument()
    expect(within(card).getByText(`댓글 ${post.commentCount.toString()}개`)).toBeInTheDocument()
  })

  it("keeps failed media accessible while exposing fallback frames", () => {
    // Given: a real normalized home feed post from Stage 5 mock data.
    const post = getFirstHomeFeedPost()

    // When: both remote images fail to load in the browser.
    render(<PostCard post={post} />)
    const card = screen.getByRole("article")
    const avatar = within(card).getByRole("img", { name: `${post.petName} 프로필 사진` })
    const image = within(card).getByRole("img", { name: `${post.petName} 게시물 이미지` })

    fireEvent.error(avatar)
    fireEvent.error(image)

    // Then: real media contracts remain in the DOM and the frames switch to fallback state.
    expect(avatar).toHaveAttribute("src", post.petAvatarUrl)
    expect(image).toHaveAttribute("src", post.imageUrl)
    expect(avatar.closest(".post-card__avatar-frame")).toHaveAttribute("data-image-state", "failed")
    expect(image.closest(".post-card__image-frame")).toHaveAttribute("data-image-state", "failed")
  })
})
