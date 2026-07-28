import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import PropTypes from 'prop-types'

import {
  deleteCommunityRequest,
  getCommunityRequest,
  joinCommunityRequest,
  leaveCommunityRequest,
} from '../api/communities'
import {
  createCommentRequest,
  createPostRequest,
  deletePostRequest,
  getPostsRequest,
  reactToCommentRequest,
  toggleLikeRequest,
  updatePostRequest,
} from '../api/posts'
import CreatePost from '../components/feed/CreatePost'
import PostCard from '../components/feed/PostCard'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { asArray, extractDataArray, extractDataObject } from '../utils/apiData'
import { formatDate } from '../utils/formatDate'
import { getErrorMessage } from '../utils/getErrorMessage'

function CommunityDetailPage() {
  const { t } = useI18n()
  const { communityId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [community, setCommunity] = useState(null)
  const [posts, setPosts] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isPostsLoading, setIsPostsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeletingCommunity, setIsDeletingCommunity] = useState(false)
  const [likePendingIds, setLikePendingIds] = useState([])
  const [activeTab, setActiveTab] = useState('discussion')

  const loadCommunity = useCallback(async () => {
    try {
      const response = await getCommunityRequest(communityId)
      setCommunity(extractDataObject(response, null))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('communities.detailLoadError')))
    } finally {
      setIsLoading(false)
    }
  }, [communityId, t])

  const loadCommunityPosts = useCallback(async () => {
    setIsPostsLoading(true)

    try {
      const response = await getPostsRequest({ community_id: communityId })
      setPosts(extractDataArray(response))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('communities.postsLoadError')))
      setPosts([])
    } finally {
      setIsPostsLoading(false)
    }
  }, [communityId, t])

  useEffect(() => {
    void loadCommunity()
    void loadCommunityPosts()
  }, [loadCommunity, loadCommunityPosts])

  const handleJoin = async () => {
    setIsJoining(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const response = await joinCommunityRequest(community.id)
      setCommunity(extractDataObject(response, community))
      setSuccessMessage(response.data.message)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('communities.detail.joinError')))
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeave = async () => {
    setIsJoining(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const response = await leaveCommunityRequest(community.id)
      setCommunity(extractDataObject(response, community))
      setSuccessMessage(response.data.message)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('communities.detail.leaveError')))
    } finally {
      setIsJoining(false)
    }
  }

  const handleShare = async () => {
    const url = `${globalThis.location.origin}/communities/${community.id}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: community.name,
          text: community.description || t('communities.shareFallback'),
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        setSuccessMessage(t('communities.linkCopied'))
      }
    } catch {
      setErrorMessage(t('communities.shareError'))
    }
  }

  const handleDeleteCommunity = async () => {
    if (!community?.id) {
      return
    }

    setIsDeletingCommunity(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await deleteCommunityRequest(community.id)
      navigate('/communities', {
        replace: true,
        state: { message: t('communities.deleteSuccess') },
      })
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('communities.deleteError')))
      setIsDeleteDialogOpen(false)
    } finally {
      setIsDeletingCommunity(false)
    }
  }

  const handleCreatePost = async (payload) => {
    const response = await createPostRequest({
      ...payload,
      community_id: community.id,
      visibility: community.isPrivate ? 'followers' : 'public',
    })

    const nextPost = extractDataObject(response, null)

    if (nextPost) {
      setPosts((current) => [nextPost, ...asArray(current)])
    }
  }

  const handleToggleLike = async (postId, reaction = 'like') => {
    setLikePendingIds((current) => [...current, postId])

    try {
      const response = await toggleLikeRequest(postId, reaction)
      setPosts((current) =>
        asArray(current).map((post) =>
          post.id === postId ? extractDataObject(response, post) : post,
        ),
      )
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
        post.id === postId ? addCommentToPost(post, comment) : post,
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
        post.id === postId ? updateCommentInPost(post, nextComment) : post,
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

  if (isLoading) {
    return <StateBox>{t('communities.detailLoading')}</StateBox>
  }

  if (!community) {
    return <StateBox>{errorMessage || t('communities.detail.notFound')}</StateBox>
  }

  const safePosts = asArray(posts)
  const mediaPosts = safePosts.filter((post) => post.mediaUrl || post.imageUrl)
  const canViewDiscussion = !community.isPrivate || community.isMember || community.isAdmin
  const canDeleteCommunity = Boolean(community.isOwner || community.isAdmin)
  const memberPreview = getUniqueMembers([community.owner, community.isMember ? user : null])
  const communityTabs = [
    { key: 'about', label: t('communities.detail.about') },
    { key: 'discussion', label: t('communities.detail.discussion') },
    { key: 'members', label: t('communities.detail.members') },
    { key: 'media', label: t('communities.detail.media') },
  ]

  return (
    <section className="max-w-full min-w-0 space-y-5 overflow-hidden">
      <section className="overflow-hidden rounded-[30px] border border-white/80 bg-white/94 shadow-[0_24px_60px_rgba(124,58,237,0.1)] dark:border-violet-300/12 dark:bg-white/8">
        <div className="flex flex-col gap-4 px-4 py-5 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 text-start">
            <span className="inline-flex rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-800 dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-100">
              {community.isPrivate ? t('communities.detail.privateGroup') : t('communities.detail.publicGroup')}
            </span>
            <h1 className="mt-3 break-words text-2xl font-semibold text-stone-950 sm:text-3xl dark:text-violet-50">
              {community.name}
            </h1>
            <p className="mt-2 text-sm font-medium text-stone-500 dark:text-violet-100/70">
              {t('communities.membersMeta', {
                count: community.membersCount,
                plural: community.membersCount > 1 ? 's' : '',
                date: formatDate(community.createdAt),
              })}
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
            {!community.isMember && community.membershipStatus !== 'pending' ? (
              <Button type="button" onClick={handleJoin} disabled={isJoining} className="flex-1 sm:flex-none">
                {community.isPrivate ? t('communities.requestAccess') : t('communities.detail.join')}
              </Button>
            ) : null}
            {community.isMember ? (
              <Button type="button" variant="secondary" onClick={handleLeave} disabled={isJoining} className="flex-1 sm:flex-none">
                {t('communities.detail.leave')}
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={handleShare} className="flex-1 sm:flex-none">
              {t('post.share')}
            </Button>
            {canDeleteCommunity ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="flex-1 border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 sm:flex-none dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-100"
              >
                {t('communities.detail.delete')}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="relative flex min-h-52 w-full items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#4c1d95,#7c3aed,#c4b5fd)] sm:min-h-72 lg:min-h-80">
          {community.imageUrl && !isVideoMedia(community.imageUrl) ? (
            <img
              src={community.imageUrl}
              alt={community.name}
              className="mx-auto h-auto max-h-[260px] w-full max-w-full object-contain sm:max-h-[360px] lg:max-h-[420px]"
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white/8 dark:to-black/10" />
          <div className="hidden">
            <div>
              <span className="rounded-full bg-stone-950/58 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
                {community.isPrivate ? t('communities.detail.privateGroup') : t('communities.detail.publicGroup')}
              </span>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{community.name}</h1>
              <p className="mt-2 text-sm font-medium text-white/82">
                {t('communities.membersMeta', {
                  count: community.membersCount,
                  plural: community.membersCount > 1 ? 's' : '',
                  date: formatDate(community.createdAt),
                })}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!community.isMember && community.membershipStatus !== 'pending' ? (
                <Button type="button" onClick={handleJoin} disabled={isJoining}>
                  {community.isPrivate ? t('communities.requestAccess') : t('communities.detail.join')}
                </Button>
              ) : null}
              {community.isMember ? (
                <Button type="button" variant="secondary" onClick={handleLeave} disabled={isJoining}>
                  {t('communities.detail.leave')}
                </Button>
              ) : null}
              <Button type="button" variant="ghost" onClick={handleShare}>
                {t('post.share')}
              </Button>
              {canDeleteCommunity ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-100"
                >
                  {t('communities.detail.delete')}
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t border-violet-100/70 px-4 py-4 dark:border-violet-300/12 sm:px-5">
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {communityTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? 'bg-violet-600 text-white'
                    : 'text-stone-600 hover:bg-violet-50 dark:text-violet-100/70 dark:hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {errorMessage ? <Alert tone="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert>{successMessage}</Alert> : null}

      <div className="grid max-w-full min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {activeTab === 'discussion' ? (
            <>
              {!canViewDiscussion ? (
                <StateBox>{t('communities.privateDiscussion')}</StateBox>
              ) : null}

              {canViewDiscussion && community.isMember ? (
                <CreatePost onCreate={handleCreatePost} />
              ) : null}

              {canViewDiscussion && !community.isMember ? (
                <section className="rounded-[28px] border border-dashed border-violet-200 bg-white/78 p-5 text-sm text-stone-600 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-100/70">
                  {t('communities.detail.joinToPost')}
                </section>
              ) : null}

              {canViewDiscussion && isPostsLoading ? <StateBox>{t('communities.postsLoading')}</StateBox> : null}

              {canViewDiscussion && !isPostsLoading && safePosts.length === 0 ? (
                <StateBox>{t('communities.postsEmpty')}</StateBox>
              ) : null}

              {canViewDiscussion && !isPostsLoading && safePosts.length > 0 ? (
                <div className="space-y-5">
                  {safePosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={user?.id}
                      onCreateComment={handleCreateComment}
                      onDeletePost={handleDeletePost}
                      onReactToComment={handleReactToComment}
                      onToggleLike={handleToggleLike}
                      onUpdatePost={handleUpdatePost}
                      isLikePending={likePendingIds.includes(post.id)}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          {activeTab === 'about' ? (
            <section className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/12 dark:bg-white/8">
              <h2 className="text-xl font-semibold text-stone-950 dark:text-violet-50">{t('communities.aboutGroup')}</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-violet-100/72">
                {community.description || t('communities.detail.noDescriptionYet')}
              </p>
              <div className="mt-5 grid gap-3 text-sm text-stone-600 sm:grid-cols-3 dark:text-violet-100/72">
                <InfoPill
                  label={t('communities.detail.visibility')}
                  value={community.isPrivate ? t('communities.form.private') : t('communities.form.public')}
                />
                <InfoPill label={t('communities.detail.owner')} value={community.owner?.name || 'YaZoo'} />
                <InfoPill label={t('communities.detail.status')} value={getMembershipLabel(community, t)} />
              </div>
            </section>
          ) : null}

          {activeTab === 'members' ? (
            <section className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/12 dark:bg-white/8">
              <h2 className="text-xl font-semibold text-stone-950 dark:text-violet-50">{t('communities.membersGroup')}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {memberPreview.map((member) => (
                  <div key={member.id ?? member.name} className="flex items-center gap-3 rounded-[22px] border border-violet-100 bg-white/80 p-3 dark:border-violet-300/12 dark:bg-white/8">
                    <Avatar name={member.name} src={member.avatar || ''} />
                    <div>
                      <p className="font-semibold text-stone-950 dark:text-violet-50">{member.name}</p>
                      <p className="text-xs text-stone-500 dark:text-violet-100/60">
                        {String(member.id) === String(community.owner?.id)
                          ? t('communities.detail.admin')
                          : t('communities.detail.member')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {memberPreview.length === 0 ? <StateBox>{t('communities.membersEmpty')}</StateBox> : null}
            </section>
          ) : null}

          {activeTab === 'media' ? (
            <section className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/12 dark:bg-white/8">
              <h2 className="text-xl font-semibold text-stone-950 dark:text-violet-50">{t('communities.mediaGroup')}</h2>
              {mediaPosts.length === 0 ? (
                <StateBox>{t('communities.mediaEmpty')}</StateBox>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {mediaPosts.map((post) => (
                    <MediaPreview key={post.id} post={post} t={t} />
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/12 dark:bg-white/8">
            <h2 className="text-lg font-semibold text-stone-950 dark:text-violet-50">{t('communities.about')}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-violet-100/70">
              {community.description || t('communities.detail.noDescription')}
            </p>
            <div className="mt-4 space-y-3 text-sm text-stone-600 dark:text-violet-100/70">
              <p><strong className="text-stone-950 dark:text-violet-50">{t('communities.visibilityLabel')}</strong> {community.isPrivate ? t('communities.form.private') : t('communities.form.public')}</p>
              <p><strong className="text-stone-950 dark:text-violet-50">{t('communities.ownerLabel')}</strong> {community.owner?.name}</p>
              <p><strong className="text-stone-950 dark:text-violet-50">{t('communities.statusLabel')}</strong> {getMembershipLabel(community, t)}</p>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/12 dark:bg-white/8">
            <h2 className="text-lg font-semibold text-stone-950 dark:text-violet-50">{t('communities.recentMembers')}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {memberPreview.map((member, index) => (
                <Avatar
                  key={`${member.id ?? index}-${member.name}`}
                  name={member.name}
                  src={member.avatar || ''}
                  className="border-2 border-white dark:border-stone-950"
                />
              ))}
            </div>
          </section>

          <Link
            to="/communities"
            className="block rounded-[24px] border border-violet-100 bg-white/80 px-5 py-4 text-center text-sm font-semibold text-violet-900 transition hover:bg-violet-50 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-50 dark:hover:bg-white/12"
          >
            {t('communities.detail.backToGroups')}
          </Link>
        </aside>
      </div>

      {isDeleteDialogOpen ? (
        <ConfirmDialog
          confirmLabel={isDeletingCommunity ? t('common.deleting') : t('communities.detail.delete')}
          isProcessing={isDeletingCommunity}
          message={t('communities.deleteConfirmMessage')}
          onCancel={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDeleteCommunity}
          title={t('communities.deleteConfirmTitle')}
        />
      ) : null}
    </section>
  )
}

function getMembershipLabel(community, t) {
  if (community.membershipStatus === 'pending') {
    return t('communities.detail.pending')
  }

  if (community.isMember) {
    return t('communities.detail.member')
  }

  return t('communities.detail.notMember')
}

function Alert({ children, tone = 'success' }) {
  const className =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  return <div className={`rounded-[24px] border px-5 py-4 text-sm ${className}`}>{children}</div>
}

function StateBox({ children }) {
  return (
    <div className="rounded-[28px] border border-dashed border-violet-200 bg-white/84 px-5 py-12 text-center text-sm text-stone-500 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-100/70">
      {children}
    </div>
  )
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-[22px] border border-violet-100 bg-white/78 px-4 py-3 dark:border-violet-300/12 dark:bg-white/8">
      <p className="text-xs uppercase tracking-[0.16em] text-stone-500 dark:text-violet-100/52">
        {label}
      </p>
      <p className="mt-1 font-semibold text-stone-950 dark:text-violet-50">
        {value}
      </p>
    </div>
  )
}

function ConfirmDialog({
  confirmLabel,
  isProcessing,
  message,
  onCancel,
  onConfirm,
  title,
}) {
  const { t } = useI18n()

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/58 px-4 py-6 backdrop-blur-sm">
      <section className="max-h-[82vh] w-full max-w-lg overflow-y-auto rounded-[30px] border border-white/70 bg-white/96 p-5 text-start shadow-[0_28px_70px_rgba(20,9,38,0.24)] dark:border-violet-300/14 dark:bg-[#12051f]">
        <h2 className="text-lg font-semibold text-stone-950 dark:text-violet-50">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-violet-100/72">
          {message}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isProcessing}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onConfirm}
            disabled={isProcessing}
            className="border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-100"
          >
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}

function MediaPreview({ post, t }) {
  const mediaUrl = post.mediaUrl ?? post.imageUrl
  const isVideo = post.mediaKind === 'video'

  return (
    <article className="overflow-hidden rounded-[24px] border border-violet-100 bg-white/78 dark:border-violet-300/12 dark:bg-white/8">
      {isVideo ? (
        <video src={mediaUrl} controls className="h-64 w-full object-cover sm:h-80" />
      ) : (
        <img src={mediaUrl} alt={post.content || t('communities.detail.mediaAlt')} className="h-64 w-full object-cover sm:h-80" />
      )}
      <p className="line-clamp-2 px-4 py-3 text-sm text-stone-600 dark:text-violet-100/72">
        {post.content || t('communities.detail.postFallback')}
      </p>
    </article>
  )
}

function getUniqueMembers(members) {
  const seen = new Set()

  return members.filter((member) => {
    if (!member?.id && !member?.name) {
      return false
    }

    const key = String(member.id ?? member.name)

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

Alert.propTypes = {
  children: PropTypes.node,
  tone: PropTypes.string,
}

StateBox.propTypes = {
  children: PropTypes.node,
}

InfoPill.propTypes = {
  label: PropTypes.string,
  value: PropTypes.node,
}

ConfirmDialog.propTypes = {
  confirmLabel: PropTypes.string,
  isProcessing: PropTypes.bool,
  message: PropTypes.string,
  onCancel: PropTypes.func,
  onConfirm: PropTypes.func,
  title: PropTypes.string,
}

MediaPreview.propTypes = {
  post: PropTypes.object,
  t: PropTypes.func,
}

function addCommentToPost(post, comment) {
  if (comment.parentId) {
    return {
      ...post,
      commentsCount: (post.commentsCount ?? post.comments?.length ?? 0) + 1,
      comments: (post.comments ?? []).map((existingComment) =>
        existingComment.id === comment.parentId
          ? {
              ...existingComment,
              replies: [...(existingComment.replies ?? []), comment],
            }
          : existingComment,
      ),
    }
  }

  return {
    ...post,
    commentsCount: (post.commentsCount ?? post.comments?.length ?? 0) + 1,
    comments: [comment, ...(post.comments ?? [])],
  }
}

function updateCommentInPost(post, nextComment) {
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

function isVideoMedia(value = '') {
  return /\.(mp4|webm|mov|quicktime)(\?|#|$)/i.test(String(value).toLowerCase())
}

export default CommunityDetailPage
