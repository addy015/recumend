import React, { useState, useMemo } from 'react'
import { X, Plus, Check, AlertCircle } from 'lucide-react'
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
    if (note.trim()) metadata.note = note.trim()
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

    const res = await addItem({
      title: title.trim(),
      category,
      metadata
    })

    setIsSubmitting(false)

    if (res.exists) {
      // Prompt user to upvote the existing item instead of creating a duplicate
      setDuplicateCandidate(res.item)
    } else if (res.success) {
      resetForm()
      onClose()
    } else {
      setStatus({ type: 'error', msg: res.error || 'Failed to add' })
    }
  }

  // Quickly upvote an existing suggestion from the live search list
  const handleRecommendExisting = async (itemId) => {
    if (!user) {
      signInWithGoogle()
      return
    }
    if (!userRecs.has(itemId)) {
      await toggleRecommend(itemId)
    }
    resetForm()
    onClose()
  }

  // Confirm upvote on the detected duplicate item
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 p-4 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Add Recommendation</h2>
            <p className="text-xs text-zinc-400">Search first to prevent duplicate entries</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {duplicateCandidate ? (
          /* Duplicate Decision Prompt Card */
          <div className="space-y-4 py-1">
            <div className="p-4 bg-zinc-950 border border-amber-500/40 space-y-3">
              <div className="flex items-start gap-2.5 text-amber-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Already recommended on site
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    "{duplicateCandidate.title}" is already on the leaderboard.
                  </p>
                </div>
              </div>

              {/* Existing item snapshot */}
              <div className="p-3 bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-zinc-100 text-sm">
                    {duplicateCandidate.title}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center gap-2 flex-wrap">
                    <span className="uppercase text-zinc-300 bg-zinc-950 px-1.5 py-0.5 border border-zinc-800">
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

              <p className="text-xs text-zinc-300 leading-relaxed">
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
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                {userRecs.has(duplicateCandidate.id) ? 'Close' : "No, Don't Upvote"}
              </button>

              {!userRecs.has(duplicateCandidate.id) && (
                <button
                  type="button"
                  onClick={handleConfirmUpvote}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors shadow-sm"
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
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Title / Name
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Severance, Interstellar, Atomic Habits..."
                className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Live Deduplication Alert while typing */}
            {matchingExistingItems.length > 0 && (
              <div className="p-3 bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Already recommended on site:</span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {matchingExistingItems.map(it => {
                    const alreadyVoted = userRecs.has(it.id)
                    return (
                      <div key={it.id} className="flex items-center justify-between p-2 bg-zinc-900 border border-zinc-800/80 text-xs">
                        <div>
                          <span className="font-semibold text-zinc-200">{it.title}</span>
                          <span className="text-[10px] text-zinc-500 ml-2 font-mono uppercase">({it.category})</span>
                          <span className="text-[10px] text-zinc-400 ml-2">★ {it.recommend_count} recs</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRecommendExisting(it.id)}
                          className={`px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 ${
                            alreadyVoted
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-zinc-100 text-zinc-950 hover:bg-white'
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
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Category
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`py-2 px-2 text-xs font-medium border text-center transition-all ${
                      category === cat.id
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
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
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Custom Category Label <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Podcast, Course, Hardware, Tool, Newsletter..."
                  className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
            )}

            {/* Extra Details */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
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
                className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* User Review / Note */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Description of your recommendation
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What makes this worth someone's time?"
                className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
              />
            </div>

            {/* Feedback message */}
            {status && (
              <div className={`p-2.5 text-xs font-medium ${
                status.type === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {status.msg}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors disabled:opacity-60"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Adding...' : 'Submit Recommendation'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
