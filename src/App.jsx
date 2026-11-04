import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ItemProvider, useItems } from './context/ItemContext'
import Navbar from './components/Navbar'
import CommunityFeed from './components/CommunityFeed'
import MyRecommendations from './components/MyRecommendations'
import AddRecommendationModal from './components/AddRecommendationModal'
import SettingsModal from './components/SettingsModal'
import UserProfileView from './components/UserProfileView'
import { TrendingUp, Bookmark } from 'lucide-react'

// Main layout component managing active tabs, modals, and URL routing
function MainContent() {
  const { myItems, upvotedItems = [] } = useItems()
  const { user, profile, signInWithGoogle } = useAuth()

  // Navigation and search state
  const [activeTab, setActiveTab] = useState('feed') // 'feed' | 'my-recs'
  const [searchQuery, setSearchQuery] = useState('')

  // Modal open states and currently viewed profile handle
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [viewingUsername, setViewingUsername] = useState(null)

  // Listen for hash route changes (e.g. #/u/:username)
  useEffect(() => {
    function checkHash() {
      const hash = window.location.hash
      const match = hash.match(/^#\/u\/([a-zA-Z0-9_]+)/)
      if (match) {
        setViewingUsername(match[1])
      } else {
        setViewingUsername(null)
      }
    }

    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  // Open add modal or prompt Google login if guest
  const handleOpenAddModal = () => {
    if (!user) {
      signInWithGoogle()
      return
    }
    setIsAddModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          window.location.hash = ''
          setViewingUsername(null)
          setActiveTab(tab)
        }}
        onOpenProfileModal={() => {
          if (profile?.username) {
            window.location.hash = `/u/${profile.username}`
            setViewingUsername(profile.username)
          }
        }}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onSelectUser={(u) => {
          if (u?.username) {
            window.location.hash = `/u/${u.username}`
            setViewingUsername(u.username)
          }
        }} 
      />
 
      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {viewingUsername ? (
          <UserProfileView
            username={viewingUsername}
            onBack={() => {
              window.location.hash = ''
              setViewingUsername(null)
            }}
            onSelectUser={(u) => {
              if (u?.username) {
                window.location.hash = `/u/${u.username}`
                setViewingUsername(u.username)
              }
            }}
          />
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
              <button
                onClick={() => setActiveTab('feed')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold transition-all ${
                  activeTab === 'feed'
                    ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Community Leaderboard</span>
              </button>

              <button
                onClick={() => {
                  if (!user) {
                    signInWithGoogle()
                    return
                  }
                  setActiveTab('my-recs')
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold transition-all ${
                  activeTab === 'my-recs'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Bookmark className="w-4 h-4 text-emerald-400" />
                <span>My Recommendations</span>
                {user && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-300">
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
                    window.location.hash = `/u/${creator.username}`
                    setViewingUsername(creator.username)
                  }
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 mt-auto py-8 px-4 font-mono">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-200">recumend</span>
            <span className="text-zinc-700">•</span>
            <span className="text-zinc-400">only human taste</span>
          </div>
          <div className="text-[11px] text-zinc-500">
           Life's too short for mid consumption
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
