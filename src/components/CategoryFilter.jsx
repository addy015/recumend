import React from 'react'
import { CATEGORIES } from '../constants/categories'

export { CATEGORIES }

// Horizontal scrollable category filter buttons
export default function CategoryFilter({ selectedCategory, onSelectCategory }) {
  return (
    <nav
      className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-0.5 border-b border-stone-200 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none touch-pan-x"
      aria-label="Filter categories"
    >
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon
        const isActive = selectedCategory === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono transition-all duration-150 shrink-0 select-none cursor-pointer rounded-full ${
              isActive
                ? 'bg-zinc-950 text-white font-semibold shadow-xs'
                : 'bg-white hover:bg-stone-100 text-stone-600 hover:text-zinc-900 border border-stone-200'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-stone-500'}`} />
            <span>{cat.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
