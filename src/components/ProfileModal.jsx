import React from 'react'
import { X, Award, Calendar } from 'lucide-react'
import { useItems } from '../context/ItemContext'
import { getAvatarUrl } from '../lib/avatar'
import ItemCard from './ItemCard'

// Pop-up modal displaying a user's profile details and recommendations
export default function ProfileModal({ profileData, isOpen, onClose }) {
  const { items } = useItems()

  if (!isOpen || !profileData) return null

  // Filter recommendations created by this specific user
  const userItems = items.filter(it => it.created_by === profileData.id || it.creator?.username === profileData.username)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="w-full max-w-xl max-h-[85vh] bg-white border border-stone-200 rounded-2xl p-6 shadow-2xl flex flex-col space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={getAvatarUrl(profileData.avatar_url, profileData.display_name || profileData.username)}
              alt={profileData.display_name}
              className="w-12 h-12 object-cover border border-stone-200 rounded-full"
              onError={(e) => {
                e.currentTarget.src = getAvatarUrl(null, profileData.display_name || profileData.username)
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-zinc-950">{profileData.display_name}</h2>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-full font-semibold">
                  @{profileData.username}
                </span>
              </div>
              <p className="text-xs text-stone-500 font-mono mt-0.5">
                ID: {profileData.app_uid}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-zinc-950 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Stats Banner */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-stone-500">Items Created</span>
              <p className="text-sm font-bold text-zinc-950 font-mono">{userItems.length} items</p>
            </div>
          </div>
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-stone-100 border border-stone-200 rounded-lg text-stone-600">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-stone-500">Member Status</span>
              <p className="text-sm font-bold text-zinc-950">Verified Member</p>
            </div>
          </div>
        </div>

        {/* User Recommended Items Feed */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <h4 className="font-display text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">
            Recommendations by {profileData.display_name}
          </h4>

          {userItems.length === 0 ? (
            <div className="text-center py-8 text-xs text-stone-500">
              No recommendations created yet.
            </div>
          ) : (
            userItems.map((item, idx) => (
              <ItemCard key={item.id} item={item} rank={idx + 1} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
