import { useState } from 'react'
import { Link } from 'react-router'

import { requestPasswordReset } from '../api/auth'
import Footer from '../components/ui/Footer'
import { useI18n } from '../hooks/useI18n'
import { getErrorMessage } from '../utils/getErrorMessage'

function ForgotPasswordPage() {
  const { t } = useI18n()
  const [channel, setChannel] = useState('email')
  const [identifier, setIdentifier] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setError('')

    try {
      const response = await requestPasswordReset({ channel, identifier: identifier.trim() })
      setMessage(response.data?.message || t('auth.forgot.success'))
    } catch (requestError) {
      setError(getErrorMessage(requestError, t('auth.forgot.failed')))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main id="main-content" className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.2),_transparent_28%),linear-gradient(180deg,_#fffaff_0%,_#f7f1ff_100%)] px-4 py-8 dark:bg-[linear-gradient(180deg,_#090011_0%,_#160827_100%)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col">
        <section className="yz-form-surface my-auto rounded-[30px] border p-5 sm:p-7">
          <h1 className="text-3xl font-semibold text-stone-950 dark:text-violet-50">{t('auth.forgot.title')}</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-violet-100/76">{t('auth.forgot.subtitle')}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-100">{t('auth.recovery.channel')}</span>
              <select
                value={channel}
                onChange={(event) => {
                  setChannel(event.target.value)
                  setIdentifier('')
                }}
                className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm dark:border-violet-300/18 dark:bg-white/8 dark:text-violet-50"
              >
                <option value="email">{t('common.email')}</option>
                <option value="phone">{t('common.phone')}</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-100">
                {channel === 'email' ? t('common.email') : t('common.phone')}
              </span>
              <input
                required
                type={channel === 'email' ? 'email' : 'tel'}
                dir="ltr"
                autoComplete={channel === 'email' ? 'email' : 'tel'}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm outline-none focus:border-violet-400 dark:border-violet-300/18 dark:bg-white/8 dark:text-violet-50"
              />
            </label>

            <p className="text-sm leading-6 text-stone-500 dark:text-violet-100/70">{t('auth.recovery.genericNotice')}</p>
            {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-100">{message}</p> : null}
            {error ? <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-100">{error}</p> : null}

            <button disabled={isSubmitting} className="w-full rounded-full bg-violet-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {isSubmitting ? t('common.sending') : t('auth.forgot.submit')}
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

export default ForgotPasswordPage
