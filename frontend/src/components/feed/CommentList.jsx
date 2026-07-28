import { useState } from 'react'
import { Link } from 'react-router'

import { formatDate } from '../../utils/formatDate'
import { useI18n } from '../../hooks/useI18n'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'

function CommentList({
  comments,
  postId,
  reactions = [],
  onCreateReply,
  onReactToComment,
}) {
  const { t } = useI18n()

  if (!comments.length) {
    return (
      <p className="rounded-2xl border border-dashed border-violet-200 bg-white/80 px-4 py-3 text-sm text-stone-500">
        {t('comments.empty')}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          postId={postId}
          reactions={reactions}
          onCreateReply={onCreateReply}
          onReactToComment={onReactToComment}
        />
      ))}
    </div>
  )
}

function CommentItem({
  comment,
  postId,
  reactions,
  onCreateReply,
  onReactToComment,
  isReply = false,
}) {
  const { t } = useI18n()
  const [isReplyOpen, setIsReplyOpen] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [replyReaction, setReplyReaction] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const selectedReaction = reactions.find(
    (reaction) => reaction.key === comment.reaction,
  )

  const handleSubmitReply = async (event) => {
    event.preventDefault()

    if (!replyBody.trim()) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await onCreateReply(postId, replyBody.trim(), {
        parentId: comment.id,
        reaction: replyReaction || null,
      })
      setReplyBody('')
      setReplyReaction('')
      setIsReplyOpen(false)
    } catch {
      setErrorMessage(t('comments.replyError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className={`rounded-[22px] border border-violet-100 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.84))] px-4 py-3 shadow-[0_12px_28px_rgba(124,58,237,0.06)] ${
        isReply ? 'ms-8' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <ProfileAvatar user={comment.author} t={t} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold text-stone-900">
              {comment.author.name}
            </p>
            <span className="text-xs text-stone-500">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-600">{comment.body}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {selectedReaction ? (
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-sm text-violet-900">
                {selectedReaction.icon}
              </span>
            ) : null}

            {reactions.slice(1).map((reaction) => (
              <button
                key={`${comment.id}-${reaction.key}`}
                type="button"
                onClick={() => onReactToComment(postId, comment.id, reaction.key)}
                className="rounded-full border border-violet-100 bg-white px-2.5 py-1 text-sm transition hover:bg-violet-50"
                aria-label={t('comments.reactWith', { reaction: reaction.label })}
                title={reaction.label}
              >
                {reaction.icon}
              </button>
            ))}

            {!isReply ? (
              <button
                type="button"
                onClick={() => setIsReplyOpen((current) => !current)}
                className="rounded-full border border-violet-100 bg-white px-3 py-1 text-xs font-semibold text-violet-900 transition hover:bg-violet-50"
              >
                {t('comments.reply')}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {isReplyOpen ? (
        <form onSubmit={handleSubmitReply} className="mt-3 space-y-3 ps-12">
          <div className="flex flex-wrap gap-2">
            {reactions.slice(1).map((reaction) => (
              <button
                key={`reply-${comment.id}-${reaction.key}`}
                type="button"
                onClick={() =>
                  setReplyReaction((current) =>
                    current === reaction.key ? '' : reaction.key,
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  replyReaction === reaction.key
                    ? 'border-violet-300 bg-violet-600 text-white'
                    : 'border-violet-100 bg-white text-violet-900 hover:bg-violet-50'
                }`}
              >
                {reaction.icon}
              </button>
            ))}
          </div>
          <textarea
            value={replyBody}
            onChange={(event) => setReplyBody(event.target.value)}
            rows={2}
            placeholder={t('comments.replyPlaceholder')}
            className="w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400"
          />
          {errorMessage ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !replyBody.trim()}>
              {isSubmitting ? t('common.sending') : t('comments.reply')}
            </Button>
          </div>
        </form>
      ) : null}

      {(comment.replies ?? []).length > 0 ? (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              reactions={reactions}
              onCreateReply={onCreateReply}
              onReactToComment={onReactToComment}
              isReply
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ProfileAvatar({ user, t }) {
  const avatar = <Avatar name={user?.name} src={user?.avatar} size="sm" />

  if (!user?.id) {
    return avatar
  }

  return (
    <Link
      to={`/profile/${user.id}`}
      className="shrink-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
      aria-label={t('profile.viewProfile')}
    >
      {avatar}
    </Link>
  )
}

export default CommentList
