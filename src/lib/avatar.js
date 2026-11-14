/**
 * Resolves user avatar URL.
 * Prioritizes original Google OAuth / Gmail profile picture (https://lh3.googleusercontent.com/...).
 * Strips out any random Unsplash/stock images.
 * If no picture exists or URL fails, returns an initials avatar (dark zinc + emerald text).
 */
export function getAvatarUrl(avatarUrl, name = 'User') {
  // Use existing avatar if valid and not a stock image
  if (
    avatarUrl &&
    typeof avatarUrl === 'string' &&
    avatarUrl.trim() !== '' &&
    !avatarUrl.includes('unsplash.com')
  ) {
    return avatarUrl
  }

  // Fallback to generated initials avatar
  const cleanName = encodeURIComponent((name || 'User').trim() || 'User')
  return `https://ui-avatars.com/api/?name=${cleanName}&background=27272a&color=34d399&bold=true&size=128`
}

/**
 * Validates, sanitizes, and normalizes external URLs to prevent XSS (e.g. javascript: schemes)
 * while safely allowing both full http(s) URLs and bare web/domain links (e.g. camsim.damoat.com).
 */
export function getSafeExternalLink(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null

  // Immediately reject dangerous schemes (XSS protection)
  if (/^(javascript|data|vbscript|file|about|blob):/i.test(trimmed)) return null

  // If already starts with valid http or https protocol
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  // Reject anything with another colon/scheme (e.g. ftp:, gopher:, or malicious scheme injection)
  if (trimmed.includes(':')) return null

  // If starts with protocol-relative '//'
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`

  // If it's a domain/host URL (e.g. camsim.damoat.com, youtube.com/@...)
  if (/^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+/i.test(trimmed)) {
    return `https://${trimmed}`
  }

  return null
}
