import React, { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Bookmark,
  User,
  Settings,
  LogOut,
  TrendingUp,
  ArrowBigUp,
} from "lucide-react";
import { getAvatarUrl } from "../lib/avatar";

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mockItems, setMockItems] = useState({
    item1: { votes: 148, voted: false },
    item2: { votes: 124, voted: false },
    item3: { votes: 98, voted: false },
  });
  const dropdownRef = useRef(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  const toggleMockVote = (key) => {
    setMockItems((prev) => {
      const current = prev[key];
      const nextVoted = !current.voted;
      return {
        ...prev,
        [key]: {
          voted: nextVoted,
          votes: nextVoted ? current.votes + 1 : current.votes - 1,
        },
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] flex flex-col font-body selection:bg-rose-600/30 selection:text-rose-200">
      {/* Top Header Bar */}
      <header className="shrink-0 border-b border-white/[0.08] bg-[#0A0A0A]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo with Ruby "REC" Dot */}
          <div
            className="flex items-center gap-2 select-none cursor-pointer"
            onClick={onBegin}
          >
            <span className="font-display font-bold text-lg tracking-tight text-white flex items-center">
              <span>recumend&nbsp;</span>
              <span className="w-1.5 h-1.5 mx-0.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] inline-block animate-pulse" />
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user && profile ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 hover:bg-white/[0.06] border border-white/[0.1] rounded-full transition-all cursor-pointer min-h-[44px]"
                  title={`Logged in as @${profile.username}`}
                  aria-label="User navigation menu"
                >
                  <img
                    src={getAvatarUrl(
                      profile.avatar_url,
                      profile.display_name || profile.username,
                    )}
                    alt={profile.display_name}
                    className="w-7 h-7 object-cover rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = getAvatarUrl(
                        null,
                        profile.display_name || profile.username,
                      );
                    }}
                  />
                  <span className="text-xs font-mono text-zinc-300 hidden sm:inline pr-2">
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
                        onBegin?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer min-h-[40px]"
                    >
                      <TrendingUp className="w-4 h-4 text-zinc-400" />
                      <span>Feed</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenMyRecs?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer min-h-[40px]"
                    >
                      <Bookmark className="w-4 h-4 text-zinc-400" />
                      <span>My Vault</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenProfileModal?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer min-h-[40px]"
                    >
                      <User className="w-4 h-4 text-zinc-400" />
                      <span>Public Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenSettingsModal?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer min-h-[40px]"
                    >
                      <Settings className="w-4 h-4 text-zinc-400" />
                      <span>Account Settings</span>
                    </button>

                    <div className="border-t border-white/[0.08] pt-1 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onSignOut?.();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-xl text-left transition-colors cursor-pointer min-h-[40px]"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : user ? (
              <div className="flex items-center gap-2 p-1.5 border border-white/[0.1] rounded-full">
                <div className="w-7 h-7 rounded-full bg-zinc-800 animate-pulse" />
              </div>
            ) : (
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={isAuthenticating}
                className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-60 disabled:cursor-not-allowed text-xs font-semibold px-4 py-2 rounded-full transition-all shrink-0 cursor-pointer min-h-[40px]"
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
                    <span className="hidden sm:inline">
                      Continue with Google
                    </span>
                    <span className="sm:hidden">Sign In</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section (Single Page Landing View) */}
      <section className="flex-1 flex items-center py-12 sm:py-16 lg:py-20">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-6 space-y-6 text-left">
              <h1 className="font-display font-medium text-4xl sm:text-6xl md:text-7xl tracking-[-0.04em] text-white leading-[1.04]">
                Built for people who care about{" "}
                <span className="text-zinc-500 font-normal">taste.</span>
              </h1>

              <p className="text-zinc-400 text-base sm:text-lg max-w-xl leading-relaxed">
                Life's too short for mid consumption. So, are you ready to find
                your next favorite thing?
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={onBegin}
                  className="inline-flex items-center justify-center gap-2.5 bg-white hover:bg-zinc-200 text-black font-semibold text-sm sm:text-base px-8 py-3.5 rounded-full transition-all active:scale-[0.98] cursor-pointer min-h-[48px] group"
                >
                  <span>Explore Leaderboard</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  type="button"
                  onClick={onOpenMyRecs || onBegin}
                  className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-white/[0.06] border border-white/20 text-zinc-300 hover:text-white font-medium text-sm sm:text-base px-7 py-3.5 rounded-full transition-all cursor-pointer min-h-[48px] active:scale-[0.98]"
                >
                  <Bookmark className="w-4 h-4 text-zinc-400" />
                  <span>Curate Vault</span>
                </button>
              </div>
            </div>

            {/* Right Column: Community Leaderboard UI Preview */}
            <div className="lg:col-span-6 space-y-3">
              {/* Authentic Item Cards Stack mirroring actual community UI */}
              <div className="space-y-2.5">
                {/* Rank #01: Dune Part Two (Ruby Velvet Laurel Accent) */}
                <article className="group bg-gradient-to-r from-rose-950/20 via-[#141414] to-[#121212] border border-rose-500/30 hover:border-rose-500/50 rounded-2xl p-4 flex items-start gap-3.5 transition-all duration-150 shadow-sm taste-card">
                  <div className="shrink-0 pt-0.5 select-none w-6 text-right">
                    <span className="font-mono text-xs sm:text-sm tabular-nums tracking-tighter text-amber-400 font-black drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]">
                      01
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 flex-wrap">
                      <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md border bg-amber-500/10 text-amber-300 border-amber-500/25">
                        Movies
                      </span>
                      <span>2024</span>
                      <span>• 70mm</span>
                    </div>
                    <h3 className="font-display text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                      Dune: Part Two
                    </h3>
                    <p className="border-l-2 border-amber-400/50 pl-2.5 text-xs text-zinc-300 italic leading-relaxed line-clamp-1">
                      "Monumental sound design and visual symmetry that
                      redefines modern sci-fi."
                    </p>
                    <div className="pt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
                      <span className="text-zinc-600">@</span>
                      <span className="text-zinc-300">elena</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleMockVote("item1")}
                    className={`flex flex-col items-center justify-center min-w-[2.75rem] w-11 py-2 px-1 border transition-all duration-150 shrink-0 select-none min-h-[46px] rounded-xl cursor-pointer ${
                      mockItems.item1.voted
                        ? "bg-amber-400 text-black border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.22)] active:scale-95"
                        : "bg-[#151515] hover:bg-amber-400/10 border-white/[0.1] hover:border-amber-400/30 text-zinc-400 hover:text-amber-300 active:scale-95"
                    }`}
                    title="Click to test tactile upvote toggle"
                  >
                    <ArrowBigUp
                      className={`w-5 h-5 ${mockItems.item1.voted ? "fill-black stroke-black scale-105" : "text-zinc-400 group-hover:text-amber-300"}`}
                    />
                    <span
                      className={`text-xs font-mono font-bold mt-0.5 tabular-nums ${mockItems.item1.voted ? "text-black" : "text-zinc-300"}`}
                    >
                      {mockItems.item1.votes}
                    </span>
                  </button>
                </article>

                {/* Rank #02: Severance */}
                <article className="group bg-gradient-to-r from-slate-900/30 via-[#131416] to-[#121212] border border-slate-400/25 hover:border-slate-300/40 rounded-2xl p-4 flex items-start gap-3.5 transition-all duration-150 shadow-sm taste-card">
                  <div className="shrink-0 pt-0.5 select-none w-6 text-right">
                    <span className="font-mono text-xs sm:text-sm tabular-nums tracking-tighter text-slate-200 font-extrabold">
                      02
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 flex-wrap">
                      <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md border bg-orange-500/10 text-orange-300 border-orange-500/25">
                        TV Shows
                      </span>
                      <span>2022</span>
                      <span>• Apple TV+</span>
                    </div>
                    <h3 className="font-display text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                      Severance
                    </h3>
                    <p className="border-l-2 border-orange-400/50 pl-2.5 text-xs text-zinc-300 italic leading-relaxed line-clamp-1">
                      "Masterpiece psychological workplace mystery that stays
                      with you."
                    </p>
                    <div className="pt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
                      <span className="text-zinc-600">@</span>
                      <span className="text-zinc-300">dan_e</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleMockVote("item2")}
                    className={`flex flex-col items-center justify-center min-w-[2.75rem] w-11 py-2 px-1 border transition-all duration-150 shrink-0 select-none min-h-[46px] rounded-xl cursor-pointer ${
                      mockItems.item2.voted
                        ? "bg-amber-400 text-black border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.22)] active:scale-95"
                        : "bg-[#151515] hover:bg-amber-400/10 border-white/[0.1] hover:border-amber-400/30 text-zinc-400 hover:text-amber-300 active:scale-95"
                    }`}
                    title="Click to test tactile upvote toggle"
                  >
                    <ArrowBigUp
                      className={`w-5 h-5 ${mockItems.item2.voted ? "fill-black stroke-black scale-105" : "text-zinc-400 group-hover:text-amber-300"}`}
                    />
                    <span
                      className={`text-xs font-mono font-bold mt-0.5 tabular-nums ${mockItems.item2.voted ? "text-black" : "text-zinc-300"}`}
                    >
                      {mockItems.item2.votes}
                    </span>
                  </button>
                </article>

                {/* Rank #03: Chrono Trigger */}
                <article className="group bg-gradient-to-r from-amber-950/15 via-[#141312] to-[#121212] border border-amber-700/25 hover:border-amber-600/35 rounded-2xl p-4 flex items-start gap-3.5 transition-all duration-150 shadow-sm taste-card hidden sm:flex">
                  <div className="shrink-0 pt-0.5 select-none w-6 text-right">
                    <span className="font-mono text-xs sm:text-sm tabular-nums tracking-tighter text-amber-600 font-bold">
                      03
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 flex-wrap">
                      <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md border bg-rose-500/10 text-rose-300 border-rose-500/25">
                        Games
                      </span>
                      <span>SNES</span>
                      <span>• JRPG</span>
                    </div>
                    <h3 className="font-display text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                      Chrono Trigger
                    </h3>
                    <div className="pt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
                      <span className="text-zinc-600">@</span>
                      <span className="text-zinc-300">yamada</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleMockVote("item3")}
                    className={`flex flex-col items-center justify-center min-w-[2.75rem] w-11 py-2 px-1 border transition-all duration-150 shrink-0 select-none min-h-[46px] rounded-xl cursor-pointer ${
                      mockItems.item3.voted
                        ? "bg-amber-400 text-black border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.22)] active:scale-95"
                        : "bg-[#151515] hover:bg-amber-400/10 border-white/[0.1] hover:border-amber-400/30 text-zinc-400 hover:text-amber-300 active:scale-95"
                    }`}
                    title="Click to test tactile upvote toggle"
                  >
                    <ArrowBigUp
                      className={`w-5 h-5 ${mockItems.item3.voted ? "fill-black stroke-black scale-105" : "text-zinc-400 group-hover:text-amber-300"}`}
                    />
                    <span
                      className={`text-xs font-mono font-bold mt-0.5 tabular-nums ${mockItems.item3.voted ? "text-black" : "text-zinc-300"}`}
                    >
                      {mockItems.item3.votes}
                    </span>
                  </button>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="shrink-0 py-8 px-4 sm:px-6 font-mono text-xs text-zinc-500 bg-[#0A0A0A] border-t border-white/[0.08]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
            <span className="font-display font-bold text-white tracking-tight flex items-center">
              <span>recumend</span>
              <span className="bg-zinc-400 w-1 h-1 rounded-full mx-2"></span>
              <span className="font-thin">taste matters</span>
            </span>
          </div>

          <div className="text-[11px] text-zinc-600 text-center sm:text-right">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.history.pushState(null, "", "/privacy");
                  window.dispatchEvent(new Event("popstate"));
                }
              }}
              className="text-zinc-500 hover:text-white underline transition-colors cursor-pointer"
            >
              privacy policy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
