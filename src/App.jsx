import React, { useState, useEffect, useRef, useCallback } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ItemProvider, useItems } from './context/ItemContext'
import Navbar from './components/Navbar'
import LandingPage from './components/LandingPage'
import CommunityFeed from './components/CommunityFeed'
import MyRecommendations from './components/MyRecommendations'
import AddRecommendationModal from './components/AddRecommendationModal'
import SettingsModal from './components/SettingsModal'
import UserProfileView from './components/UserProfileView'
import LegalView from './components/LegalView'
import AtmosphereBackground from './components/AtmosphereBackground'
import { TrendingUp, Bookmark, X } from 'lucide-react'

// Lightweight SPA routing helper
function navigate(url) {
  if (typeof window === 'undefined') return
  window.history.pushState(null, '', url)
  window.dispatchEvent(new Event('popstate'))
}

// Parse current URL path and hash to determine active page and params
function getRoute() {
  if (typeof window === 'undefined') return { page: 'landing', username: null }
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  const hash = window.location.hash || ''

  // If URL has legacy #/landing or /landing or #/, clean it up immediately to pure /
  if (hash === '#/landing' || hash === '#/') {
    window.history.replaceState(null, '', path === '/landing' ? '/' : path)
  }
  if (path === '/landing') {
    window.history.replaceState(null, '', '/')
  }

  // 1. Privacy Policy route: /privacy or #/privacy
  if (path === '/privacy' || hash === '#/privacy') {
    return { page: 'privacy', username: null }
  }

  // 2. Profile route: /u/:username or #/u/:username
  const pathUser = path.match(/^\/u\/([a-zA-Z0-9_]+)/)
  const hashUser = hash.match(/^#\/u\/([a-zA-Z0-9_]+)/)
  const username = pathUser?.[1] || hashUser?.[1] || null
  if (username) {
    return { page: 'profile', username }
  }

  // 3. Community Feed route: /feed or #/feed or #/app or #/my-recs
  if (path === '/feed' || hash === '#/feed' || hash === '#/app' || hash === '#/my-recs') {
    return { page: 'feed', username: null }
  }

  // 4. Homepage / Landing Page: /
  return { page: 'landing', username: null }
}

function MainContent() {
  const { myItems, upvotedItems = [] } = useItems()
  const { user, profile, signInWithGoogle, signOut, isAuthenticating } = useAuth()

  // Track active route derived from URL (path / hash)
  const [route, setRoute] = useState(getRoute)

  // Navigation and search state within the app dashboard
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#/my-recs') {
      return 'my-recs'
    }
    return 'feed'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [feedSortBy, setFeedSortBy] = useState('overall') // 'overall' | 'recent'
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  // Trigger floating toast notification with optional action button
  const showToast = useCallback(({ message, actionLabel, onAction }) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ id: Date.now(), message, actionLabel, onAction })
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
    }, 5000)
  }, [])

  // Handle successful recommendation addition
  const handleAddSuccess = useCallback(({ isPrivate }) => {
    if (isPrivate) {
      showToast({
        message: 'Saved to your private vault.'
      })
    } else {
      showToast({
        message: 'Recommendation published!',
        actionLabel: 'View in Most Recent →',
        onAction: () => {
          navigate('/feed')
          setActiveTab('feed')
          setFeedSortBy('recent')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      })
    }
  }, [showToast])

  // Modal open states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addModalInitialPrivate, setAddModalInitialPrivate] = useState(false)
  const [addModalInitialCategory, setAddModalInitialCategory] = useState('movie')
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  // Listen to browser navigation (back/forward and custom navigate events)
  useEffect(() => {
    if (window.location.hash === '#/landing' || window.location.hash === '#/') {
      window.history.replaceState(null, '', window.location.pathname === '/landing' ? '/' : window.location.pathname)
    }

    function handleLocationChange() {
      if (window.location.hash === '#/landing' || window.location.hash === '#/') {
        window.history.replaceState(null, '', window.location.pathname === '/landing' ? '/' : window.location.pathname)
      }
      const nextRoute = getRoute()
      setRoute(prev => {
        if (prev.page === nextRoute.page && prev.username === nextRoute.username) {
          return prev
        }
        return nextRoute
      })
      if (window.location.hash === '#/my-recs') {
        setActiveTab('my-recs')
      } else if (nextRoute.page === 'feed' && !window.location.hash) {
        setActiveTab('feed')
      }
    }

    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hashchange', handleLocationChange)
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hashchange', handleLocationChange)
    }
  }, [])

  // Open add modal or prompt Google login if guest
  const handleOpenAddModal = (options = {}) => {
    if (!user) {
      signInWithGoogle()
      return
    }
    setAddModalInitialPrivate(Boolean(options?.isPrivate))
    setAddModalInitialCategory(options?.category && options.category !== 'all' ? options.category : 'movie')
    setIsAddModalOpen(true)
  }

  // AtmosphereBackground stays permanently mounted across ALL routes
  return (
    <div className="min-h-screen text-[#F3F4F6] flex flex-col font-body selection:bg-rose-600/30 selection:text-rose-200 relative">
      {/* Lives across all routes without remounting */}
      <AtmosphereBackground />

      {route.page === 'landing' ? (
        <LandingPage
          onBegin={() => navigate('/feed')}
          onExploreFeed={() => navigate('/feed')}
          user={user}
          profile={profile}
          onGoogleSignIn={signInWithGoogle}
          onSignOut={signOut}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onOpenProfileModal={() => {
            if (profile?.username) {
              navigate(`/u/${profile.username}`)
            }
          }}
          onOpenMyRecs={() => navigate('/feed#/my-recs')}
          isAuthenticating={isAuthenticating}
        />
      ) : (
        <>
          {/* Main Navbar */}
          <Navbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeTab={activeTab}
            setActiveTab={(tab) => {
              if (tab === 'my-recs') {
                navigate('/feed#/my-recs')
              } else {
                navigate('/feed')
              }
              setActiveTab(tab)
            }}
            onGoToHome={() => navigate('/')}
            onOpenProfileModal={() => {
              if (profile?.username) {
                navigate(`/u/${profile.username}`)
              }
            }}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            onSelectUser={(u) => {
              if (u?.username) {
                navigate(`/u/${u.username}`)
              }
            }}
          />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {route.page === 'privacy' ? (
          <LegalView onBack={() => navigate('/')} />
        ) : route.page === 'profile' && route.username ? (
          <UserProfileView
            username={route.username}
            onBack={() => navigate('/feed')}
            onSelectUser={(u) => {
              if (u?.username) {
                navigate(`/u/${u.username}`)
              }
            }}
          />
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="flex items-center gap-2 border-b border-white/[0.08] pb-4">
              <button
                type="button"
                onClick={() => {
                  navigate('/feed')
                  setActiveTab('feed')
                }}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-colors duration-75 cursor-pointer min-h-[38px] ${
                  activeTab === 'feed'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60'
                }`}
              >
                <TrendingUp className={`w-4 h-4 ${activeTab === 'feed' ? 'text-black' : 'text-white'}`} />
                <span>Leaderboard</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    signInWithGoogle()
                    return
                  }
                  navigate('/feed#/my-recs')
                  setActiveTab('my-recs')
                }}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-colors duration-75 cursor-pointer min-h-[38px] ${
                  activeTab === 'my-recs'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${activeTab === 'my-recs' ? 'text-black' : 'text-white'}`} />
                <span>My Vault</span>
                {user && (
                  <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full ${
                    activeTab === 'my-recs'
                      ? 'bg-black/10 text-black font-bold'
                      : 'bg-white/15 text-white font-mono'
                  }`}>
                    {myItems.length + (upvotedItems?.length || 0)}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Views */}
            <div className={activeTab === 'feed' ? 'block' : 'hidden'}>
              <CommunityFeed
                searchQuery={searchQuery}
                sortBy={feedSortBy}
                onSortChange={setFeedSortBy}
                onOpenAddModal={handleOpenAddModal}
                onSelectUser={(creator) => {
                  if (creator?.username) {
                    navigate(`/u/${creator.username}`)
                  }
                }}
              />
            </div>

            <div className={activeTab === 'my-recs' ? 'block' : 'hidden'}>
              <MyRecommendations onOpenAddModal={handleOpenAddModal} searchQuery={searchQuery} />
            </div>
          </>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="shrink-0 py-8 px-4 sm:px-6 font-mono text-xs text-zinc-500 bg-[#08090C]/40 backdrop-blur-md border-t border-white/[0.08] mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="font-display font-bold text-white tracking-tight flex items-center hover:opacity-90 transition-opacity cursor-pointer"
            >
              <span>recumend</span>
              <span className="bg-zinc-400 w-1 h-1 rounded-full mx-2"></span>
              <span className="font-thin">taste matters</span>
            </button>
          </div>

          <div className="text-[11px] text-zinc-600 text-center sm:text-right">
            <button
              type="button"
              onClick={() => navigate('/privacy')}
              className="text-zinc-500 hover:text-white underline transition-colors cursor-pointer"
            >
              privacy policy
            </button>
          </div>
        </div>
      </footer>
        </>
      )}

      {/* Modals */}
      <AddRecommendationModal
        isOpen={isAddModalOpen}
        initialPrivate={addModalInitialPrivate}
        initialCategory={addModalInitialCategory}
        onSuccess={handleAddSuccess}
        onClose={() => setIsAddModalOpen(false)}
      />

      <SettingsModal
        key={profile?.id ? `${profile.id}-${profile.username}` : 'settings-modal'}
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Floating Toast Notification Banner */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-[#141414] text-white border border-white/[0.12] rounded-full shadow-2xl font-mono text-xs max-w-[90vw] animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <span className="text-zinc-300 select-none">{toast.message}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction()
                setToast(null)
              }}
              className="px-3 py-1 bg-white text-black hover:bg-zinc-200 rounded-full text-xs font-semibold font-body transition-colors cursor-pointer whitespace-nowrap"
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Close notification"
            className="p-1 text-zinc-500 hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// Root application component wrapping auth and item providers
export default function App() {
  return (
    <AuthProvider>
      <ItemProvider>
        <MainContent />
      </ItemProvider>
    </AuthProvider>
  )
}
