import PropTypes from 'prop-types'
import { useRef, useState } from 'react'
import { useI18n } from '../../hooks/useI18n'
import { getErrorMessage } from '../../utils/getErrorMessage'
import Button from '../ui/Button'

export default function OwnerListingActions({ onEdit, onDelete, disabled = false }) {
  const { t } = useI18n()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const remove = async () => {
    if (lock.current || disabled) return
    lock.current = true
    setPending(true)
    setError('')
    try { await onDelete(); setConfirming(false) }
    catch (failure) { setError(getErrorMessage(failure, t('errors.generic'))) }
    finally { lock.current = false; setPending(false) }
  }
  return <div className="mt-3 space-y-2">
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={disabled || pending} variant="secondary" onClick={onEdit}>{t('common.edit')}</Button>
      <Button type="button" disabled={disabled || pending} variant="ghost" onClick={() => setConfirming(true)}>{t('common.delete')}</Button>
    </div>
    {confirming ? <div role="group" aria-label={t('common.delete')} className="flex flex-wrap gap-2 rounded-2xl border border-rose-300 p-3 dark:border-rose-300/30">
      <Button type="button" disabled={pending || disabled} onClick={remove}>{t('common.confirm')}</Button>
      <Button type="button" disabled={pending} variant="ghost" onClick={() => setConfirming(false)}>{t('common.cancel')}</Button>
    </div> : null}
    {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-200">{error}</p> : null}
  </div>
}

OwnerListingActions.propTypes = { onEdit: PropTypes.func.isRequired, onDelete: PropTypes.func.isRequired, disabled: PropTypes.bool }
