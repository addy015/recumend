import React, { useState, useEffect } from 'react'
import { ArrowLeft, Share2, Award, Check } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useItems } from '../context/ItemContext'
import { getAvatarUrl } from '../lib/avatar'
import ItemCard from './ItemCard'

// Public user profile page showing curated recommendations for #/u/:username
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
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>
        <div className="p-8 text-center text-xs font-mono text-zinc-500 border border-zinc-800 bg-zinc-900/40">
          Loading @{username}'s profile...
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>
        <div className="p-8 text-center text-xs font-mono text-zinc-400 border border-zinc-800 bg-zinc-900/40 space-y-3">
          <p className="text-rose-400 font-semibold">{error || 'User not found'}</p>
          <button
            onClick={onBack}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition-colors"
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
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Community Feed</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Link Copied!</span>
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
      <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <img
              src={getAvatarUrl(profile.avatar_url, profile.display_name || profile.username)}
              alt={profile.display_name}
              className="w-12 h-12 sm:w-14 sm:h-14 object-cover border border-zinc-700 shrink-0"
              onError={(e) => {
                e.currentTarget.src = getAvatarUrl(null, profile.display_name || profile.username)
              }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  {profile.display_name}
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 bg-zinc-950 text-emerald-400 border border-emerald-500/30">
                  @{profile.username}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 shrink-0 w-full sm:w-auto">
            <div className="px-3.5 py-2 bg-zinc-950 border border-zinc-800 text-center sm:text-right">
              <span className="block text-[10px] font-mono text-zinc-500 uppercase">Recommendations</span>
              <span className="text-sm sm:text-base font-mono font-bold text-emerald-400">{userItems.length}</span>
            </div>
            <div className="px-3.5 py-2 bg-zinc-950 border border-zinc-800 text-center sm:text-right">
              <span className="block text-[10px] font-mono text-zinc-500 uppercase">Joined</span>
              <span className="text-xs font-mono font-medium text-zinc-300">{joinDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User's Recommendations Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 font-mono flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            Curated by @{profile.username}
          </h2>
          <span className="text-xs font-mono text-zinc-500">
            {userItems.length} items
          </span>
        </div>

        {userItems.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-zinc-500 border border-zinc-800 bg-zinc-900/30">
            No public recommendations created by @{profile.username} yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {userItems.map((item, idx) => (
              <ItemCard
                key={item.id}
                item={item}
                rank={idx + 1}
                onSelectUser={onSelectUser}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
