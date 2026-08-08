import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import PropTypes from 'prop-types'

import { getAnimalsRequest } from '../api/animals'
import { getCommunitiesRequest, joinCommunityRequest } from '../api/communities'
import {
  createCommentRequest,
  createPostRequest,
  deletePostRequest,
  getPostsRequest,
  reactToCommentRequest,
  toggleLikeRequest,
  updatePostRequest,
} from '../api/posts'
import { getProductsRequest } from '../api/products'
import { getProfileRequest, getUserSuggestionsRequest } from '../api/profile'
import { createReservationRequest, getReservationsRequest } from '../api/reservations'
import { getServiceSuggestionsRequest } from '../api/services'
import {
  createStoryRequest,
  deleteStoryRequest,
  getStoriesRequest,
  markStoryViewedRequest,
} from '../api/stories'
import CreatePost from '../components/feed/CreatePost'
import PostCard from '../components/feed/PostCard'
import StoryComposerModal from '../components/feed/StoryComposerModal'
import StoryViewer from '../components/feed/StoryViewer'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import FollowButton from '../components/ui/FollowButton'
import SkeletonBlock from '../components/ui/SkeletonBlock'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { asArray, extractDataArray, extractDataObject } from '../utils/apiData'
import { getErrorMessage } from '../utils/getErrorMessage'
import { normalizeProfileMediaPayload } from '../utils/media'
import {
  buildMarketplaceHighlights,
  buildOrganicFeedItems,
  buildStoryRowItems,
  getStoryInitials,
  getStoryRingClass,
  getStoryViewerKey,
  mapStoryGroupForViewer,
  updateStoryInGroups,
} from '../utils/feed'
import {
  addCommentToPost,
  filterSocialPosts as filterPosts,
  updateCommentInPost,
} from '../utils/socialPosts'

const FEED_COLUMN_CLASS = 'mx-auto w-full max-w-[42rem] min-w-0'
const FEED_GRID_CLASS =
  'grid min-w-0 gap-6 xl:grid-cols-[minmax(0,42rem)_minmax(280px,320px)] xl:justify-center'
const STORIES_ROW_CLASS = 'w-full min-w-0 xl:col-span-2'

function FeedPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { t } = useI18n()
  const [posts, setPosts] = useState([])
  const [storyGroups, setStoryGroups] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [profileSummary, setProfileSummary] = useState(null)
  const [marketplaceHighlights, setMarketplaceHighlights] = useState([])
  const [communityHighlights, setCommunityHighlights] = useState([])
  const [serviceHighlights, setServiceHighlights] = useState([])
  const [userSuggestions, setUserSuggestions] = useState([])
  const [organicActionId, setOrganicActionId] = useState('')
  const [reservationSummary, setReservationSummary] = useState({
    buyer: 0,
    seller: 0,
  })
  const [storyErrorMessage, setStoryErrorMessage] = useState('')
  const [storySuccessMessage, setStorySuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isStoriesLoading, setIsStoriesLoading] = useState(true)
  const [likePendingIds, setLikePendingIds] = useState([])
  const [activeStoryIndex, setActiveStoryIndex] = useState(null)
  const [isStoryComposerOpen, setIsStoryComposerOpen] = useState(false)
  const [isStorySubmitting, setIsStorySubmitting] = useState(false)
  const [isDeletingStoryId, setIsDeletingStoryId] = useState('')
  const [storyPendingDelete, setStoryPendingDelete] = useState(null)
  const [profileShareMessage, setProfileShareMessage] = useState('')
  const viewingStoryIdsRef = useRef(new Set())

  const loadPosts = useCallback(async () => {
    try {
      const response = await getPostsRequest()

      setPosts(extractDataArray(response))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('errors.generic')))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  const loadSidebarData = useCallback(async () => {
    if (!user?.id) {
      setProfileSummary(null)
      setMarketplaceHighlights([])
      setCommunityHighlights([])
      setUserSuggestions([])
      setReservationSummary({ buyer: 0, seller: 0 })
      return
    }

    const [
      profileResult,
      animalsResult,
      productsResult,
      servicesResult,
      communitiesResult,
      reservationsResult,
      suggestionsResult,
    ] = await Promise.allSettled([
      getProfileRequest(user.id),
      getAnimalsRequest(),
      getProductsRequest(),
      getServiceSuggestionsRequest(),
      getCommunitiesRequest(),
      getReservationsRequest(),
      getUserSuggestionsRequest(),
    ])

    if (profileResult.status === 'fulfilled') {
      setProfileSummary(
        normalizeProfileMediaPayload(extractDataObject(profileResult.value, null)),
      )
    }

    const animals = animalsResult.status === 'fulfilled'
      ? extractDataArray(animalsResult.value)
      : []
    const products = productsResult.status === 'fulfilled'
      ? extractDataArray(productsResult.value)
      : []
    const communities = communitiesResult.status === 'fulfilled'
      ? extractDataArray(communitiesResult.value)
      : []
    const services = servicesResult.status === 'fulfilled'
      ? extractDataArray(servicesResult.value)
      : []
    const reservations = reservationsResult.status === 'fulfilled'
      ? reservationsResult.value.data ?? {}
      : {}
    const suggestions = suggestionsResult.status === 'fulfilled'
      ? extractDataArray(suggestionsResult.value)
      : []

    setMarketplaceHighlights(
      buildMarketplaceHighlights(animals, products, user.id, { onlyOwn: false, t }),
    )
    setCommunityHighlights(
      communities
        .filter((community) => !community.isAdmin)
        .slice(0, 3),
    )
    setServiceHighlights(services.slice(0, 4))
    setReservationSummary({
      buyer: reservations.buyerReservations?.length ?? 0,
      seller: reservations.sellerReservations?.length ?? 0,
    })
    setUserSuggestions(suggestions)
  }, [t, user?.id])

  const loadStories = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsStoriesLoading(true)
    }

    try {
      const response = await getStoriesRequest()

      setStoryGroups(extractDataArray(response))
      setStoryErrorMessage('')
    } catch (error) {
      setStoryErrorMessage(
        getErrorMessage(error, t('errors.generic')),
      )
    } finally {
      if (!silent) {
        setIsStoriesLoading(false)
      }
    }
  }, [t])

  useEffect(() => {
    void loadPosts()
    void loadStories()
    void loadSidebarData()
  }, [loadPosts, loadSidebarData, loadStories])

  useEffect(() => {
    if (!location.state?.openStoryComposer) {
      return
    }

    setIsStoryComposerOpen(true)
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
      },
      {
        replace: true,
      },
    )
  }, [location.pathname, location.search, location.state, navigate])

  const handleCreatePost = async (payload) => {
    const response = await createPostRequest(payload)

    const nextPost = extractDataObject(response, null)

    if (nextPost) {
      setPosts((current) => [nextPost, ...asArray(current)])
    }
  }

  const handleToggleLike = async (postId, reaction = 'like') => {
    let previousPost = null

    setLikePendingIds((current) => [...current, postId])
    setPosts((current) =>
      asArray(current).map((post) => {
        if (post.id !== postId) {
          return post
        }

        previousPost = post

        return {
          ...post,
          liked: post.userReaction === reaction ? false : true,
          userReaction: post.userReaction === reaction ? null : reaction,
          likes: post.userReaction === reaction ? Math.max(0, post.likes - 1) : post.liked ? post.likes : post.likes + 1,
        }
      }),
    )

    try {
      const response = await toggleLikeRequest(postId, reaction)

      setPosts((current) =>
        asArray(current).map((post) =>
          post.id === postId ? extractDataObject(response, post) : post,
        ),
      )
      setErrorMessage('')
    } catch (error) {
      if (previousPost) {
        setPosts((current) =>
          asArray(current).map((post) => (post.id === postId ? previousPost : post)),
        )
      }

      setErrorMessage(
        getErrorMessage(error, t('profile.likeError')),
      )

      throw error
    } finally {
      setLikePendingIds((current) => current.filter((id) => id !== postId))
    }
  }

  const handleCreateComment = async (postId, body, options = {}) => {
    const response = await createCommentRequest(postId, {
      body,
      parent_id: options.parentId ?? null,
      reaction: options.reaction ?? null,
    })
    const comment = extractDataObject(response, null)

    if (!comment) {
      return null
    }

    setPosts((current) =>
      asArray(current).map((post) =>
        post.id === postId
          ? addCommentToPost(post, comment)
          : post,
      ),
    )

    return comment
  }

  const handleReactToComment = async (postId, commentId, reaction) => {
    const response = await reactToCommentRequest(commentId, reaction)
    const nextComment = extractDataObject(response, null)

    if (!nextComment) {
      return null
    }

    setPosts((current) =>
      asArray(current).map((post) =>
        post.id === postId
          ? updateCommentInPost(post, nextComment)
          : post,
      ),
    )

    return nextComment
  }

  const handleUpdatePost = async (postId, payload) => {
    const response = await updatePostRequest(postId, payload)

    setPosts((current) =>
      asArray(current).map((post) =>
        post.id === postId ? extractDataObject(response, post) : post,
      ),
    )

    return extractDataObject(response, null)
  }

  const handleDeletePost = async (postId) => {
    await deletePostRequest(postId)
    setPosts((current) => asArray(current).filter((post) => post.id !== postId))
  }

  const handleJoinCommunity = async (communityId) => {
    setOrganicActionId(`community-${communityId}`)
    setErrorMessage('')

    try {
      const response = await joinCommunityRequest(communityId)
      const nextCommunity = extractDataObject(response, null)

      setCommunityHighlights((current) =>
        asArray(current).map((community) =>
          community.id === communityId ? nextCommunity : community,
        ),
      )
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('errors.generic')),
      )
    } finally {
      setOrganicActionId('')
    }
  }

  const handleReserveService = async (service) => {
    setOrganicActionId(`service-${service.id}`)
    setErrorMessage('')

    try {
      await createReservationRequest({
        category: service.type,
        reservable_id: service.id,
      })
      navigate('/reservations')
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('errors.generic')),
      )
    } finally {
      setOrganicActionId('')
    }
  }

  const handleCreateStory = async (payload) => {
    setIsStorySubmitting(true)
    setStoryErrorMessage('')
    setStorySuccessMessage('')

    try {
      await createStoryRequest(payload)
      setStorySuccessMessage(t('feed.storyPublished'))
      setIsStoryComposerOpen(false)
      await loadStories()
    } catch (error) {
      setStoryErrorMessage(
        getErrorMessage(error, t('feed.storyPublishError')),
      )
      throw error
    } finally {
      setIsStorySubmitting(false)
    }
  }

  const handleOpenStory = (storyGroup) => {
    if (storyGroup.isComposerShortcut || (storyGroup.stories?.length ?? 0) === 0) {
      setIsStoryComposerOpen(true)
      return
    }

    const nextIndex = viewerStories.findIndex((group) => group.id === storyGroup.id)

    if (nextIndex >= 0) {
      setActiveStoryIndex(nextIndex)
    }
  }

  const handleStorySeen = useCallback(
    async (story) => {
      const storyId = String(story?.id ?? '')

      if (
        !storyId ||
        story.isOwn ||
        story.isViewed ||
        viewingStoryIdsRef.current.has(storyId)
      ) {
        return
      }

      viewingStoryIdsRef.current.add(storyId)

      try {
        const response = await markStoryViewedRequest(story.id)

        setStoryGroups((current) =>
          updateStoryInGroups(current, response.data.data),
        )
      } catch (error) {
        setStoryErrorMessage(
          getErrorMessage(error, t('feed.storyViewedError')),
        )
      } finally {
        viewingStoryIdsRef.current.delete(storyId)
      }
    },
    [t],
  )

  const handleDeleteStory = async (story) => {
    if (!story?.id) {
      return
    }

    setIsDeletingStoryId(String(story.id))
    setStoryErrorMessage('')
    setStorySuccessMessage('')

    try {
      await deleteStoryRequest(story.id)
      setActiveStoryIndex(null)
      setStorySuccessMessage(t('feed.storyDeleted'))
      await loadStories({ silent: true })
    } catch (error) {
      setStoryErrorMessage(
        getErrorMessage(error, t('feed.storyDeleteError')),
      )
    } finally {
      setIsDeletingStoryId('')
    }
  }

  const handleShareProfile = async () => {
    const profileUrl = `${globalThis.location.origin}/profile/${user?.id}`
    setProfileShareMessage('')

    try {
      if (typeof globalThis.navigator?.share === 'function') {
        await globalThis.navigator.share({ title: sidebarName, url: profileUrl })
      } else if (typeof globalThis.navigator?.clipboard?.writeText === 'function') {
        await globalThis.navigator.clipboard.writeText(profileUrl)
      } else {
        throw new Error('Profile sharing is not supported by this browser.')
      }
      setProfileShareMessage(t('profile.copied'))
    } catch (error) {
      if (error?.name !== 'AbortError') setProfileShareMessage(t('errors.generic'))
    }
  }

  const requestDeleteStory = (story) => {
    if (!story?.id) {
      return
    }

    setStoryPendingDelete(story)
  }

  const storyRowItems = useMemo(
    () => buildStoryRowItems(storyGroups, user, t),
    [storyGroups, t, user],
  )

  const viewerStories = useMemo(
    () => asArray(storyGroups).map((group) => mapStoryGroupForViewer(group, t)),
    [storyGroups, t],
  )
  const searchTerm = searchParams.get('q')?.trim() ?? ''
  const safePosts = asArray(posts)
  const visiblePosts = useMemo(
    () => filterPosts(safePosts, searchTerm),
    [safePosts, searchTerm],
  )
  const organicFeedItems = useMemo(
    () => buildOrganicFeedItems(visiblePosts, {
      marketplace: marketplaceHighlights,
      services: serviceHighlights,
      communities: communityHighlights,
    }),
    [communityHighlights, marketplaceHighlights, serviceHighlights, visiblePosts],
  )
  const storyViewerKey = getStoryViewerKey(activeStoryIndex, viewerStories)
  const ownPosts = useMemo(
    () =>
      safePosts.filter((post) => String(post.author?.id) === String(user?.id)),
    [safePosts, user?.id],
  )
  const sidebarProfile = profileSummary ?? user ?? {}
  const sidebarName = sidebarProfile.name ?? user?.name ?? 'Utilisateur'
  const sidebarAvatar =
    sidebarProfile.avatar ?? user?.avatar ?? user?.cover_photo ?? ''
  const sidebarCity = sidebarProfile.city ?? user?.city ?? ''
  const sidebarCountry = sidebarProfile.country ?? user?.country ?? ''
  const sidebarLocation = [sidebarCity, sidebarCountry].filter(Boolean).join(', ')
  const sidebarPostsCount = profileSummary?.postsCount ?? ownPosts.length
  const sidebarFollowersCount = profileSummary?.followersCount ?? 0
  const sidebarFollowingCount = profileSummary?.followingCount ?? 0

  return (
    <section className="max-w-full min-w-0 space-y-6 overflow-x-clip">
      <div className={FEED_GRID_CLASS}>
        <section
          data-testid="stories-row"
          className={`${STORIES_ROW_CLASS} overflow-hidden rounded-[30px] border border-white/80 bg-white/88 p-4 shadow-[0_20px_48px_rgba(124,58,237,0.08)] backdrop-blur dark:border-violet-300/14 dark:bg-white/8`}
        >
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
                {t('feed.quickShare')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsStoryComposerOpen(true)}
              className="w-full rounded-full bg-violet-50 px-4 py-2 text-xs font-medium text-violet-700 transition hover:bg-violet-100 sm:w-auto"
            >
              {t('post.share')}
            </button>
          </div>

          {isStoriesLoading ? (
            <div className="yz-horizontal-scroll mt-4 pb-1">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`story-skeleton-${index}`}
                  className="min-w-[120px] animate-pulse rounded-[28px] border border-violet-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.8))] p-4"
                >
                  <div className="mx-auto h-[74px] w-[74px] rounded-full bg-violet-100" />
                  <div className="mx-auto mt-3 h-3 w-20 rounded-full bg-violet-100" />
                  <div className="mx-auto mt-2 h-2.5 w-16 rounded-full bg-violet-50" />
                </div>
              ))}
            </div>
          ) : (
            <div className="yz-horizontal-scroll mt-4 pb-1">
              {storyRowItems.map((storyGroup) => (
                <StoryCard
                  key={storyGroup.id}
                  storyGroup={storyGroup}
                  t={t}
                  onOpen={() => handleOpenStory(storyGroup)}
                  onAddStory={
                    storyGroup.isOwn && !storyGroup.isComposerShortcut
                      ? () => setIsStoryComposerOpen(true)
                      : null
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {storyErrorMessage ? (
        <div className={FEED_GRID_CLASS}>
          <div role="alert" className={`${FEED_COLUMN_CLASS} rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700`}>
            {storyErrorMessage}
          </div>
        </div>
      ) : null}

      {storySuccessMessage ? (
        <div className={FEED_GRID_CLASS}>
          <div role="status" aria-live="polite" className={`${FEED_COLUMN_CLASS} rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700`}>
            {storySuccessMessage}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className={FEED_GRID_CLASS}>
          <div role="alert" className={`${FEED_COLUMN_CLASS} rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700`}>
            {errorMessage}
          </div>
        </div>
      ) : null}

      <div className={FEED_GRID_CLASS}>
        <div data-testid="feed-main-column" className={`${FEED_COLUMN_CLASS} space-y-6`}>
          <UserSuggestionsSection
            users={userSuggestions}
            currentUserId={user?.id}
            onNavigate={navigate}
            t={t}
          />

          <CreatePost onCreate={handleCreatePost} />

          {isLoading ? (
            <SkeletonBlock count={3} label={t('feed.loadingFeed')} variant="feed" />
          ) : null}

          {!isLoading && safePosts.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-violet-200 bg-white/84 px-5 py-12 text-center text-sm text-stone-500">
              {t('feed.emptyFeed')}
            </div>
          ) : null}

          {!isLoading && safePosts.length > 0 && visiblePosts.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-violet-200 bg-white/84 px-5 py-12 text-center text-sm text-stone-500">
              {t('feed.noSearchResults')}
            </div>
          ) : null}

          {!isLoading ? (
            <div className="space-y-5">
              {organicFeedItems.map((item) =>
                item.type === 'post' ? (
                  <PostCard
                    key={`post-${item.post.id}`}
                    post={item.post}
                    onCreateComment={handleCreateComment}
                    onReactToComment={handleReactToComment}
                    onToggleLike={handleToggleLike}
                    onUpdatePost={handleUpdatePost}
                    onDeletePost={handleDeletePost}
                    isLikePending={likePendingIds.includes(item.post.id)}
                    currentUserId={user?.id}
                  />
                ) : (
                  <OrganicSuggestionCard
                    key={item.key}
                    item={item}
                    processingId={organicActionId}
                    onNavigate={navigate}
                    onJoinCommunity={handleJoinCommunity}
                    onReserveService={handleReserveService}
                    t={t}
                  />
                ),
              )}
            </div>
          ) : null}
        </div>

        <aside className="hidden space-y-4 xl:block">
          <article className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.82))] p-5 shadow-[0_18px_42px_rgba(124,58,237,0.08)]">
            <div className="flex items-center gap-3">
              <Avatar
                name={sidebarName}
                src={sidebarAvatar}
                size="md"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-950">
                  {sidebarName}
                </p>
                <p className="truncate text-xs text-stone-500">
                  @{sidebarName.toLowerCase().replace(/\s+/g, '')}
                  {sidebarLocation ? ` - ${sidebarLocation}` : ''}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-stone-600">
              <div className="rounded-xl bg-violet-50 px-2 py-2">
                <p className="font-semibold text-stone-900">
                  {sidebarFollowingCount}
                </p>
                <p>{t('feed.followingCount')}</p>
              </div>
              <div className="rounded-xl bg-violet-50 px-2 py-2">
                <p className="font-semibold text-stone-900">
                  {sidebarFollowersCount}
                </p>
                <p>{t('feed.followers')}</p>
              </div>
              <div className="rounded-xl bg-violet-50 px-2 py-2">
                <p className="font-semibold text-stone-900">
                  {sidebarPostsCount}
                </p>
                <p>{t('feed.postsCount')}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleShareProfile}
                className="rounded-full border border-violet-100 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-violet-50"
              >
                {t('feed.editProfile')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7)] px-3 py-2 text-xs font-medium text-white transition hover:brightness-105"
              >
                {t('feed.shareProfile')}
              </button>
            </div>
            {profileShareMessage ? (
              <p role="status" aria-live="polite" className="mt-3 text-xs text-violet-800 dark:text-violet-100">
                {profileShareMessage}
              </p>
            ) : null}
          </article>

          <article className="rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-[0_18px_42px_rgba(124,58,237,0.08)]">
            <p className="text-xs uppercase tracking-[0.18em] text-violet-700">
              {t('feed.myPublications')}
            </p>
            {ownPosts.slice(0, 3).map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => navigate('/profile')}
                className="mt-3 block w-full rounded-[18px] bg-violet-50/70 px-3 py-3 text-left text-sm text-stone-700 transition hover:bg-violet-100"
              >
                <span className="line-clamp-2">
                  {post.content || t('feed.mediaPublication')}
                </span>
              </button>
            ))}
            {ownPosts.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {t('feed.nextPostsHere')}
              </p>
            ) : null}
          </article>

          <article className="rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-[0_18px_42px_rgba(124,58,237,0.08)]">
            <p className="text-xs uppercase tracking-[0.18em] text-violet-700">
              {t('common.marketplaceBadge')}
            </p>
              {marketplaceHighlights.slice(0, 3).map((item) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                onClick={() => navigate(item.href)}
                className="mt-3 block w-full rounded-[18px] bg-violet-50/70 px-3 py-3 text-left transition hover:bg-violet-100"
              >
                <p className="truncate text-sm font-medium text-stone-900">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {[item.priceLabel, item.location].filter(Boolean).join(' - ')}
                </p>
              </button>
            ))}
            {marketplaceHighlights.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {t('feed.marketplaceSidebarEmpty')}
              </p>
            ) : null}
          </article>

          <article className="rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-[0_18px_42px_rgba(124,58,237,0.08)]">
            <p className="text-xs uppercase tracking-[0.18em] text-violet-700">
              {t('feed.activity')}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs text-stone-600">
              <button
                type="button"
                onClick={() => navigate('/reservations')}
                className="rounded-xl bg-violet-50 px-2 py-3 transition hover:bg-violet-100"
              >
                <p className="font-semibold text-stone-900">
                  {reservationSummary.buyer}
                </p>
                <p>{t('common.purchases')}</p>
              </button>
              <button
                type="button"
                onClick={() => navigate('/reservations')}
                className="rounded-xl bg-violet-50 px-2 py-3 transition hover:bg-violet-100"
              >
                <p className="font-semibold text-stone-900">
                  {reservationSummary.seller}
                </p>
                <p>{t('common.sales')}</p>
              </button>
            </div>
            {communityHighlights.map((community) => (
              <button
                key={community.id}
                type="button"
                onClick={() => navigate('/communities')}
                className="mt-3 block w-full rounded-[18px] bg-violet-50/70 px-3 py-3 text-left transition hover:bg-violet-100"
              >
                <p className="truncate text-sm font-medium text-stone-900">
                  {community.name}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {t('feed.membersCount', {
                    count: community.membersCount ?? 0,
                    plural: (community.membersCount ?? 0) > 1 ? 's' : '',
                  })}
                </p>
              </button>
            ))}
            {communityHighlights.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {t('feed.joinedCommunitiesHere')}
              </p>
            ) : null}
          </article>
        </aside>
      </div>

      {isStoryComposerOpen ? (
        <StoryComposerModal
          isOpen={isStoryComposerOpen}
          isSubmitting={isStorySubmitting}
          onClose={() => setIsStoryComposerOpen(false)}
          onSubmit={handleCreateStory}
        />
      ) : null}

      <StoryViewer
        key={storyViewerKey}
        stories={viewerStories}
        activeStoryIndex={activeStoryIndex}
        onChangeStory={setActiveStoryIndex}
        onClose={() => setActiveStoryIndex(null)}
        onStorySeen={handleStorySeen}
        onDeleteStory={requestDeleteStory}
        isDeletingStoryId={isDeletingStoryId}
      />

      <FeedConfirmDialog
        isOpen={Boolean(storyPendingDelete)}
        title={t('confirm.deleteStoryTitle')}
        message={t('confirm.deleteStoryMessage')}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.cancel')}
        isProcessing={Boolean(isDeletingStoryId)}
        onCancel={() => setStoryPendingDelete(null)}
        onConfirm={() => {
          const story = storyPendingDelete
          setStoryPendingDelete(null)
          handleDeleteStory(story)
        }}
      />

    </section>
  )
}

function FeedConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isProcessing,
  onCancel,
  onConfirm,
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-violet-950/35 px-4 py-6 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="feed-confirm-title"
        className="max-h-[82vh] w-full max-w-lg overflow-y-auto rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(247,241,255,0.94),_rgba(237,233,254,0.9))] p-5 text-start shadow-[0_30px_80px_rgba(76,29,149,0.28)] dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(24,16,38,0.98),_rgba(49,24,83,0.94))]"
      >
        <h2 id="feed-confirm-title" className="text-lg font-semibold text-stone-950 dark:text-violet-50">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-violet-100/72">
          {message}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isProcessing} className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isProcessing} className="w-full bg-rose-600 hover:bg-rose-500 sm:w-auto">
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}

function UserSuggestionsSection({ users, currentUserId, onNavigate, t }) {
  const safeUsers = asArray(users).filter(
    (suggestedUser) => String(suggestedUser.id) !== String(currentUserId),
  )

  if (safeUsers.length === 0) {
    return null
  }

  return (
    <section className="max-w-full min-w-0 rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_42px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
            {t('feed.discoverUsers')}
          </p>
        </div>
      </div>

      <div className="yz-horizontal-scroll mt-4 pb-1">
        {safeUsers.map((suggestedUser) => (
          <article
            key={suggestedUser.id}
            className="w-[220px] snap-start rounded-[22px] border border-violet-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.78))] p-4 dark:border-violet-300/14 dark:bg-white/8 sm:w-[240px]"
          >
            <button
              type="button"
              onClick={() => onNavigate(`/profile/${suggestedUser.id}`)}
              className="flex w-full items-center gap-3 text-start"
              aria-label={t('profile.viewProfileOf', { name: suggestedUser.name ?? t('common.user') })}
            >
              <Avatar
                name={suggestedUser.name ?? t('common.user')}
                src={suggestedUser.avatar ?? ''}
                size="sm"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-stone-950 dark:text-violet-50">
                  {suggestedUser.name ?? t('common.user')}
                </span>
                <span className="block truncate text-xs text-stone-500 dark:text-violet-100/62">
                  @{suggestedUser.username ?? suggestedUser.id}
                </span>
              </span>
            </button>

            <div className="mt-4 flex flex-wrap gap-2">
              <FollowButton
                userId={suggestedUser.id}
                isFollowing={suggestedUser.isFollowing}
                hidden={String(suggestedUser.id) === String(currentUserId)}
                compact
              />
              <button
                type="button"
                onClick={() => onNavigate(`/messages?user=${suggestedUser.id}`)}
                className="inline-flex items-center justify-center rounded-full border border-violet-100 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 transition hover:bg-violet-50 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-50"
              >
                {t('messages.message')}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function StoryCard({ storyGroup, onOpen, onAddStory, t }) {
  const hasStories = (storyGroup.stories?.length ?? 0) > 0
  const ringClass = getStoryRingClass(storyGroup)
  const avatarName = storyGroup.user?.name ?? t('story.yourStory')
  const avatarSrc = storyGroup.user?.avatar ?? ''

  return (
    <article className="min-w-[118px] snap-start sm:min-w-[132px]">
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-[28px] border border-violet-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.8))] p-4 text-center transition duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_18px_36px_rgba(124,58,237,0.1)]"
      >
        <div className="mx-auto flex h-[84px] w-[84px] items-center justify-center">
          <div
            className={`relative rounded-full p-[3px] shadow-[0_12px_26px_rgba(124,58,237,0.18)] ${ringClass}`}
          >
            <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-white p-[4px]">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={avatarName}
                  className="h-[66px] w-[66px] rounded-full border border-white object-cover shadow-[0_10px_22px_rgba(124,58,237,0.18)]"
                />
              ) : (
                <span className="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#c4b5fd,#d8b4fe,#f5d0fe)] text-sm font-semibold text-violet-950 shadow-[0_10px_22px_rgba(124,58,237,0.12)]">
                  {getStoryInitials(avatarName)}
                </span>
              )}
            </div>
            {storyGroup.isOwn ? (
              <span className="absolute bottom-[2px] right-[2px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-violet-600 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(124,58,237,0.34)]">
                +
              </span>
            ) : null}
          </div>
        </div>

        <p className="mt-3 text-sm font-semibold text-stone-900">
          {storyGroup.title}
        </p>
        <p className="mt-1 text-xs text-stone-500">
          {storyGroup.caption}
        </p>
      </button>

      {storyGroup.isOwn && hasStories && onAddStory ? (
        <button
          type="button"
          onClick={onAddStory}
          className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-violet-50 px-3 py-2 text-[11px] font-medium text-violet-700 transition hover:bg-violet-100"
        >
          {t('story.addAnother')}
        </button>
      ) : null}
    </article>
  )
}

function OrganicSuggestionCard({
  item,
  processingId,
  onNavigate,
  onJoinCommunity,
  onReserveService,
  t,
}) {
  if (item.type === 'service') {
    const service = item.service
    const isProcessing = processingId === `service-${service.id}`

    return (
      <article className="rounded-[28px] border border-violet-100 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.88))] p-5 shadow-[0_18px_42px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-[linear-gradient(135deg,_rgba(24,6,44,0.92),_rgba(8,5,13,0.96))]">
        <p className="text-xs uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
          {t('feed.recommendedService')}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-stone-950 dark:text-white">
          {service.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-violet-100/76">
          {service.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-violet-50 px-3 py-1 font-medium text-violet-800 dark:bg-white/10 dark:text-violet-50">
            {service.type === 'training' ? t('services.petTraining') : t('services.petSitting')}
          </span>
          <span className="rounded-full bg-white px-3 py-1 font-medium text-stone-700 dark:bg-white/10 dark:text-violet-50">
            {service.city || t('profile.locationMissing')}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/marketplace/services')}
            className="rounded-full border border-violet-100 bg-white px-4 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-50"
          >
            {t('services.viewService')}
          </button>
          {!service.isOwner ? (
            <button
              type="button"
              onClick={() => onReserveService(service)}
              disabled={isProcessing}
              className="rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
            >
              {isProcessing ? t('common.sending') : t('reservations.bookSession')}
            </button>
          ) : null}
        </div>
      </article>
    )
  }

  if (item.type === 'community') {
    const community = item.community
    const isProcessing = processingId === `community-${community.id}`

    return (
      <article className="rounded-[28px] border border-violet-100 bg-white/94 p-5 shadow-[0_18px_42px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8">
        <p className="text-xs uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
          {t('feed.recommendedCommunity')}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-stone-950 dark:text-white">
          {community.name}
        </h3>
        <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-violet-100/76">
          {community.description || t('feed.communityFallback')}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNavigate(`/communities/${community.id}`)}
            className="rounded-full border border-violet-100 bg-white px-4 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-50"
          >
            {t('common.show')}
          </button>
          {!community.isMember && community.membershipStatus !== 'pending' ? (
            <button
              type="button"
              onClick={() => onJoinCommunity(community.id)}
              disabled={isProcessing}
              className="rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
            >
              {isProcessing
                ? t('common.sending')
                : community.isPrivate
                  ? t('communities.requestAccess')
                  : t('communities.join')}
            </button>
          ) : null}
        </div>
      </article>
    )
  }

  const listing = item.listing

  return (
    <article className="rounded-[28px] border border-violet-100 bg-white/94 p-5 shadow-[0_18px_42px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8">
      <p className="text-xs uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
        {t('feed.recommendedMarketplace')}
      </p>
      <h3 className="mt-2 text-lg font-semibold text-stone-950 dark:text-white">
        {listing.title}
      </h3>
      <p className="mt-2 text-sm text-stone-600 dark:text-violet-100/76">
        {[listing.priceLabel, listing.location].filter(Boolean).join(' - ')}
      </p>
      <button
        type="button"
        onClick={() => onNavigate(listing.href)}
        className="mt-4 rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
      >
        {t('marketplace.viewListing')}
      </button>
    </article>
  )
}

StoryCard.propTypes = {
  storyGroup: PropTypes.object,
  onOpen: PropTypes.func,
  onAddStory: PropTypes.func,
  t: PropTypes.func,
}

OrganicSuggestionCard.propTypes = {
  item: PropTypes.object,
  processingId: PropTypes.string,
  onNavigate: PropTypes.func,
  onJoinCommunity: PropTypes.func,
  onReserveService: PropTypes.func,
  t: PropTypes.func,
}

UserSuggestionsSection.propTypes = {
  users: PropTypes.array,
  currentUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onNavigate: PropTypes.func,
  t: PropTypes.func,
}

FeedConfirmDialog.propTypes = {
  isOpen: PropTypes.bool,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  isProcessing: PropTypes.bool,
  onCancel: PropTypes.func,
  onConfirm: PropTypes.func,
}

export default FeedPage
