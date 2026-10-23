import { getBackendBaseUrl } from '../lib/appConfig'

export function safeMediaSource(value) {
  if (typeof value !== 'string' || /[<>"']/.test(value) || [...value].some(character => character.charCodeAt(0) < 32)) return ''
  if (/^data:/i.test(value)) {
    return /^data:(?:image\/(?:png|jpeg|webp|gif)|video\/(?:mp4|webm|quicktime));base64,[a-z0-9+/=\s]+$/i.test(value) ? value : ''
  }
  try {
    const url = new URL(value, globalThis.location?.origin ?? 'http://localhost')
    return ['http:', 'https:', 'blob:'].includes(url.protocol) ? value : ''
  } catch {
    return ''
  }
}

export function getMediaUrl(value) {
  if (!value) {
    return ''
  }

  const rawUrl = String(value).trim()

  if (!rawUrl) {
    return ''
  }

  if (/^(blob:|data:|https?:\/\/)/i.test(rawUrl)) {
    return rawUrl
  }

  const backendBaseUrl = getBackendBaseUrl()
  const normalizedPath = rawUrl
    .replace(/^\/+/, '')
    .replace(/^public\//, '')

  if (normalizedPath.startsWith('storage/') || normalizedPath.startsWith('api/media/')) {
    return `${backendBaseUrl}/${normalizedPath}`
  }

  return `${backendBaseUrl}/storage/${normalizedPath}`
}

export function getPostMedia(post) {
  const source =
    post?.mediaUrl ??
    post?.imageUrl ??
    post?.media_url ??
    post?.image_url ??
    post?.mediaPath ??
    post?.media_path ??
    post?.imagePath ??
    post?.image_path ??
    ''
  const mediaUrl = getMediaUrl(source)
  const rawKind = post?.mediaKind ?? post?.media_kind ?? ''
  const mediaKind = rawKind || (mediaUrl && /\.(mp4|webm|mov)(\?|#|$)/i.test(mediaUrl) ? 'video' : 'image')

  return {
    mediaKind: mediaUrl ? mediaKind : null,
    mediaUrl,
  }
}

export function versionMediaUrl(url, version) {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) {
    return url ?? ''
  }

  const hashIndex = url.indexOf('#')
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url
  const withoutVersion = withoutHash
    .replace(/([?&])v=[^&]*/g, '$1')
    .replace(/[?&]$/, '')
  const separator = withoutVersion.includes('?') ? '&' : '?'
  const safeVersion = encodeURIComponent(String(version ?? Date.now()))

  return `${withoutVersion}${separator}v=${safeVersion}${hash}`
}

export function normalizeProfileMediaPayload(profile) {
  if (!profile) {
    return profile
  }

  const version = profile.mediaVersion ?? profile.updatedAt ?? Date.now()

  return {
    ...profile,
    avatar: versionMediaUrl(profile.avatar, version),
    coverPhoto: versionMediaUrl(profile.coverPhoto, version),
  }
}

export function normalizeAuthUserMedia(user) {
  if (!user) {
    return user
  }

  const version = user.mediaVersion ?? user.updated_at ?? Date.now()

  return {
    ...user,
    avatar: versionMediaUrl(user.avatar, version),
    cover_photo: versionMediaUrl(user.cover_photo, version),
  }
}
