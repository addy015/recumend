/**
 * Resolves user avatar URL.
 * Prioritizes original Google OAuth / Gmail profile picture (https://lh3.googleusercontent.com/...).
 * Strips out any random Unsplash/stock images.
 * If no picture exists or URL fails, returns an initials avatar (dark zinc + emerald text).
 */
export function getAvatarUrl(avatarUrl, name = 'User') {
  if (
    avatarUrl &&
    typeof avatarUrl === 'string' &&
    avatarUrl.trim() !== '' &&
    !avatarUrl.includes('unsplash.com')
  ) {
    return avatarUrl
  }

  const cleanName = encodeURIComponent((name || 'User').trim() || 'User')
  return `https://ui-avatars.com/api/?name=${cleanName}&background=27272a&color=34d399&bold=true&size=128`
}

/**
 * Validates and sanitizes external URLs to prevent XSS (e.g. javascript: schemes).
 */
export function getSafeExternalLink(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return null
}
