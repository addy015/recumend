import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, Share2, Award, Check, UserPlus, UserCheck, Loader2, Clock, Download, FileText } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useItems } from '../context/ItemContext'
import { useFriends } from '../context/FriendContext'
import { getAvatarUrl } from '../lib/avatar'
import { KNOWN_USERS } from '../constants/knownUsers'
import { downloadRecsText, printRecsAsPdf } from '../lib/exportUtils'
import ItemCard from './ItemCard'

// Public user profile page showing curated recommendations for /u/:username
export default function UserProfileView({ username, onBack, onSelectUser, onOpenShare, onToast }) {
  const { user, signInWithGoogle } = useAuth()
  const { items } = useItems()
  const {
    friends = [],
    incomingRequests = [],
    outgoingRequests = [],
    sendFriendRequest,
    acceptFriendRequest,
    cancelFriendRequest,
    addFriend
  } = useFriends() || {}

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [isAddingFriend, setIsAddingFriend] = useState(false)
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false)
  const downloadMenuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setIsDownloadMenuOpen(false)
      }
    }
    if (isDownloadMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDownloadMenuOpen])

  const itemsRef = React.useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // Clean username handle (strip leading @)
  const cleanUsername = String(username || '').replace(/^@/, '').trim()

  // Fetch target user's profile information
  useEffect(() => {
    async function loadUserProfile() {
      setLoading(true)
      setError(null)

      try {
        if (!isSupabaseConfigured) {
          // Demo fallback: search in items
          const found = itemsRef.current.find(
            it => it.creator?.username?.toLowerCase() === cleanUsername.toLowerCase()
          )
          if (found?.creator) {
            setProfile(found.creator)
          } else {
            const known = Object.values(KNOWN_USERS || {}).find(
              u => u.username?.toLowerCase() === cleanUsername.toLowerCase()
            )
            if (known) {
              setProfile({ ...known, public_key: null })
            } else {
              setProfile({
                id: 'demo-user',
                username: cleanUsername,
                display_name: cleanUsername.toUpperCase(),
                app_uid: `u_${cleanUsername.slice(0, 6)}`,
                avatar_url: null,
                public_key: null
              })
            }
          }
          setLoading(false)
          return
        }

        // Fetch from Supabase
        const { data, error: err } = await supabase
          .from('profiles')
          .select('id, app_uid, username, display_name, avatar_url, public_key, created_at')
          .eq('username', cleanUsername)
          .maybeSingle()

        if (err) throw err
        if (!data) {
          setError(`User @${cleanUsername} not found`)
        } else {
          setProfile(data)
        }
      } catch (err) {
        console.error('Failed to load profile:', err)
        setError('Failed to load user profile')
      } finally {
        setLoading(false)
      }
    }

    if (cleanUsername) {
      loadUserProfile()
    }
  }, [cleanUsername])

  // Get all public items created by or attributed to this user (strictly excluding private vault items)
  // Sorted strictly by newest first (created_at DESC, id tie-breaker)
  const userItems = useMemo(() => {
    if (!profile) return []
    return items
      .filter((it) => {
        if (it.is_private) return false
        return (
          it.created_by === profile.id ||
          it.creator?.username?.toLowerCase() === profile.username?.toLowerCase()
        )
      })
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        if (dateB !== dateA) return dateB - dateA
        return String(a.id || '').localeCompare(String(b.id || ''))
      })
  }, [items, profile])

  const isOwnProfile = Boolean(user?.id && profile?.id && user.id === profile.id)
  const isFriend = Boolean(profile?.id && friends.some((f) => f.id === profile.id))
  const incomingReq = incomingRequests.find((r) => r.id === profile?.id)
  const outgoingReq = outgoingRequests.find((r) => r.id === profile?.id)

  const handleSendFriendRequest = async () => {
    if (!user) {
      signInWithGoogle()
      return
    }
    if (!profile?.id) return

    setIsAddingFriend(true)
    try {
      const res = await (sendFriendRequest || addFriend)(profile)
      if (res?.error) {
        onToast?.({ message: res.error })
      } else {
        onToast?.({ message: `Friend request sent to @${profile.username}!` })
      }
    } catch (err) {
      onToast?.({ message: err.message || 'Failed to send friend request' })
    } finally {
      setIsAddingFriend(false)
    }
  }

  const handleAcceptRequest = async () => {
    if (!incomingReq) return
    const reqId = incomingReq.requestId || incomingReq.id
    setIsAddingFriend(true)
    try {
      const res = await acceptFriendRequest(reqId)
      if (res?.error) {
        onToast?.({ message: res.error })
      } else {
        onToast?.({ message: `Connected with @${profile.username}!` })
      }
    } catch (err) {
      onToast?.({ message: err.message || 'Failed to accept friend request' })
    } finally {
      setIsAddingFriend(false)
    }
  }

  const handleCancelRequest = async () => {
    if (!outgoingReq) return
    const reqId = outgoingReq.requestId || outgoingReq.id
    setIsAddingFriend(true)
    try {
      const res = await cancelFriendRequest(reqId)
      if (res?.error) {
        onToast?.({ message: res.error })
      } else {
        onToast?.({ message: `Cancelled request to @${profile.username}` })
      }
    } catch (err) {
      onToast?.({ message: err.message || 'Failed to cancel friend request' })
    } finally {
      setIsAddingFriend(false)
    }
  }

  // Copy current profile URL to clipboard
  const handleShare = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      setCopied(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>
        <div className="p-12 text-center text-xs font-mono text-zinc-400 border border-white/[0.08] bg-[#141414] rounded-2xl shadow-sm">
          Loading @{cleanUsername || username}'s profile...
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-mono text-stone-400 hover:text-white transition-colors cursor-pointer min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>
        <div className="p-12 text-center text-xs font-mono text-zinc-400 border border-white/[0.08] bg-[#141414] rounded-2xl space-y-4">
          <p className="text-rose-400 font-semibold text-sm">{error || 'User not found'}</p>
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 bg-white text-black font-semibold text-xs rounded-full transition-all cursor-pointer min-h-[40px]"
          >
            Return to Leaderboard
          </button>
        </div>
      </div>
    )
  }

  const joinDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Recently'

  return (
    <div className="space-y-6">
      {/* Navigation bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>

        <div className="flex items-center gap-2">
          {!isOwnProfile && (
            isFriend ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-mono font-semibold min-h-[40px]">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Friends</span>
              </span>
            ) : incomingReq ? (
              <button
                type="button"
                disabled={isAddingFriend}
                onClick={handleAcceptRequest}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full text-xs font-semibold font-body transition-all cursor-pointer min-h-[40px] shadow-sm active:scale-95 disabled:opacity-50"
                aria-label={`Accept friend request from @${profile.username}`}
              >
                {isAddingFriend ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
                <span>Accept Request</span>
              </button>
            ) : outgoingReq ? (
              <button
                type="button"
                disabled={isAddingFriend}
                onClick={handleCancelRequest}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 border border-white/10 rounded-full text-xs font-mono transition-all cursor-pointer min-h-[40px] shadow-sm active:scale-95 disabled:opacity-50 group/req"
                aria-label="Cancel friend request"
              >
                {isAddingFriend ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className="group-hover/req:hidden">Request Sent</span>
                <span className="hidden group-hover/req:inline text-rose-300">Cancel Request</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isAddingFriend}
                onClick={handleSendFriendRequest}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-full text-xs font-semibold font-body transition-all cursor-pointer min-h-[40px] shadow-sm active:scale-95 disabled:opacity-50"
                aria-label={`Add @${profile.username} as friend`}
              >
                {isAddingFriend ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                <span>{isAddingFriend ? "Sending..." : "Add Friend"}</span>
              </button>
            )
          )}

          {/* Download Recs Button & Menu */}
          <div className="relative" ref={downloadMenuRef}>
            <button
              type="button"
              disabled={userItems.length === 0}
              onClick={() => setIsDownloadMenuOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] rounded-full text-xs font-mono text-zinc-200 transition-colors cursor-pointer min-h-[40px] disabled:opacity-40"
              aria-label="Download public recommendations"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Download Recs</span>
            </button>

            {isDownloadMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#141414] border border-white/[0.12] p-1.5 shadow-2xl rounded-2xl z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={async () => {
                    setIsDownloadMenuOpen(false)
                    const res = await printRecsAsPdf({ userProfile: profile, items: userItems })
                    onToast?.({
                      message: res?.savedToDocuments
                        ? `Downloaded ${res.filename} to Documents`
                        : `Downloaded ${userItems.length} recommendations as .pdf`
                    })
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>PDF Sheet (.pdf)</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsDownloadMenuOpen(false)
                    const res = await downloadRecsText({ userProfile: profile, items: userItems })
                    onToast?.({
                      message: res?.savedToDocuments
                        ? `Downloaded ${res.filename} to Documents`
                        : `Downloaded ${userItems.length} recommendations as .txt`
                    })
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <span>Plain Text (.txt)</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] rounded-full text-xs font-mono text-zinc-200 transition-colors cursor-pointer min-h-[40px]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Share Profile</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Profile Header Banner */}
      <div className="bg-[#141414]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4.5 min-w-0">
            <img
              src={getAvatarUrl(profile.avatar_url, profile.display_name || profile.username)}
              alt={profile.display_name}
              className="w-14 h-14 sm:w-16 sm:h-16 object-cover border border-white/20 rounded-full shrink-0"
              onError={(e) => {
                e.currentTarget.src = getAvatarUrl(null, profile.display_name || profile.username)
              }}
            />
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                  {profile.display_name}
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/[0.1] font-semibold">
                  @{profile.username}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono">
                Verified Curator
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:gap-3 shrink-0 w-full sm:w-auto">
            <div className="px-4 py-2.5 bg-[#1C1C1C] border border-white/[0.08] rounded-xl text-center sm:text-right">
              <span className="block text-[10px] font-mono text-zinc-500 uppercase">Recommendations</span>
              <span className="text-base sm:text-lg font-mono font-bold text-white">{userItems.length}</span>
            </div>
            <div className="px-4 py-2.5 bg-[#1C1C1C] border border-white/[0.08] rounded-xl text-center sm:text-right">
              <span className="block text-[10px] font-mono text-zinc-500 uppercase">Joined</span>
              <span className="text-xs font-mono font-medium text-zinc-300">{joinDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User's Recommendations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
            <Award className="w-4 h-4 text-zinc-400" />
            Curated by @{profile.username}
          </h2>
          <span className="text-xs font-mono text-zinc-500">
            {userItems.length} items
          </span>
        </div>

        {userItems.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-zinc-300 border border-white/[0.08] bg-[#141414]/92 rounded-2xl">
            No public recommendations created by @{profile.username} yet.
          </div>
        ) : (
          <div className="space-y-3">
            {userItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                rank={null}
                isLeaderboard={false}
                onSelectUser={onSelectUser}
                onOpenShare={onOpenShare}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
