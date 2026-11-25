import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { X, Plus, Check, AlertCircle, Lock } from 'lucide-react'
import { useItems } from '../context/ItemContext'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES } from '../constants/categories'
import {
  findMatchingExistingItems,
  getMatchOwnership,
  isItemPlaintextAvailable
} from '../lib/recommendationMatching'

// Modal dialog for submitting a new recommendation or upvoting existing matches
export default function AddRecommendationModal({
  isOpen,
  onClose,
  initialPrivate = false,
  initialCategory = 'movie',
  onSuccess
}) {
  const { items, myPrivateItems = [], addItem, toggleRecommend, userRecs, isVaultSyncing } = useItems()
  const { user, signInWithGoogle } = useAuth()

  // Ref to title input for auto-focus
  const titleInputRef = useRef(null)
  const backdropMouseDownRef = useRef(false)

  // Form input fields
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(initialCategory || 'movie')
  const [customCategory, setCustomCategory] = useState('')
  const [note, setNote] = useState('')
  const [linkOrExtra, setLinkOrExtra] = useState('')
  const [isPrivate, setIsPrivate] = useState(Boolean(initialPrivate))
  const [status, setStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [upvotingId, setUpvotingId] = useState(null)
  const [duplicateCandidate, setDuplicateCandidate] = useState(null)
  const [pendingPrivatePayload, setPendingPrivatePayload] = useState(null)
  const [prevOpen, setPrevOpen] = useState(isOpen)

  // Reset and initialize form state when modal opens (handles external/hardware-back closes cleanly)
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen)
    if (isOpen) {
      setTitle('')
      setCategory(initialCategory && initialCategory !== 'all' ? initialCategory : 'movie')
      setCustomCategory('')
      setNote('')
      setLinkOrExtra('')
      setIsPrivate(Boolean(initialPrivate))
      setStatus(null)
      setIsSubmitting(false)
      setUpvotingId(null)
      setDuplicateCandidate(null)
      setPendingPrivatePayload(null)
    }
  }

  // Auto-focus title input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Clear inputs and error messages
  const resetForm = useCallback(() => {
    setTitle('')
    setCategory(initialCategory && initialCategory !== 'all' ? initialCategory : 'movie')
    setCustomCategory('')
    setNote('')
    setLinkOrExtra('')
    setIsPrivate(Boolean(initialPrivate))
    setStatus(null)
    setIsSubmitting(false)
    setUpvotingId(null)
    setDuplicateCandidate(null)
    setPendingPrivatePayload(null)
  }, [initialCategory, initialPrivate])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  const lockedVaultCount = useMemo(
    () => myPrivateItems.filter(it => !isItemPlaintextAvailable(it)).length,
    [myPrivateItems]
  )

  // Find matching items across Public Recommendations and unlocked Private Vault Items while typing
  const matchingExistingItems = useMemo(() => {
    if (isSubmitting || duplicateCandidate) return []
    return findMatchingExistingItems({
      query: title,
      publicItems: items,
      privateItems: myPrivateItems
    })
  }, [title, items, myPrivateItems, isSubmitting, duplicateCandidate])

  if (!isOpen) return null

  const buildMetadata = () => {
    const metadata = {}
    if (category === 'other' && customCategory.trim()) {
      metadata.custom_category = customCategory.trim()
    }
    if (note.trim()) {
      metadata.note = note.trim()
    }
    if (linkOrExtra.trim()) {
      const val = linkOrExtra.trim()
      if (category === 'yt' || (category === 'app' && (val.includes('.') || /^https?:\/\//i.test(val)))) {
        metadata.channel_link = /^https?:\/\//i.test(val) ? val : `https://${val}`
      } else if (category === 'book') {
        metadata.author = val
      } else {
        metadata.platform = val
      }
    }
    return metadata
  }

  // Handle recommendation form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      signInWithGoogle()
      return
    }

    if (!title.trim()) return
    if (category === 'other' && !customCategory.trim()) {
      setStatus({ type: 'error', msg: 'Please enter a custom category label' })
      return
    }

    setIsSubmitting(true)
    setStatus(null)

    const metadata = buildMetadata()
    const payload = {
      title: title.trim(),
      category,
      metadata,
      is_private: isPrivate,
      isPrivate
    }

    const res = await addItem(payload)

    setIsSubmitting(false)

    if (res?.duplicate || res?.exists) {
      const existingItem = res.existingItem || res.item
      if (res.isPrivateDuplicate) {
        setPendingPrivatePayload(payload)
        setDuplicateCandidate({ ...existingItem, is_private: true })
      } else {
        setDuplicateCandidate(existingItem)
      }
      return
    }

    if (res?.error) {
      setStatus({ type: 'error', msg: res.error })
      return
    }

    // Success: notify parent, reset form, and close dialog
    onSuccess?.({ isPrivate, item: res.item })
    resetForm()
    onClose()
  }

  // Save a second independent Private Vault Item after duplicate confirmation
  const handleForceSavePrivateDuplicate = async () => {
    if (!pendingPrivatePayload || isSubmitting) return
    setIsSubmitting(true)
    setStatus(null)

    const res = await addItem({ ...pendingPrivatePayload, forceDuplicate: true })
    setIsSubmitting(false)

    if (res?.error) {
      setStatus({ type: 'error', msg: res.error })
      return
    }

    onSuccess?.({ isPrivate: true, item: res.item })
    resetForm()
    onClose()
  }

  // Immediately upvote an existing matching recommendation (only for another user's public item)
  const handleRecommendExisting = async (itemId) => {
    if (upvotingId) return
    setUpvotingId(itemId)
    const res = await toggleRecommend(itemId)
    setUpvotingId(null)
    if (res?.error) {
      setStatus({ type: 'error', msg: res.error })
      return
    }
    const upvotedItem = items.find(i => i.id === itemId)
    resetForm()
    onClose()
    onSuccess?.({ isPrivate: false, item: upvotedItem, isUpvote: true })
  }

  // Confirm upvote on duplicate modal
  const handleConfirmUpvote = async () => {
    if (!duplicateCandidate || isSubmitting) return
    setIsSubmitting(true)
    const res = await toggleRecommend(duplicateCandidate.id)
    setIsSubmitting(false)
    if (res?.error) {
      setStatus({ type: 'error', msg: res.error })
      return
    }
    const upvotedItem = duplicateCandidate
    resetForm()
    onClose()
    onSuccess?.({ isPrivate: false, item: upvotedItem, isUpvote: true })
  }

  // Dismiss duplicate prompt without upvoting
  const handleDismissDuplicate = () => {
    resetForm()
    onClose()
  }

  const isDuplicateOwnOrVoted = duplicateCandidate
    ? userRecs.has(duplicateCandidate.id) || (user?.id && duplicateCandidate.created_by === user.id)
    : false

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && backdropMouseDownRef.current) {
          handleClose()
        }
        backdropMouseDownRef.current = false
      }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#141414] border border-white/[0.12] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div>
            <h2 className="font-display text-base font-bold text-white">Add Recommendation</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {duplicateCandidate ? (
          /* Duplicate Decision Prompt Card */
          <div className="space-y-4 py-1">
            <div className="p-4 bg-white/[0.04] border border-white/[0.12] rounded-xl space-y-3">
              <div className="flex items-start gap-2.5 text-zinc-200">
                {duplicateCandidate.is_private ? (
                  <Lock className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-zinc-400" />
                )}
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-bold text-white">
                    {duplicateCandidate.is_private ? 'Already in your Private Vault' : 'Already recommended on site'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 break-words">
                    {duplicateCandidate.is_private
                      ? `"${duplicateCandidate.title}" is already saved in your Private Vault.`
                      : `"${duplicateCandidate.title}" is already on the leaderboard.`}
                  </p>
                </div>
              </div>

              {/* Existing item snapshot */}
              <div className="p-3 bg-[#1A1A1A] border border-white/[0.08] rounded-xl text-xs space-y-1.5">
                <div className="font-display font-bold text-white text-sm break-words">
                  {duplicateCandidate.title}
                </div>
                <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2 flex-wrap">
                  <span className="uppercase text-zinc-300 bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/[0.08]">
                    {CATEGORIES.find(c => c.id === duplicateCandidate.category)?.label || duplicateCandidate.category}
                  </span>
                  {duplicateCandidate.is_private ? (
                    <span className="inline-flex items-center gap-1 text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <Lock className="w-3 h-3" />
                      <span>Private Vault</span>
                    </span>
                  ) : (
                    <>
                      <span>•</span>
                      <span>{duplicateCandidate.recommend_count} recommendations</span>
                      {duplicateCandidate.creator?.username && (
                        <>
                          <span>•</span>
                          <span>by @{duplicateCandidate.creator.username}</span>
                        </>
                      )}
                    </>
                  )}
                </div>
                {duplicateCandidate.is_private && duplicateCandidate.metadata?.note && (
                  <p className="text-[11px] text-zinc-400 line-clamp-2 pt-0.5">
                    {duplicateCandidate.metadata.note}
                  </p>
                )}
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                {duplicateCandidate.is_private
                  ? 'Would you like to keep the existing item or save another copy?'
                  : duplicateCandidate.created_by === user?.id
                  ? 'You already created and recommended this item.'
                  : userRecs.has(duplicateCandidate.id)
                  ? 'You have already upvoted this recommendation.'
                  : 'Would you like to upvote this recommendation to add it to your recommendations?'}
              </p>
            </div>

            {status && (
              <div className={`p-2.5 text-xs font-medium rounded-xl ${
                status.type === 'error' ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30' : 'bg-white/[0.08] text-white border border-white/20'
              }`}>
                {status.msg}
              </div>
            )}

            {/* Decision Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
              <button
                type="button"
                onClick={handleDismissDuplicate}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer min-h-[38px]"
              >
                {duplicateCandidate.is_private
                  ? 'Cancel'
                  : isDuplicateOwnOrVoted
                  ? 'Close'
                  : "No, Don't Upvote"}
              </button>

              {duplicateCandidate.is_private ? (
                <button
                  type="button"
                  onClick={handleForceSavePrivateDuplicate}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-full transition-all disabled:opacity-60 cursor-pointer min-h-[38px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Duplicate Anyway'}</span>
                </button>
              ) : (
                !isDuplicateOwnOrVoted && (
                  <button
                    type="button"
                    onClick={handleConfirmUpvote}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-5 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-full transition-all disabled:opacity-60 cursor-pointer min-h-[38px]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Upvoting...' : 'Yes, Upvote (+1)'}</span>
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title Input */}
            <div>
              <label htmlFor="add-rec-title" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Title / Name
              </label>
              <input
                ref={titleInputRef}
                id="add-rec-title"
                name="title"
                type="text"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Severance, Interstellar, Atomic Habits..."
                className="w-full bg-[#1A1A1A] border border-white/[0.1] px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* Live Deduplication Alert while typing (Public + Unlocked Private Vault) */}
            {matchingExistingItems.length > 0 && (
              <div className="p-3 bg-white/[0.04] border border-white/[0.1] rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>Existing recommendations match:</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                  {matchingExistingItems.map(it => {
                    const ownership = getMatchOwnership(it, user?.id)
                    const alreadyVoted = userRecs.has(it.id)
                    const catLabel = CATEGORIES.find(c => c.id === it.category)?.label || it.category

                    return (
                      <div
                        key={it.id}
                        className="flex items-center justify-between gap-2.5 p-2.5 bg-[#1A1A1A] border border-white/[0.08] rounded-xl text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-white truncate block">{it.title}</span>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span className="uppercase text-zinc-300">{catLabel}</span>
                            {ownership.kind !== 'own_vault' && (
                              <>
                                <span>•</span>
                                <span>{ownership.sourceLabel}</span>
                                <span>•</span>
                                <span>{it.recommend_count} recs</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {ownership.kind === 'own_vault' ? (
                            <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 inline-flex items-center gap-1 select-none whitespace-nowrap">
                              <Lock className="w-3 h-3" />
                              <span>{ownership.badgeLabel}</span>
                            </span>
                          ) : ownership.kind === 'own_public' ? (
                            <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-white/[0.08] text-zinc-300 border border-white/10 inline-flex items-center gap-1 select-none whitespace-nowrap">
                              <Check className="w-3 h-3" />
                              <span>{ownership.badgeLabel}</span>
                            </span>
                          ) : alreadyVoted ? (
                            <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-white/10 text-zinc-300 border border-white/10 inline-flex items-center gap-1 select-none whitespace-nowrap">
                              <Check className="w-3 h-3" />
                              <span>Upvoted</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={upvotingId === it.id}
                              onClick={() => handleRecommendExisting(it.id)}
                              className="px-3 py-1.5 min-h-[32px] text-[11px] font-semibold rounded-full flex items-center gap-1 cursor-pointer transition-colors bg-white text-black hover:bg-zinc-200 disabled:opacity-60 whitespace-nowrap"
                            >
                              {upvotingId === it.id ? 'Adding...' : '+1 Upvote'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Inline vault sync / locked hint when Private Vault items are unavailable for matching */}
            {(isPrivate || title.trim().length >= 2) && (isVaultSyncing || lockedVaultCount > 0) && (
              <p className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5 leading-snug">
                <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                <span>
                  {isVaultSyncing
                    ? 'Syncing encrypted vault — some private items may not appear in matches yet.'
                    : `${lockedVaultCount} encrypted vault item${lockedVaultCount === 1 ? ' is' : 's are'} still locked and excluded from matches.`}
                </span>
              </p>
            )}

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Category
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                  const Icon = cat.icon
                  const isSelected = category === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-mono border text-center rounded-xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white text-black border-white font-semibold shadow-sm'
                          : 'bg-[#1A1A1A] border-white/[0.08] text-zinc-300 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-black' : cat.color || 'text-zinc-400'}`} />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Category Input if 'other' is selected */}
            {category === 'other' && (
              <div>
                <label htmlFor="add-rec-custom-category" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Custom Category Label *
                </label>
                <input
                  id="add-rec-custom-category"
                  name="customCategory"
                  type="text"
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Podcast, Newsletter, Hardware, Essay..."
                  className="w-full bg-[#1A1A1A] border border-white/[0.1] px-3.5 py-2 text-xs text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>
            )}

            {/* Extra Details */}
            <div>
              <label htmlFor="add-rec-extra" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {category === 'yt'
                  ? 'Channel Link'
                  : category === 'book'
                  ? 'Author'
                  : category === 'app'
                  ? 'Website / App Link (optional)'
                  : 'Platform / Source (optional)'}
              </label>
              <input
                id="add-rec-extra"
                name="linkOrExtra"
                type="text"
                value={linkOrExtra}
                onChange={(e) => setLinkOrExtra(e.target.value)}
                placeholder={
                  category === 'yt'
                    ? 'https://youtube.com/@...'
                    : category === 'book'
                    ? 'Author name'
                    : category === 'app'
                    ? 'https://... or Play Store'
                    : 'e.g. Netflix, Steam, Criterion, HBO'
                }
                className="w-full bg-[#1A1A1A] border border-white/[0.1] px-3.5 py-2 text-xs text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-white/30 transition-colors font-mono"
              />
            </div>

            {/* User Review / Note */}
            <div>
              <label htmlFor="add-rec-note" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Curator's Note
              </label>
              <textarea
                id="add-rec-note"
                name="note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write whatever you want here bro.."
                className="w-full bg-[#1A1A1A] border border-white/[0.1] px-3.5 py-2 text-xs text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-white/30 transition-colors resize-none"
              />
            </div>

            {/* Private Watchlist Checkbox Toggle */}
            <div className={`p-3.5 border rounded-xl transition-all duration-150 ${
              isPrivate
                ? 'bg-white/[0.06] border-white/20'
                : 'bg-[#1A1A1A] border-white/[0.08]'
            }`}>
              <label htmlFor="add-rec-private-toggle" className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  id="add-rec-private-toggle"
                  name="isPrivate"
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-700 bg-zinc-800 text-white focus:ring-0 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Lock className={`w-3.5 h-3.5 transition-colors ${isPrivate ? 'text-white' : 'text-zinc-500'}`} />
                    <span>Save to Private Vault</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed font-mono">
                    Hidden from the public feed.
                  </p>
                </div>
              </label>
            </div>

            {/* Feedback message */}
            {status && (
              <div className={`p-2.5 text-xs font-medium rounded-xl ${
                status.type === 'error' ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30' : 'bg-white/[0.08] text-white border border-white/20'
              }`}>
                {status.msg}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-6 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-full transition-all disabled:opacity-60 cursor-pointer min-h-[40px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : isPrivate ? 'Save to Vault' : 'Publish Recommendation'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
