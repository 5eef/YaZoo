import { useRef, useState } from 'react'
import PropTypes from 'prop-types'

import { createDataDeletionRequest } from '../../api/privacy'
import { useI18n } from '../../hooks/useI18n'
import { useAccessibleDialog } from '../../hooks/useAccessibleDialog'
import { getErrorMessage } from '../../utils/getErrorMessage'
import Button from '../ui/Button'

function DeleteAccountRequestModal({ isOpen, onClose, onCreated }) {
  const { t } = useI18n()
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const cancelButtonRef = useRef(null)
  const dialogRef = useAccessibleDialog(isOpen, onClose, cancelButtonRef)

  if (!isOpen) {
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      const response = await createDataDeletionRequest({ reason })
      setMessage(response.data?.message ?? t('privacy.settings.deleteSuccess'))
      setReason('')
      onCreated?.()
    } catch (error) {
      setMessage(getErrorMessage(error, t('privacy.settings.deleteError')))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-stone-950/50 px-3 py-4 backdrop-blur-sm sm:items-center">
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-dialog-title"
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-[28px] border border-white/80 bg-white p-5 text-start shadow-[0_24px_70px_rgba(35,13,68,0.25)] dark:border-violet-300/16 dark:bg-[#13091f]"
      >
        <h2 id="delete-account-dialog-title" className="text-xl font-semibold text-stone-950 dark:text-violet-50">
          {t('privacy.settings.deleteTitle')}
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-violet-100/76">
          {t('privacy.settings.deleteDescription')}
        </p>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold text-stone-700 dark:text-violet-100">
            {t('privacy.settings.deleteReason')}
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full resize-none rounded-[20px] border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-violet-400 focus:bg-white dark:border-violet-300/16 dark:bg-white/8 dark:text-violet-50 dark:placeholder:text-violet-100/40"
            placeholder={t('privacy.settings.deleteReasonPlaceholder')}
          />
        </label>
        {message ? (
          <p role="status" aria-live="polite" className="mt-3 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:bg-white/10 dark:text-violet-50">
            {message}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button ref={cancelButtonRef} type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('common.sending') : t('privacy.settings.deleteSubmit')}
          </Button>
        </div>
      </form>
    </div>
  )
}

DeleteAccountRequestModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  onCreated: PropTypes.func,
}

export default DeleteAccountRequestModal
