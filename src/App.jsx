import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ItemProvider, useItems } from './context/ItemContext'
import Navbar from './components/Navbar'
import LandingPage from './components/LandingPage'
import CommunityFeed from './components/CommunityFeed'
import MyRecommendations from './components/MyRecommendations'
import AddRecommendationModal from './components/AddRecommendationModal'
import SettingsModal from './components/SettingsModal'
import UserProfileView from './components/UserProfileView'
import PrivacyPolicy from './components/PrivacyPolicy'
import { TrendingUp, Bookmark } from 'lucide-react'

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
  const { user, profile, signInWithGoogle, isAuthenticating } = useAuth()

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

  // Modal open states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
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
      setRoute(nextRoute)
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
  const handleOpenAddModal = () => {
    if (!user) {
      signInWithGoogle()
      return
    }
    setIsAddModalOpen(true)
  }

  // ROUTE 1: HOMEPAGE (/) -> Landing Page
  if (route.page === 'landing') {
    return (
      <>
        <LandingPage
          onBegin={() => navigate('/feed')}
          onExploreFeed={() => navigate('/feed')}
          user={user}
          onGoogleSignIn={signInWithGoogle}
          isAuthenticating={isAuthenticating}
        />
        <SettingsModal
          key={profile?.id ? `${profile.id}-${profile.username}` : 'settings-modal'}
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      </>
    )
  }

  // ROUTE 2 & 3: /feed or /u/:username -> Community Dashboard
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1917] flex flex-col font-body selection:bg-stone-200 selection:text-stone-900">
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
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {route.page === 'privacy' ? (
          <PrivacyPolicy onBack={() => navigate('/')} />
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
            <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
              <button
                type="button"
                onClick={() => {
                  navigate('/feed')
                  setActiveTab('feed')
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'feed'
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'text-stone-500 hover:text-zinc-900 hover:bg-stone-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Community Leaderboard</span>
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
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'my-recs'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                    : 'text-stone-500 hover:text-zinc-900 hover:bg-stone-100'
                }`}
              >
                <Bookmark className="w-4 h-4 text-emerald-600" />
                <span>My Recommendations</span>
                {user && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-md bg-stone-200 text-stone-700">
                    {myItems.length + (upvotedItems?.length || 0)}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Views */}
            {activeTab === 'my-recs' ? (
              <MyRecommendations onOpenAddModal={handleOpenAddModal} />
            ) : (
              <CommunityFeed
                searchQuery={searchQuery}
                onOpenAddModal={handleOpenAddModal}
                onSelectUser={(creator) => {
                  if (creator?.username) {
                    navigate(`/u/${creator.username}`)
                  }
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 mt-auto py-8 px-4 font-mono bg-[#F7F6F2]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="font-display font-bold text-zinc-900 hover:text-[#2D6A4F] transition-colors cursor-pointer"
            >
              recumend
            </button>
            <span className="text-stone-300">•</span>
            <span>only human taste</span>
            <span className="text-stone-300">•</span>
            <button
              type="button"
              onClick={() => navigate('/privacy')}
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

      {/* Modals */}
      <AddRecommendationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <SettingsModal
        key={profile?.id ? `${profile.id}-${profile.username}` : 'settings-modal'}
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
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
