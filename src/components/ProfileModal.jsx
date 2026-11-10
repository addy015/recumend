import React, { useEffect, useRef } from 'react'
import { X, Award, Calendar } from 'lucide-react'
import { useItems } from '../context/ItemContext'
import { getAvatarUrl } from '../lib/avatar'
import ItemCard from './ItemCard'

// Pop-up modal displaying a user's profile details and recommendations
export default function ProfileModal({ profileData, isOpen, onClose }) {
  const { items } = useItems()
  const backdropMouseDownRef = useRef(false)

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !profileData) return null

  // Filter public recommendations created by this specific user
  const userItems = items.filter(it => !it.is_private && (
    it.created_by === profileData.id ||
    (it.creator?.username && profileData.username && it.creator.username.toLowerCase() === profileData.username.toLowerCase())
  ))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && backdropMouseDownRef.current) {
          onClose()
        }
        backdropMouseDownRef.current = false
      }}
    >
      <div
        className="w-full max-w-xl max-h-[85vh] bg-[#141414] border border-white/[0.12] rounded-2xl p-6 shadow-2xl flex flex-col space-y-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={getAvatarUrl(profileData.avatar_url, profileData.display_name || profileData.username)}
              alt={profileData.display_name}
              className="w-12 h-12 object-cover border border-white/20 rounded-full"
              onError={(e) => {
                e.currentTarget.src = getAvatarUrl(null, profileData.display_name || profileData.username)
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-white">{profileData.display_name}</h2>
                <span className="text-[11px] font-mono text-zinc-300 bg-white/[0.06] px-2 py-0.5 border border-white/[0.1] rounded-full">
                  @{profileData.username}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Stats Banner */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="p-3 bg-[#1A1A1A] border border-white/[0.08] rounded-xl flex items-center gap-3">
            <div className="p-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-zinc-400 font-mono">Curated</span>
              <p className="text-sm font-bold text-white font-mono">{userItems.length} items</p>
            </div>
          </div>
          <div className="p-3 bg-[#1A1A1A] border border-white/[0.08] rounded-xl flex items-center gap-3">
            <div className="p-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-zinc-400 font-mono">Status</span>
              <p className="text-sm font-bold text-white">Verified Curator</p>
            </div>
          </div>
        </div>

        {/* User Recommended Items Feed */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
          <h4 className="font-display text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
            Curated by @{profileData.username}
          </h4>

          {userItems.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500 font-mono">
              No recommendations created yet.
            </div>
          ) : (
            userItems.map((item) => (
              <ItemCard key={item.id} item={item} rank={null} isLeaderboard={false} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
