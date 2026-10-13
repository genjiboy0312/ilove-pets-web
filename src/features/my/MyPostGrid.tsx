import { useTranslation } from "react-i18next"

import { ThumbImage } from "../../components/ThumbImage"
import type { ImageSourceUrl, PostId } from "../../types/domain"
import type { MyPost } from "./myData"

interface ActivePost {
  readonly postId: PostId
  readonly imageUrl: ImageSourceUrl
}

interface MyPostGridProps {
  readonly onEdit?: (postId: PostId) => void
  readonly onPostClick: (post: ActivePost) => void
  readonly posts: readonly MyPost[]
}

export function MyPostGrid({ onPostClick, onEdit, posts }: MyPostGridProps) {
  const { t } = useTranslation()

  if (posts.length === 0) {
    return <p className="my-section__empty">{t(($) => $.my.empty)}</p>
  }

  return (
    <ul className="my-post-grid">
      {posts.map((post) => (
        <li className="my-post-grid__item" key={post.postId}>
          <button
            aria-label={post.petName}
            className="my-post-grid__button"
            onClick={() => {
              onPostClick({ postId: post.postId, imageUrl: post.imageUrl })
            }}
            type="button"
          >
            <ThumbImage alt={post.petName} className="my-post-grid__image" src={post.imageUrl} />
          </button>
          {post.postId.startsWith("post_local_") && onEdit !== undefined ? (
            <button
              className="local-button my-post-grid__edit"
              type="button"
              onClick={() => {
                onEdit(post.postId)
              }}
              aria-label={`${t(($) => $.manage.edit)} ${post.petName}`}
            >
              {t(($) => $.manage.edit)}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
