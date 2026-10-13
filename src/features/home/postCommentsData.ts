import { readMetadata } from "../local/localContentMetadata"

import {
  CURRENT_USER_ID,
  mockCommentIds,
  mockCommentsById,
  mockUsersById,
} from "../../mocks/mockData"
import type { CommentId, HttpsUrl, IsoDateTimeString, PostId } from "../../types/domain"

export interface PostCommentView {
  readonly commentId: CommentId
  readonly authorName: string
  readonly authorAvatarUrl: HttpsUrl
  readonly content: string
  readonly createdAt: IsoDateTimeString
}

export function isLocalPostId(postId: PostId): boolean {
  try {
    return readMetadata().posts.some((post) => post.id === postId)
  } catch {
    return false
  }
}

export function getPostComments(postId: PostId): readonly PostCommentView[] {
  if (isLocalPostId(postId)) {
    const post = readMetadata().posts.find((item) => item.id === postId)
    return (post?.comments ?? []).map((comment) => ({
      commentId: `comment_local_${comment.id}`,
      content: comment.content,
      createdAt: comment.createdAt,
      authorName: getCurrentCommenter().name,
      authorAvatarUrl: getCurrentCommenter().avatarUrl,
    }))
  }
  const comments = mockCommentIds.flatMap((commentId) => {
    const comment = mockCommentsById[commentId]

    if (comment.postId !== postId) {
      return []
    }

    const author = mockUsersById[comment.authorId]

    return [
      {
        commentId: comment.id,
        authorName: author.displayName,
        authorAvatarUrl: author.profileImageUrl,
        content: comment.content,
        createdAt: comment.createdAt,
      },
    ]
  })

  return [...comments].sort((firstComment, secondComment) => {
    return secondComment.createdAt.localeCompare(firstComment.createdAt)
  })
}

export function getPostCommentCount(postId: PostId): number {
  return getPostComments(postId).length
}

export interface CurrentCommenter {
  readonly name: string
  readonly avatarUrl: HttpsUrl
}

export function getCurrentCommenter(): CurrentCommenter {
  const currentUser = mockUsersById[CURRENT_USER_ID]

  return {
    name: currentUser.displayName,
    avatarUrl: currentUser.profileImageUrl,
  }
}
