import { Film, Tv, PlaySquare, BookOpen, Gamepad2, Video, Clapperboard, Layers, Globe, MoreHorizontal } from 'lucide-react'

// Supported recommendation categories, labels, and their matching icons
export const CATEGORIES = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'movie', label: 'Movies', icon: Film },
  { id: 'show', label: 'TV Shows', icon: Tv },
  { id: 'anime', label: 'Anime', icon: PlaySquare },
  { id: 'book', label: 'Books', icon: BookOpen },
  { id: 'game', label: 'Games', icon: Gamepad2 },
  { id: 'yt', label: 'YouTube', icon: Video },
  { id: 'docu', label: 'Documentaries', icon: Clapperboard },
  { id: 'app', label: 'App/Website', icon: Globe },
  { id: 'other', label: 'Others', icon: MoreHorizontal },
]

