import React, { useState, useEffect, useRef } from "react";
import {
  Bookmark,
  Search,
  User,
  LogOut,
  Settings,
  ArrowRight,
  Loader2,
  AlertCircle,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { getAvatarUrl } from "../lib/avatar";

// Top navigation bar containing site logo, live search, and account controls
export default function Navbar({
  searchQuery,
  setSearchQuery,
  setActiveTab,
  onOpenProfileModal,
  onOpenSettingsModal,
  onSelectUser,
}) {
  const {
    user,
    profile,
    signInWithGoogle,
    signOut,
    isAuthenticating,
    authError,
    clearAuthError,
    isSupabaseConfigured,
  } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [matchingUsers, setMatchingUsers] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);

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
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand */}
          <div
            className="flex items-center gap-1.5 cursor-pointer shrink-0"
            onClick={() => {
              setSearchQuery("");
              if (setActiveTab) setActiveTab("feed");
            }}
          >
            <span className="font-bold text-sm sm:text-base tracking-tight text-zinc-100 select-none">
              recumend
            </span>
          </div>

          {/* Search Bar with Live User Search Dropdown */}
          <div
            className="flex-1 max-w-xs sm:max-w-md relative min-w-0"
            ref={searchContainerRef}
          >
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-500 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (!val.trim()) setMatchingUsers([]);
              }}
              placeholder="Search recs or @username..."
              className="w-full bg-zinc-900/90 border border-zinc-800 pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 sm:py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setMatchingUsers([]);
                }}
                className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs text-zinc-500 hover:text-zinc-300 font-mono"
              >
                esc
              </button>
            )}

            {/* User Search Dropdown */}
            {searchFocused && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 shadow-2xl z-50 overflow-hidden divide-y divide-zinc-800/80">
                {/* If matching profiles found */}
                {matchingUsers.length > 0 && (
                  <div className="p-1.5 sm:p-2 space-y-1">
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      Profiles ({matchingUsers.length})
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
                        className="w-full flex items-center justify-between p-2 hover:bg-zinc-800/80 transition-colors text-left group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={getAvatarUrl(u.avatar_url, u.display_name || u.username)}
                            alt={u.display_name}
                            className="w-6 h-6 object-cover border border-zinc-700 shrink-0"
                            onError={(e) => {
                              e.currentTarget.src = getAvatarUrl(null, u.display_name || u.username);
                            }}
                          />
                          <div className="min-w-0 truncate">
                            <span className="text-xs font-medium text-zinc-200 group-hover:text-white truncate block">
                              {u.display_name}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400">
                              @{u.username}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300 flex items-center gap-1 shrink-0">
                          View profile <ArrowRight className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Feed Items Filter Option */}
                <div
                  className="p-2.5 px-3 hover:bg-zinc-800/50 cursor-pointer flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200"
                  onClick={() => setSearchFocused(false)}
                >
                  <span className="truncate">
                    Filter for "<strong>{searchQuery}</strong>"
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600 shrink-0 ml-2">
                    Enter
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons & Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {user && profile ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1 hover:bg-zinc-900 border border-zinc-800/80 transition-colors"
                  title={`Logged in as @${profile.username}`}
                >
                  <img
                    src={getAvatarUrl(profile.avatar_url, profile.display_name || profile.username)}
                    alt={profile.display_name}
                    className="w-7 h-7 object-cover border border-zinc-700"
                    onError={(e) => {
                      e.currentTarget.src = getAvatarUrl(null, profile.display_name || profile.username);
                    }}
                  />
                  <span className="text-xs font-medium text-zinc-300 hidden md:inline pr-1 font-mono">
                    @{profile.username}
                  </span>
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-zinc-900 border border-zinc-800 p-1.5 shadow-2xl z-50 text-xs space-y-0.5">
                      <div className="px-3 py-2 border-b border-zinc-800/80">
                        <p className="font-semibold text-zinc-200 truncate">
                          {profile.display_name}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          if (setActiveTab) setActiveTab("my-recs");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800/70 text-left transition-colors"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
                        My Recommendations
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenProfileModal();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800/70 text-left transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        Public Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenSettingsModal();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800/70 text-left transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5 text-zinc-400" />
                        Account Settings
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-500/10 text-left transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={isAuthenticating}
                className="flex items-center gap-1.5 sm:gap-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed border border-zinc-800 hover:border-zinc-700 text-zinc-100 text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 transition-all shadow-sm shrink-0 min-h-[36px]"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />
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
        <div className="bg-rose-950/80 border-b border-rose-900/60 px-3 sm:px-4 py-2 text-rose-300 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="truncate">{authError}</span>
          </div>
          <button
            type="button"
            onClick={clearAuthError}
            className="p-1 hover:bg-rose-900/40 text-rose-400 hover:text-rose-200 transition-colors shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
