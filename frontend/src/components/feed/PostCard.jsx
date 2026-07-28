import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import PropTypes from 'prop-types'

import { formatDate } from '../../utils/formatDate'
import { getErrorMessage } from '../../utils/getErrorMessage'
import { getPostMedia } from '../../utils/media'
import { useI18n } from '../../hooks/useI18n'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import FollowButton from '../ui/FollowButton'
import ReportButton from '../reports/ReportButton'
import VerifiedPhoneBadge from '../ui/VerifiedPhoneBadge'
import CommentList from './CommentList'

const POST_REACTIONS = [
  { key: 'like', labelKey: 'post.reactions.like', icon: '\u{1F44D}' },
  { key: 'love', labelKey: 'post.reactions.love', icon: '\u{2764}\u{FE0F}' },
  { key: 'happy', labelKey: 'post.reactions.happy', icon: '\u{1F60A}' },
  { key: 'wow', labelKey: 'post.reactions.wow', icon: '\u{1F62E}' },
]

const POST_VISIBILITIES = [
  { key: 'public', labelKey: 'post.visibility.public', helperKey: 'post.visibility.publicHelp' },
  { key: 'followers', labelKey: 'post.visibility.followers', helperKey: 'post.visibility.followersHelp' },
  { key: 'private', labelKey: 'post.visibility.private', helperKey: 'post.visibility.privateHelp' },
]

function PostCard({
  post,
  currentUserId,
  onCreateComment,
  onDeletePost,
  onReactToComment,
  onToggleLike,
  onUpdatePost,
  isLikePending = false,
}) {
  const { t } = useI18n()
  const menuRef = useRef(null)
  const [showComments, setShowComments] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content ?? '')
  const [commentBody, setCommentBody] = useState('')
  const [commentReaction, setCommentReaction] = useState('')
  const [commentError, setCommentError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [hasMediaError, setHasMediaError] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isUpdatingPost, setIsUpdatingPost] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const { mediaKind, mediaUrl } = getPostMedia(post)
  const canManagePost = String(post.author?.id) === String(currentUserId)
  const visibility = post.visibility ?? 'public'
  const visibilityLabel = getVisibilityLabel(visibility, t)

  const metadata = [post.location, formatDate(post.createdAt)]
    .filter(Boolean)
    .join(' - ')

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isMenuOpen])

  const handleSubmitComment = async (event) => {
    event.preventDefault()

    if (!commentBody.trim()) {
      return
    }

    setCommentError('')
    setIsSubmittingComment(true)

    try {
      await onCreateComment(post.id, commentBody.trim(), {
        reaction: commentReaction || null,
      })
      setCommentBody('')
      setCommentReaction('')
      setShowComments(true)
    } catch (error) {
      setCommentError(
        getErrorMessage(error, t('post.commentError')),
      )
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleSharePost = async () => {
    const url = `${globalThis.location.origin}/feed?post=${post.id}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post YaZoo de ${post.author?.name ?? 'membre'}`,
          text: post.content || t('post.shareFallback'),
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        setActionMessage(t('post.linkCopied'))
      }
    } catch {
      setActionMessage(t('post.shareUnavailable'))
    } finally {
      setIsMenuOpen(false)
    }
  }

  const handleSavePost = async () => {
    try {
      await navigator.clipboard.writeText(`${globalThis.location.origin}/feed?post=${post.id}`)
      setActionMessage(t('post.linkSaved'))
    } catch {
      setActionMessage(t('post.saveError'))
    } finally {
      setIsMenuOpen(false)
    }
  }

  const handleVisibilityChange = async (nextVisibility) => {
    if (!onUpdatePost || !canManagePost) {
      return
    }

    setIsUpdatingPost(true)
    setActionMessage('')

    try {
      await onUpdatePost(post.id, { visibility: nextVisibility })
      setActionMessage(t('post.visibilityUpdated', { visibility: getVisibilityLabel(nextVisibility, t) }))
    } catch (error) {
      setActionMessage(getErrorMessage(error, t('post.visibilityError')))
    } finally {
      setIsUpdatingPost(false)
      setIsMenuOpen(false)
    }
  }

  const handleEditPost = async (event) => {
    event.preventDefault()

    if (!onUpdatePost || !editContent.trim()) {
      return
    }

    setIsUpdatingPost(true)
    setActionMessage('')

    try {
      await onUpdatePost(post.id, { content: editContent.trim() })
      setIsEditing(false)
      setActionMessage(t('post.updated'))
    } catch (error) {
      setActionMessage(getErrorMessage(error, t('post.updateError')))
    } finally {
      setIsUpdatingPost(false)
    }
  }

  const handleDeletePost = async () => {
    if (!onDeletePost || !canManagePost) {
      return
    }

    setIsUpdatingPost(true)

    try {
      await onDeletePost(post.id)
    } catch (error) {
      setActionMessage(getErrorMessage(error, t('post.deleteError')))
      setIsUpdatingPost(false)
    }
  }

  return (
    <article className={`group relative mx-auto box-border w-full max-w-[42rem] min-w-0 rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(246,239,255,0.94))] shadow-[0_24px_56px_rgba(124,58,237,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_28px_60px_rgba(124,58,237,0.12)] dark:border-violet-300/12 dark:bg-[linear-gradient(180deg,_rgba(24,16,38,0.96),_rgba(36,20,61,0.92))] dark:shadow-[0_24px_60px_rgba(0,0,0,0.34)] ${isMenuOpen ? 'z-40 overflow-visible' : 'z-0 overflow-hidden'}`}>
      <div className="h-1.5 rounded-t-[30px] bg-[linear-gradient(90deg,#7c3aed,#a855f7,#d8b4fe,#ede9fe)]" />

      <div className={`w-full min-w-0 max-w-full px-3 py-4 sm:p-5 ${isMenuOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
        <div className="flex w-full min-w-0 items-start gap-3 sm:gap-4">
          <ProfileAvatar user={post.author} t={t} />

          <div className="min-w-0 flex-1 text-start">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-stone-900 dark:text-violet-50">
                {post.author?.name}
              </h3>
              {post.author?.isPhoneVerified ? <VerifiedPhoneBadge /> : null}
            </div>
            <p className="truncate text-sm text-stone-500 dark:text-violet-100/60">{metadata}</p>
            <div className="mt-2 flex w-full max-w-full flex-wrap items-center gap-2">
              <span className="inline-flex max-w-full rounded-full border border-violet-100 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-violet-800 dark:border-violet-300/15 dark:bg-white/8 dark:text-violet-100">
                {visibilityLabel}
              </span>
              <FollowButton
                userId={post.author?.id}
                isFollowing={post.author?.isFollowing}
                hidden={canManagePost}
                compact
              />
              <ReportButton reportableType="post" reportableId={post.id} isOwner={canManagePost} />
            </div>
          </div>

          <PostActionsMenu
            canManagePost={canManagePost}
            isMenuOpen={isMenuOpen}
            isUpdatingPost={isUpdatingPost}
            post={post}
            visibility={visibility}
            onDeletePost={() => {
              setIsMenuOpen(false)
              setIsDeleteDialogOpen(true)
            }}
            onEditPost={() => {
              setEditContent(post.content ?? '')
              setIsEditing(true)
              setIsMenuOpen(false)
            }}
            onSavePost={handleSavePost}
            onSharePost={handleSharePost}
            onToggleMenu={() => setIsMenuOpen((current) => !current)}
            onVisibilityChange={handleVisibilityChange}
            menuRef={menuRef}
            t={t}
          />
        </div>

        {(post.tags ?? []).length > 0 ? (
          <div className="mt-3 flex w-full max-w-full flex-wrap items-center gap-2">
            {(post.tags ?? []).map((tag) => (
              <span
                key={tag}
                dir="ltr"
                style={{ unicodeBidi: 'isolate' }}
                className="max-w-full rounded-full border border-violet-100 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.82))] px-3 py-1 text-xs font-medium text-violet-800 transition hover:border-violet-200 hover:bg-violet-50 dark:border-violet-300/12 dark:bg-white/8 dark:text-violet-100"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        {isEditing ? (
          <form onSubmit={handleEditPost} className="mt-4 w-full max-w-full space-y-3">
            <textarea
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm leading-7 text-stone-700 outline-none transition focus:border-violet-400 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-50"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isUpdatingPost || !editContent.trim()}>
                {isUpdatingPost ? t('post.updating') : t('common.save')}
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-4 w-full min-w-0 max-w-full break-words text-start text-sm leading-7 text-stone-700 dark:text-violet-50/86">
            {post.content}
          </p>
        )}

        {actionMessage ? (
          <p className="mt-3 w-full max-w-full rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-100">
            {actionMessage}
          </p>
        ) : null}

        {mediaUrl && !hasMediaError ? (
          <div className="mt-4 w-full min-w-0 max-w-full overflow-hidden">
            <div className="relative mx-auto w-full max-w-full overflow-hidden rounded-[24px] bg-stone-100 shadow-[0_18px_40px_rgba(124,58,237,0.08)] dark:bg-stone-900 sm:rounded-[28px]">
              <span className="absolute end-3 top-3 z-10 rounded-full bg-violet-950/72 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                {mediaKind === 'video' ? t('post.video') : t('post.photo')}
              </span>

              {mediaKind === 'video' ? (
                <video
                  src={mediaUrl}
                  controls
                  className="mx-auto block h-auto max-h-[70vh] w-full max-w-full object-contain md:max-h-[42rem] xl:max-h-[min(62vh,38rem)]"
                  onError={() => setHasMediaError(true)}
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={t('post.mediaAlt')}
                  className="mx-auto block h-auto w-auto max-h-[70vh] max-w-full object-contain md:max-h-[42rem] xl:max-h-[min(62vh,38rem)]"
                  onError={() => setHasMediaError(true)}
                />
              )}
            </div>
          </div>
        ) : mediaUrl && hasMediaError ? (
          <div className="mt-4 w-full max-w-full rounded-[24px] border border-dashed border-violet-200 bg-violet-50 px-4 py-8 text-center text-sm text-violet-800 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-100">
            {t('post.mediaUnavailable')}
          </div>
        ) : null}

        <div className="mt-5 flex w-full max-w-full min-w-0 flex-col gap-3">
          <div className="grid w-full max-w-full min-w-0 grid-cols-4 gap-2">
            {POST_REACTIONS.map((reaction) => (
              <button
                key={reaction.key}
                type="button"
                onClick={() => onToggleLike(post.id, reaction.key)}
                disabled={isLikePending}
                className={`inline-flex h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 ${
                  post.userReaction === reaction.key
                    ? 'border-violet-300 bg-violet-600 text-white shadow-[0_12px_26px_rgba(124,58,237,0.18)]'
                    : 'border-violet-100 bg-white/86 text-violet-900 hover:bg-violet-50 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-50 dark:hover:bg-white/14'
                }`}
                aria-label={t('post.reactAria', { reaction: t(reaction.labelKey) })}
                title={t(reaction.labelKey)}
              >
                <span aria-hidden="true">{reaction.icon}</span>
                <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                  {reaction.key === 'like' ? post.likes : getReactionCount(post.reactions, reaction.key)}
                </span>
              </button>
            ))}
          </div>

          <div className="flex w-full max-w-full items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowComments((current) => !current)}
              className="inline-flex h-11 min-w-[5rem] items-center justify-center gap-2 rounded-full border border-violet-100 bg-white/86 px-3 text-sm font-semibold text-violet-900 shadow-[0_12px_26px_rgba(124,58,237,0.08)] transition hover:-translate-y-0.5 hover:bg-violet-50 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-50 dark:hover:bg-white/14"
              aria-label={showComments ? t('common.hide') : t('post.comments')}
              title={showComments ? t('common.hide') : t('post.comments')}
            >
              <span aria-hidden="true">
                <CommentIcon />
              </span>
              <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                {post.commentsCount ?? post.comments?.length ?? 0}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSharePost}
              className="inline-flex h-11 min-w-[5rem] items-center justify-center gap-2 rounded-full border border-violet-100 bg-white/86 px-3 text-sm font-semibold text-violet-900 shadow-[0_12px_26px_rgba(124,58,237,0.08)] transition hover:-translate-y-0.5 hover:bg-violet-50 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-50 dark:hover:bg-white/14"
              aria-label={t('post.share')}
              title={t('post.share')}
            >
              <span aria-hidden="true">
                <ShareIcon />
              </span>
              <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                {post.sharesCount ?? 0}
              </span>
            </button>
          </div>
        </div>

        {showComments ? (
          <div className="mt-5 rounded-[26px] border border-violet-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.82))] p-4 dark:border-violet-300/12 dark:bg-[linear-gradient(180deg,_rgba(255,255,255,0.08),_rgba(168,85,247,0.08))]">
            <form onSubmit={handleSubmitComment} className="mb-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {POST_REACTIONS.slice(1).map((reaction) => (
                  <button
                    key={`comment-reaction-${reaction.key}`}
                    type="button"
                    onClick={() =>
                      setCommentReaction((current) =>
                        current === reaction.key ? '' : reaction.key,
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      commentReaction === reaction.key
                        ? 'border-violet-300 bg-violet-600 text-white'
                        : 'border-violet-100 bg-white text-violet-900 hover:bg-violet-50 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-50'
                    }`}
                    aria-label={t('post.addReactionAria', { reaction: t(reaction.labelKey) })}
                    title={t(reaction.labelKey)}
                  >
                    {reaction.icon}
                  </button>
                ))}
              </div>
              <textarea
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                rows={3}
                placeholder={t('post.addCommentPlaceholder')}
                className="w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-50"
              />

              {commentError ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {commentError}
                </p>
              ) : null}

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmittingComment}>
                  {isSubmittingComment ? t('common.sending') : t('post.commentAction')}
                </Button>
              </div>
            </form>

            <CommentList
              comments={post.comments ?? []}
              postId={post.id}
              reactions={POST_REACTIONS.map((reaction) => ({
                ...reaction,
                label: t(reaction.labelKey),
              }))}
              onCreateReply={onCreateComment}
              onReactToComment={onReactToComment}
            />
          </div>
        ) : null}
      </div>
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title={t('confirm.deletePostTitle')}
        message={t('confirm.deletePostMessage')}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.cancel')}
        isProcessing={isUpdatingPost}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => {
          setIsDeleteDialogOpen(false)
          handleDeletePost()
        }}
      />
    </article>
  )
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M7.5 16.5 4.5 19.5v-12A2.25 2.25 0 0 1 6.75 5.25h10.5A2.25 2.25 0 0 1 19.5 7.5v6A2.25 2.25 0 0 1 17.25 15.75H7.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M8.25 12.75 15.75 5.25m0 0H10.5m5.25 0v5.25M9.75 7.5H7.5A2.25 2.25 0 0 0 5.25 9.75v6.75A2.25 2.25 0 0 0 7.5 18.75h6.75a2.25 2.25 0 0 0 2.25-2.25v-2.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ConfirmDialog({
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
        aria-labelledby="post-delete-confirm-title"
        className="max-h-[82vh] w-full max-w-lg overflow-y-auto rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(247,241,255,0.94),_rgba(237,233,254,0.9))] p-5 text-start shadow-[0_30px_80px_rgba(76,29,149,0.28)] dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(24,16,38,0.98),_rgba(49,24,83,0.94))]"
      >
        <h2 id="post-delete-confirm-title" className="text-lg font-semibold text-stone-950 dark:text-violet-50">
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

function ProfileAvatar({ user, t }) {
  const avatar = (
    <Avatar name={user?.name} src={user?.avatar} className="shrink-0" />
  )

  if (!user?.id) {
    return avatar
  }

  return (
    <Link
      to={`/profile/${user.id}`}
      className="shrink-0 rounded-[20px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
      aria-label={t('profile.viewProfile')}
    >
      {avatar}
    </Link>
  )
}

function PostActionsMenu({
  canManagePost,
  isMenuOpen,
  isUpdatingPost,
  post,
  visibility,
  onDeletePost,
  onEditPost,
  onSavePost,
  onSharePost,
  onToggleMenu,
  onVisibilityChange,
  menuRef,
  t,
}) {
  return (
    <div ref={menuRef} className="relative z-30 ms-auto shrink-0 self-start">
      <button
        type="button"
        onClick={onToggleMenu}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-violet-100 bg-white/86 text-lg font-bold text-violet-900 transition hover:bg-violet-50 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-50 dark:hover:bg-white/14"
        aria-label={t('post.options')}
        aria-expanded={isMenuOpen}
      >
        <span aria-hidden="true">...</span>
      </button>

      {isMenuOpen ? (
        <div className="absolute end-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(70vh,34rem)] w-[min(18rem,calc(100vw-3rem))] overflow-y-auto rounded-[24px] border border-violet-100 bg-white/98 p-2 text-sm shadow-[0_24px_60px_rgba(76,29,149,0.22)] backdrop-blur-xl dark:border-violet-300/14 dark:bg-stone-950/96">
          <PostMenuButton onClick={onSharePost}>{t('post.share')}</PostMenuButton>
          <PostMenuButton onClick={onSavePost}>{t('post.saveLink')}</PostMenuButton>

          {canManagePost ? (
            <>
              <PostMenuButton onClick={onEditPost}>{t('post.edit')}</PostMenuButton>
              <div className="my-2 h-px bg-violet-100 dark:bg-violet-300/12" />
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-violet-100/58">
                {t('post.visibilityLabel')}
              </p>
              {POST_VISIBILITIES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onVisibilityChange(option.key)}
                  disabled={isUpdatingPost}
                  className={`block w-full rounded-2xl px-3 py-2 text-start transition disabled:opacity-60 ${
                    visibility === option.key
                      ? 'bg-violet-600 text-white'
                      : 'text-stone-700 hover:bg-violet-50 dark:text-violet-50 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="block font-semibold">{t(option.labelKey)}</span>
                  <span className="block text-xs opacity-72">{t(option.helperKey)}</span>
                </button>
              ))}
              <div className="my-2 h-px bg-violet-100 dark:bg-violet-300/12" />
              <PostMenuButton tone="danger" onClick={onDeletePost}>
                {t('post.delete')}
              </PostMenuButton>
            </>
          ) : (
            <p className="px-3 py-2 text-xs text-stone-500 dark:text-violet-100/62">
              {t('post.authorOnlyOptions', { name: post.author?.name ?? t('common.user') })}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function PostMenuButton({ children, onClick, tone = 'default' }) {
  const toneClass =
    tone === 'danger'
      ? 'text-rose-700 hover:bg-rose-50 dark:text-rose-200 dark:hover:bg-rose-500/12'
      : 'text-stone-700 hover:bg-violet-50 dark:text-violet-50 dark:hover:bg-white/10'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-2xl px-3 py-2 text-start font-semibold transition ${toneClass}`}
    >
      {children}
    </button>
  )
}

function getVisibilityLabel(visibility, t) {
  const labels = {
    public: t('post.visibility.public'),
    followers: t('post.visibility.followers'),
    private: t('post.visibility.private'),
  }

  return labels[visibility] ?? labels.public
}

function getReactionCount(reactions = [], reactionKey) {
  return reactions.find((reaction) => reaction.reaction === reactionKey)?.count ?? 0
}

PostCard.propTypes = {
  post: PropTypes.object,
  currentUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onCreateComment: PropTypes.func,
  onDeletePost: PropTypes.func,
  onReactToComment: PropTypes.func,
  onToggleLike: PropTypes.func,
  onUpdatePost: PropTypes.func,
  isLikePending: PropTypes.bool,
}

PostActionsMenu.propTypes = {
  canManagePost: PropTypes.bool,
  isMenuOpen: PropTypes.bool,
  isUpdatingPost: PropTypes.bool,
  post: PropTypes.object,
  visibility: PropTypes.string,
  onDeletePost: PropTypes.func,
  onEditPost: PropTypes.func,
  onSavePost: PropTypes.func,
  onSharePost: PropTypes.func,
  onToggleMenu: PropTypes.func,
  onVisibilityChange: PropTypes.func,
  menuRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  t: PropTypes.func,
}

PostMenuButton.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
  tone: PropTypes.string,
}

ProfileAvatar.propTypes = {
  user: PropTypes.object,
  t: PropTypes.func,
}

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  isProcessing: PropTypes.bool,
  onCancel: PropTypes.func,
  onConfirm: PropTypes.func,
}

export default PostCard
