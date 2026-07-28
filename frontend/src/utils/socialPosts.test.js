import { describe, expect, it } from 'vitest'

import {
  addCommentToPost,
  filterSocialPosts,
  normalizeSearchText,
  updateCommentInPost,
} from './socialPosts'

describe('social post utilities', () => {
  it('normalise les accents et filtre les champs publics', () => {
    const posts = [
      { id: 1, content: 'Éducation canine', tags: ['Rabat'], author: { name: 'Amine' } },
      { id: 2, content: 'Chats', author: { name: 'Sara' } },
    ]

    expect(normalizeSearchText('ÉDUCATION')).toBe('education')
    expect(filterSocialPosts(posts, 'education')).toEqual([posts[0]])
    expect(filterSocialPosts(posts, 'rabat')).toEqual([posts[0]])
  })

  it('ajoute et met a jour commentaires et reponses sans muter le post', () => {
    const post = { id: 1, comments: [{ id: 10, body: 'Parent', replies: [] }], commentsCount: 1 }
    const withReply = addCommentToPost(post, { id: 11, parentId: 10, body: 'Reponse' })
    const updated = updateCommentInPost(withReply, { id: 11, parentId: 10, body: 'Corrigee' })

    expect(post.comments[0].replies).toEqual([])
    expect(withReply.commentsCount).toBe(2)
    expect(updated.comments[0].replies[0].body).toBe('Corrigee')
  })
})
