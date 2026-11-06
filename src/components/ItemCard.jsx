import React from 'react'
import { ArrowBigUp, ExternalLink, Lock } from 'lucide-react'
import { useItems } from '../context/ItemContext'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES } from '../constants/categories'
import { getAvatarUrl, getSafeExternalLink } from '../lib/avatar'

// Category badge color lookup for light theme styling
function getCategoryBadgeClass(category) {
  switch (category) {
    case 'movie':
      return 'bg-amber-50 text-amber-900 border-amber-200/80'
    case 'anime':
      return 'bg-indigo-50 text-indigo-900 border-indigo-200/80'
    case 'book':
      return 'bg-emerald-50 text-emerald-900 border-emerald-200/80'
    case 'game':
      return 'bg-rose-50 text-rose-900 border-rose-200/80'
    case 'yt':
    case 'webseries':
      return 'bg-orange-50 text-orange-900 border-orange-200/80'
    case 'app':
    case 'other':
    default:
      return 'bg-stone-100 text-stone-800 border-stone-200/90'
  }
}

// Individual recommendation card showing rank, title, creator, and upvote button
export default function ItemCard({ item, rank, onSelectUser }) {
  const { userRecs, toggleRecommend } = useItems()
  const { user, signInWithGoogle } = useAuth()

  // The creator's upvote is permanently locked at +1
  const isOwner = Boolean(user?.id && item.created_by === user.id)
  const isRecommended = isOwner || userRecs.has(item.id)

  // Toggle upvote or prompt login for visitors
  const handleVote = () => {
    if (!user) {
      signInWithGoogle()
      return
    }
    if (isOwner) return
    toggleRecommend(item.id)
  }

  // Resolve display category label (including custom labels for 'other')
  const categoryObj = CATEGORIES.find(c => c.id === item.category)
  const displayCategory = item.category === 'other' && item.metadata?.custom_category
    ? item.metadata.custom_category
    : categoryObj?.label || item.category

  const formattedRank = String(rank).padStart(2, '0')
  const badgeClasses = getCategoryBadgeClass(item.category)

  return (
    <article className="group bg-white hover:bg-white border border-stone-200/90 hover:border-stone-300 rounded-2xl p-3.5 sm:p-4.5 flex items-start gap-3 sm:gap-4 shadow-xs hover:shadow-md transition-all duration-150">
      {/* Editorial Typographic Rank */}
      <div className="shrink-0 pt-0.5 select-none w-5 sm:w-6 text-right">
        <span
          className={`font-mono text-xs sm:text-sm font-bold tabular-nums tracking-tighter ${
            rank === 1
              ? 'text-amber-600 font-extrabold'
              : rank === 2
              ? 'text-stone-700 font-bold'
              : rank === 3
              ? 'text-amber-700'
              : 'text-stone-400 group-hover:text-stone-600'
          }`}
        >
          {formattedRank}
        </span>
      </div>

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Subtle Metadata Strip */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-stone-500 flex-wrap">
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeClasses}`}>
            {displayCategory}
          </span>

          {item.metadata?.year && (
            <span>{item.metadata.year}</span>
          )}

          {item.metadata?.author && (
            <span className="text-stone-500 truncate">
              by <strong className="text-stone-800 font-medium">{item.metadata.author}</strong>
            </span>
          )}

          {item.metadata?.platform && (
            <span>• {item.metadata.platform}</span>
          )}

          {item.is_private && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold">
              <Lock className="w-3 h-3 text-emerald-700" />
              <span>Private</span>
            </span>
          )}

          {isOwner && !item.is_private && (
            <span className="text-[10px] uppercase tracking-wide text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 font-semibold">
              My Rec
            </span>
          )}
        </div>

        {/* Hero Title */}
        <h3 className="font-display text-sm sm:text-base font-bold text-zinc-950 group-hover:text-[#2D6A4F] transition-colors tracking-tight leading-snug break-words">
          {item.title}
        </h3>

        {/* Recommender Note & Username */}
        {(item.metadata?.note || item.creator?.username) && (
          <div className="pt-1 flex items-baseline justify-between gap-3 flex-wrap sm:flex-nowrap">
            {item.metadata?.note ? (
              <p className="border-l-2 border-stone-200 group-hover:border-stone-300 pl-2.5 text-xs text-stone-600 italic leading-relaxed flex-1 line-clamp-2">
                "{item.metadata.note}"
              </p>
            ) : (
              <div className="flex-1" />
            )}

            {item.creator?.username && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectUser?.(item.creator)
                }}
                className="shrink-0 flex items-center gap-1.5 font-mono text-[11px] text-stone-500 hover:text-zinc-950 transition-colors cursor-pointer group/user self-end sm:self-auto"
                title={`View @${item.creator.username}'s public profile`}
              >
                <img
                  src={getAvatarUrl(item.creator.avatar_url, item.creator.display_name || item.creator.username)}
                  alt=""
                  className="w-4 h-4 object-cover border border-stone-200 rounded-full shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = getAvatarUrl(null, item.creator.display_name || item.creator.username)
                  }}
                />
                <span>
                  <span className="text-stone-400 group-hover/user:text-stone-600">@</span>
                  <span className="hover:underline text-stone-600 group-hover/user:text-zinc-950">{item.creator.username}</span>
                </span>
              </button>
            )}
          </div>
        )}

        {/* External Link */}
        {getSafeExternalLink(item.metadata?.channel_link) && (
          <div className="pt-0.5">
            <a
              href={getSafeExternalLink(item.metadata.channel_link)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-600 hover:text-[#2D6A4F] transition-colors"
            >
              <span>Visit link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Action Buttons Container (Slot for P2P Share button directly to the left of Upvote) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-center">
        {/* Tactile Upvote Button */}
        <button
          type="button"
          onClick={handleVote}
          disabled={isOwner || item.is_private}
          className={`flex flex-col items-center justify-center min-w-[2.75rem] sm:min-w-[3.25rem] w-11 sm:w-12 py-2 px-1 border transition-all duration-150 shrink-0 select-none min-h-[44px] rounded-xl cursor-pointer ${
            item.is_private
              ? 'bg-stone-100/60 border-stone-200 text-stone-400 cursor-not-allowed opacity-60'
              : isOwner
              ? 'bg-stone-100/80 border-stone-200 text-stone-500 cursor-default'
              : isRecommended
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs active:scale-95'
              : 'bg-stone-50 hover:bg-stone-100 border-stone-200 hover:border-stone-300 text-stone-600 hover:text-zinc-950 active:scale-95'
          }`}
          title={
            item.is_private
              ? 'Private items do not participate in public upvotes'
              : isOwner
              ? 'You created this recommendation (locked at +1 vote)'
              : isRecommended
              ? 'Remove recommendation'
              : 'Recommend this'
          }
        >
          <ArrowBigUp
            className={`w-5 h-5 transition-transform duration-150 ${
              isRecommended && !item.is_private ? 'fill-emerald-600 stroke-emerald-600 scale-105' : 'group-hover:text-zinc-900'
            }`}
          />
          <span className="text-xs font-mono font-bold mt-0.5 tabular-nums">
            {item.recommend_count}
          </span>
          {isOwner && !item.is_private && (
            <span className="text-[8px] font-mono text-stone-400 uppercase font-semibold leading-none mt-0.5 tracking-tighter">
              Lock
            </span>
          )}
        </button>
      </div>
    </article>
  )
}
