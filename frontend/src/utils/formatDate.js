import { getCurrentLocale, getDateLocale } from '../lib/i18n'

export function formatDate(value, locale = getCurrentLocale()) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat(getDateLocale(locale), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatCurrency(value, locale = getCurrentLocale(), currency = 'MAD') {
  return new Intl.NumberFormat(getDateLocale(locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

export function formatDateOnly(value, locale = getCurrentLocale()) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat(getDateLocale(locale), {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  }).format(new Date(value))
}

export function formatDateTime(value, locale = getCurrentLocale()) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat(getDateLocale(locale), {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
