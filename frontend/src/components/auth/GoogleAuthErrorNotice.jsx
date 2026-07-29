import PropTypes from 'prop-types'

function GoogleAuthErrorNotice({ message }) {
  if (!message) {
    return null
  }

  return (
    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-300/20 dark:bg-amber-950/60 dark:text-amber-100">
      {message}
    </p>
  )
}

GoogleAuthErrorNotice.propTypes = {
  message: PropTypes.string,
}

export default GoogleAuthErrorNotice
