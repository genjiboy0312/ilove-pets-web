import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { i18n, initializeI18n } from "../../i18n/i18n"
import { getPostCommentCount, getPostComments } from "./postCommentsData"
import { CommentDialog } from "./CommentDialog"

describe("CommentDialog", () => {
  beforeEach(async () => {
    localStorage.clear()
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })

  it("renders the post comments with their authors", () => {
    // Given: a post from mock data with comments in the data layer.
    const postId = "post_bori_hike"
    const onClose = vi.fn()
    const onCommentAdded = vi.fn()

    // When: the comment dialog opens for that post.
    render(<CommentDialog onClose={onClose} onCommentAdded={onCommentAdded} postId={postId} />)

    // Then: the dialog lists every comment from the data layer.
    const dialog = screen.getByRole("dialog", { name: "댓글" })
    const comments = getPostComments(postId)

    expect(within(dialog).getAllByRole("listitem")).toHaveLength(comments.length)
    for (const comment of comments) {
      expect(within(dialog).getByText(comment.authorName)).toBeInTheDocument()
      expect(within(dialog).getByText(comment.content)).toBeInTheDocument()
    }
  })

  it("adds the drafted comment to the list and notifies the parent", () => {
    // Given: an open comment dialog with a real post.
    const postId = "post_bori_hike"
    const onClose = vi.fn()
    const onCommentAdded = vi.fn()

    render(<CommentDialog onClose={onClose} onCommentAdded={onCommentAdded} postId={postId} />)

    // When: the user types a comment and submits it.
    const dialog = screen.getByRole("dialog")
    const input = within(dialog).getByPlaceholderText("댓글을 입력하세요")
    const submit = within(dialog).getByRole("button", { name: "등록" })

    fireEvent.change(input, { target: { value: "너무 귀여워요!" } })
    fireEvent.click(submit)

    // Then: the new comment appears and the parent learns about it.
    expect(within(dialog).getByText("너무 귀여워요!")).toBeInTheDocument()
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(getPostCommentCount(postId) + 1)
    expect(onCommentAdded).toHaveBeenCalledTimes(1)
    expect(input).toHaveValue("")
  })

  it("keeps the submit button disabled until the draft has content", () => {
    // Given: an open comment dialog for a real post.
    const onClose = vi.fn()
    const onCommentAdded = vi.fn()

    render(
      <CommentDialog onClose={onClose} onCommentAdded={onCommentAdded} postId="post_bori_hike" />,
    )

    // Then: whitespace-only drafts cannot be submitted.
    const dialog = screen.getByRole("dialog")
    const input = within(dialog).getByPlaceholderText("댓글을 입력하세요")
    const submit = within(dialog).getByRole("button", { name: "등록" })

    expect(submit).toBeDisabled()

    fireEvent.change(input, { target: { value: "   " } })

    expect(submit).toBeDisabled()

    fireEvent.change(input, { target: { value: "예쁘다!" } })

    expect(submit).toBeEnabled()
  })

  it("closes when the close button is activated", () => {
    // Given: an open comment dialog.
    const onClose = vi.fn()
    const onCommentAdded = vi.fn()

    render(
      <CommentDialog onClose={onClose} onCommentAdded={onCommentAdded} postId="post_bori_hike" />,
    )

    // When: the user activates the close button.
    fireEvent.click(screen.getByRole("button", { name: "닫기" }))

    // Then: the dialog reports its intent to close.
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
