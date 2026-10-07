import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ItemProvider, useItems } from './context/ItemContext'
import { supabase } from './lib/supabase'
import Navbar from './components/Navbar'
import CommunityFeed from './components/CommunityFeed'
import MyRecommendations from './components/MyRecommendations'
import AddRecommendationModal from './components/AddRecommendationModal'
import SettingsModal from './components/SettingsModal'
import ConnectSupabaseModal from './components/ConnectSupabaseModal'
import UserProfileView from './components/UserProfileView'
import { TrendingUp, Sparkles, Database } from 'lucide-react'

function MainContent() {
  const { myItems, items } = useItems()
  const { user, profile, signInWithGoogle, isSupabaseConfigured } = useAuth()

  const [activeTab, setActiveTab] = useState('feed') // 'feed' | 'my-recs'
  const [searchQuery, setSearchQuery] = useState('')

  // Modals & Navigation state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isConnectSupabaseModalOpen, setIsConnectSupabaseModalOpen] = useState(false)
  const [viewingUsername, setViewingUsername] = useState(null)

  // Direct public profile route (/u/:username)
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
        onOpenAddModal={handleOpenAddModal}
        onOpenProfileModal={() => {
          if (profile?.username) {
            window.location.hash = `/u/${profile.username}`
            setViewingUsername(profile.username)
          }
        }}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenSupabaseModal={() => setIsConnectSupabaseModalOpen(true)}
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
            {/* Supabase status indicator banner */}
            {!isSupabaseConfigured ? (
              <div className="p-3.5 bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 bg-amber-400 shrink-0"></span>
                  <span>Running in Demo / LocalStorage Mode. Connect your Supabase project for live database & auth.</span>
                </div>
                <button
                  onClick={() => setIsConnectSupabaseModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shrink-0 transition-colors"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Connect Supabase</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 px-3.5 bg-zinc-900/60 border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 shrink-0"></span>
                  <span className="text-zinc-300 font-medium">Supabase Backend Connected</span>
                  <span className="text-zinc-500 hidden sm:inline">• Live PostgreSQL database & Auth active</span>
                </div>
                <button
                  onClick={() => setIsConnectSupabaseModalOpen(true)}
                  className="text-zinc-400 hover:text-white underline text-[11px]"
                >
                  Manage Connection
                </button>
              </div>
            )}

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
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>My Recommendations</span>
                {user && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-300">
                    {myItems.length}
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
      <footer className="border-t border-zinc-900 mt-auto py-6 text-center text-xs text-zinc-600 font-mono">
        recumend • minimal dark community curation
      </footer>

      {/* Modals */}
      <ConnectSupabaseModal
        isOpen={isConnectSupabaseModalOpen}
        onClose={() => setIsConnectSupabaseModalOpen(false)}
      />

      <AddRecommendationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ItemProvider>
        <MainContent />
      </ItemProvider>
    </AuthProvider>
  )
}
