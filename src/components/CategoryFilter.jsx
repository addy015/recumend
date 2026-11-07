import React, { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CATEGORIES } from '../constants/categories'

export { CATEGORIES }

// Horizontal scrollable category filter buttons with left/right scroll controls
export default function CategoryFilter({ selectedCategory, onSelectCategory }) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Check whether content overflows left or right
  const checkScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 4)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4)
  }

  // Update scroll limits on mount, resize, and category changes
  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return

    const handleResize = () => checkScroll()
    window.addEventListener('resize', handleResize)

    let resizeObserver = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => checkScroll())
      resizeObserver.observe(el)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeObserver) resizeObserver.disconnect()
    }
  }, [])

  // Smooth scroll left or right by a chunk
  const handleScroll = (direction) => {
    if (!scrollRef.current) return
    const scrollAmount = direction === 'left' ? -260 : 260
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    setTimeout(checkScroll, 320)
  }

  return (
    <div className="relative border-b border-stone-200 pb-2">
      {/* Left Scroll Button Overlay */}
      <div
        className={`absolute left-0 top-0 bottom-2 flex items-center pr-8 pl-0.5 bg-gradient-to-r from-[#F7F6F2] via-[#F7F6F2]/90 to-transparent z-10 pointer-events-none transition-opacity duration-200 ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={() => handleScroll('left')}
          disabled={!canScrollLeft}
          tabIndex={canScrollLeft ? 0 : -1}
          aria-label="Scroll categories left"
          className="p-1.5 rounded-full bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 text-stone-700 shadow-xs pointer-events-auto cursor-pointer transition-transform hover:scale-105 active:scale-95"
          title="Scroll left"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Horizontal scrollable nav */}
      <nav
        ref={scrollRef}
        onScroll={checkScroll}
        className="w-full flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none touch-pan-x scroll-smooth py-0.5"
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

      {/* Right Scroll Button Overlay */}
      <div
        className={`absolute right-0 top-0 bottom-2 flex items-center pl-8 pr-0.5 bg-gradient-to-l from-[#F7F6F2] via-[#F7F6F2]/90 to-transparent z-10 pointer-events-none transition-opacity duration-200 ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={() => handleScroll('right')}
          disabled={!canScrollRight}
          tabIndex={canScrollRight ? 0 : -1}
          aria-label="Scroll categories right"
          className="p-1.5 rounded-full bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 text-stone-700 shadow-xs pointer-events-auto cursor-pointer transition-transform hover:scale-105 active:scale-95"
          title="Scroll right"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
