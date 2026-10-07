import React, { useState } from 'react'
import { Sparkles, Edit3, Trash2, ArrowBigUp, ExternalLink, Plus, AlertCircle, ShieldCheck } from 'lucide-react'
import { useItems } from '../context/ItemContext'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES } from '../constants/categories'
import { getSafeExternalLink } from '../lib/avatar'
import EditRecommendationModal from './EditRecommendationModal'

export default function MyRecommendations({ onOpenAddModal }) {
  const { myItems, deleteItem } = useItems()
  const { user } = useAuth()

  const [editingItem, setEditingItem] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  const handleDelete = async (itemId) => {
    setDeletingId(itemId)
    setErrorMessage(null)
    const res = await deleteItem(itemId)
    setDeletingId(null)
    setDeleteConfirmItem(null)
    if (res.error) {
      setErrorMessage(res.error)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-zinc-900">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-400" />
            My Recommendations
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Recommendations you personally added. Your vote is locked at +1. Edit or delete anytime.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
          <div className="text-xs font-mono text-zinc-400 bg-zinc-900/60 border border-zinc-800/80 px-3 py-1.5 shrink-0">
            <strong>{myItems.length}</strong> created
          </div>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rec</span>
          </button>
        </div>
      </div>

      {/* Info notice about locked vote & global changes */}
      <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-zinc-200">Owner protection active:</strong> You cannot downvote your own recommendations — your vote stays locked at 1. Any edits or deletions you make here will update globally in the community feed.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* List of User's Created Items */}
      {myItems.length === 0 ? (
        <div className="py-16 text-center bg-zinc-950/40 border border-zinc-800 p-8 space-y-3">
          <Sparkles className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-semibold text-zinc-300">You haven't added any recommendations yet</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Recommend your favorite movies, anime, books, or YouTube channels to put them on the global leaderboard.
          </p>
          <button
            onClick={onOpenAddModal}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Your First Recommendation</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {myItems.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-900/60 border border-zinc-800/80 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:border-zinc-700 transition-colors"
            >
              {/* Item Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 text-zinc-400">
                    {item.category === 'other' && item.metadata?.custom_category
                      ? item.metadata.custom_category
                      : CATEGORIES.find(c => c.id === item.category)?.label || item.category}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    Locked at +1
                  </span>
                  {item.metadata?.year && (
                    <span className="text-xs font-mono text-zinc-500">{item.metadata.year}</span>
                  )}
                  {item.metadata?.author && (
                    <span className="text-xs text-zinc-400 truncate">by {item.metadata.author}</span>
                  )}
                  {item.metadata?.platform && (
                    <span className="text-xs text-zinc-500">• {item.metadata.platform}</span>
                  )}
                </div>

                <h3 className="font-semibold text-sm sm:text-base text-zinc-100 break-words line-clamp-2">
                  {item.title}
                </h3>

                {item.metadata?.note && (
                  <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed border-l-2 border-zinc-800 pl-2.5 italic">
                    "{item.metadata.note}"
                  </p>
                )}

                {getSafeExternalLink(item.metadata?.channel_link) && (
                  <a
                    href={getSafeExternalLink(item.metadata.channel_link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400/90 hover:text-emerald-300 mt-1.5"
                  >
                    <span>Visit Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Vote Count & Action Buttons */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-stretch sm:self-center justify-between sm:justify-start pt-2 sm:pt-0 border-t border-zinc-800/60 sm:border-t-0">
                {/* Vote Indicator */}
                <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2.5 sm:px-3 py-1.5 text-xs font-mono text-zinc-300">
                  <ArrowBigUp className="w-4 h-4 fill-emerald-400 stroke-emerald-400" />
                  <span className="font-bold">{item.recommend_count}</span>
                  <span className="text-zinc-500 text-[11px]">votes</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Edit Button */}
                  <button
                    onClick={() => setEditingItem(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors border border-zinc-700/60"
                    title="Edit recommendation details"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Edit</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => setDeleteConfirmItem(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-colors border border-rose-500/30"
                    title="Delete recommendation globally"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <EditRecommendationModal
        item={editingItem}
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-zinc-100">Delete Recommendation</h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to permanently delete <strong>"{deleteConfirmItem.title}"</strong>?
              This will remove it from the platform globally.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId === deleteConfirmItem.id}
                onClick={() => handleDelete(deleteConfirmItem.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {deletingId === deleteConfirmItem.id ? 'Deleting...' : 'Yes, Delete Globally'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
