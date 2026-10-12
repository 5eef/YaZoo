const imageTypes = ['image/jpeg', 'image/png', 'image/webp']
const mediaTypes = [...imageTypes, 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']

export function uploadError(file, kind = 'image') {
  if (!file) return null
  const types = kind === 'document' ? [...imageTypes, 'application/pdf'] : kind === 'media' ? mediaTypes : imageTypes
  if (!types.includes(file.type)) return 'errors.uploadType'
  if (file.size > (kind === 'media' ? 20 : 5) * 1024 * 1024) return 'errors.uploadSize'
  return null
}

export function galleryError(main, gallery = []) {
  if (gallery.length + (main ? 1 : 0) > 6) return 'errors.uploadCount'
  return [main, ...gallery].map(file => uploadError(file)).find(Boolean) ?? null
}
