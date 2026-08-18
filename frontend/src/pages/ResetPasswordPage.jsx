import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import PropTypes from 'prop-types'

import { resetPassword } from '../api/auth'
import Footer from '../components/ui/Footer'
import PasswordField from '../components/ui/PasswordField'
import { useI18n } from '../hooks/useI18n'
import { getErrorMessage } from '../utils/getErrorMessage'

function ResetPasswordPage() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const channel = searchParams.get('channel') === 'phone' ? 'phone' : 'email'
  const [identifier, setIdentifier] = useState(searchParams.get('identifier') ?? '')
  const [token, setToken] = useState(searchParams.get('token') ?? '')
  const [otpCode, setOtpCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setError('')

    try {
      const response = await resetPassword({
        channel,
        identifier: identifier.trim(),
        token: channel === 'email' ? token.trim() : undefined,
        otp_code: channel === 'phone' ? otpCode.trim() : undefined,
        password,
        password_confirmation: confirmation,
      })
      setMessage(response.data?.message || t('auth.reset.success'))
    } catch (requestError) {
      setError(getErrorMessage(requestError, t('auth.reset.failed')))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fffaff_0%,_#f7f1ff_100%)] px-4 py-8 dark:bg-[linear-gradient(180deg,_#090011_0%,_#160827_100%)]">
      <div className="mx-auto max-w-2xl">
        <section className="yz-form-surface rounded-[30px] border p-5 sm:p-7">
          <h1 className="text-3xl font-semibold text-stone-950 dark:text-violet-50">{t('auth.reset.title')}</h1>
          <p className="mt-3 text-sm text-stone-600 dark:text-violet-100/76">{t('auth.reset.subtitle')}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input label={channel === 'email' ? t('common.email') : t('common.phone')} type={channel === 'email' ? 'email' : 'tel'} value={identifier} onChange={setIdentifier} />
            {channel === 'email' ? <Input label={t('auth.recovery.token')} value={token} onChange={setToken} /> : <Input label={t('auth.recovery.otp')} inputMode="numeric" value={otpCode} onChange={setOtpCode} />}
            <PasswordField label={t('auth.login.password')} value={password} onChange={setPassword} autoComplete="new-password" minLength={8} required showLabel={t('auth.showPassword')} hideLabel={t('auth.hidePassword')} />
            <PasswordField label={t('auth.register.passwordConfirmation')} value={confirmation} onChange={setConfirmation} autoComplete="new-password" minLength={8} required showLabel={t('auth.showPassword')} hideLabel={t('auth.hidePassword')} />
            <p className="text-sm text-stone-500 dark:text-violet-100/70">{t('auth.recovery.passwordRules')}</p>
            {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-100">{message}</p> : null}
            {error ? <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-100">{error}</p> : null}
            <button disabled={isSubmitting} className="w-full rounded-full bg-violet-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {isSubmitting ? t('common.sending') : t('auth.reset.submit')}
            </button>
          </form>

          <Link to="/login" className="mt-5 inline-flex text-sm font-semibold text-violet-800 dark:text-violet-200">
            {t('auth.forgot.backToLogin')}
          </Link>
        </section>
        <Footer className="mt-8" />
      </div>
    </main>
  )
}

function Input({ label, onChange, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-100">{label}</span>
      <input required dir="ltr" onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm outline-none focus:border-violet-400 dark:border-violet-300/18 dark:bg-white/8 dark:text-violet-50" {...props} />
    </label>
  )
}

Input.propTypes = {
  label: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
}

export default ResetPasswordPage
