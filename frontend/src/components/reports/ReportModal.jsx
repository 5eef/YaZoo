import { useRef, useState } from 'react'
import PropTypes from 'prop-types'

import { createReportRequest } from '../../api/reports'
import { useI18n } from '../../hooks/useI18n'
import { useAccessibleDialog } from '../../hooks/useAccessibleDialog'
import { getErrorMessage } from '../../utils/getErrorMessage'
import Button from '../ui/Button'

const REPORT_REASONS = [
  'illegal_sale',
  'animal_welfare',
  'scam',
  'wrong_category',
  'offensive_content',
  'duplicate',
  'other',
]

function ReportModal({ isOpen, reportableType, reportableId, onClose }) {
  const { t } = useI18n()
  const [reason, setReason] = useState('illegal_sale')
  const [details, setDetails] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const closeButtonRef = useRef(null)
  const dialogRef = useAccessibleDialog(isOpen, onClose, closeButtonRef)

  if (!isOpen) {
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const response = await createReportRequest({
        reportable_type: reportableType,
        reportable_id: reportableId,
        reason,
        details,
      })
      setMessage(response.data?.message ?? t('reports.success'))
      setDetails('')
    } catch (submitError) {
      setError(getErrorMessage(submitError, t('reports.error')))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-950/58 px-4 py-6 backdrop-blur-sm">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-[30px] border border-white/70 bg-white/96 p-5 text-start shadow-[0_30px_80px_rgba(76,29,149,0.28)] dark:border-violet-300/16 dark:bg-[#12051f]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="report-dialog-title" className="text-lg font-semibold text-stone-950 dark:text-violet-50">
              {t('reports.title')}
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-violet-100/72">
              {t('reports.description')}
            </p>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-100 bg-white text-lg font-semibold text-stone-600 transition hover:bg-violet-50 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-50"
            aria-label={t('common.close')}
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-100">
              {t('reports.reason')}
            </span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
            >
              {REPORT_REASONS.map((item) => (
                <option key={item} value={item}>{t(`reports.reasons.${item}`)}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-100">
              {t('reports.details')}
            </span>
            <textarea
              rows={4}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
              placeholder={t('reports.detailsPlaceholder')}
            />
          </label>

          {error ? <p role="alert" aria-live="assertive" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          {message ? <p role="status" aria-live="polite" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? t('common.sending') : t('reports.submit')}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

ReportModal.propTypes = {
  isOpen: PropTypes.bool,
  reportableType: PropTypes.string.isRequired,
  reportableId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onClose: PropTypes.func.isRequired,
}

export default ReportModal
