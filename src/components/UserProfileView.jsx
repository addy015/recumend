import React, { useState, useEffect } from 'react'
import { ArrowLeft, Share2, Award, Check } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useItems } from '../context/ItemContext'
import { getAvatarUrl } from '../lib/avatar'
import ItemCard from './ItemCard'

// Public user profile page showing curated recommendations for /u/:username
export default function UserProfileView({ username, onBack, onSelectUser }) {
  const { items } = useItems()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const itemsRef = React.useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // Fetch target user's profile information
  useEffect(() => {
    async function loadUserProfile() {
      setLoading(true)
      setError(null)

      try {
        if (!isSupabaseConfigured) {
          // Demo fallback: search in items
          const found = itemsRef.current.find(it => it.creator?.username === username)
          if (found?.creator) {
            setProfile(found.creator)
          } else {
            setProfile({
              id: 'demo-user',
              username: username,
              display_name: username.toUpperCase(),
              app_uid: `u_${username.slice(0, 6)}`,
              avatar_url: null
            })
          }
          setLoading(false)
          return
        }

        // Fetch from Supabase
        const { data, error: err } = await supabase
          .from('profiles')
          .select('id, app_uid, username, display_name, avatar_url, created_at')
          .eq('username', username)
          .maybeSingle()

        if (err) throw err
        if (!data) {
          setError(`User @${username} not found`)
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

    if (username) {
      loadUserProfile()
    }
  }, [username])

  // Get all items created by or attributed to this user
  const userItems = items.filter(it => {
    if (!profile) return false
    return it.created_by === profile.id || it.creator?.username === profile.username
  })

  // Copy current profile URL to clipboard
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
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
        <div className="p-12 text-center text-xs font-mono text-stone-400 border border-white/[0.08] bg-[#11141D] rounded-2xl shadow-card">
          Loading @{username}'s profile...
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
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>

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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
