import { asArray } from './apiData'

export function filterSocialPosts(posts, searchTerm) {
  const safePosts = asArray(posts)

  if (!searchTerm) {
    return safePosts
  }

  const normalizedSearch = normalizeSearchText(searchTerm)

  return safePosts.filter((post) =>
    [
      post.content,
      post.location,
      post.author?.name,
      post.author?.email,
      ...(post.tags ?? []),
    ].some((value) => normalizeSearchText(value).includes(normalizedSearch)),
  )
}

export function normalizeSearchText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function addCommentToPost(post, comment) {
  const isReply = Boolean(comment.parentId)

  if (!isReply) {
    return {
      ...post,
      comments: [...(post.comments ?? []), comment],
      commentsCount: (post.commentsCount ?? post.comments?.length ?? 0) + 1,
    }
  }

  return {
    ...post,
    comments: (post.comments ?? []).map((currentComment) =>
      currentComment.id === comment.parentId
        ? {
            ...currentComment,
            replies: [...(currentComment.replies ?? []), comment],
          }
        : currentComment,
    ),
    commentsCount: (post.commentsCount ?? post.comments?.length ?? 0) + 1,
  }
}

export function updateCommentInPost(post, nextComment) {
  return {
    ...post,
    comments: (post.comments ?? []).map((comment) => {
      if (comment.id === nextComment.id) {
        return nextComment
      }

      return {
        ...comment,
        replies: (comment.replies ?? []).map((reply) =>
          reply.id === nextComment.id ? nextComment : reply,
        ),
      }
    }),
  }
}
