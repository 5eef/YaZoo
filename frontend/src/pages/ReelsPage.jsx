import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { getPostsRequest, toggleLikeRequest, createCommentRequest, reactToCommentRequest, updatePostRequest, deletePostRequest } from '../api/posts'
import PostCard from '../components/feed/PostCard'
import Button from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { extractDataArray, extractDataObject } from '../utils/apiData'
import { addCommentToPost, updateCommentInPost } from '../utils/socialPosts'
import { getPostMedia } from '../utils/media'
import { getErrorMessage } from '../utils/getErrorMessage'

// Reels are existing video posts: Laravel remains the authority for visibility
// and mutations. No separate catalogue, duplicated media or automatic POST retry.
export default function ReelsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pending, setPending] = useState([])
  const [attempt, setAttempt] = useState(0)
  const container = useRef(null)
  const identity = useRef(user?.id)
  identity.current = user?.id
  const videoIds = posts.map((post) => post.id).join(',')

  useEffect(() => {
    let active = true
    setLoading(true)
    setPosts([])
    setError('')
    getPostsRequest({ media_kind: 'video', page }).then((response) => {
      if (!active) return
      setPosts(extractDataArray(response).filter((post) => getPostMedia(post).mediaKind === 'video'))
      setLastPage(response.data?.meta?.last_page ?? 1)
    }).catch((failure) => {
      if (active) setError(getErrorMessage(failure, t('errors.generic')))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, user?.id, t, attempt])

  useEffect(() => {
    const root = container.current
    if (!root) return undefined
    const pauseAll = () => root.querySelectorAll('video').forEach((video) => video.pause())
    const visibility = () => { if (document.hidden) pauseAll() }
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => { if (!isIntersecting) target.pause() })
    }, { threshold: 0.5 })
    root.querySelectorAll('video').forEach((video) => observer?.observe(video))
    // Playing another card pauses the previous video; never autoplay audio.
    const play = (event) => root.querySelectorAll('video').forEach((video) => {
      if (video !== event.target) video.pause()
    })
    root.addEventListener('play', play, true)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      pauseAll()
      observer?.disconnect()
      root.removeEventListener('play', play, true)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [videoIds])

  const replace = (id, next) => setPosts((current) => current.map((post) => post.id === id ? next(post) : post))
  const mutate = async (request, apply) => {
    const owner = identity.current
    try {
      const response = await request()
      if (owner === identity.current) apply(response)
      return extractDataObject(response, null)
    } catch (failure) {
      if (owner === identity.current) setError(getErrorMessage(failure, t('errors.generic')))
      throw failure
    }
  }
  const like = async (id, reaction) => {
    if (pending.includes(id)) return
    setPending((current) => [...current, id])
    try {
      await mutate(() => toggleLikeRequest(id, reaction), (response) => replace(id, (post) => extractDataObject(response, post)))
    } catch { /* Surface the uncertain result, never replay the mutation. */ }
    finally { setPending((current) => current.filter((value) => value !== id)) }
  }

  return (
    <section className="mx-auto w-full min-w-0 max-w-[42rem] space-y-4" aria-label="Reels">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-violet-950 dark:text-violet-50">Reels</h1>
        <Link to="/feed" className="text-violet-700 dark:text-violet-200">{t('common.feed')}</Link>
      </div>
      {error ? <div role="alert">{error} <Button onClick={() => setAttempt((value) => value + 1)}>{t('common.refresh')}</Button></div> : null}
      {loading ? <p role="status">{t('common.loading')}</p> : null}
      {!loading && !error && posts.length === 0 ? <p>{t('reels.empty')}</p> : null}
      <div ref={container} className="max-h-[78dvh] space-y-5 overflow-y-auto overscroll-contain snap-y snap-proximity">
        {posts.map((post) => <div key={post.id} className="snap-start">
          <PostCard post={post} currentUserId={user?.id} isLikePending={pending.includes(post.id)}
            onToggleLike={like}
            onCreateComment={(id, body, options = {}) => mutate(() => createCommentRequest(id, { body, parent_id: options.parentId ?? null, reaction: options.reaction ?? null }), (response) => replace(id, (current) => addCommentToPost(current, extractDataObject(response, null))))}
            onReactToComment={(id, commentId, reaction) => mutate(() => reactToCommentRequest(commentId, reaction), (response) => replace(id, (current) => updateCommentInPost(current, extractDataObject(response, null))))}
            onUpdatePost={(id, payload) => mutate(() => updatePostRequest(id, payload), (response) => replace(id, (current) => extractDataObject(response, current)))}
            onDeletePost={(id) => mutate(() => deletePostRequest(id), () => setPosts((current) => current.filter((post) => post.id !== id)))} />
        </div>)}
      </div>
      <nav className="flex justify-between gap-3" aria-label={t('reels.pagination')}>
        <Button disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>{t('reels.previous')}</Button>
        <span>{page} / {lastPage}</span>
        <Button disabled={loading || page >= lastPage} onClick={() => setPage((value) => value + 1)}>{t('reels.next')}</Button>
      </nav>
    </section>
  )
}
