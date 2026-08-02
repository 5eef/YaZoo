import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'

import { useI18n } from '../../hooks/useI18n'
import { useAccessibleDialog } from '../../hooks/useAccessibleDialog'
import Button from '../ui/Button'

function StoryComposerModal({
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
}) {
  const { t } = useI18n()
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState('')
  const [mediaPreviewKind, setMediaPreviewKind] = useState('')
  const [localErrorMessage, setLocalErrorMessage] = useState('')
  const closeButtonRef = useRef(null)

  const resetForm = useCallback(() => {
    if (mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl)
    }

    setContent('')
    setLocation('')
    setMediaFile(null)
    setMediaPreviewUrl('')
    setMediaPreviewKind('')
    setLocalErrorMessage('')
  }, [mediaPreviewUrl])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [onClose, resetForm])
  const dialogRef = useAccessibleDialog(isOpen, handleClose, closeButtonRef)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreviewUrl)
      }
    }
  }, [mediaPreviewUrl])

  if (!isOpen) {
    return null
  }

  function handleMediaChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl)
    }

    setMediaFile(file)
    setMediaPreviewUrl(URL.createObjectURL(file))
    setMediaPreviewKind(file.type.startsWith('video/') ? 'video' : 'image')
    setLocalErrorMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!mediaFile) {
      setLocalErrorMessage(t('story.composerNeedsMedia'))
      return
    }

    setLocalErrorMessage('')
    try {
      await onSubmit({
        content: content.trim(),
        location: location.trim(),
        media_file: mediaFile,
      })
    } catch {
      // Le parent gere deja le message d erreur.
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[120] overflow-y-auto overscroll-contain bg-stone-950/72 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-0 backdrop-blur-sm sm:px-4 sm:py-4"
    >
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={handleClose}
        aria-label={t('story.closeComposer')}
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <form
          ref={dialogRef}
          onSubmit={handleSubmit}
          className="w-full max-h-[calc(100dvh-0.5rem)] overflow-y-auto rounded-[30px] border border-white/80 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.26)] sm:max-h-[calc(100dvh-2rem)]"
          style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable both-edges' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="story-composer-title"
          aria-describedby="story-composer-description"
        >
          <div className="border-b border-violet-100 bg-[linear-gradient(135deg,_rgba(124,58,237,0.12),_rgba(216,180,254,0.22),_rgba(255,255,255,0.9))] px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-violet-700">
                  {t('story.stories24h')}
                </p>
                <h2 id="story-composer-title" className="mt-2 text-[1.7rem] font-semibold leading-tight text-stone-950 sm:text-2xl">
                  {t('story.addStory')}
                </h2>
                <p id="story-composer-description" className="mt-2 text-sm text-stone-600">
                  {t('story.composerDescription')}
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                ref={closeButtonRef}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-100 bg-white text-stone-700 transition hover:border-violet-200 hover:bg-violet-50"
                aria-label={t('story.closeComposer')}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">
            <div className="rounded-[26px] border border-dashed border-violet-200 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.82),_rgba(237,233,254,0.76))] p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-900">
                    {t('story.mediaLabel')}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-stone-500">
                    {t('story.mediaHelp')}
                  </p>
                </div>

                <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-violet-100 bg-white px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-50">
                  {t('feed.chooseFile')}
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    onChange={handleMediaChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="mt-3 overflow-hidden rounded-[24px] border border-white/80 bg-white/88">
                {renderMediaPreview(mediaPreviewUrl, mediaPreviewKind, t)}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">
                  {t('story.caption')}
                </span>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="w-full rounded-[22px] border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white"
                  placeholder={t('story.captionPlaceholder')}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">
                  {t('feed.location')}
                </span>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="w-full rounded-[22px] border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white"
                  placeholder={t('feed.locationPlaceholder')}
                />
              </label>
            </div>

            {localErrorMessage ? (
              <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {localErrorMessage}
              </div>
            ) : null}

            <div className="sticky bottom-0 z-20 -mx-4 -mb-4 mt-2 flex flex-wrap justify-end gap-3 border-t border-violet-100 bg-white/97 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] sm:-mx-5 sm:-mb-5 sm:px-5 sm:pb-3">
              <Button type="button" variant="ghost" onClick={handleClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('feed.publishing') : t('story.publishStory')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

function renderMediaPreview(mediaPreviewUrl, mediaPreviewKind, t) {
  if (!mediaPreviewUrl) {
    return (
      <div className="flex h-[150px] items-center justify-center bg-[linear-gradient(180deg,_rgba(124,58,237,0.14),_rgba(216,180,254,0.22),_rgba(255,255,255,0.94))] px-6 text-center text-sm leading-7 text-violet-900 sm:h-[210px] lg:h-[240px]">
        {t('story.emptyPreview')}
      </div>
    )
  }

  if (mediaPreviewKind === 'video') {
    return (
      <video
        src={mediaPreviewUrl}
        controls
        className="h-64 w-full object-cover sm:h-80 md:h-96 lg:h-[28rem]"
      />
    )
  }

  return (
    <img
      src={mediaPreviewUrl}
      alt={t('story.previewAlt')}
      className="h-64 w-full object-cover sm:h-80 md:h-96 lg:h-[28rem]"
    />
  )
}

StoryComposerModal.propTypes = {
  isOpen: PropTypes.bool,
  isSubmitting: PropTypes.bool,
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
}

export default StoryComposerModal
