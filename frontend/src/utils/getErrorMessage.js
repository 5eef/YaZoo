import { classifyApiError } from '../api/classifyError'
import { getCurrentLocale, translate } from '../lib/i18n'

export function getErrorMessage(error, fallback = 'Une erreur est survenue.') {
  const responseData = error?.response?.data
  const category = classifyApiError(error)
  if (['timeout', 'backendWaking', 'uploadsDisabled'].includes(category)) {
    return translate(getCurrentLocale(), `errors.${category}`)
  }

  if (responseData?.errors) {
    const firstEntry = Object.values(responseData.errors)[0]

    if (Array.isArray(firstEntry) && firstEntry[0]) {
      return firstEntry[0]
    }
  }

  if (responseData?.message) {
    return responseData.message
  }

  return fallback
}
