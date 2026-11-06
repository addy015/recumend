import React, { useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Bookmark,
  User,
  Settings,
  LogOut,
  TrendingUp
} from 'lucide-react'
import { getAvatarUrl } from '../lib/avatar'

export default function LandingPage({
  onBegin,
  onExploreFeed,
  user,
  profile,
  onGoogleSignIn,
  onSignOut,
  onOpenSettingsModal,
  onOpenProfileModal,
  onOpenMyRecs,
  isAuthenticating,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1917] flex flex-col font-body selection:bg-stone-200 selection:text-stone-900">
      {/* Top Header Bar */}
      <header className="shrink-0 border-b border-stone-200/80 bg-[#F7F6F2]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 select-none">
            <span className="font-display font-extrabold text-xl tracking-tight text-zinc-950">
              recumend
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user && profile ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1 hover:bg-stone-100 border border-stone-200 rounded-xl transition-colors cursor-pointer"
                  title={`Logged in as @${profile.username}`}
                >
                  <img
                    src={getAvatarUrl(profile.avatar_url, profile.display_name || profile.username)}
                    alt={profile.display_name}
                    className="w-7 h-7 object-cover border border-stone-200 rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = getAvatarUrl(null, profile.display_name || profile.username)
                    }}
                  />
                  <span className="text-xs font-medium text-zinc-700 hidden sm:inline pr-1 font-mono">
                    @{profile.username}
                  </span>
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-stone-200 p-1.5 shadow-xl rounded-2xl z-50 text-xs space-y-0.5">
                      <div className="px-3 py-2 border-b border-stone-100">
                        <p className="font-semibold text-zinc-900 truncate">
                          {profile.display_name}
                        </p>
                        <p className="text-[11px] font-mono text-stone-500 truncate">
                          @{profile.username}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false)
                          onBegin?.()
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-stone-700 hover:text-zinc-950 hover:bg-stone-50 rounded-xl text-left transition-colors cursor-pointer font-medium"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-zinc-700" />
                        Go to Feed
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false)
                          onOpenMyRecs?.()
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-stone-700 hover:text-zinc-950 hover:bg-stone-50 rounded-xl text-left transition-colors cursor-pointer"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-emerald-600" />
                        My Recommendations
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false)
                          onOpenProfileModal?.()
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-stone-700 hover:text-zinc-950 hover:bg-stone-50 rounded-xl text-left transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-stone-500" />
                        Public Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false)
                          onOpenSettingsModal?.()
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-stone-700 hover:text-zinc-950 hover:bg-stone-50 rounded-xl text-left transition-colors cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-stone-500" />
                        Account Settings
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false)
                          onSignOut?.()
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-left transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : user ? (
              <div className="flex items-center gap-2 p-1 border border-stone-200 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-stone-200 animate-pulse" />
              </div>
            ) : (
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={isAuthenticating}
                className="flex items-center gap-1.5 sm:gap-2 bg-white hover:bg-stone-50 disabled:opacity-60 disabled:cursor-not-allowed border border-stone-200 hover:border-stone-300 text-zinc-800 text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer min-h-[36px]"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Continue with Google</span>
                    <span className="sm:hidden">Sign In</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-10 sm:py-16 max-w-4xl mx-auto w-full my-auto">
        <div className="w-full flex flex-col items-center justify-center space-y-8 sm:space-y-10">
          
          {/* Display Headline */}
          <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl tracking-tight text-zinc-950 max-w-3xl mx-auto leading-[1.15]">
            Built for people who care about taste.{' '}
            <span className="block sm:inline text-stone-500 font-medium mt-2 sm:mt-0">
              Ready to find your next favorite thing?
            </span>
          </h1>

          {/* Primary CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            <button
              type="button"
              onClick={onBegin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-sm sm:text-base px-7 py-3.5 rounded-2xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group"
            >
              <span>Let's Begin</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={onExploreFeed || onBegin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-stone-50 border border-stone-200 text-zinc-800 font-semibold text-sm sm:text-base px-6 py-3.5 rounded-2xl transition-all shadow-xs hover:border-stone-300 cursor-pointer"
            >
              <span>Browse Community Leaderboard</span>
            </button>
          </div>

          {/* Features */}
          <div className="flex items-center justify-center gap-5 sm:gap-8 text-xs text-stone-600 font-mono flex-wrap">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>1-Click Google Auth</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Global + Private Feed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Real Upvotes</span>
            </div>
          </div>

        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="shrink-0 border-t border-stone-200 mt-auto py-8 px-4 sm:px-6 font-mono text-xs text-stone-500 bg-[#F7F6F2]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-zinc-900">recumend</span>
            <span>•</span>
            <span>only human taste</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '/privacy')
                  window.dispatchEvent(new Event('popstate'))
                }
              }}
              className="hover:text-zinc-900 underline transition-colors cursor-pointer"
            >
              privacy policy
            </button>
          </div>

          <div className="text-[11px] text-stone-500">
            Life's too short for mid consumption.
          </div>
        </div>
      </footer>
    </div>
  )
}
