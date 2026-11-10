import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  X,
  Users,
  UserPlus,
  UserCheck,
  Trash2,
  Search,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Clock,
  Check
} from 'lucide-react'
import { useFriends } from '../context/FriendContext'
import { useAuth } from '../context/AuthContext'
import { getAvatarUrl } from '../lib/avatar'

export default function FriendsModal({ isOpen, onClose, onToast }) {
  const { user } = useAuth()
  const {
    friends,
    incomingRequests = [],
    outgoingRequests = [],
    loadingFriends,
    searchUserByUsername,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend
  } = useFriends()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const backdropMouseDownRef = useRef(false)

  const handleClose = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setErrorMessage(null)
    setActionLoadingId(null)
    onClose()
  }, [onClose])

  const handleSearchChange = (val) => {
    setSearchQuery(val)
    const q = val.trim().replace(/^@/, '')
    if (q.length < 2) {
      setSearchResults([])
      setIsSearching(false)
    } else {
      setIsSearching(true)
    }
  }

  // Debounced search for @username
  useEffect(() => {
    const q = searchQuery.trim().replace(/^@/, '')
    if (!q || q.length < 2) {
      return
    }

    let isCurrent = true
    const timer = setTimeout(async () => {
      try {
        const results = await searchUserByUsername(q)
        if (isCurrent) {
          setSearchResults(results)
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        if (isCurrent) {
          setIsSearching(false)
        }
      }
    }, 250)

    return () => {
      isCurrent = false
      clearTimeout(timer)
    }
  }, [searchQuery, searchUserByUsername])

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends])

  const handleSendFriendRequest = async (targetUser) => {
    setActionLoadingId(targetUser.id)
    setErrorMessage(null)
    try {
      const res = await sendFriendRequest(targetUser)
      if (res?.error) {
        setErrorMessage(res.error)
      } else {
        onToast?.({
          message: `Friend request sent to @${targetUser.username}!`
        })
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send friend request')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleAcceptRequest = async (req) => {
    const reqId = req.requestId || req.friendshipId || req.id
    setActionLoadingId(reqId)
    setErrorMessage(null)
    try {
      const res = await acceptFriendRequest(reqId)
      if (res?.error) {
        setErrorMessage(res.error)
      } else {
        onToast?.({
          message: `Connected with @${req.username || req.sender?.username}!`
        })
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to accept friend request')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeclineRequest = async (req) => {
    const reqId = req.requestId || req.friendshipId || req.id
    setActionLoadingId(reqId)
    setErrorMessage(null)
    try {
      const res = await declineFriendRequest(reqId)
      if (res?.error) {
        setErrorMessage(res.error)
      } else {
        onToast?.({
          message: `Declined request from @${req.username || req.sender?.username}`
        })
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to decline friend request')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleCancelRequest = async (req) => {
    const reqId = req.requestId || req.friendshipId || req.id
    setActionLoadingId(reqId)
    setErrorMessage(null)
    try {
      const res = await cancelFriendRequest(reqId)
      if (res?.error) {
        setErrorMessage(res.error)
      } else {
        onToast?.({
          message: `Cancelled friend request to @${req.username || req.recipient?.username}`
        })
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to cancel friend request')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRemoveFriend = async (friend) => {
    setActionLoadingId(friend.id)
    setErrorMessage(null)
    try {
      const res = await removeFriend(friend.id)
      if (res?.error) {
        setErrorMessage(res.error)
      } else {
        onToast?.({
          message: `Removed @${friend.username} from friends`
        })
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to remove friend')
    } finally {
      setActionLoadingId(null)
    }
  }

  if (!isOpen) return null

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
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl text-white">
              <Users className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white tracking-tight">
                Friends & Connections
              </h2>
              <p className="text-[11px] font-mono text-zinc-400">
                Share taste directly with your inner circle
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search input for adding friends */}
        <div className="p-4 border-b border-white/[0.06] shrink-0 space-y-2">
          <label htmlFor="friend-search-input" className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Find Curators by @username
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="friend-search-input"
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="e.g. @kanehito or username..."
              className="w-full bg-[#1e1e1e] border border-white/[0.1] pl-9 pr-8 py-2 text-xs text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30 transition-all font-mono"
            />
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 hover:text-white font-mono cursor-pointer"
              >
                esc
              </button>
            ) : null}
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-2 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-300 text-xs font-mono">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span className="truncate">{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Content body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 divide-y divide-white/[0.06]">
          {/* Section 1: Search Results (if querying) */}
          {searchQuery.trim().replace(/^@/, '').length >= 2 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                <span>Search Results</span>
                <span>{searchResults.length} found</span>
              </div>

              {isSearching ? (
                <div className="py-6 flex items-center justify-center gap-2 text-zinc-500 font-mono text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                  <span>Searching curators...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 font-mono">
                  No users found matching "{searchQuery}"
                </div>
              ) : (
                <div className="space-y-1.5">
                  {searchResults.map((u) => {
                    const isSelf = u.id === user?.id
                    const isAlreadyFriend = friendIds.has(u.id)
                    const isLoading = actionLoadingId === u.id

                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] rounded-xl transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <img
                            src={getAvatarUrl(u.avatar_url, u.display_name || u.username)}
                            alt={u.display_name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                            onError={(e) => {
                              e.currentTarget.src = getAvatarUrl(null, u.display_name || u.username)
                            }}
                          />
                          <div className="min-w-0 truncate">
                            <p className="text-xs font-medium text-white truncate">
                              {u.display_name || u.username}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-mono text-zinc-400">
                                @{u.username}
                              </span>
                              {u.public_key && (
                                <span className="inline-flex items-center text-[10px] text-emerald-400 font-mono" title="E2EE Ready">
                                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isSelf ? (
                            <span className="text-[10px] font-mono text-zinc-500 px-2 py-1 bg-white/5 rounded-md">
                              You
                            </span>
                          ) : isAlreadyFriend ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                              <UserCheck className="w-3 h-3" />
                              <span>Friends</span>
                            </span>
                          ) : u.isIncomingPending ? (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleAcceptRequest({ requestId: u.requestId, username: u.username })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 min-h-[32px]"
                            >
                              {isLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin text-black" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              <span>Accept</span>
                            </button>
                          ) : u.isOutgoingPending ? (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleCancelRequest({ requestId: u.requestId, username: u.username })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 border border-white/10 text-xs font-mono rounded-lg transition-colors cursor-pointer disabled:opacity-50 group/btn min-h-[32px]"
                              title="Click to cancel pending friend request"
                            >
                              {isLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin text-white" />
                              ) : (
                                <Clock className="w-3 h-3 text-amber-400" />
                              )}
                              <span className="group-hover/btn:hidden">Requested</span>
                              <span className="hidden group-hover/btn:inline text-rose-300">Cancel</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleSendFriendRequest(u)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-black hover:bg-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 min-h-[32px]"
                            >
                              {isLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin text-black" />
                              ) : (
                                <UserPlus className="w-3 h-3" />
                              )}
                              <span>Add Friend</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Incoming Friend Requests (Awaiting your approval) */}
          {incomingRequests.length > 0 && (
            <div className={`space-y-2.5 ${searchQuery.trim().length >= 2 ? 'pt-4' : ''}`}>
              <div className="flex items-center justify-between text-[11px] font-mono text-amber-300 uppercase tracking-wider font-semibold">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Friend Requests ({incomingRequests.length})
                </span>
                <span className="text-[10px] text-zinc-500 normal-case font-mono">Needs your response</span>
              </div>

              <div className="space-y-2">
                {incomingRequests.map((req) => {
                  const reqId = req.requestId || req.id
                  const isLoading = actionLoadingId === reqId

                  return (
                    <div
                      key={reqId}
                      className="flex items-center justify-between p-2.5 bg-amber-400/[0.04] hover:bg-amber-400/[0.07] border border-amber-400/20 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <img
                          src={getAvatarUrl(req.avatar_url, req.display_name || req.username)}
                          alt={req.display_name}
                          className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                          onError={(e) => {
                            e.currentTarget.src = getAvatarUrl(null, req.display_name || req.username)
                          }}
                        />
                        <div className="min-w-0 truncate">
                          <p className="text-xs font-medium text-white truncate">
                            {req.display_name || req.username}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono text-zinc-400">
                              @{req.username}
                            </span>
                            {req.public_key && (
                              <span className="inline-flex items-center text-[10px] text-emerald-400 font-mono" title="E2EE Ready">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleAcceptRequest(req)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 min-h-[32px]"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin text-black" />
                          ) : (
                            <Check className="w-3 h-3 stroke-[3]" />
                          )}
                          <span>Accept</span>
                        </button>

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleDeclineRequest(req)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/20 disabled:opacity-50"
                          title="Decline friend request"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Section 3: Pending Outgoing Requests */}
          {outgoingRequests.length > 0 && searchQuery.trim().length < 2 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                <span>Sent Requests ({outgoingRequests.length})</span>
                <span className="text-[10px] text-zinc-600 normal-case">Waiting for approval</span>
              </div>
              <div className="space-y-1.5">
                {outgoingRequests.map((req) => {
                  const reqId = req.requestId || req.id
                  const isLoading = actionLoadingId === reqId

                  return (
                    <div
                      key={reqId}
                      className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/[0.06] rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <img
                          src={getAvatarUrl(req.avatar_url, req.display_name || req.username)}
                          alt={req.display_name}
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10"
                          onError={(e) => {
                            e.currentTarget.src = getAvatarUrl(null, req.display_name || req.username)
                          }}
                        />
                        <div className="min-w-0 truncate">
                          <span className="text-zinc-300 font-mono">@{req.username}</span>
                          <span className="text-[10px] text-zinc-500 font-mono ml-2">Pending</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleCancelRequest(req)}
                        className="text-[11px] font-mono text-zinc-400 hover:text-rose-400 px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Section 4: Current Friends List */}
          <div className={`space-y-2.5 ${(searchQuery.trim().length >= 2 || incomingRequests.length > 0) ? 'pt-4' : ''}`}>
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              <span>Your Friends</span>
              <span className="text-zinc-500">
                {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
              </span>
            </div>

            {loadingFriends ? (
              <div className="py-8 flex items-center justify-center gap-2 text-zinc-500 font-mono text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                <span>Loading your friends...</span>
              </div>
            ) : friends.length === 0 ? (
              <div className="py-8 text-center bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-2">
                <Users className="w-6 h-6 text-zinc-600 mx-auto" />
                <p className="text-xs font-semibold text-zinc-300">
                  No friends added yet
                </p>
                <p className="text-[11px] font-mono text-zinc-500 max-w-xs mx-auto">
                  Type a curator's @username above to connect and start exchanging recommendations.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {friends.map((friend) => {
                  const isLoading = actionLoadingId === friend.id

                  return (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-2.5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <img
                          src={getAvatarUrl(friend.avatar_url, friend.display_name || friend.username)}
                          alt={friend.display_name}
                          className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                          onError={(e) => {
                            e.currentTarget.src = getAvatarUrl(null, friend.display_name || friend.username)
                          }}
                        />
                        <div className="min-w-0 truncate">
                          <p className="text-xs font-medium text-white truncate">
                            {friend.display_name || friend.username}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono text-zinc-400">
                              @{friend.username}
                            </span>
                            {friend.public_key ? (
                              <span
                                className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20"
                                title="Zero-knowledge E2EE ready"
                              >
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                                <span>E2EE</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[9px] font-mono text-zinc-500 bg-white/5 px-1.5 py-0.2 rounded"
                                title="Public recommendations only until user signs in"
                              >
                                <span>Public only</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleRemoveFriend(friend)}
                          className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/20 disabled:opacity-40"
                          title="Remove from friends"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0f0f0f] border-t border-white/[0.08] text-center shrink-0">
          <p className="text-[10px] font-mono text-zinc-500">
            End-to-End Encrypted via ECDH P-256 • Zero-Knowledge
          </p>
        </div>
      </div>
    </div>
  )
}
