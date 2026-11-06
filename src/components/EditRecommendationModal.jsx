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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h2 className="font-display text-base font-bold text-zinc-950">Edit Recommendation</h2>
            <p className="text-xs text-stone-500">Updates will reflect live across the entire community</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-zinc-950 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
              Title / Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 px-3.5 py-2.5 text-xs text-zinc-950 placeholder:text-stone-400 rounded-xl focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
            />
          </div>

          {/* Category */}
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
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
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

          {/* Reason / Note */}
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

          {/* Feedback message */}
          {status && (
            <div className={`p-2.5 text-xs font-medium rounded-xl ${
              status.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : status.type === 'loading'
                ? 'bg-stone-100 text-stone-700 border border-stone-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {status.msg}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-zinc-950 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
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
