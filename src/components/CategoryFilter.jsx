import React from 'react'
import { CATEGORIES } from '../constants/categories'

export { CATEGORIES }

export default function CategoryFilter({ selectedCategory, onSelectCategory }) {
  return (
    <nav
      className="flex items-center gap-1 overflow-x-auto pb-1.5 pt-0.5 border-b border-zinc-900 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none touch-pan-x"
      aria-label="Filter categories"
    >
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon
        const isActive = selectedCategory === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono transition-all duration-150 shrink-0 select-none ${
              isActive
                ? 'bg-zinc-100 text-zinc-950 font-semibold border-b-2 border-emerald-500 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 border-b-2 border-transparent'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-950' : 'text-zinc-500'}`} />
            <span>{cat.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
