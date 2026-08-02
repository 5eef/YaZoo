import { useContext, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'

import { getGoogleAuthUrl, isGoogleAuthEnabled } from '../api/auth'
import GoogleAuthErrorNotice from '../components/auth/GoogleAuthErrorNotice'
import Button from '../components/ui/Button'
import Footer from '../components/ui/Footer'
import PasswordField from '../components/ui/PasswordField'
import { I18nContext } from '../contexts/i18n-context'
import { useAuth } from '../hooks/useAuth'
import { useSmsAvailability } from '../hooks/useSmsAvailability'
import { getGoogleAuthErrorMessage } from '../lib/googleAuthErrors'
import { translate } from '../lib/i18n'
import { getErrorMessage } from '../utils/getErrorMessage'

function RegisterPage() {
  const i18n = useContext(I18nContext)
  const t = useMemo(
    () => i18n?.t ?? ((key, replacements) => translate('fr', key, replacements)),
    [i18n?.t],
  )
  const { isAuthenticated, isBootstrapping, register } = useAuth()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: '',
    country: '',
    city: '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const smsAvailable = useSmsAvailability()
  const googleAuthEnabled = isGoogleAuthEnabled()
  const authError = searchParams.get('auth_error')
  const googleAuthErrorMessage = getGoogleAuthErrorMessage(authError, 'register', t)
  const onboardingNotes = useMemo(
    () => [
      t('auth.register.highlights.one'),
      t('auth.register.highlights.two'),
      t('auth.register.highlights.three'),
    ],
    [t],
  )

  if (isBootstrapping) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#fffaff_0%,_#f6efff_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.28),_transparent_28%),linear-gradient(180deg,_#090011_0%,_#13071f_56%,_#08000f_100%)]">
        <p className="text-sm text-stone-600 dark:text-violet-100">
          {t('common.loadingSession')}
        </p>
      </main>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/feed" replace />
  }

  const handleChange = (field) => (value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    const payload = {
      name: String(formData.get('name') ?? form.name).trim(),
      email: String(formData.get('email') ?? form.email).trim(),
      password: String(formData.get('password') ?? form.password),
      password_confirmation: String(
        formData.get('password_confirmation') ?? form.password_confirmation,
      ),
      phone: String(formData.get('phone') ?? form.phone).trim(),
      country: String(formData.get('country') ?? form.country).trim(),
      city: String(formData.get('city') ?? form.city).trim(),
    }

    try {
      await register(payload)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('auth.register.failed')),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleRegister = () => {
    if (!googleAuthEnabled) {
      setErrorMessage(t('auth.register.googleUnavailable'))
      return
    }

    globalThis.location.assign(getGoogleAuthUrl())
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(221,214,254,0.42),_transparent_24%),linear-gradient(180deg,_#fffaff_0%,_#f7f1ff_100%)] px-3 py-6 text-stone-950 sm:px-4 sm:py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.34),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(88,28,135,0.28),_transparent_28%),linear-gradient(180deg,_#090011_0%,_#13071f_55%,_#08000f_100%)] dark:text-violet-50">
      <div className="mx-auto max-w-6xl">
        <div className="grid min-h-[calc(100vh-3rem)] w-full gap-5 sm:min-h-[calc(100vh-4rem)] sm:gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
        <section className="order-2 rounded-[30px] border border-white/80 bg-[linear-gradient(135deg,_rgba(124,58,237,0.94),_rgba(168,85,247,0.88),_rgba(237,233,254,0.82))] p-5 text-white shadow-[0_28px_70px_rgba(124,58,237,0.18)] sm:rounded-[34px] sm:p-6 lg:order-2 lg:p-7 dark:border-violet-300/12 dark:bg-[linear-gradient(135deg,_rgba(88,28,135,0.92),_rgba(37,12,61,0.96),_rgba(8,0,15,0.98))]">
          <Link
            to="/"
            className="inline-flex items-center rounded-full border border-white/30 bg-white/16 px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-white/24 lg:px-5 lg:py-2.5 lg:text-base"
          >
            {t('common.backHome')}
          </Link>

          <p className="mt-8 text-xs uppercase tracking-[0.24em] text-violet-50">
            YaZoo
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl xl:text-5xl">
            {t('auth.register.heroTitle')}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-violet-50/92 lg:text-base xl:text-[17px] xl:leading-8">
            {t('auth.register.heroText')}
          </p>

          <div className="mt-8 space-y-3">
            {onboardingNotes.map((item) => (
              <div
                key={item}
                className="rounded-[24px] border border-white/24 bg-white/14 px-4 py-4 text-sm leading-6 text-white/92 backdrop-blur lg:text-base lg:leading-7"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="yz-form-surface order-1 rounded-[30px] border p-5 sm:rounded-[34px] sm:p-6 lg:order-1 lg:p-7">
          <p className="text-xs uppercase tracking-[0.24em] text-violet-700 dark:text-violet-300">
            {t('auth.register.title')}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-950 sm:text-3xl dark:text-violet-50">
            {t('auth.register.panelTitle')}
          </h2>
          <p className="mt-2 text-sm text-stone-500 dark:text-violet-100/70 lg:text-base">
            {t('auth.register.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field
              label={t('auth.register.name')}
              name="name"
              value={form.name}
              onChange={handleChange('name')}
              placeholder={t('auth.register.namePlaceholder')}
              autoComplete="name"
            />
            <Field
              label={t('auth.register.email')}
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange('email')}
              placeholder={t('auth.register.emailPlaceholder')}
              autoComplete="email"
              dir="ltr"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <PasswordField
                label={t('auth.register.password')}
                name="password"
                value={form.password}
                onChange={handleChange('password')}
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete="new-password"
                showLabel={t('auth.showPassword')}
                hideLabel={t('auth.hidePassword')}
              />
              <PasswordField
                label={t('auth.register.passwordConfirmation')}
                name="password_confirmation"
                value={form.password_confirmation}
                onChange={handleChange('password_confirmation')}
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete="new-password"
                showLabel={t('auth.showPassword')}
                hideLabel={t('auth.hidePassword')}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label={t('auth.register.phone')}
                name="phone"
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder={t('auth.register.phonePlaceholder')}
                autoComplete="tel"
                dir="ltr"
              />
              <Field
                label={t('common.country')}
                name="country"
                value={form.country}
                onChange={handleChange('country')}
                placeholder={t('auth.countryPlaceholder')}
                autoComplete="country-name"
              />
              <Field
                label={t('auth.register.city')}
                name="city"
                value={form.city}
                onChange={handleChange('city')}
                placeholder={t('feed.locationPlaceholder')}
                autoComplete="address-level2"
              />
            </div>

            {smsAvailable === false ? (
              <p className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-300/20 dark:bg-amber-500/10 dark:text-amber-100">
                {t('auth.smsUnavailable')}
              </p>
            ) : null}

            <GoogleAuthErrorNotice message={googleAuthErrorMessage} />

            {errorMessage ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-300/20 dark:bg-rose-950/60 dark:text-rose-100">
                {errorMessage}
              </p>
            ) : null}

            <Button type="submit" className="w-full py-3" disabled={isSubmitting}>
              {isSubmitting ? t('auth.register.loading') : t('auth.register.submit')}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-violet-100 dark:bg-violet-300/14" />
            <span className="text-xs uppercase tracking-[0.16em] text-stone-600 dark:text-violet-100/75">
              {t('common.or')}
            </span>
            <div className="h-px flex-1 bg-violet-100 dark:bg-violet-300/14" />
          </div>

          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={!googleAuthEnabled}
            className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-violet-100 bg-white px-4 py-3 text-sm font-semibold text-stone-800 shadow-[0_14px_30px_rgba(124,58,237,0.08)] transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50/80 disabled:cursor-not-allowed disabled:opacity-55 dark:border-violet-300/14 dark:bg-[#12051f] dark:text-violet-50 dark:hover:bg-[#180827]"
          >
            <GoogleMark />
            {t('auth.register.google')}
          </button>

          <p className="mt-5 text-sm text-stone-500 dark:text-violet-100/70">
            {t('auth.register.alreadyAccount')}{' '}
            <Link className="font-medium text-violet-900 dark:text-violet-300" to="/login">
              {t('auth.register.login')}
            </Link>
          </p>
        </section>
        </div>

        <Footer mode="public" className="mt-8" />
      </div>
    </main>
  )
}

function GoogleMark() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-violet-700 shadow-sm">
      G
    </span>
  )
}

function Field({ label, onChange, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-100">
        {label}
      </span>
      <input
        className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-[#12051f] dark:text-violet-50 dark:placeholder:text-violet-200/45 dark:focus:bg-[#160827]"
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  )
}

export default RegisterPage
