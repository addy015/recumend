import React from 'react'
import { ArrowBigUp, ExternalLink, Lock } from 'lucide-react'
import { useItems } from '../context/ItemContext'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES, getCategoryBadgeClass } from '../constants/categories'
import { getAvatarUrl, getSafeExternalLink } from '../lib/avatar'

// Individual recommendation card showing rank (in leaderboard), title, creator, and upvote button
export default function ItemCard({ item, rank = null, onSelectUser, isLeaderboard = false }) {
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

  const formattedRank = rank ? String(rank).padStart(2, '0') : null

  return (
    <article
      className={`group rounded-2xl p-4 sm:p-5 flex items-start gap-4 transition-all duration-150 shadow-sm taste-card ${
        isLeaderboard && rank === 1
          ? 'bg-gradient-to-r from-rose-950/40 via-[#141414] to-[#121212] border border-rose-500/30 hover:border-rose-500/50'
          : isLeaderboard && rank === 2
          ? 'bg-gradient-to-r from-slate-900/50 via-[#131416] to-[#121212] border border-slate-400/25 hover:border-slate-300/40'
          : isLeaderboard && rank === 3
          ? 'bg-gradient-to-r from-amber-950/35 via-[#141312] to-[#121212] border border-amber-700/25 hover:border-amber-600/35'
          : 'bg-[#121212]/92 hover:bg-[#161616] border border-white/[0.08] hover:border-white/[0.18]'
      }`}
    >
      {formattedRank && (
        <div className="shrink-0 pt-0.5 select-none w-6 sm:w-7 text-right">
          <span
            className={`font-mono text-xs sm:text-sm tabular-nums tracking-tighter ${
              isLeaderboard && rank === 1
                ? 'text-amber-400 font-black drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]'
                : isLeaderboard && rank === 2
                ? 'text-slate-200 font-extrabold'
                : isLeaderboard && rank === 3
                ? 'text-amber-600 font-bold'
                : 'text-zinc-600 font-medium group-hover:text-zinc-400'
            }`}
          >
            {formattedRank}
          </span>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Minimal Metadata Strip */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 flex-wrap">
          <span
            className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(
              item.category
            )}`}
          >
            {displayCategory}
          </span>

          {item.metadata?.year && (
            <span>{item.metadata.year}</span>
          )}

          {item.metadata?.author && (
            <span className="truncate">
              by <strong className="text-zinc-300 font-medium">{item.metadata.author}</strong>
            </span>
          )}

          {item.metadata?.platform && (
            <span>• {item.metadata.platform}</span>
          )}

          {item.is_private && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Vault</span>
            </span>
          )}

          {isOwner && !item.is_private && (
            <span className="text-[10px] uppercase tracking-wide text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/25">
              My Rec
            </span>
          )}
        </div>

        {/* Hero Title */}
        <h3 className="font-display text-sm sm:text-base font-bold text-white group-hover:text-white transition-colors tracking-tight leading-snug break-words">
          {item.title}
        </h3>

        {/* Recommender Note & Username */}
        {(item.metadata?.note || item.creator?.username) && (
          <div className="pt-1 flex items-baseline justify-between gap-3 flex-wrap sm:flex-nowrap">
            {item.metadata?.note ? (
              <p className="border-l-2 border-amber-400/40 pl-2.5 text-xs text-zinc-300 italic leading-relaxed flex-1 line-clamp-2">
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
                className="shrink-0 flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 hover:text-white transition-colors cursor-pointer group/user self-end sm:self-auto min-h-[30px]"
                title={`View @${item.creator.username}'s public profile`}
              >
                <img
                  src={getAvatarUrl(item.creator.avatar_url, item.creator.display_name || item.creator.username)}
                  alt=""
                  className="w-4 h-4 object-cover rounded-full shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = getAvatarUrl(null, item.creator.display_name || item.creator.username)
                  }}
                />
                <span>
                  <span className="text-zinc-600">@</span>
                  <span className="hover:underline text-zinc-400 group-hover/user:text-white">{item.creator.username}</span>
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
              className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-white transition-colors"
            >
              <span>Visit link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Action Buttons Container */}
      <div className="flex items-center gap-2 shrink-0 self-center">
        {/* Tactile Inversion / Golden Accent Upvote Button */}
        <button
          type="button"
          onClick={handleVote}
          disabled={isOwner || item.is_private}
          className={`flex flex-col items-center justify-center min-w-[2.75rem] sm:min-w-[3.25rem] w-11 sm:w-12 py-2 px-1 border transition-all duration-150 shrink-0 select-none min-h-[46px] rounded-xl cursor-pointer ${
            item.is_private
              ? 'bg-white/[0.02] border-white/[0.04] text-zinc-600 cursor-not-allowed opacity-40'
              : isOwner
              ? 'bg-amber-400/10 border-amber-400/25 text-amber-300 cursor-default'
              : isRecommended
              ? 'bg-amber-400 text-black border-amber-400 active:scale-95 shadow-[0_0_16px_rgba(251,191,36,0.22)]'
              : 'bg-[#151515] hover:bg-amber-400/10 border-white/[0.1] hover:border-amber-400/30 text-zinc-400 hover:text-amber-300 active:scale-95'
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
          aria-label={
            item.is_private
              ? 'Private item'
              : isOwner
              ? 'Created by you (locked)'
              : isRecommended
              ? 'Remove recommendation'
              : 'Upvote recommendation'
          }
        >
          <ArrowBigUp
            className={`w-5 h-5 transition-transform duration-150 ${
              isRecommended && !item.is_private
                ? 'fill-black stroke-black scale-105'
                : isOwner
                ? 'fill-amber-400 stroke-amber-400'
                : 'text-zinc-400 group-hover:text-amber-300'
            }`}
          />
          <span
            className={`text-xs font-mono font-bold mt-0.5 tabular-nums ${
              isRecommended && !item.is_private
                ? 'text-black'
                : isOwner
                ? 'text-amber-300'
                : 'text-zinc-300 group-hover:text-amber-200'
            }`}
          >
            {item.recommend_count}
          </span>
          {isOwner && !item.is_private && (
            <span className="text-[8px] font-mono text-amber-400/90 uppercase font-semibold leading-none mt-0.5 tracking-tighter">
              Lock
            </span>
          )}
        </button>
      </div>
    </article>
  )
}
