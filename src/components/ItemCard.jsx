import React from 'react'
import { ArrowBigUp, ExternalLink } from 'lucide-react'
import { useItems } from '../context/ItemContext'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES } from '../constants/categories'
import { getAvatarUrl, getSafeExternalLink } from '../lib/avatar'

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

  return (
    <article className="group bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 p-3.5 sm:p-4 flex items-start gap-3 sm:gap-4 transition-all duration-150">
      {/* Editorial Typographic Rank */}
      <div className="shrink-0 pt-0.5 select-none w-5 sm:w-6 text-right">
        <span
          className={`font-mono text-xs sm:text-sm font-bold tabular-nums tracking-tighter ${
            rank === 1
              ? 'text-amber-400'
              : rank === 2
              ? 'text-zinc-300'
              : rank === 3
              ? 'text-amber-600'
              : 'text-zinc-600 group-hover:text-zinc-400'
          }`}
        >
          {formattedRank}
        </span>
      </div>

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Subtle Metadata Strip */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-950 px-1.5 py-0.5 border border-zinc-800/80">
            {displayCategory}
          </span>

          {item.metadata?.year && (
            <span>{item.metadata.year}</span>
          )}

          {item.metadata?.author && (
            <span className="text-zinc-400 truncate">
              by <strong className="text-zinc-300 font-medium">{item.metadata.author}</strong>
            </span>
          )}

          {item.metadata?.platform && (
            <span>• {item.metadata.platform}</span>
          )}

          {isOwner && (
            <span className="text-[10px] uppercase tracking-wide text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 border border-emerald-500/30">
              My Rec
            </span>
          )}
        </div>

        {/* Hero Title */}
        <h3 className="text-sm sm:text-base font-semibold text-zinc-100 group-hover:text-emerald-300 transition-colors tracking-tight leading-snug break-words">
          {item.title}
        </h3>

        {/* Recommender Note & Username */}
        {(item.metadata?.note || item.creator?.username) && (
          <div className="pt-1 flex items-baseline justify-between gap-3 flex-wrap sm:flex-nowrap">
            {item.metadata?.note ? (
              <p className="border-l-2 border-zinc-800 group-hover:border-zinc-700 pl-2.5 text-xs text-zinc-400 italic leading-relaxed flex-1 line-clamp-2">
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
                className="shrink-0 flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer group/user self-end sm:self-auto"
                title={`View @${item.creator.username}'s public profile`}
              >
                <img
                  src={getAvatarUrl(item.creator.avatar_url, item.creator.display_name || item.creator.username)}
                  alt=""
                  className="w-4 h-4 object-cover border border-zinc-700 shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = getAvatarUrl(null, item.creator.display_name || item.creator.username)
                  }}
                />
                <span>
                  <span className="text-zinc-600 group-hover/user:text-emerald-500/70">@</span>
                  <span className="hover:underline text-zinc-400 group-hover/user:text-emerald-400">{item.creator.username}</span>
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
              className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400/90 hover:text-emerald-300 transition-colors"
            >
              <span>Visit link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Tactile Upvote Button */}
      <button
        onClick={handleVote}
        disabled={isOwner}
        className={`flex flex-col items-center justify-center min-w-[2.75rem] sm:min-w-[3.25rem] w-11 sm:w-12 py-2 px-1 border transition-all duration-150 shrink-0 select-none min-h-[44px] ${
          isOwner
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default'
            : isRecommended
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm active:scale-95'
            : 'bg-zinc-950/80 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 active:scale-95'
        }`}
        title={
          isOwner
            ? 'You created this recommendation (locked at +1 vote)'
            : isRecommended
            ? 'Remove recommendation'
            : 'Recommend this'
        }
      >
        <ArrowBigUp
          className={`w-5 h-5 transition-transform duration-150 ${
            isRecommended ? 'fill-emerald-400 stroke-emerald-400 scale-105' : 'group-hover:text-zinc-200'
          }`}
        />
        <span className="text-xs font-mono font-bold mt-0.5 tabular-nums">
          {item.recommend_count}
        </span>
        {isOwner && (
          <span className="text-[8px] font-mono text-emerald-400 uppercase font-semibold leading-none mt-0.5 tracking-tighter">
            Lock
          </span>
        )}
      </button>
    </article>
  )
}
