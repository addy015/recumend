import React, { useState } from 'react'
import { X, Save } from 'lucide-react'
import { useItems } from '../context/ItemContext'
import { CATEGORIES } from '../constants/categories'

// Modal dialog allowing the creator of a recommendation to edit title, category, and notes
export default function EditRecommendationModal({ item, isOpen, onClose }) {
  const { updateItem } = useItems()

  // Extract initial extra field depending on the category (channel link, author, or platform)
  const getInitialExtra = () => {
    if (!item) return ''
    if (item.category === 'yt' || (item.category === 'app' && item.metadata?.channel_link)) {
      return item.metadata?.channel_link || ''
    } else if (item.category === 'book') {
      return item.metadata?.author || ''
    }
    return item.metadata?.platform || ''
  }

  const [title, setTitle] = useState(item?.title || '')
  const [category, setCategory] = useState(item?.category || 'movie')
  const [customCategory, setCustomCategory] = useState(item?.metadata?.custom_category || '')
  const [extra, setExtra] = useState(getInitialExtra)
  const [note, setNote] = useState(item?.metadata?.note || '')
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen || !item) return null

  // Prevent editing locked/undecrypted items
  if (item.is_private && !item._isDecrypted && item.title === '[Encrypted Item]') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <div className="w-full max-w-md bg-[#141414] border border-white/[0.12] rounded-2xl p-6 shadow-2xl space-y-4 text-white">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <h2 className="font-display text-base font-bold text-white">Item Locked</h2>
            <button type="button" onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            This private item cannot be edited because it is currently encrypted with an unverified key. Please ensure your vault key is synced before editing.
          </p>
          <div className="flex justify-end pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2 bg-white text-black text-xs font-semibold rounded-full">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Save changes to the recommendation across the platform
  const handleSave = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setStatus({ type: 'error', msg: 'Title cannot be empty' })
      return
    }

    if (category === 'other' && !customCategory.trim()) {
      setStatus({ type: 'error', msg: 'Please enter a custom category label' })
      return
    }

    setSubmitting(true)
    setStatus({ type: 'loading', msg: 'Updating recommendation globally...' })

    // Clean up metadata based on active category
    const metadata = { ...item.metadata }
    if (category === 'other' && customCategory.trim()) {
      metadata.custom_category = customCategory.trim()
    } else {
      delete metadata.custom_category
    }

    if (note.trim()) metadata.note = note.trim()
    else delete metadata.note

    if (extra.trim()) {
      const val = extra.trim()
      if (category === 'yt' || (category === 'app' && (val.includes('.') || /^https?:\/\//i.test(val)))) {
        metadata.channel_link = val
        delete metadata.author
        delete metadata.platform
      } else if (category === 'book') {
        metadata.author = val
        delete metadata.channel_link
        delete metadata.platform
      } else {
        metadata.platform = val
        delete metadata.channel_link
        delete metadata.author
      }
    } else {
      delete metadata.channel_link
      delete metadata.author
      delete metadata.platform
    }

    const res = await updateItem(item.id, {
      title: title.trim(),
      category,
      metadata
    })

    setSubmitting(false)
    if (res.success) {
      setStatus({ type: 'success', msg: 'Updated successfully across all feeds!' })
      setTimeout(() => {
        onClose()
        setStatus(null)
      }, 700)
    } else {
      setStatus({ type: 'error', msg: res.error || 'Failed to update item' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#141414] border border-white/[0.12] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div>
            <h2 className="font-display text-base font-bold text-white">Edit Recommendation</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="edit-rec-title" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Title / Name
            </label>
            <input
              id="edit-rec-title"
              name="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-white/[0.1] px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {/* Category */}
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
              <label htmlFor="edit-rec-custom-category" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Custom Category Label *
              </label>
              <input
                id="edit-rec-custom-category"
                name="customCategory"
                type="text"
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Podcast, Newsletter, Hardware..."
                className="w-full bg-[#1A1A1A] border border-white/[0.1] px-3.5 py-2 text-xs text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
          )}

          {/* Extra Details */}
          <div>
            <label htmlFor="edit-rec-extra" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {category === 'yt'
                ? 'Channel Link'
                : category === 'book'
                ? 'Author'
                : category === 'app'
                ? 'Website / App Link (optional)'
                : 'Platform / Source (optional)'}
            </label>
            <input
              id="edit-rec-extra"
              name="extra"
              type="text"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder={
                category === 'yt'
                  ? 'https://youtube.com/@...'
                  : category === 'book'
                  ? 'Author name'
                  : category === 'app'
                  ? 'https://... or Play Store'
                  : 'e.g. Netflix, Steam, HBO'
              }
              className="w-full bg-[#1A1A1A] border border-white/[0.1] px-3.5 py-2 text-xs text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-white/30 transition-colors font-mono"
            />
          </div>

          {/* Reason / Note */}
          <div>
            <label htmlFor="edit-rec-note" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Curator's Note
            </label>
            <textarea
              id="edit-rec-note"
              name="note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why do you recommend this?"
              className="w-full bg-[#1A1A1A] border border-white/[0.1] px-3.5 py-2 text-xs text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
          </div>

          {/* Feedback message */}
          {status && (
            <div className={`p-2.5 text-xs font-medium rounded-xl ${
              status.type === 'error'
                ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                : status.type === 'loading'
                ? 'bg-white/[0.05] text-zinc-300 border border-white/10'
                : 'bg-white/[0.08] text-white border border-white/20'
            }`}>
              {status.msg}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer min-h-[40px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-6 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-full transition-colors disabled:opacity-50 cursor-pointer min-h-[40px]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
