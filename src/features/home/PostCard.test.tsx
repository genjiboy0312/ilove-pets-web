import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PET_FILTER_ALL } from "../../constants/petCategories"
import { i18n, initializeI18n } from "../../i18n/i18n"
import { getHomeFeedPosts } from "./homeFeedData"
import type { HomeFeedPost } from "./homeFeedData"
import { getPostCommentCount } from "./postCommentsData"
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

  it("toggles the like state and count when the like button is activated", () => {
    // Given: a real normalized home feed post that is not liked by the current user.
    const post = getFirstHomeFeedPost()

    // When: the user activates the like button twice.
    render(<PostCard post={post} />)
    const card = screen.getByRole("article")
    const likeButton = within(card).getByRole("button", { name: "좋아요" })

    fireEvent.click(likeButton)

    // Then: the like state fills and the count increments.
    expect(likeButton).toHaveAttribute("aria-pressed", "true")
    expect(
      within(card).getByText(`좋아요 ${(post.likeCount + 1).toString()}개`),
    ).toBeInTheDocument()

    fireEvent.click(likeButton)

    // And: activating again returns both the state and count to the original values.
    expect(likeButton).toHaveAttribute("aria-pressed", "false")
    expect(within(card).getByText(`좋아요 ${post.likeCount.toString()}개`)).toBeInTheDocument()
  })

  it("opens the comment dialog with the post comments when the comment button is activated", () => {
    // Given: a real normalized home feed post with comments in the mock data.
    const post = getFirstHomeFeedPost()

    // When: the user activates the comment button.
    render(<PostCard post={post} />)
    const card = screen.getByRole("article")

    fireEvent.click(within(card).getByRole("button", { name: "댓글" }))

    // Then: the dialog exposes the comments heading and every comment for the post.
    const dialog = screen.getByRole("dialog", { name: "댓글" })

    expect(within(dialog).getByText("댓글", { selector: "h2" })).toBeInTheDocument()
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(getPostCommentCount(post.postId))
  })

  it("copies the post link and shows a toast via the share sheet", async () => {
    // Given: a browser without the native share sheet and a stubbed clipboard.
    const post = getFirstHomeFeedPost()
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)

    Object.assign(navigator, { share: undefined, clipboard: { writeText: clipboardWriteText } })

    // When: the user activates the share button and confirms in the sheet.
    render(<PostCard post={post} />)
    const card = screen.getByRole("article")

    fireEvent.click(within(card).getByRole("button", { name: "공유" }))

    const sheet = await screen.findByRole("dialog", { name: "공유" })
    fireEvent.click(within(sheet).getByRole("button", { name: "링크 복사" }))

    // Then: the post URL is copied and the toast communicates the result.
    await screen.findByText("링크가 복사되었습니다.")
    expect(clipboardWriteText).toHaveBeenCalledWith(window.location.href)
  })
})
