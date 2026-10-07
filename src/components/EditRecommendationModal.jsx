import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { useItems } from '../context/ItemContext'
import { CATEGORIES } from '../constants/categories'

export default function EditRecommendationModal({ item, isOpen, onClose }) {
  const { updateItem } = useItems()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('movie')
  const [customCategory, setCustomCategory] = useState('')
  const [extra, setExtra] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (item) {
      setTitle(item.title || '')
      setCategory(item.category || 'movie')
      setCustomCategory(item.metadata?.custom_category || '')
      setNote(item.metadata?.note || '')
      if (item.category === 'yt' || (item.category === 'app' && item.metadata?.channel_link)) {
        setExtra(item.metadata?.channel_link || '')
      } else if (item.category === 'book') {
        setExtra(item.metadata?.author || '')
      } else {
        setExtra(item.metadata?.platform || '')
      }
      setStatus(null)
    }
  }, [item])

  if (!isOpen || !item) return null

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
        metadata.channel_link = /^https?:\/\//i.test(val) ? val : `https://${val}`
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 p-4 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Edit Recommendation</h2>
            <p className="text-xs text-zinc-400">Updates will reflect live across the entire community</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Title / Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Category */}
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
              className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Reason / Note */}
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
              status.type === 'error'
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {status.msg}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors disabled:opacity-50"
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
