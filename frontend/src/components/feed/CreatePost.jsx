import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'

import { getErrorMessage } from '../../utils/getErrorMessage'
import { useI18n } from '../../hooks/useI18n'
import Button from '../ui/Button'

function CreatePost({ onCreate, focusToken = 0 }) {
  const { t } = useI18n()
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState('')
  const [mediaPreviewKind, setMediaPreviewKind] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const composerRef = useRef(null)
  const canPublish = Boolean(content.trim() || mediaFile)

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreviewUrl)
      }
    }
  }, [mediaPreviewUrl])

  useEffect(() => {
    if (!focusToken) {
      return
    }

    const timeoutId = globalThis.setTimeout(() => {
      setIsOpen(true)
      composerRef.current?.focus()
    }, 180)

    return () => {
      globalThis.clearTimeout(timeoutId)
    }
  }, [focusToken])

  const resetMediaPreview = () => {
    if (mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl)
    }

    setMediaFile(null)
    setMediaPreviewUrl('')
    setMediaPreviewKind('')
  }

  const handleMediaChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl)
    }

    const nextPreviewUrl = URL.createObjectURL(file)
    const nextPreviewKind = file.type.startsWith('video/') ? 'video' : 'image'

    setMediaFile(file)
    setMediaPreviewUrl(nextPreviewUrl)
    setMediaPreviewKind(nextPreviewKind)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!canPublish) {
      setErrorMessage(t('feed.createPostNeedsContent'))
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      await onCreate({
        content: content.trim(),
        location: location.trim(),
        tags: tagsInput
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        media_file: mediaFile,
      })

      setContent('')
      setLocation('')
      setTagsInput('')
      resetMediaPreview()
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('feed.createPostError')),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-white/80 bg-white/94 shadow-[0_24px_56px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8">
      <div className="border-b border-violet-100 bg-[linear-gradient(135deg,_rgba(124,58,237,0.12),_rgba(216,180,254,0.22),_rgba(255,255,255,0.88))] px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-stone-900">
              {t('creation.createPost')}
            </p>
            <p className="text-sm text-stone-600">
              {t('feed.createPostDescription')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="rounded-full border border-violet-100 bg-white/84 px-3 py-1 text-xs font-medium text-violet-800 shadow-sm transition hover:bg-violet-50"
            aria-expanded={isOpen}
          >
            {isOpen ? t('creation.hidePostForm') : t('creation.createPost')}
          </button>
        </div>

        <div
          className="yz-horizontal-scroll yz-no-scrollbar mt-4 pb-1"
          role="region"
          aria-label={t('creation.createPost')}
          tabIndex={0}
        >
          {['moment', 'photo', 'video', 'adoption', 'communaute'].map((item) => (
            <span
              key={item}
              className="whitespace-nowrap rounded-full border border-violet-100 bg-white/86 px-3 py-1 text-xs font-medium text-violet-800 shadow-sm"
            >
              #{item}
            </span>
          ))}
        </div>
      </div>

      {isOpen ? (
      <form onSubmit={handleSubmit} className="p-5">
        <label className="block">
            <span className="sr-only">{t('feed.postContent')}</span>
          <textarea
            ref={composerRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={4}
            maxLength={1200}
            placeholder={t('feed.postPlaceholder')}
            className="w-full rounded-[24px] border border-violet-100 bg-violet-50/55 px-4 py-4 text-sm leading-6 text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white"
            aria-describedby="create-post-helper"
          />
        </label>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700">
              {t('feed.location')}
            </span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={t('feed.locationPlaceholder')}
              className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700">
              {t('feed.tags')}
            </span>
            <input
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder={t('feed.tagsPlaceholder')}
              className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white"
            />
          </label>
        </div>

        <div className="mt-4 rounded-[24px] border border-dashed border-violet-200 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.82),_rgba(237,233,254,0.76))] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-stone-800">
                {t('feed.addMedia')}
              </p>
              <p className="mt-1 text-xs leading-6 text-stone-500">
                {t('feed.mediaHelp')}
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-violet-100 bg-white px-4 py-2 text-sm font-medium text-violet-800 transition hover:-translate-y-0.5 hover:bg-violet-50">
              {t('feed.chooseFile')}
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                onChange={handleMediaChange}
                className="hidden"
              />
            </label>
          </div>

          {mediaPreviewUrl ? (
            <div className="mt-4 overflow-hidden rounded-[24px] border border-white/80 bg-white p-3 shadow-[0_16px_36px_rgba(124,58,237,0.08)]">
              {renderPostMediaPreview(mediaPreviewUrl, mediaPreviewKind, t)}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-stone-500">
                  {mediaFile?.name} {mediaPreviewKind ? `- ${mediaPreviewKind}` : ''}
                </p>
                <button
                  type="button"
                  onClick={resetMediaPreview}
                  className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-800 transition hover:bg-violet-100"
                >
                  {t('profile.remove')}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {errorMessage ? (
          <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div id="create-post-helper" className="rounded-2xl bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.82))] px-4 py-3 text-xs leading-6 text-stone-600">
            {t('feed.characterHelp', { count: content.trim().length })}
          </div>
          <Button type="submit" disabled={isSubmitting || !canPublish} className="min-w-[140px]">
            {isSubmitting ? t('feed.publishing') : t('feed.publish')}
          </Button>
        </div>
      </form>
      ) : null}
    </section>
  )
}

function renderPostMediaPreview(mediaPreviewUrl, mediaPreviewKind, t) {
  if (mediaPreviewKind === 'video') {
    return (
      <video
        src={mediaPreviewUrl}
        controls
        className="h-64 w-full rounded-[20px] object-cover sm:h-80 md:h-96 lg:h-[28rem]"
      />
    )
  }

  return (
    <img
      src={mediaPreviewUrl}
      alt={t('feed.mediaPreviewAlt')}
      className="h-64 w-full rounded-[20px] object-cover sm:h-80 md:h-96 lg:h-[28rem]"
    />
  )
}

CreatePost.propTypes = {
  onCreate: PropTypes.func,
  focusToken: PropTypes.number,
}

export default CreatePost
