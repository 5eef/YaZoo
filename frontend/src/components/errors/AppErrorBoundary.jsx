import { Component } from 'react'
import PropTypes from 'prop-types'

import { useI18n } from '../../hooks/useI18n'

class AppErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return <ErrorFallback />
  }
}

function ErrorFallback() {
  const { t } = useI18n()

  return (
    <main className="flex min-h-screen items-center justify-center bg-violet-50 px-4 text-center dark:bg-stone-950">
      <section role="alert" className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl dark:bg-stone-900">
        <h1 className="text-2xl font-semibold text-stone-950 dark:text-white">{t('errors.boundaryTitle')}</h1>
        <p className="mt-3 text-sm text-stone-700 dark:text-stone-200">{t('errors.boundaryDescription')}</p>
        <button
          type="button"
          onClick={() => globalThis.location.reload()}
          className="mt-6 min-h-11 rounded-full bg-violet-700 px-6 py-3 font-semibold text-white"
        >
          {t('errors.reload')}
        </button>
      </section>
    </main>
  )
}

AppErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
}

export default AppErrorBoundary
