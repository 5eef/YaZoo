import { useState } from 'react'
import { resendVerificationEmail } from '../../api/demoIntegration'
import { useI18n } from '../../hooks/useI18n'
import { getErrorMessage } from '../../utils/getErrorMessage'
import Button from '../ui/Button'

export default function ResendVerification() {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  return <div className="space-y-2"><p className="text-sm">{t('integration.mailNotice')}</p><Button disabled={busy} variant="secondary" onClick={async () => {
    setBusy(true); setMessage('')
    try { const response = await resendVerificationEmail(); setMessage(response.data.message) }
    catch (error) { setMessage(getErrorMessage(error, t('integration.failed'))) }
    finally { setBusy(false) }
  }}>{t('integration.resend')}</Button>{message && <p role="status">{message}</p>}</div>
}
