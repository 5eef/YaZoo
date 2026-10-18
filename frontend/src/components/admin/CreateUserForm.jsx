import { useRef, useState } from 'react'
import { createAdminUser } from '../../api/demoIntegration'
import { useI18n } from '../../hooks/useI18n'
import { getErrorMessage } from '../../utils/getErrorMessage'
import Button from '../ui/Button'

export default function CreateUserForm() {
  const { t } = useI18n()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  async function submit(event) {
    event.preventDefault()
    if (lock.current) return
    const element = event.currentTarget
    const form = new FormData(element)
    lock.current = true; setBusy(true); setMessage('')
    try {
      await createAdminUser(Object.fromEntries(form.entries()))
      element.reset(); setMessage(t('integration.userCreated'))
    } catch (error) { setMessage(getErrorMessage(error, t('integration.failed'))) }
    finally { lock.current = false; setBusy(false) }
  }
  return <details className="rounded-[26px] border border-violet-100 bg-white/90 p-5 dark:border-violet-300/20 dark:bg-white/8">
    <summary className="cursor-pointer font-semibold">{t('integration.createUser')}</summary>
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
      {['name', 'email', 'password', 'password_confirmation'].map(name => <label key={name}>{t(`integration.${name}`)}
        <input name={name} type={name.startsWith('password') ? 'password' : name === 'email' ? 'email' : 'text'} autoComplete={name.startsWith('password') ? 'new-password' : 'off'} required minLength={name.startsWith('password') ? 8 : undefined} maxLength={255} className="mt-2 w-full rounded-xl border border-violet-200 bg-white p-3 dark:bg-stone-950" />
      </label>)}
      <Button type="submit" disabled={busy}>{t('integration.createUser')}</Button>
      {message && <p role="status" className="break-words text-sm">{message}</p>}
    </form>
  </details>
}
