import { Film, Tv, PlaySquare, BookOpen, Gamepad2, Video, Clapperboard, Layers, Globe, MoreHorizontal } from 'lucide-react'

// Supported recommendation categories, labels, and their matching icons
export const CATEGORIES = [
  { id: 'all', label: 'All', icon: Layers, color: 'text-zinc-300', bg: 'bg-white/[0.06]' },
  { id: 'movie', label: 'Movies', icon: Film, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  { id: 'show', label: 'TV Shows', icon: Tv, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { id: 'anime', label: 'Anime', icon: PlaySquare, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  { id: 'book', label: 'Books', icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { id: 'game', label: 'Games', icon: Gamepad2, color: 'text-rose-400', bg: 'bg-rose-400/10' },
  { id: 'yt', label: 'YouTube', icon: Video, color: 'text-red-400', bg: 'bg-red-400/10' },
  { id: 'docu', label: 'Documentaries', icon: Clapperboard, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { id: 'app', label: 'App/Website', icon: Globe, color: 'text-sky-400', bg: 'bg-sky-400/10' },
  { id: 'other', label: 'Others', icon: MoreHorizontal, color: 'text-purple-400', bg: 'bg-purple-400/10' },
]

export const CATEGORY_STYLES = {
  movie: {
    accent: 'text-amber-400',
    border: 'border-amber-400/30',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    activeChip: 'bg-amber-400 text-black border-amber-400 font-semibold shadow-sm',
    glow: 'rgba(251, 191, 36, 0.15)',
  },
  show: {
    accent: 'text-orange-400',
    border: 'border-orange-400/30',
    badge: 'bg-orange-500/10 text-orange-300 border-orange-500/25',
    activeChip: 'bg-orange-400 text-black border-orange-400 font-semibold shadow-sm',
    glow: 'rgba(251, 146, 60, 0.15)',
  },
  anime: {
    accent: 'text-indigo-400',
    border: 'border-indigo-400/30',
    badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25',
    activeChip: 'bg-indigo-400 text-black border-indigo-400 font-semibold shadow-sm',
    glow: 'rgba(129, 140, 248, 0.15)',
  },
  book: {
    accent: 'text-emerald-400',
    border: 'border-emerald-400/30',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    activeChip: 'bg-emerald-400 text-black border-emerald-400 font-semibold shadow-sm',
    glow: 'rgba(52, 211, 153, 0.15)',
  },
  game: {
    accent: 'text-rose-400',
    border: 'border-rose-400/30',
    badge: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    activeChip: 'bg-rose-400 text-black border-rose-400 font-semibold shadow-sm',
    glow: 'rgba(251, 113, 133, 0.15)',
  },
  yt: {
    accent: 'text-red-400',
    border: 'border-red-400/30',
    badge: 'bg-red-500/10 text-red-300 border-red-500/25',
    activeChip: 'bg-red-400 text-black border-red-400 font-semibold shadow-sm',
    glow: 'rgba(248, 113, 113, 0.15)',
  },
  docu: {
    accent: 'text-yellow-400',
    border: 'border-yellow-400/30',
    badge: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/25',
    activeChip: 'bg-yellow-400 text-black border-yellow-400 font-semibold shadow-sm',
    glow: 'rgba(250, 204, 21, 0.15)',
  },
  app: {
    accent: 'text-sky-400',
    border: 'border-sky-400/30',
    badge: 'bg-sky-500/10 text-sky-300 border-sky-500/25',
    activeChip: 'bg-sky-400 text-black border-sky-400 font-semibold shadow-sm',
    glow: 'rgba(56, 189, 248, 0.15)',
  },
  other: {
    accent: 'text-purple-400',
    border: 'border-purple-400/30',
    badge: 'bg-purple-500/10 text-purple-300 border-purple-500/25',
    activeChip: 'bg-purple-400 text-black border-purple-400 font-semibold shadow-sm',
    glow: 'rgba(192, 132, 252, 0.15)',
  },
  all: {
    accent: 'text-zinc-300',
    border: 'border-white/20',
    badge: 'bg-white/[0.06] text-zinc-300 border-white/[0.08]',
    activeChip: 'bg-white text-black border-white font-semibold shadow-sm',
    glow: 'rgba(255, 255, 255, 0.15)',
  },
}

export function getCategoryBadgeClass(category) {
  return CATEGORY_STYLES[category]?.badge || 'bg-white/[0.06] text-zinc-300 border-white/[0.08]'
}

export function getCategoryAccent(category) {
  return CATEGORY_STYLES[category]?.accent || 'text-zinc-400'
}
