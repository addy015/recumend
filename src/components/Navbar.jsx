import React, { useState, useEffect, useRef } from "react";
import {
  Bookmark,
  Search,
  User,
  Users,
  LogOut,
  Settings,
  ArrowRight,
  Loader2,
  AlertCircle,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useFriends } from "../context/FriendContext";
import { supabase } from "../lib/supabase";
import { getAvatarUrl } from "../lib/avatar";
import { KNOWN_USERS } from "../constants/knownUsers";

// Top navigation bar containing site logo, live search, and account controls
export default function Navbar({
  searchQuery,
  setSearchQuery,
  setActiveTab,
  onOpenProfileModal,
  onOpenSettingsModal,
  onOpenFriendsModal,
  onSelectUser,
  onGoToHome,
}) {
  const {
    user,
    profile,
    loading,
    signInWithGoogle,
    signOut,
    isAuthenticating,
    authError,
    clearAuthError,
    isSupabaseConfigured,
  } = useAuth();
  const { friends = [], incomingRequests = [] } = useFriends() || {};

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [matchingUsers, setMatchingUsers] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Search user profiles in real time when typing an @handle or name
  useEffect(() => {
    const q = searchQuery.trim().replace(/^@/, "");
    if (!q) {
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, app_uid, username, display_name, avatar_url")
            .ilike("username", `%${q}%`)
            .limit(5);
          if (!error && isMounted) {
            setMatchingUsers(data || []);
          }
        } else {
          const demoCurators = Object.values(KNOWN_USERS || {});
          const matched = demoCurators
            .filter(
              (u) =>
                u.username?.toLowerCase().includes(q.toLowerCase()) ||
                u.display_name?.toLowerCase().includes(q.toLowerCase())
            )
            .slice(0, 5);
          if (isMounted) {
            setMatchingUsers(matched);
          }
        }
      } catch (err) {
        console.error("User search error:", err);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, isSupabaseConfigured]);

  // Close user dropdown menu when clicking anywhere outside or pressing Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleDropdownOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleDropdownOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleDropdownOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  // Close search suggestions dropdown when clicking outside the input
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initiate Google OAuth login
  const handleGoogleClick = async () => {
    if (isAuthenticating) return;
    clearAuthError?.();
    await signInWithGoogle();
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#08090C]/60 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-4">
          {/* Brand */}
          <div
            className="flex items-center gap-2 cursor-pointer shrink-0 select-none group"
            onClick={() => {
              setSearchQuery("");
              if (onGoToHome) {
                onGoToHome();
              } else if (setActiveTab) {
                setActiveTab("feed");
              }
            }}
          >
            <span className="font-display font-bold text-lg tracking-tight text-white transition-opacity group-hover:opacity-80 flex items-center">
              <span>recumend&nbsp;</span>
              <span className="w-1.5 h-1.5 mx-0.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] inline-block animate-pulse" />
            </span>
          </div>

          {/* Search Bar with Live User Search Dropdown */}
          <div
            className="flex-1 max-w-xs sm:max-w-md relative min-w-0"
            ref={searchContainerRef}
          >
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="global-search-input"
              name="searchQuery"
              aria-label="Search recommendations or users"
              autoComplete="off"
              type="text"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (!val.trim()) setMatchingUsers([]);
              }}
              placeholder="Search recs or @username..."
              className="w-full bg-[#141414] border border-white/[0.1] pl-9 pr-8 py-2 text-xs text-white placeholder:text-zinc-500 rounded-full focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setMatchingUsers([]);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 hover:text-white font-mono"
              >
                esc
              </button>
            )}

            {/* User Search Dropdown */}
            {searchFocused && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#141414] border border-white/[0.12] shadow-2xl rounded-2xl z-50 overflow-hidden divide-y divide-white/[0.06]">
                {matchingUsers.length > 0 && (
                  <div className="p-2 space-y-1">
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      Curators ({matchingUsers.length})
                    </div>
                    {matchingUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSearchFocused(false);
                          setSearchQuery("");
                          onSelectUser?.(u);
                        }}
                        className="w-full flex items-center justify-between p-2 hover:bg-white/[0.06] rounded-xl transition-colors text-left group min-h-[44px]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={getAvatarUrl(u.avatar_url, u.display_name || u.username)}
                            alt={u.display_name}
                            className="w-6 h-6 object-cover rounded-full shrink-0"
                            onError={(e) => {
                              e.currentTarget.src = getAvatarUrl(null, u.display_name || u.username);
                            }}
                          />
                          <div className="min-w-0 truncate">
                            <span className="text-xs font-medium text-zinc-200 group-hover:text-white truncate block">
                              {u.display_name}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              @{u.username}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300 flex items-center gap-1 shrink-0">
                          Profile <ArrowRight className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className="p-3 hover:bg-white/[0.04] cursor-pointer flex items-center justify-between text-xs text-zinc-400 hover:text-white"
                  onClick={() => setSearchFocused(false)}
                >
                  <span className="truncate">
                    Search feed for "<strong>{searchQuery}</strong>"
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 shrink-0 ml-2">
                    Enter
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons & Auth */}
          <div className="flex items-center gap-2 shrink-0">
            {loading && !profile ? (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-white/[0.08] bg-white/[0.03] rounded-full min-h-[40px] select-none">
                <div className="w-6 h-6 rounded-full bg-zinc-800" />
                <div className="w-16 h-3 bg-zinc-800 rounded-full hidden sm:block" />
              </div>
            ) : user && profile ? (
              <>
                <button
                  type="button"
                  onClick={onOpenFriendsModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] hover:bg-white/[0.08] border border-white/[0.1] rounded-full text-zinc-300 hover:text-white transition-all cursor-pointer min-h-[40px] text-xs font-mono"
                  aria-label="Friends & Connections"
                >
                  <Users className="w-3.5 h-3.5 text-zinc-300" />
                  <span className="hidden sm:inline">Friends</span>
                  {incomingRequests.length > 0 ? (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-400 text-black">
                      {incomingRequests.length}
                    </span>
                  ) : friends.length > 0 ? (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-white/10 text-white">
                      {friends.length}
                    </span>
                  ) : null}
                </button>

                <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 hover:bg-white/[0.06] border border-white/[0.1] rounded-full transition-all cursor-pointer min-h-[44px]"
                  aria-label={`Logged in as @${profile.username}`}
                >
                  <img
                    src={getAvatarUrl(profile.avatar_url, profile.display_name || profile.username)}
                    alt={profile.display_name}
                    className="w-7 h-7 object-cover rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = getAvatarUrl(null, profile.display_name || profile.username);
                    }}
                  />
                  <span className="text-xs font-mono text-zinc-300 hidden md:inline pr-2">
                    @{profile.username}
                  </span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#141414] border border-white/[0.12] p-2 shadow-2xl rounded-2xl z-50 text-xs space-y-1">
                      <div className="px-3 py-2.5 border-b border-white/[0.08]">
                        <p className="font-semibold text-white truncate">
                          {profile.display_name}
                        </p>
                        <p className="text-[11px] font-mono text-zinc-500 truncate">
                          @{profile.username}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenFriendsModal?.();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors min-h-[40px]"
                      >
                        <Users className="w-4 h-4 text-zinc-400" />
                        <span>Friends ({friends.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          if (setActiveTab) setActiveTab("my-recs");
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors min-h-[40px]"
                      >
                        <Bookmark className="w-4 h-4 text-zinc-400" />
                        <span>My Recs.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenProfileModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors min-h-[40px]"
                      >
                        <User className="w-4 h-4 text-zinc-400" />
                        <span>Public Profile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenSettingsModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors min-h-[40px]"
                      >
                        <Settings className="w-4 h-4 text-zinc-400" />
                        <span>Account Settings</span>
                      </button>

                      <div className="border-t border-white/[0.08] pt-1 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDropdownOpen(false);
                            signOut();
                            if (setActiveTab) setActiveTab("feed");
                            if (typeof window !== "undefined") {
                              window.history.replaceState(null, "", "/feed");
                            }
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-xl text-left transition-colors min-h-[40px]"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                )}
              </div>
            </>
            ) : (
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={isAuthenticating}
                className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-60 disabled:cursor-not-allowed text-xs font-semibold px-4 py-2 rounded-full transition-all shrink-0 min-h-[40px]"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-black shrink-0" />
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

      {/* Auth Error Banner with Dismiss */}
      {authError && (
        <div className="bg-rose-950/60 border-b border-rose-500/30 px-4 py-2.5 text-rose-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 max-w-6xl mx-auto flex-1 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="truncate">{authError}</span>
          </div>
          <button
            type="button"
            onClick={clearAuthError}
            className="p-1 hover:bg-rose-900/50 text-rose-300 rounded-md transition-colors shrink-0"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
