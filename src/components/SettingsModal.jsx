import React, { useState } from 'react'
import { X, Check, AlertCircle, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function SettingsModal({ isOpen, onClose }) {
  const { profile, updateProfile } = useAuth()

  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [status, setStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !profile) return null

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatus(null)

    const res = await updateProfile({
      display_name: displayName,
      username: username
    })

    setIsSubmitting(false)
    if (res?.success) {
      setStatus({ type: 'success', msg: 'Profile updated successfully!' })
      setTimeout(() => {
        setStatus(null)
        onClose()
      }, 1000)
    } else {
      setStatus({ type: 'error', msg: res?.error || 'Failed to update profile' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 p-4 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Account Settings</h2>
            <p className="text-xs text-zinc-400">Update your username and display name</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Immutable App UID */}
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-zinc-300 mb-1.5">
              <span>Unique App UID</span>
              <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-normal">
                <Lock className="w-3 h-3 text-zinc-500" /> Permanent & Immutable
              </span>
            </label>
            <input
              type="text"
              readOnly
              value={profile.app_uid}
              className="w-full bg-zinc-950/60 border border-zinc-800/80 px-3.5 py-2 text-xs font-mono text-zinc-400 cursor-not-allowed select-all"
            />
          </div>

          {/* Mutable Display Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Abhishek"
              className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Mutable Username */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Unique Handle (@username)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">@</span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                className="w-full bg-zinc-950 border border-zinc-800 pl-7 pr-3.5 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Friends can search and find your profile using this handle.</p>
          </div>

          {/* Status Message */}
          {status && (
            <div className={`p-2.5 text-xs font-medium ${
              status.type === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {status.msg}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
