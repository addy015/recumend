import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// Modal dialog for updating username handle and display name
export default function SettingsModal({ isOpen, onClose }) {
  const { profile, updateProfile } = useAuth()

  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [status, setStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [prevOpen, setPrevOpen] = useState(isOpen)
  const backdropMouseDownRef = useRef(false)

  // Sync inputs with profile data when modal opens
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen)
    if (isOpen) {
      setDisplayName(profile?.display_name || '')
      setUsername(profile?.username || '')
      setStatus(null)
    }
  }

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !profile) return null

  // Save updated username and display name
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
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
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#141414] border border-white/[0.12] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div>
            <h2 className="font-display text-base font-bold text-white">Account Settings</h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">Update your username and display name</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Mutable Display Name */}
          <div>
            <label htmlFor="settings-display-name" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Display Name
            </label>
            <input
              id="settings-display-name"
              name="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Abhishek"
              className="w-full bg-[#1A1A1A] border border-white/[0.1] px-3.5 py-2 text-xs text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {/* Mutable Username */}
          <div>
            <label htmlFor="settings-username" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Unique Handle (@username)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">@</span>
              <input
                id="settings-username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                className="w-full bg-[#1A1A1A] border border-white/[0.1] pl-8 pr-3.5 py-2 text-xs font-mono text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 font-mono">Friends can search and find your profile using this handle.</p>
          </div>

          {/* Status Message */}
          {status && (
            <div className={`p-2.5 text-xs font-medium rounded-xl ${
              status.type === 'error' ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30' : 'bg-white/[0.08] text-white border border-white/20'
            }`}>
              {status.msg}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer min-h-[40px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-full transition-colors disabled:opacity-50 cursor-pointer min-h-[40px]"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
