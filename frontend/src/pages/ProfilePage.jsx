import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import {
  createCommentRequest,
  deletePostRequest,
  getPostsRequest,
  reactToCommentRequest,
  toggleLikeRequest,
  updatePostRequest,
} from '../api/posts'
import {
  getProfileFollowersRequest,
  getProfileFollowingRequest,
  getProfileRequest,
  updateProfileRequest,
} from '../api/profile'
import { createDirectConversationRequest } from '../api/messages'
import PostCard from '../components/feed/PostCard'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import ComplianceBadge from '../components/ui/ComplianceBadge'
import FollowButton from '../components/ui/FollowButton'
import VerifiedPhoneBadge from '../components/ui/VerifiedPhoneBadge'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { asArray, extractDataArray, extractDataObject } from '../utils/apiData'
import { getErrorMessage } from '../utils/getErrorMessage'
import { normalizeAuthUserMedia, normalizeProfileMediaPayload } from '../utils/media'
import {
  addCommentToPost,
  filterSocialPosts as filterPublications,
  updateCommentInPost,
} from '../utils/socialPosts'

function ProfilePage() {
  const { setUser, user } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const { userId: routeUserId } = useParams()
  const [searchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    country: '',
    city: '',
    bio: '',
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [coverPhotoFile, setCoverPhotoFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [coverPreview, setCoverPreview] = useState('')
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [removeCoverPhoto, setRemoveCoverPhoto] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [recentPublications, setRecentPublications] = useState([])
  const [likePendingIds, setLikePendingIds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMessageStarting, setIsMessageStarting] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')
  const [relationshipDialog, setRelationshipDialog] = useState(null)
  const [relationshipUsers, setRelationshipUsers] = useState([])
  const [relationshipError, setRelationshipError] = useState('')
  const [isRelationshipLoading, setIsRelationshipLoading] = useState(false)
  const publicationsSectionRef = useRef(null)
  const editSectionRef = useRef(null)
  const nameInputRef = useRef(null)
  const requestedProfileId =
    routeUserId ?? searchParams.get('userId') ?? searchParams.get('id') ?? user?.id
  const isOwnProfile =
    Boolean(user?.id) && String(requestedProfileId ?? user.id) === String(user.id)
  const profileTabs = [
    { key: 'posts', label: t('profile.publications') },
    { key: 'about', label: t('common.about') },
    { key: 'media', label: t('profile.media') },
    { key: 'communities', label: t('profile.communities') },
  ]

  useEffect(() => {
    let cancelled = false

    const fetchProfile = async () => {
      if (!user?.id || !requestedProfileId) {
        setIsLoading(false)
        return
      }

      try {
        const response = await getProfileRequest(requestedProfileId)
        const data = normalizeProfileMediaPayload(extractDataObject(response, null))
        const postsResponse = await getPostsRequest()
        const userPosts = extractDataArray(postsResponse).filter(
          (post) => String(post.author?.id) === String(requestedProfileId),
        )

        if (!cancelled) {
          setProfile(data)
          setRecentPublications(userPosts)
          setForm({
            name: data.name ?? '',
            phone: data.phone ?? '',
            country: data.country ?? '',
            city: data.city ?? '',
            bio: data.bio ?? '',
          })
          setAvatarPreview(data.avatar ?? '')
          setCoverPreview(data.coverPhoto ?? '')
          setRemoveAvatar(false)
          setRemoveCoverPhoto(false)
          setErrorMessage('')
        }
      } catch (error) {
        if (!cancelled) {
          setRecentPublications([])
          setErrorMessage(
            getErrorMessage(error, t('profile.loadError')),
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchProfile()

    return () => {
      cancelled = true
    }
  }, [requestedProfileId, t, user?.id])

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }

      if (coverPreview.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreview)
      }
    }
  }, [avatarPreview, coverPreview])

  useEffect(() => {
    if (!isEditOpen) {
      return undefined
    }

    const timeoutId = globalThis.setTimeout(() => {
      editSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      nameInputRef.current?.focus()
    }, 160)

    return () => {
      globalThis.clearTimeout(timeoutId)
    }
  }, [isEditOpen])

  const handleChange = (field) => (event) => {
    const value = event.target.value

    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleFilePreview = (type) => (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const nextPreview = URL.createObjectURL(file)

    if (type === 'avatar') {
      if (avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }

      setAvatarFile(file)
      setAvatarPreview(nextPreview)
      setRemoveAvatar(false)
      return
    }

    if (coverPreview.startsWith('blob:')) {
      URL.revokeObjectURL(coverPreview)
    }

    setCoverPhotoFile(file)
    setCoverPreview(nextPreview)
    setRemoveCoverPhoto(false)
  }

  const handleRemoveAvatar = () => {
    if (avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview)
    }

    setAvatarFile(null)
    setAvatarPreview('')
    setRemoveAvatar(true)
  }

  const handleRemoveCoverPhoto = () => {
    if (coverPreview.startsWith('blob:')) {
      URL.revokeObjectURL(coverPreview)
    }

    setCoverPhotoFile(null)
    setCoverPreview('')
    setRemoveCoverPhoto(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!isOwnProfile) {
      return
    }

    setSuccessMessage('')
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const response = await updateProfileRequest(user.id, {
        ...form,
        avatar_file: avatarFile,
        cover_photo_file: coverPhotoFile,
        remove_avatar: removeAvatar,
        remove_cover_photo: removeCoverPhoto,
      })
      const mediaVersion = Date.now()
      const data = normalizeProfileMediaPayload({
        ...extractDataObject(response),
        mediaVersion,
      })

      setProfile(data)
      setAvatarFile(null)
      setCoverPhotoFile(null)
      setAvatarPreview(data.avatar ?? '')
      setCoverPreview(data.coverPhoto ?? '')
      setRemoveAvatar(false)
      setRemoveCoverPhoto(false)
      setUser((current) =>
        normalizeAuthUserMedia({
          ...(current ?? {}),
          name: data.name,
          phone: data.phone,
          country: data.country,
          city: data.city,
          bio: data.bio,
          avatar: data.avatar,
          cover_photo: data.coverPhoto,
          mediaVersion,
          updated_at: data.updatedAt ?? new Date().toISOString(),
        }),
      )
      setSuccessMessage(t('profile.updated'))
      setIsEditOpen(false)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('profile.updateError')),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const avatarSrc = removeAvatar
    ? ''
    : avatarPreview || profile?.avatar || user?.avatar || ''
  const coverImage = removeCoverPhoto
    ? ''
    : coverPreview || profile?.coverPhoto || user?.cover_photo || ''
  const followersCount = profile?.followersCount ?? 0
  const followingCount = profile?.followingCount ?? 0
  const profileLocation = profile?.city || user?.city || ''
  const searchTerm = searchParams.get('q')?.trim() ?? ''
  const visibleRecentPublications = filterPublications(
    recentPublications,
    searchTerm,
  )
  const mediaPublications = visibleRecentPublications.filter(
    (post) => post.mediaUrl || post.imageUrl,
  )

  const handleEditToggle = () => {
    if (!isOwnProfile) {
      return
    }

    if (isEditOpen) {
      setIsEditOpen(false)
      return
    }

    setIsEditOpen(true)
  }

  const handleShareProfile = async () => {
    const profileUrl = `${globalThis.location.origin}/profile/${profile?.id ?? requestedProfileId ?? user?.id}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Profil YaZoo',
          text: `Decouvrez le profil de ${profile?.name ?? user?.name ?? 'Utilisateur'} sur YaZoo.`,
          url: profileUrl,
        })
        return
      } catch {
        // User cancelled share dialog.
      }
    }

    try {
      await navigator.clipboard.writeText(profileUrl)
      setSuccessMessage(t('profile.copied'))
      setErrorMessage('')
    } catch {
      setErrorMessage(t('profile.shareError'))
    }
  }

  const handleStartConversation = async () => {
    if (!profile?.id || isOwnProfile) {
      return
    }

    setIsMessageStarting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await createDirectConversationRequest({
        user_id: profile.id,
      })
      const conversation = extractDataObject(response, null)

      if (!conversation?.id) {
        throw new Error('Conversation introuvable.')
      }

      navigate(`/messages?conversation=${conversation.id}`)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('profile.startConversationError')),
      )
    } finally {
      setIsMessageStarting(false)
    }
  }

  const handleOpenPublications = () => {
    setActiveTab('posts')
    globalThis.setTimeout(() => {
      publicationsSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 80)
  }

  const handleOpenRelationshipDialog = async (type) => {
    if (!requestedProfileId) {
      return
    }

    setRelationshipDialog(type)
    setRelationshipUsers([])
    setRelationshipError('')
    setIsRelationshipLoading(true)

    try {
      const response = type === 'followers'
        ? await getProfileFollowersRequest(requestedProfileId)
        : await getProfileFollowingRequest(requestedProfileId)

      setRelationshipUsers(extractDataArray(response))
    } catch (error) {
      setRelationshipError(getErrorMessage(error, t('profile.relationshipsLoadError')))
    } finally {
      setIsRelationshipLoading(false)
    }
  }

  const handleCloseRelationshipDialog = () => {
    setRelationshipDialog(null)
    setRelationshipUsers([])
    setRelationshipError('')
  }

  const handleToggleLike = async (postId, reaction = 'like') => {
    let previousPost = null

    setLikePendingIds((current) => [...current, postId])
    setRecentPublications((current) =>
      asArray(current).map((post) => {
        if (post.id !== postId) {
          return post
        }

        previousPost = post

        return {
          ...post,
          liked: post.userReaction === reaction ? false : true,
          userReaction: post.userReaction === reaction ? null : reaction,
          likes:
            post.userReaction === reaction
              ? Math.max(0, post.likes - 1)
              : post.liked
                ? post.likes
                : post.likes + 1,
        }
      }),
    )

    try {
      const response = await toggleLikeRequest(postId, reaction)

      setRecentPublications((current) =>
        asArray(current).map((post) =>
          post.id === postId ? extractDataObject(response, post) : post,
        ),
      )
    } catch (error) {
      if (previousPost) {
        setRecentPublications((current) =>
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

    setRecentPublications((current) =>
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

    setRecentPublications((current) =>
      asArray(current).map((post) =>
        post.id === postId ? updateCommentInPost(post, nextComment) : post,
      ),
    )

    return nextComment
  }

  const handleUpdatePost = async (postId, payload) => {
    const response = await updatePostRequest(postId, payload)

    setRecentPublications((current) =>
      asArray(current).map((post) =>
        post.id === postId ? extractDataObject(response, post) : post,
      ),
    )

    return extractDataObject(response, null)
  }

  const handleDeletePost = async (postId) => {
    await deletePostRequest(postId)
    setRecentPublications((current) => asArray(current).filter((post) => post.id !== postId))
    setProfile((current) =>
      current
        ? {
            ...current,
            postsCount: Math.max(0, (current.postsCount ?? 1) - 1),
          }
        : current,
    )
  }

  return (
    <section className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-white/80 bg-white/92 shadow-[0_24px_60px_rgba(124,58,237,0.08)] sm:rounded-[32px] dark:border-violet-300/12 dark:bg-white/8">
        <div
          className="relative h-56 bg-[linear-gradient(135deg,#5b21b6_0%,#8b5cf6_45%,#ddd6fe_100%)] sm:h-64 md:h-80 lg:h-96 xl:h-[28rem]"
        >
          {coverImage ? (
            <img
              src={coverImage}
              alt={t('profile.coverAlt')}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(17,12,28,0.22))]" />
          <div className="absolute bottom-5 right-5 z-10 rounded-full bg-white/18 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white backdrop-blur">
            {t('profile.profileBadge')}
          </div>
          <div className="absolute -bottom-12 left-1/2 z-20 -translate-x-1/2">
            <Avatar
              name={profile?.name ?? user?.name ?? 'YaZoo User'}
              src={avatarSrc}
              size="xl"
              className="border-4 border-white shadow-[0_18px_42px_rgba(15,23,42,0.12)]"
            />
          </div>
        </div>

        <div className="px-4 pb-5 pt-16 sm:px-5 sm:pb-6 sm:pt-16">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
                  {t('profile.publicProfile')}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-stone-950 sm:text-3xl dark:text-violet-50">
                    {profile?.name ?? user?.name}
                  </h2>
                  {profile?.isPhoneVerified || (isOwnProfile && user?.isPhoneVerified) ? <VerifiedPhoneBadge /> : null}
                  {profile?.isProfessionalVerified ? <ComplianceBadge type="professionalApproved" /> : null}
                </div>
                <p className="mt-1 text-sm text-stone-500 dark:text-violet-100/62">
                  @{(profile?.name ?? user?.name ?? 'username').toLowerCase().replace(/\s+/g, '')}
                  {profileLocation || profile?.country ? ' - ' : ''}
                  {[profileLocation, profile?.country].filter(Boolean).join(', ')}
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 dark:text-violet-100/76">
                  {profile?.bio ||
                    t('profile.defaultBio')}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              {isOwnProfile ? (
                <Button
                  type="button"
                  variant={isEditOpen ? 'ghost' : 'secondary'}
                  onClick={handleEditToggle}
                  className="w-full sm:w-auto"
                >
                  {isEditOpen ? t('profile.close') : t('profile.edit')}
                </Button>
            ) : (
              <>
                <FollowButton
                  userId={profile?.id}
                  isFollowing={profile?.isFollowing}
                  hidden={isOwnProfile}
                  onChange={(nextProfile) => {
                    if (nextProfile) {
                      setProfile(normalizeProfileMediaPayload(nextProfile))
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleStartConversation}
                  disabled={isMessageStarting}
                  className="w-full sm:w-auto"
                >
                  {isMessageStarting ? t('common.loading') : t('messages.sendMessage')}
                </Button>
              </>
              )}
              <button
                type="button"
                onClick={handleShareProfile}
                className="inline-flex w-full items-center justify-center rounded-full border border-violet-200/80 bg-white/92 px-4 py-2 text-sm font-medium text-stone-700 shadow-[0_12px_26px_rgba(124,58,237,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50/80 hover:text-violet-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200 sm:w-auto dark:border-violet-300/16 dark:bg-white/8 dark:text-violet-50 dark:hover:bg-white/12"
              >
                {t('profile.shareProfile')}
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <StatCard label={t('feed.postsCount')} value={profile?.postsCount ?? 0} onClick={handleOpenPublications} />
            <StatCard label={t('feed.followers')} value={followersCount} onClick={() => handleOpenRelationshipDialog('followers')} />
            <StatCard label={t('feed.followingCount')} value={followingCount} onClick={() => handleOpenRelationshipDialog('following')} />
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <section
        ref={publicationsSectionRef}
        className="scroll-mt-24 rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/12 dark:bg-white/8"
      >
        <div className="flex gap-2 overflow-x-auto pb-1">
          {profileTabs.map((tab) => (
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

        {activeTab === 'posts' ? (
          <div className="mt-5 space-y-4">
            {recentPublications.length === 0 ? (
              <EmptyProfileState>{t('profile.noPublication')}</EmptyProfileState>
            ) : null}

            {recentPublications.length > 0 && visibleRecentPublications.length === 0 ? (
              <EmptyProfileState>{t('profile.noPublicationSearch')}</EmptyProfileState>
            ) : null}

            {visibleRecentPublications.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onCreateComment={handleCreateComment}
                onReactToComment={handleReactToComment}
                onToggleLike={handleToggleLike}
                onUpdatePost={handleUpdatePost}
                onDeletePost={handleDeletePost}
                isLikePending={likePendingIds.includes(post.id)}
                currentUserId={user?.id}
              />
            ))}
          </div>
        ) : null}

        {activeTab === 'about' ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <ProfileInfo label={t('common.name')} value={profile?.name ?? user?.name ?? t('common.user')} />
            <ProfileInfo label={t('common.city')} value={profileLocation || t('common.notProvided')} />
            <ProfileInfo label={t('common.country')} value={profile?.country || user?.country || t('common.notProvided')} />
            <ProfileInfo label={t('profile.memberSince')} value={formatProfileDate(profile?.createdAt)} />
            <div className="rounded-[24px] border border-violet-100 bg-white/78 p-4 lg:col-span-2 dark:border-violet-300/12 dark:bg-white/8">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500 dark:text-violet-100/52">{t('common.bio')}</p>
              <p className="mt-2 text-sm leading-7 text-stone-700 dark:text-violet-100/76">
                {profile?.bio || t('profile.defaultAbout')}
              </p>
            </div>
          </div>
        ) : null}

        {activeTab === 'media' ? (
          <div className="mt-5">
            {mediaPublications.length === 0 ? (
              <EmptyProfileState>{t('profile.noMedia')}</EmptyProfileState>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {mediaPublications.map((post) => (
                  <ProfileMediaPreview key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {activeTab === 'communities' ? (
          <div className="mt-5">
            <EmptyProfileState>
              {t('profile.communitiesEmpty')}
            </EmptyProfileState>
          </div>
        ) : null}
      </section>

      {isOwnProfile && isEditOpen ? (
        <form
          ref={editSectionRef}
          onSubmit={handleSubmit}
          className="scroll-mt-24 rounded-[30px] border border-white/80 bg-white/94 p-5 shadow-[0_24px_56px_rgba(124,58,237,0.08)]"
        >
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-stone-950">
              {t('profile.editProfile')}
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              {t('profile.editText')}
            </p>
          </div>

          {isLoading ? (
            <p className="text-sm text-stone-500">{t('profile.loading')}</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="rounded-[24px] border border-violet-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.78))] p-4">
                  <p className="text-sm font-medium text-stone-800">
                    {t('profile.photo')}
                  </p>
                  <div className="mt-4 flex justify-center">
                    <Avatar
                      name={form.name || profile?.name || user?.name || 'YaZoo User'}
                      src={removeAvatar ? '' : avatarPreview || profile?.avatar || user?.avatar || ''}
                      size="lg"
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-violet-100 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-violet-50">
                      {t('profile.changePhoto')}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFilePreview('avatar')}
                        className="hidden"
                      />
                    </label>
                    {avatarPreview ? (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                      >
                        {t('profile.remove')}
                      </button>
                    ) : null}
                  </div>
                  {avatarFile ? (
                    <p className="mt-2 text-xs text-stone-500">
                      {avatarFile.name}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-[24px] border border-violet-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.82),_rgba(237,233,254,0.74))] p-4">
                  <p className="text-sm font-medium text-stone-800">
                    {t('profile.cover')}
                  </p>
                  <div className="relative mt-4 h-40 overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#5b21b6_0%,#8b5cf6_45%,#ddd6fe_100%)]">
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt={t('profile.coverPreview')}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,transparent,rgba(17,12,28,0.16))]" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-violet-100 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-violet-50">
                      {t('profile.changeCover')}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFilePreview('cover')}
                        className="hidden"
                      />
                    </label>
                    {coverPreview ? (
                      <button
                        type="button"
                        onClick={handleRemoveCoverPhoto}
                        className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                      >
                        {t('profile.remove')}
                      </button>
                    ) : null}
                  </div>
                  {coverPhotoFile ? (
                    <p className="mt-2 text-xs text-stone-500">
                      {coverPhotoFile.name}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label={t('common.name')}
                  value={form.name}
                  onChange={handleChange('name')}
                  inputRef={nameInputRef}
                />
                <Field label="Email" value={profile?.email ?? user?.email ?? ''} readOnly />
                <Field label={t('common.phone')} value={form.phone} onChange={handleChange('phone')} />
                <Field label={t('common.country')} value={form.country} onChange={handleChange('country')} />
                <Field label={t('common.city')} value={form.city} onChange={handleChange('city')} />
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">
                  {t('common.bio')}
                </span>
                <textarea
                  rows={5}
                  value={form.bio}
                  onChange={handleChange('bio')}
                  className="w-full rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white"
                  placeholder={t('profile.bioPlaceholder')}
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsEditOpen(false)
                    setAvatarFile(null)
                    setCoverPhotoFile(null)
                    setRemoveAvatar(false)
                    setRemoveCoverPhoto(false)
                    setAvatarPreview(profile?.avatar ?? '')
                    setCoverPreview(profile?.coverPhoto ?? '')
                  }}
                  className="w-full sm:w-auto"
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? t('common.sending') : t('profile.saveChanges')}
                </Button>
              </div>
            </div>
          )}
        </form>
      ) : null}

      {relationshipDialog ? (
        <RelationshipDialog
          errorMessage={relationshipError}
          isLoading={isRelationshipLoading}
          onClose={handleCloseRelationshipDialog}
          title={relationshipDialog === 'followers' ? t('profile.followersTitle') : t('profile.followingTitle')}
          users={relationshipUsers}
        />
      ) : null}

    </section>
  )
}

function Field({ label, inputRef = null, readOnly = false, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-100">
        {label}
      </span>
      <input
        ref={inputRef}
        readOnly={readOnly}
        className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
          readOnly
            ? 'border-stone-200 bg-stone-100 text-stone-500 dark:border-violet-300/12 dark:bg-white/8 dark:text-violet-100/62'
            : 'border-violet-100 bg-violet-50/50 text-stone-700 focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-[#12051f] dark:text-violet-50 dark:placeholder:text-violet-200/45 dark:focus:bg-[#160827]'
        }`}
        {...props}
      />
    </label>
  )
}

function EmptyProfileState({ children }) {
  return (
    <div className="rounded-[24px] border border-dashed border-violet-200 bg-white/84 px-5 py-10 text-center text-sm text-stone-500 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-100/70">
      {children}
    </div>
  )
}

function ProfileInfo({ label, value }) {
  return (
    <div className="rounded-[24px] border border-violet-100 bg-white/78 p-4 dark:border-violet-300/12 dark:bg-white/8">
      <p className="text-xs uppercase tracking-[0.16em] text-stone-500 dark:text-violet-100/52">
        {label}
      </p>
      <p className="mt-1 font-semibold text-stone-950 dark:text-violet-50">
        {value}
      </p>
    </div>
  )
}

function ProfileMediaPreview({ post }) {
  const { t } = useI18n()
  const mediaUrl = post.mediaUrl ?? post.imageUrl
  const isVideo = post.mediaKind === 'video'
  const stats = getPostStats(post)

  return (
    <Link
      to={`/feed?post=${post.id}`}
      className="block overflow-hidden rounded-[24px] border border-violet-100 bg-white/78 transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_18px_38px_rgba(124,58,237,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 dark:border-violet-300/12 dark:bg-white/8"
    >
      <div className="relative">
        {isVideo ? (
          <video src={mediaUrl} controls className="h-64 w-full object-cover sm:h-80" />
        ) : (
          <img src={mediaUrl} alt={post.content || t('profile.mediaAlt')} className="h-64 w-full object-cover sm:h-80" />
        )}
        <div className="absolute inset-x-3 bottom-3 flex flex-wrap justify-center gap-2">
          <MediaStat label={t('profile.reactionsShort')} value={stats.reactions} />
          <MediaStat label={t('comments.title')} value={stats.comments} />
          <MediaStat label={t('post.shares')} value={stats.shares} />
        </div>
      </div>
      <p className="line-clamp-2 px-4 py-3 text-sm text-stone-600 dark:text-violet-100/72">
        {post.content || t('post.shareFallback')}
      </p>
    </Link>
  )
}

function formatProfileDate(value) {
  if (!value) {
    return 'Non renseignee'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function MediaStat({ label, value }) {
  return (
    <span className="rounded-full bg-stone-950/62 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur">
      <span dir="ltr" className="me-1 inline-block">
        {value}
      </span>
      {label}
    </span>
  )
}

function RelationshipDialog({
  errorMessage,
  isLoading,
  onClose,
  title,
  users,
}) {
  const { t } = useI18n()

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/58 px-4 py-6 backdrop-blur-sm">
      <section className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] border border-white/70 bg-white/96 p-5 shadow-[0_28px_70px_rgba(20,9,38,0.24)] dark:border-violet-300/14 dark:bg-[#12051f]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-stone-950 dark:text-violet-50">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-violet-100 bg-white text-lg font-semibold text-stone-600 transition hover:bg-violet-50 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-50"
            aria-label={t('common.close')}
          >
            x
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-4 rounded-2xl border border-dashed border-violet-200 px-4 py-10 text-center text-sm text-stone-500 dark:border-violet-300/14 dark:text-violet-100/70">
            {t('common.loading')}
          </div>
        ) : null}

        {!isLoading && users.length === 0 && !errorMessage ? (
          <div className="mt-4 rounded-2xl border border-dashed border-violet-200 px-4 py-10 text-center text-sm text-stone-500 dark:border-violet-300/14 dark:text-violet-100/70">
            {t('profile.relationshipsEmpty')}
          </div>
        ) : null}

        {!isLoading && users.length > 0 ? (
          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pe-1">
            {users.map((profileUser) => (
              <Link
                key={profileUser.id}
                to={`/profile/${profileUser.id}`}
                onClick={onClose}
                className="flex items-center gap-3 rounded-[22px] border border-violet-100 bg-white/80 p-3 transition hover:border-violet-300 hover:bg-violet-50 dark:border-violet-300/12 dark:bg-white/8 dark:hover:bg-white/12"
              >
                <Avatar name={profileUser.name} src={profileUser.avatar || ''} />
                <div className="min-w-0 flex-1 text-start">
                  <p className="truncate font-semibold text-stone-950 dark:text-violet-50">{profileUser.name}</p>
                  <p className="truncate text-xs text-stone-500 dark:text-violet-100/60">
                    {profileUser.city || t('common.notProvided')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}

function StatCard({ label, value, onClick }) {
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="rounded-[24px] bg-[linear-gradient(135deg,_rgba(244,237,255,0.96),_rgba(237,233,254,0.72))] px-4 py-4 text-center transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(124,58,237,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 dark:bg-[linear-gradient(135deg,_rgba(124,58,237,0.18),_rgba(24,6,44,0.92))]"
    >
      <p className="text-xs uppercase tracking-[0.18em] text-stone-600 dark:text-violet-100/70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-stone-900 dark:text-violet-50">
        {value}
      </p>
    </Component>
  )
}

function getPostStats(post) {
  const reactionCounts = post.reactionCounts ?? {}
  const reactionTotal = Object.values(reactionCounts).reduce(
    (total, value) => total + Number(value || 0),
    0,
  )

  return {
    reactions: post.reactionsCount ?? post.likesCount ?? post.likes ?? reactionTotal,
    comments: post.commentsCount ?? post.comments?.length ?? 0,
    shares: post.sharesCount ?? post.shares ?? 0,
  }
}

export default ProfilePage
