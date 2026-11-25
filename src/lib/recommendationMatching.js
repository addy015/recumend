// Pure helpers for normalizing titles, detecting duplicates, and labeling ownership across Public Recommendations and Private Vault Items

/**
 * Strip punctuation and collapse whitespace for duplicate detection.
 */
export function normalizeRecommendationTitle(str) {
  if (typeof str !== 'string') return ''
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Return true when an item has readable plaintext (public item or unlocked private vault item).
 */
export function isItemPlaintextAvailable(item) {
  if (!item) return false
  if (!item.is_private) return true
  if (item._isDecrypted) return true
  return typeof item.title === 'string' && item.title.trim().length > 0 && item.title !== '[Encrypted Item]'
}

/**
 * Resolve ownership and display badges for an existing match row.
 */
export function getMatchOwnership(item, currentUserId) {
  if (item?.is_private) {
    return {
      kind: 'own_vault',
      badgeLabel: 'In Vault',
      sourceLabel: 'Private Vault'
    }
  }
  if (currentUserId && item?.created_by === currentUserId) {
    return {
      kind: 'own_public',
      badgeLabel: 'Added by you',
      sourceLabel: 'Your Public'
    }
  }
  const username = item?.creator?.username
  return {
    kind: 'other_public',
    badgeLabel: null,
    sourceLabel: username ? `Public • @${username}` : 'Public'
  }
}

/**
 * Search both Public Recommendations and unlocked Private Vault Items for live matches.
 * Excludes locked/undecrypted vault items and SharedWithMe entries.
 */
export function findMatchingExistingItems({ query, publicItems = [], privateItems = [] }) {
  const norm = normalizeRecommendationTitle(query)
  if (!norm || norm.length < 2) return []

  const seenIds = new Set()
  const candidates = []

  const addCandidate = (item) => {
    if (!item || !item.id || seenIds.has(item.id)) return
    if (!isItemPlaintextAvailable(item)) return
    const itemNorm = item.is_private
      ? normalizeRecommendationTitle(item.title)
      : (item.normalized_title || normalizeRecommendationTitle(item.title))
    if (!itemNorm) return
    if (itemNorm.includes(norm) || norm.includes(itemNorm)) {
      seenIds.add(item.id)
      candidates.push({ item, itemNorm })
    }
  }

  for (const item of privateItems) {
    if (item?.is_private) addCandidate(item)
  }
  for (const item of publicItems) {
    if (!item?.is_private) addCandidate(item)
  }

  // Prioritize exact matches, then own private/public items, then prefix matches
  candidates.sort((a, b) => {
    const aExact = a.itemNorm === norm ? 0 : 1
    const bExact = b.itemNorm === norm ? 0 : 1
    if (aExact !== bExact) return aExact - bExact

    const aPriv = a.item.is_private ? 0 : 1
    const bPriv = b.item.is_private ? 0 : 1
    if (aPriv !== bPriv) return aPriv - bPriv

    const aStarts = a.itemNorm.startsWith(norm) ? 0 : 1
    const bStarts = b.itemNorm.startsWith(norm) ? 0 : 1
    if (aStarts !== bStarts) return aStarts - bStarts

    return (b.item.recommend_count || 0) - (a.item.recommend_count || 0)
  })

  return candidates.map((c) => c.item)
}

/**
 * Find an exact (normalized title + category) duplicate among unlocked Private Vault Items.
 */
export function findPrivateVaultDuplicate({ title, category, privateItems = [] }) {
  const norm = normalizeRecommendationTitle(title)
  if (!norm) return null
  return (
    privateItems.find(
      (it) =>
        it?.is_private &&
        isItemPlaintextAvailable(it) &&
        it.category === category &&
        normalizeRecommendationTitle(it.title) === norm
    ) || null
  )
}
