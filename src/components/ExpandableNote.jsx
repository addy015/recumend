import React, { useState, useRef, useEffect } from 'react'

/**
 * ExpandableNote component with interactive "... more" / "... less" toggle,
 * dynamically detecting overflow clamp to show read more on mobile screens.
 */
export default function ExpandableNote({
  note,
  borderColor = 'border-amber-400/40',
  textColor = 'text-zinc-300',
  className = 'mt-1'
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isClamped, setIsClamped] = useState(false)
  const textRef = useRef(null)

  const cleanNote = typeof note === 'string' ? note.trim() : ''
  if (!cleanNote) return null

  useEffect(() => {
    const el = textRef.current
    if (!el) return

    const checkOverflow = () => {
      // If expanded, don't re-measure scrollHeight vs clientHeight because it's uncapped
      if (!isExpanded) {
        setIsClamped(el.scrollHeight > el.clientHeight + 1)
      }
    }

    checkOverflow()

    let resizeObserver = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => checkOverflow())
      resizeObserver.observe(el)
    }

    window.addEventListener('resize', checkOverflow)
    return () => {
      window.removeEventListener('resize', checkOverflow)
      if (resizeObserver) resizeObserver.disconnect()
    }
  }, [cleanNote, isExpanded])

  const showToggle = isClamped || isExpanded

  return (
    <div className={className}>
      <p
        ref={textRef}
        className={`border-l-2 ${borderColor} pl-2.5 text-xs ${textColor} italic leading-relaxed break-words whitespace-pre-line ${
          isExpanded ? '' : 'line-clamp-2'
        }`}
      >
        "{cleanNote}"
      </p>
      {showToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded((prev) => !prev)
          }}
          className="mt-1 pl-2.5 text-[11px] font-mono font-medium text-amber-400/90 hover:text-amber-300 transition-colors cursor-pointer inline-flex items-center not-italic select-none"
        >
          {isExpanded ? '... less' : '... more'}
        </button>
      )}
    </div>
  )
}
