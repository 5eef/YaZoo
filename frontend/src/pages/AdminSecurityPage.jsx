import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'

import {
  challengeAdminMfaRequest,
  confirmAdminMfaRequest,
  disableAdminMfaRequest,
  enrollAdminMfaRequest,
  getAdminMfaStatusRequest,
  regenerateAdminMfaRecoveryCodesRequest,
} from '../api/admin'
import Button from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { getErrorMessage } from '../utils/getErrorMessage'

function AdminSecurityPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [status, setStatus] = useState(null)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [enrollment, setEnrollment] = useState(null)
  const [recoveryCodes, setRecoveryCodes] = useState([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const response = await getAdminMfaStatusRequest()
    setStatus(response.data)
  }

  useEffect(() => {
    if (user?.isAdmin) void load()
  }, [user?.isAdmin])

  if (!user?.isAdmin) return <Navigate to="/feed" replace />

  const perform = async (action, success) => {
    setBusy(true)
    setMessage('')
    try {
      const response = await action()
      setMessage(success)
      setCode('')
      setPassword('')
      await load()
      return response
    } catch (error) {
      setMessage(getErrorMessage(error, t('adminMfa.error')))
      return null
    } finally {
      setBusy(false)
    }
  }

  const enroll = async () => {
    const response = await perform(() => enrollAdminMfaRequest(password), t('adminMfa.enrollmentReady'))
    if (response) {
      setEnrollment(response.data)
      setRecoveryCodes(response.data.recovery_codes ?? [])
    }
  }

  const confirm = async () => {
    const response = await perform(() => confirmAdminMfaRequest(code), t('adminMfa.enabled'))
    if (response) setEnrollment(null)
  }

  const regenerate = async () => {
    const response = await perform(
      () => regenerateAdminMfaRecoveryCodesRequest({ password, code }),
      t('adminMfa.regenerated'),
    )
    if (response) setRecoveryCodes(response.data.recovery_codes ?? [])
  }

  const disable = async () => {
    const response = await perform(
      () => disableAdminMfaRequest({ password, code }),
      t('adminMfa.disabled'),
    )
    if (response) setRecoveryCodes([])
  }

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <header className="rounded-[30px] border border-white/80 bg-white/92 p-6 shadow-xl dark:border-violet-300/15 dark:bg-white/8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
          {t('adminMfa.eyebrow')}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-950 dark:text-white">{t('adminMfa.title')}</h1>
        <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-violet-100/75">{t('adminMfa.description')}</p>
        <p className="mt-3 rounded-2xl bg-violet-50 p-3 text-sm text-violet-900 dark:bg-violet-300/10 dark:text-violet-100">
          {status?.enabled ? t('adminMfa.statusEnabled') : t('adminMfa.statusDisabled')}
        </p>
      </header>

      <section className="space-y-4 rounded-[30px] border border-white/80 bg-white/92 p-6 dark:border-violet-300/15 dark:bg-white/8">
        <label className="block text-sm font-medium text-stone-800 dark:text-violet-50">
          {t('adminMfa.password')}
          <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-stone-950 dark:border-violet-300/25 dark:bg-black/20 dark:text-white" />
        </label>
        <label className="block text-sm font-medium text-stone-800 dark:text-violet-50">
          {t('adminMfa.code')}
          <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} className="mt-2 w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-stone-950 dark:border-violet-300/25 dark:bg-black/20 dark:text-white" />
        </label>

        {enrollment?.otpauth_uri ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">{t('adminMfa.scan')}</p>
            <code className="mt-2 block break-all select-all">{enrollment.otpauth_uri}</code>
          </div>
        ) : null}

        {recoveryCodes.length ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">
            <p className="font-semibold">{t('adminMfa.saveCodes')}</p>
            <ul className="mt-2 grid grid-cols-2 gap-2 font-mono">
              {recoveryCodes.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {!status?.enabled ? (
            <>
              <Button type="button" disabled={busy || !password} onClick={enroll}>{t('adminMfa.enroll')}</Button>
              {enrollment ? <Button type="button" disabled={busy || !code} onClick={confirm}>{t('adminMfa.confirm')}</Button> : null}
            </>
          ) : (
            <>
              <Button type="button" disabled={busy || !code} onClick={() => perform(() => challengeAdminMfaRequest(code), t('adminMfa.verified'))}>{t('adminMfa.challenge')}</Button>
              <Button type="button" variant="secondary" disabled={busy || !password || !code} onClick={regenerate}>{t('adminMfa.regenerate')}</Button>
              <Button type="button" variant="ghost" disabled={busy || !password || !code} onClick={disable}>{t('adminMfa.disable')}</Button>
            </>
          )}
        </div>
        <div aria-live="polite" className="text-sm text-stone-700 dark:text-violet-100">{message}</div>
      </section>
    </section>
  )
}

export default AdminSecurityPage
