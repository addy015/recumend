import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Send,
  Lock,
  Trash2,
  Check,
  CheckCheck,
  ExternalLink,
  Search,
  Loader2,
  AlertCircle,
  Plus,
  ArrowBigUp
} from 'lucide-react'
import { useFriends } from '../context/FriendContext'
import { useItems } from '../context/ItemContext'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES, getCategoryBadgeClass } from '../constants/categories'
import { getAvatarUrl, getSafeExternalLink } from '../lib/avatar'
import CategoryFilter from './CategoryFilter'

// Lightweight relative time helper
function formatRelativeTime(dateString) {
  if (!dateString) return ''
  const diff = Date.now() - new Date(dateString).getTime()
  if (diff < 0) return 'just now'
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function SharedWithMe({ isActive = false, searchQuery = '', onToast, onSelectUser }) {
  const { user } = useAuth()
  const { items, userRecs, toggleRecommend, normalizeTitle, myPrivateItems = [] } = useItems()
  const {
    sharedItems = [],
    sentSharedItems = [],
    unreadCount = 0,
    loadingShared,
    loadingSent,
    decryptSharedItem,
    markAllSharesAsRead,
    deleteShare,
    saveSharedToVault,
    p2pKeys
  } = useFriends()

  const [activeSubTab, setActiveSubTab] = useState('with-me') // 'with-me' | 'by-me'
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [decryptedMap, setDecryptedMap] = useState({})
  const [decryptingIds, setDecryptingIds] = useState(new Set())
  const [savingAction, setSavingAction] = useState(null) // { id, isPrivate }
  const [deletingId, setDeletingId] = useState(null)

  const decryptingRef = useRef(new Set())
  const cacheRef = useRef({})

  // Auto-mark incoming shares as seen ONLY when user is actively viewing "With Me" tab
  useEffect(() => {
    if (!isActive) return
    if (activeSubTab !== 'with-me') return
    if (unreadCount <= 0) return

    let timer = null

    const scheduleMarkSeen = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      timer = setTimeout(() => {
        markAllSharesAsRead()
      }, 1200)
    }

    scheduleMarkSeen()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        scheduleMarkSeen()
      } else if (timer) {
        clearTimeout(timer)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isActive, activeSubTab, unreadCount, markAllSharesAsRead])

  // Active pool of items based on selected sub-tab
  const currentPool = useMemo(() => {
    return activeSubTab === 'with-me' ? sharedItems : sentSharedItems
  }, [activeSubTab, sharedItems, sentSharedItems])

  // Auto-decrypt private shares when keys or pool items change
  useEffect(() => {
    let isCancelled = false

    async function decryptAll() {
      const synchronousHydrations = {}

      for (const share of currentPool) {
        if (!share.is_private_item) {
          if (!cacheRef.current[share.id]) {
            const data = {
              title: share.item?.title || share.metadata?.title || 'Shared Recommendation',
              category: share.item?.category || share.metadata?.category || 'other',
              metadata: share.item?.metadata || share.metadata || {},
              _isDecrypted: true
            }
            cacheRef.current[share.id] = data
            synchronousHydrations[share.id] = data
          }
          continue
        }

        if (cacheRef.current[share.id]?._isDecrypted || cacheRef.current[share.id]?._decryptionFailed) continue
        if (decryptingRef.current.has(share.id)) continue

        if (!p2pKeys?.privateKey) continue

        decryptingRef.current.add(share.id)
        setDecryptingIds((prev) => new Set(prev).add(share.id))

        try {
          const res = await decryptSharedItem(share)
          if (!isCancelled && res) {
            cacheRef.current[share.id] = res
            setDecryptedMap((prev) => ({
              ...prev,
              [share.id]: res
            }))
          }
        } catch (err) {
          console.warn('Decryption error for share', share.id, err)
          cacheRef.current[share.id] = { _decryptionFailed: true }
        } finally {
          decryptingRef.current.delete(share.id)
          if (!isCancelled) {
            setDecryptingIds((prev) => {
              const next = new Set(prev)
              next.delete(share.id)
              return next
            })
          }
        }
      }

      if (Object.keys(synchronousHydrations).length > 0 && !isCancelled) {
        setDecryptedMap((prev) => ({ ...prev, ...synchronousHydrations }))
      }
    }

    if (currentPool.length > 0) {
      decryptAll()
    }

    return () => {
      isCancelled = true
    }
  }, [currentPool, p2pKeys, decryptSharedItem])

  // Hydrate each share with its decrypted payload
  const hydratedItems = useMemo(() => {
    return currentPool.map((share) => {
      const dec = decryptedMap[share.id]
      return {
        ...share,
        title: dec?.title || (share.is_private_item ? '[Encrypted Private Share]' : share.item?.title || 'Shared Recommendation'),
        category: dec?.category || share.metadata?.category || share.item?.category || 'other',
        metadata: dec?.metadata || share.item?.metadata || share.metadata || {},
        _isDecrypted: Boolean(dec?._isDecrypted || !share.is_private_item),
        _decryptionFailed: Boolean(dec?._decryptionFailed)
      }
    })
  }, [currentPool, decryptedMap])

  // Filter items by category, search query, and sort created_at DESC
  const filteredItems = useMemo(() => {
    let result = [...hydratedItems]

    if (selectedCategory !== 'all') {
      result = result.filter((item) => item.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((item) => {
        const matchTitle = (item.title || '').toLowerCase().includes(q)
        const peer = activeSubTab === 'with-me' ? item.sender : item.recipient
        const matchPeer = (peer?.username || '').toLowerCase().includes(q) ||
          (peer?.display_name || '').toLowerCase().includes(q)
        const matchNote = (item.note || '').toLowerCase().includes(q) ||
          (item.metadata?.note || '').toLowerCase().includes(q)
        const matchAuthor = (item.metadata?.author || '').toLowerCase().includes(q)
        const matchPlatform = (item.metadata?.platform || '').toLowerCase().includes(q)
        return matchTitle || matchPeer || matchNote || matchAuthor || matchPlatform
      })
    }

    result.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      if (dateB !== dateA) return dateB - dateA
      return String(a.id || '').localeCompare(String(b.id || ''))
    })

    return result
  }, [hydratedItems, selectedCategory, searchQuery, activeSubTab])

  // Save shared item to user's personal Private Vault
  const handleSaveToPrivateVault = async (item) => {
    setSavingAction({ id: item.id, isPrivate: true })
    const res = await saveSharedToVault(item, { isPrivate: true })
    setSavingAction(null)

    if (res?.error) {
      onToast?.({ message: res.error, type: 'error' })
    } else {
      onToast?.({
        message: `Saved "${item.title}" to your Private Vault!`
      })
    }
  }

  // Handle public recommendation (upvote if already on leaderboard, or publish if novel/private)
  const handleRecommendPublicly = async (item, matchedPublicItem) => {
    if (matchedPublicItem) {
      if (userRecs.has(matchedPublicItem.id) || matchedPublicItem.created_by === user?.id) {
        onToast?.({
          message: matchedPublicItem.created_by === user?.id
            ? `You created "${item.title}" on the leaderboard.`
            : `You have already recommended "${item.title}".`
        })
        return
      }

      setSavingAction({ id: item.id, isPrivate: false })
      await toggleRecommend(matchedPublicItem.id)
      setSavingAction(null)
      onToast?.({
        message: `Added your recommendation for "${item.title}" (+1 vote)!`
      })
      return
    }

    setSavingAction({ id: item.id, isPrivate: false })
    const res = await saveSharedToVault(item, { isPrivate: false })
    setSavingAction(null)

    if (res?.error) {
      onToast?.({ message: res.error, type: 'error' })
    } else if (res?.exists && res.item) {
      if (!userRecs.has(res.item.id) && res.item.created_by !== user?.id) {
        await toggleRecommend(res.item.id)
      }
      onToast?.({
        message: `Added your recommendation for "${item.title}" on the leaderboard!`
      })
    } else {
      onToast?.({
        message: `Published "${item.title}" to public leaderboard!`
      })
    }
  }

  // Delete share
  const handleDeleteShare = async (shareId) => {
    setDeletingId(shareId)
    const isSender = activeSubTab === 'by-me'
    const res = await deleteShare(shareId, { isSender })
    setDeletingId(null)

    if (res?.error) {
      onToast?.({ message: res.error, type: 'error' })
    } else {
      onToast?.({
        message: isSender
          ? 'Recommendation deleted from your sent list.'
          : 'Recommendation dismissed from shares.'
      })
    }
  }

  // Navigate to user's public profile
  const handleOpenProfile = (targetUser) => {
    if (!targetUser?.username) return
    if (onSelectUser) {
      onSelectUser(targetUser)
    } else {
      window.history.pushState(null, '', `/u/${targetUser.username}`)
      window.dispatchEvent(new Event('popstate'))
    }
  }

  const isLoading = activeSubTab === 'with-me' ? loadingShared : loadingSent

  return (
    <div className="space-y-6">
      {/* Sub-navigation Switch: With Me vs By Me */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center p-1 bg-[#141414] border border-white/[0.08] rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSubTab('with-me')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center cursor-pointer ${
              activeSubTab === 'with-me'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            With Me
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('by-me')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center cursor-pointer ${
              activeSubTab === 'by-me'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            By Me
          </button>
        </div>

        <span className="text-xs font-mono text-zinc-500">
          {filteredItems.length} {filteredItems.length === 1 ? 'recommendation' : 'recommendations'}
        </span>
      </div>

      {/* Category Filter Chips */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Content List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-zinc-500 bg-[#121212]/92 border border-white/[0.08] rounded-2xl flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            <span>
              {activeSubTab === 'with-me'
                ? 'Loading recommendations shared with you...'
                : 'Loading recommendations you shared...'}
            </span>
          </div>
        ) : currentPool.length === 0 ? (
          <div className="py-16 text-center bg-[#121212]/92 border border-white/[0.08] rounded-2xl p-8 space-y-3 shadow-sm">
            <Send className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="font-display text-sm font-bold text-white">
              {activeSubTab === 'with-me'
                ? 'No recommendations shared with you yet'
                : 'You haven\'t shared any recommendations yet'}
            </p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              {activeSubTab === 'with-me'
                ? 'When friends connect and send you movies, anime, or books, they will appear right here with sender attribution.'
                : 'Click the share icon on any recommendation in your feed or vault to send it directly to your friends.'}
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center bg-[#121212]/92 border border-white/[0.08] rounded-2xl p-8 space-y-3 shadow-sm">
            <Search className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="font-display text-sm font-bold text-white">
              No matching recommendations found
            </p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              No items match "{searchQuery}".
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isUnread = !item.is_read
            const isDecrypting = decryptingIds.has(item.id)
            const sender = item.sender
            const recipient = item.recipient

            const normTitle = item.title && item._isDecrypted ? normalizeTitle(item.title) : ''
            const matchedPublicItem = item.item_id
              ? items.find((it) => it.id === item.item_id && !it.is_private)
              : normTitle
              ? items.find((it) => !it.is_private && it.category === item.category && it.normalized_title === normTitle)
              : null

            const isCreator = Boolean(user?.id && matchedPublicItem?.created_by === user.id)
            const isUpvotedByMe = Boolean(matchedPublicItem && userRecs.has(matchedPublicItem.id))
            const isAlreadyRecommended = isCreator || isUpvotedByMe

            const isAlreadyInVault = Boolean(
              myPrivateItems.some(
                (priv) =>
                  priv.category === item.category && (
                    (priv._isDecrypted && priv.title && priv.title.toLowerCase() === (item.title || '').toLowerCase()) ||
                    (normTitle && normalizeTitle(priv.title || '') === normTitle)
                  )
              )
            )

            const formattedTime = formatRelativeTime(item.created_at)

            return (
              <article
                key={item.id}
                className={`group bg-[#121212]/92 hover:bg-[#161616] border transition-all duration-150 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-sm taste-card ${
                  activeSubTab === 'with-me' && isUnread
                    ? 'border-amber-400/40 shadow-[0_0_16px_rgba(251,191,36,0.06)]'
                    : 'border-white/[0.08] hover:border-white/[0.18]'
                }`}
              >
                {/* Header Attribution Strip */}
                <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeSubTab === 'with-me' ? (
                      /* With Me: Sender Attribution */
                      sender?.username ? (
                        <button
                          type="button"
                          onClick={() => handleOpenProfile(sender)}
                          className="flex items-center gap-2 group/sender text-left cursor-pointer transition-opacity hover:opacity-90"
                          aria-label={`View @${sender.username}'s public profile`}
                        >
                          <img
                            src={getAvatarUrl(sender?.avatar_url, sender?.display_name || sender?.username)}
                            alt={sender?.display_name || 'Sender'}
                            className="w-5 h-5 rounded-full object-cover border border-white/10 group-hover/sender:border-white/30 transition-colors"
                            onError={(e) => {
                              e.currentTarget.src = getAvatarUrl(null, sender?.display_name || sender?.username)
                            }}
                          />
                          <span className="text-xs text-zinc-300 font-medium">
                            Shared by{' '}
                            <strong className="text-white font-semibold group-hover/sender:underline group-hover/sender:text-amber-300 transition-colors">
                              @{sender.username}
                            </strong>
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <img
                            src={getAvatarUrl(sender?.avatar_url, sender?.display_name || 'friend')}
                            alt={sender?.display_name || 'Sender'}
                            className="w-5 h-5 rounded-full object-cover border border-white/10"
                            onError={(e) => {
                              e.currentTarget.src = getAvatarUrl(null, sender?.display_name || 'friend')
                            }}
                          />
                          <span className="text-xs text-zinc-300 font-medium">
                            Shared by{' '}
                            <strong className="text-white font-semibold">
                              @{sender?.username || 'friend'}
                            </strong>
                          </span>
                        </div>
                      )
                    ) : (
                      /* By Me: Recipient Attribution */
                      recipient?.username ? (
                        <button
                          type="button"
                          onClick={() => handleOpenProfile(recipient)}
                          className="flex items-center gap-2 group/recipient text-left cursor-pointer transition-opacity hover:opacity-90"
                          aria-label={`View @${recipient.username}'s public profile`}
                        >
                          <img
                            src={getAvatarUrl(recipient?.avatar_url, recipient?.display_name || recipient?.username)}
                            alt={recipient?.display_name || 'Recipient'}
                            className="w-5 h-5 rounded-full object-cover border border-white/10 group-hover/recipient:border-white/30 transition-colors"
                            onError={(e) => {
                              e.currentTarget.src = getAvatarUrl(null, recipient?.display_name || recipient?.username)
                            }}
                          />
                          <span className="text-xs text-zinc-300 font-medium">
                            Sent to{' '}
                            <strong className="text-white font-semibold group-hover/recipient:underline group-hover/recipient:text-amber-300 transition-colors">
                              @{recipient.username}
                            </strong>
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <img
                            src={getAvatarUrl(recipient?.avatar_url, recipient?.display_name || 'friend')}
                            alt={recipient?.display_name || 'Recipient'}
                            className="w-5 h-5 rounded-full object-cover border border-white/10"
                            onError={(e) => {
                              e.currentTarget.src = getAvatarUrl(null, recipient?.display_name || 'friend')
                            }}
                          />
                          <span className="text-xs text-zinc-300 font-medium">
                            Sent to{' '}
                            <strong className="text-white font-semibold">
                              @{recipient?.username || 'friend'}
                            </strong>
                          </span>
                        </div>
                      )
                    )}

                    {/* Relative Timestamp */}
                    {formattedTime && (
                      <span className="text-[11px] font-mono text-zinc-500">
                        • {formattedTime}
                      </span>
                    )}

                    {/* Private E2EE Badge */}
                    {item.is_private_item && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-semibold">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Private Share (E2EE)</span>
                      </span>
                    )}
                  </div>

                  {/* Header Right Status */}
                  <div className="flex items-center gap-2">
                    {activeSubTab === 'with-me' ? (
                      isUnread && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400 text-black font-bold">
                          <span>New</span>
                        </span>
                      )
                    ) : (
                      /* By Me Delivery Receipt */
                      item.is_read ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        >
                          <CheckCheck className="w-3 h-3 text-emerald-400" />
                          <span>Seen</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/10"
                        >
                          <Check className="w-3 h-3 text-zinc-400" />
                          <span>Sent</span>
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Recommendation Content */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-zinc-500">
                    <span className={`text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md font-medium border ${getCategoryBadgeClass(item.category)}`}>
                      {CATEGORIES.find((c) => c.id === item.category)?.label || item.category}
                    </span>
                    {item.metadata?.year && <span>{item.metadata.year}</span>}
                    {item.metadata?.author && (
                      <span className="truncate">
                        by <strong className="text-zinc-300">{item.metadata.author}</strong>
                      </span>
                    )}
                    {item.metadata?.platform && <span>• {item.metadata.platform}</span>}
                  </div>

                  {/* Title & Decryption State */}
                  <h3 className="font-display font-bold text-base sm:text-lg text-white break-words">
                    {isDecrypting ? (
                      <span className="inline-flex items-center gap-2 text-zinc-400 font-mono text-sm">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Decrypting private share...</span>
                      </span>
                    ) : item._decryptionFailed ? (
                      <span className="inline-flex items-center gap-1.5 text-rose-400 font-mono text-xs bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Decryption failed</span>
                      </span>
                    ) : (
                      item.title
                    )}
                  </h3>

                  {/* Personal Note Block */}
                  {item.note && (
                    <div className="p-3 bg-amber-400/[0.04] border border-amber-400/20 rounded-xl text-xs text-amber-200/90 leading-relaxed italic">
                      <span className="font-mono text-[10px] font-bold text-amber-400 uppercase not-italic block mb-0.5">
                        {activeSubTab === 'with-me' ? (
                          sender?.username ? (
                            <button
                              type="button"
                              onClick={() => handleOpenProfile(sender)}
                              className="hover:underline cursor-pointer inline-flex items-center gap-1 text-amber-400"
                              aria-label={`View @${sender.username}'s profile`}
                            >
                              Note from @{sender.username}:
                            </button>
                          ) : (
                            <span>Note from friend:</span>
                          )
                        ) : (
                          <span>Your note to @{recipient?.username || 'friend'}:</span>
                        )}
                      </span>
                      "{item.note}"
                    </div>
                  )}

                  {/* Item's original curator note */}
                  {item.metadata?.note && (
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed border-l border-white/20 pl-2.5 italic">
                      "{item.metadata.note}"
                    </p>
                  )}

                  {getSafeExternalLink(item.metadata?.channel_link) && (
                    <a
                      href={getSafeExternalLink(item.metadata.channel_link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-white transition-colors"
                    >
                      <span>Visit link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
                  {activeSubTab === 'with-me' ? (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Private Vault Button */}
                        {isAlreadyInVault ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-500/25 cursor-default min-h-[36px]">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>In Private Vault</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={Boolean(savingAction?.id === item.id) || !item._isDecrypted}
                            onClick={() => handleSaveToPrivateVault(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors cursor-pointer disabled:opacity-40 min-h-[36px]"
                            aria-label="Save encrypted in your personal Private Vault"
                          >
                            {savingAction?.id === item.id && savingAction?.isPrivate ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            <span>Save to Private Vault</span>
                          </button>
                        )}

                        {/* Public Leaderboard Button */}
                        {isAlreadyRecommended ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/10 text-amber-300 text-xs font-semibold rounded-xl border border-amber-400/25 cursor-default min-h-[36px]">
                            <Check className="w-3.5 h-3.5 text-amber-400" />
                            <span>{isCreator ? 'Created by You' : 'Recommended'}</span>
                          </span>
                        ) : matchedPublicItem ? (
                          <button
                            type="button"
                            disabled={Boolean(savingAction?.id === item.id) || !item._isDecrypted}
                            onClick={() => handleRecommendPublicly(item, matchedPublicItem)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40 shadow-sm min-h-[36px]"
                            aria-label="Recommend this on the leaderboard (+1 vote)"
                          >
                            {savingAction?.id === item.id && !savingAction?.isPrivate ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                            ) : (
                              <ArrowBigUp className="w-3.5 h-3.5 text-black" />
                            )}
                            <span>Recommend (+1)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={Boolean(savingAction?.id === item.id) || !item._isDecrypted}
                            onClick={() => handleRecommendPublicly(item, null)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors cursor-pointer disabled:opacity-40 min-h-[36px]"
                            aria-label="Publish as a public recommendation on leaderboard"
                          >
                            {savingAction?.id === item.id && !savingAction?.isPrivate ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            <span>Publish to Leaderboard</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => handleDeleteShare(item.id)}
                          className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-500/20 disabled:opacity-40"
                          aria-label="Dismiss from shared list"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    /* By Me Outgoing Actions Footer */
                    <>
                      <div className="text-xs font-mono text-zinc-500">
                        {item.is_private_item ? 'End-to-End Encrypted' : 'Public Recommendation'}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => handleDeleteShare(item.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer border border-white/[0.08] hover:border-rose-500/20 disabled:opacity-40 text-xs font-mono"
                          aria-label="Delete this recommendation"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Delete Share</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
