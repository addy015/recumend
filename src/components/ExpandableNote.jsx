import React, { useState } from 'react'

/**
 * ExpandableNote component with interactive "... more" / "... less" toggle,
 * matching the Leaderboard ItemCard layout and typography.
 */
export default function ExpandableNote({
  note,
  borderColor = 'border-amber-400/40',
  textColor = 'text-zinc-300',
  className = 'mt-1'
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const cleanNote = typeof note === 'string' ? note.trim() : ''
  if (!cleanNote) return null

  const isLongNote = cleanNote.length > 95 || cleanNote.includes('\n')

  return (
    <div className={className}>
      <p
        className={`border-l-2 ${borderColor} pl-2.5 text-xs ${textColor} italic leading-relaxed break-words whitespace-pre-line ${
          isExpanded ? '' : 'line-clamp-2'
        }`}
      >
        "{cleanNote}"
      </p>
      {isLongNote && (
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
