import React, { useState, useMemo } from 'react'
import { X, Plus, Check, AlertCircle, Lock } from 'lucide-react'
import { useItems } from '../context/ItemContext'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES } from '../constants/categories'

// Modal dialog for submitting a new recommendation or upvoting existing matches
export default function AddRecommendationModal({ isOpen, onClose }) {
  const { items, addItem, toggleRecommend, userRecs, normalizeTitle } = useItems()
  const { user, signInWithGoogle } = useAuth()

  // Form input fields
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('movie')
  const [customCategory, setCustomCategory] = useState('')
  const [note, setNote] = useState('')
  const [linkOrExtra, setLinkOrExtra] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [status, setStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [duplicateCandidate, setDuplicateCandidate] = useState(null)

  // Clear inputs and error messages
  const resetForm = () => {
    setTitle('')
    setCategory('movie')
    setCustomCategory('')
    setNote('')
    setLinkOrExtra('')
    setIsPrivate(false)
    setStatus(null)
    setIsSubmitting(false)
    setDuplicateCandidate(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Find matching items in real time while user is typing
  const matchingExistingItems = useMemo(() => {
    if (isSubmitting || duplicateCandidate) return []
    if (!title.trim() || title.trim().length < 2) return []
    const norm = normalizeTitle(title)
    return items.filter(it => it.normalized_title.includes(norm) || norm.includes(it.normalized_title))
  }, [title, items, normalizeTitle, isSubmitting, duplicateCandidate])

  if (!isOpen) return null

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

    // Build category-specific metadata object
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
        metadata.channel_link = val
      } else if (category === 'book') {
        metadata.author = val
      } else {
        metadata.platform = val
      }
    }

    // Submit new recommendation item
    const res = await addItem({
      title: title.trim(),
      category,
      metadata,
      is_private: isPrivate
    })

    setIsSubmitting(false)

    if (res?.duplicate) {
      setDuplicateCandidate(res.existingItem)
      return
    }

    if (res?.error) {
      setStatus({ type: 'error', msg: res.error })
      return
    }

    // Success: close modal and clear form
    resetForm()
    onClose()
  }

  // Upvote item directly from matching suggestions
  const handleRecommendExisting = async (existingId) => {
    if (!user) {
      signInWithGoogle()
      return
    }
    await toggleRecommend(existingId)
  }

  // Confirm upvote on duplicate detection prompt
  const handleConfirmUpvote = async () => {
    if (!duplicateCandidate) return
    if (!user) {
      signInWithGoogle()
      return
    }
    if (!userRecs.has(duplicateCandidate.id)) {
      await toggleRecommend(duplicateCandidate.id)
    }
    resetForm()
    onClose()
  }

  // Dismiss duplicate prompt without upvoting
  const handleDismissDuplicate = () => {
    resetForm()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h2 className="font-display text-base font-bold text-zinc-950">Add Recommendation</h2>
            <p className="text-xs text-stone-500">Search first to prevent duplicate entries</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-stone-400 hover:text-zinc-950 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {duplicateCandidate ? (
          /* Duplicate Decision Prompt Card */
          <div className="space-y-4 py-1">
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5 text-amber-800">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <h3 className="font-display text-sm font-bold text-zinc-950">
                    Already recommended on site
                  </h3>
                  <p className="text-xs text-stone-600 mt-0.5">
                    "{duplicateCandidate.title}" is already on the leaderboard.
                  </p>
                </div>
              </div>

              {/* Existing item snapshot */}
              <div className="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-display font-bold text-zinc-950 text-sm">
                    {duplicateCandidate.title}
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono mt-1 flex items-center gap-2 flex-wrap">
                    <span className="uppercase text-stone-800 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200 font-semibold">
                      {CATEGORIES.find(c => c.id === duplicateCandidate.category)?.label || duplicateCandidate.category}
                    </span>
                    <span>•</span>
                    <span>★ {duplicateCandidate.recommend_count} recommendations</span>
                    {duplicateCandidate.creator?.username && (
                      <>
                        <span>•</span>
                        <span>by @{duplicateCandidate.creator.username}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-stone-700 leading-relaxed">
                {userRecs.has(duplicateCandidate.id)
                  ? 'You have already upvoted this recommendation.'
                  : 'Would you like to upvote this recommendation to add it to your recommendations?'}
              </p>
            </div>

            {/* Decision Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleDismissDuplicate}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-zinc-950 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                {userRecs.has(duplicateCandidate.id) ? 'Close' : "No, Don't Upvote"}
              </button>

              {!userRecs.has(duplicateCandidate.id) && (
                <button
                  type="button"
                  onClick={handleConfirmUpvote}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Yes, Upvote (+1)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                Title / Name
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Severance, Interstellar, Atomic Habits..."
                className="w-full bg-stone-50 border border-stone-200 px-3.5 py-2.5 text-xs text-zinc-950 placeholder:text-stone-400 rounded-xl focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
              />
            </div>

            {/* Live Deduplication Alert while typing */}
            {matchingExistingItems.length > 0 && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Already recommended on site:</span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {matchingExistingItems.map(it => {
                    const alreadyVoted = userRecs.has(it.id)
                    return (
                      <div key={it.id} className="flex items-center justify-between p-2 bg-white border border-stone-200 rounded-lg text-xs">
                        <div>
                          <span className="font-semibold text-zinc-900">{it.title}</span>
                          <span className="text-[10px] text-stone-500 ml-2 font-mono uppercase">({it.category})</span>
                          <span className="text-[10px] text-stone-500 ml-2">★ {it.recommend_count} recs</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRecommendExisting(it.id)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors ${
                            alreadyVoted
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-zinc-950 text-white hover:bg-zinc-800'
                          }`}
                        >
                          {alreadyVoted ? <Check className="w-3.5 h-3.5" /> : '+1'}
                          {alreadyVoted ? 'Voted' : 'Vote This'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                Category
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`py-2 px-2 text-xs font-medium border text-center rounded-xl transition-all cursor-pointer ${
                      category === cat.id
                        ? 'bg-zinc-950 text-white border-zinc-950 font-semibold shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-zinc-950'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Category Input if 'other' is selected */}
            {category === 'other' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                  Custom Category Label <span className="text-[#2D6A4F]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Podcast, Course, Hardware, Tool, Newsletter..."
                  className="w-full bg-stone-50 border border-stone-200 px-3.5 py-2 text-xs text-zinc-950 placeholder:text-stone-400 rounded-xl focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
                />
              </div>
            )}

            {/* Extra Details */}
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                {category === 'yt'
                  ? 'Channel Link'
                  : category === 'book'
                  ? 'Author'
                  : category === 'app'
                  ? 'Website / App Link (optional)'
                  : 'Platform / Source (optional)'}
              </label>
              <input
                type="text"
                value={linkOrExtra}
                onChange={(e) => setLinkOrExtra(e.target.value)}
                placeholder={
                  category === 'yt'
                    ? 'https://youtube.com/@...'
                    : category === 'book'
                    ? 'Author name'
                    : category === 'app'
                    ? 'https://... or Play Store / App Store'
                    : 'e.g. Netflix, Steam, HBO'
                }
                className="w-full bg-stone-50 border border-stone-200 px-3.5 py-2 text-xs text-zinc-950 placeholder:text-stone-400 rounded-xl focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
              />
            </div>

            {/* User Review / Note */}
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                Description of your recommendation
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What makes this worth someone's time?"
                className="w-full bg-stone-50 border border-stone-200 px-3.5 py-2 text-xs text-zinc-950 placeholder:text-stone-400 rounded-xl focus:outline-none focus:border-stone-400 focus:bg-white transition-colors resize-none"
              />
            </div>

            {/* Private Watchlist Checkbox Toggle */}
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="mt-0.5 rounded border-stone-300 text-zinc-950 focus:ring-0 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                    <Lock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Save as Private (E2EE Vault)</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                    Encrypted client-side with your Google Drive key. Hidden from the public feed and database admins.
                  </p>
                </div>
              </label>
            </div>

            {/* Feedback message */}
            {status && (
              <div className={`p-2.5 text-xs font-medium rounded-xl ${
                status.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}>
                {status.msg}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-zinc-950 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-60 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : isPrivate ? 'Save to Private Vault' : 'Submit Recommendation'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
