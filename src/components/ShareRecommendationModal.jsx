import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { X, Send, Users, Check, Lock, AlertCircle, Search } from 'lucide-react'
import { useFriends } from '../context/FriendContext'
import { getAvatarUrl } from '../lib/avatar'

export default function ShareRecommendationModal({ isOpen, onClose, item, onShareSuccess }) {
  const { friends, shareItem } = useFriends()
  const [selectedFriendIds, setSelectedFriendIds] = useState(new Set())
  const [personalNote, setPersonalNote] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const backdropMouseDownRef = useRef(false)

  const isPrivate = Boolean(item?.is_private)

  const handleClose = useCallback(() => {
    setSelectedFriendIds(new Set())
    setPersonalNote('')
    setSearchQuery('')
    setErrorMessage(null)
    onClose()
  }, [onClose])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  // Filter friends list by search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends
    const q = searchQuery.trim().toLowerCase()
    return friends.filter(
      (f) =>
        f.username?.toLowerCase().includes(q) ||
        f.display_name?.toLowerCase().includes(q)
    )
  }, [friends, searchQuery])

  // Selectable friends respecting private key requirements
  const validSelectableFriends = useMemo(() => {
    return filteredFriends.filter((f) => !isPrivate || Boolean(f.public_key))
  }, [filteredFriends, isPrivate])

  const isAllValidSelected = validSelectableFriends.length > 0 && validSelectableFriends.every((f) => selectedFriendIds.has(f.id))

  if (!isOpen || !item) return null

  const handleToggleFriend = (friendId, hasPublicKey) => {
    if (isPrivate && !hasPublicKey) return
    setSelectedFriendIds((prev) => {
      const next = new Set(prev)
      if (next.has(friendId)) {
        next.delete(friendId)
      } else {
        next.add(friendId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (!validSelectableFriends.length) return

    setSelectedFriendIds((prev) => {
      const next = new Set(prev)
      if (isAllValidSelected) {
        validSelectableFriends.forEach((f) => next.delete(f.id))
      } else {
        validSelectableFriends.forEach((f) => next.add(f.id))
      }
      return next
    })
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (selectedFriendIds.size === 0) {
      setErrorMessage('Please select at least one friend')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const res = await shareItem({
      item,
      recipientIds: Array.from(selectedFriendIds),
      personalNote
    })

    setIsSubmitting(false)

    if (res?.error) {
      setErrorMessage(res.error)
      return
    }

    const count = selectedFriendIds.size
    setSelectedFriendIds(new Set())
    setPersonalNote('')
    onClose()
    onShareSuccess?.({
      count,
      itemTitle: item.title,
      isPrivate
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && backdropMouseDownRef.current) {
          handleClose()
        }
        backdropMouseDownRef.current = false
      }}
    >
      <div
        className="w-full max-w-md max-h-[90vh] flex flex-col bg-[#141414] border border-white/[0.12] rounded-2xl shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl text-white">
              <Send className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white tracking-tight">
                Share Recommendation
              </h2>
              <p className="text-[11px] font-mono text-zinc-400">
                {isPrivate ? 'End-to-End Encrypted Private Share' : 'Direct Peer Share'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item Preview Card */}
        <div className="p-4 sm:p-5 pb-3 border-b border-white/[0.06] bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
              {item.category}
            </span>
            {isPrivate && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                <Lock className="w-2.5 h-2.5" />
                <span>E2EE Private</span>
              </span>
            )}
          </div>
          <h3 className="font-display font-bold text-sm sm:text-base text-white truncate">
            {item.title}
          </h3>
        </div>

        {/* Scrollable Friend Selection Body */}
        <form onSubmit={handleSend} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Optional Personal Note */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Personal Note <span className="text-zinc-500 font-mono text-[11px]">(Optional)</span>
            </label>
            <textarea
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              placeholder="Why you think they'll love this..."
              rows={2}
              maxLength={280}
              className="w-full bg-[#1b1b1b] border border-white/10 px-3 py-2 text-xs text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-amber-400/50 transition-colors resize-none"
            />
          </div>

          {/* Friends Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                <span>Select Friends ({selectedFriendIds.size})</span>
              </label>

              {filteredFriends.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-mono text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  {isAllValidSelected ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {/* Friend Filter Input */}
            {friends.length > 4 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter friends..."
                  className="w-full bg-[#1b1b1b] border border-white/10 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-white/20"
                />
              </div>
            )}

            {/* Friends List */}
            {friends.length === 0 ? (
              <div className="p-6 text-center bg-white/[0.02] border border-white/[0.08] rounded-xl space-y-2">
                <Users className="w-6 h-6 text-zinc-500 mx-auto" />
                <p className="text-xs font-semibold text-zinc-300">No friends added yet</p>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Add friends using their @username to share recommendations directly with them.
                </p>
              </div>
            ) : filteredFriends.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">No matching friends found.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {filteredFriends.map((friend) => {
                  const isSelected = selectedFriendIds.has(friend.id)
                  const hasPublicKey = Boolean(friend.public_key)
                  const isDisabled = isPrivate && !hasPublicKey

                  return (
                    <div
                      key={friend.id}
                      onClick={() => handleToggleFriend(friend.id, hasPublicKey)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isDisabled
                          ? 'opacity-40 bg-white/[0.01] border-white/[0.04] cursor-not-allowed'
                          : isSelected
                          ? 'bg-amber-400/15 border-amber-400/40 text-white'
                          : 'bg-[#181818] hover:bg-white/[0.06] border-white/[0.08] text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={getAvatarUrl(friend.avatar_url, friend.display_name || friend.username)}
                          alt={friend.display_name}
                          className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = getAvatarUrl(null, friend.display_name || friend.username)
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate leading-tight">
                            {friend.display_name}
                          </p>
                          <p className="text-[10px] font-mono text-zinc-400 truncate">
                            @{friend.username}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isDisabled && (
                          <span className="text-[10px] font-mono text-amber-400/80">
                            No P2P key
                          </span>
                        )}
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-amber-400 border-amber-400 text-black'
                              : 'border-white/20 bg-black/40'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Footer */}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedFriendIds.size === 0}
              className="px-4 py-2 text-xs font-semibold bg-white hover:bg-zinc-200 text-black rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Sharing...' : `Share (${selectedFriendIds.size})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
