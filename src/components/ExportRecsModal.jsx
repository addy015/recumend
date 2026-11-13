import React, { useState, useRef, useEffect } from 'react'
import { X, Download, FileText, ShieldCheck } from 'lucide-react'
import { downloadRecsText, printRecsAsPdf } from '../lib/exportUtils'
import { registerBackHandler } from '../lib/backButtonHandler'

export default function ExportRecsModal({
  isOpen,
  onClose,
  userProfile,
  myItems = [],
  upvotedItems = [],
  myPrivateItems = [],
  onToast
}) {
  const [includeCreated, setIncludeCreated] = useState(true)
  const [includeUpvoted, setIncludeUpvoted] = useState(true)
  const [includePrivate, setIncludePrivate] = useState(false)
  const [format, setFormat] = useState('pdf') // 'pdf' | 'txt'

  const backdropMouseDownRef = useRef(false)

  // Escape key & Android hardware back button handler
  useEffect(() => {
    if (!isOpen) return
    const unregister = registerBackHandler(() => {
      onClose()
      return true
    })
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      unregister()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Compute total selected count
  const selectedCount =
    (includeCreated ? myItems.length : 0) +
    (includeUpvoted ? upvotedItems.length : 0) +
    (includePrivate ? myPrivateItems.length : 0)

  const handleExport = async () => {
    if (selectedCount === 0) {
      onToast?.({ message: 'Please select at least one group to export.', type: 'error' })
      return
    }

    // Aggregate items based on selected checkboxes
    const exportPool = []
    if (includeCreated) {
      exportPool.push(...myItems)
    }
    if (includeUpvoted) {
      exportPool.push(...upvotedItems)
    }
    if (includePrivate) {
      exportPool.push(...myPrivateItems)
    }

    if (format === 'txt') {
      const res = await downloadRecsText({ userProfile, items: exportPool })
      onToast?.({
        message: res?.savedToDocuments
          ? `Downloaded ${res.filename} to Documents`
          : `Downloaded ${exportPool.length} recommendations as .txt`
      })
    } else {
      const res = await printRecsAsPdf({ userProfile, items: exportPool })
      onToast?.({
        message: res?.savedToDocuments
          ? `Downloaded ${res.filename} to Documents`
          : `Downloaded ${exportPool.length} recommendations as .pdf`
      })
    }

    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && backdropMouseDownRef.current) {
          onClose()
        }
        backdropMouseDownRef.current = false
      }}
    >
      <div
        className="w-full max-w-md bg-[#121212] border border-white/[0.12] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 text-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-amber-400" />
            <h2 id="export-modal-title" className="font-display text-base font-bold text-white tracking-tight">
              Export Recommendations
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close export dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Checkbox Options */}
        <div className="space-y-2">
          <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Select items to include:
          </label>

          <div className="space-y-2 bg-black/40 border border-white/[0.06] p-3 rounded-xl">
            {/* Created */}
            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer select-none">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={includeCreated}
                  onChange={(e) => setIncludeCreated(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 text-amber-400 focus:ring-amber-400 focus:ring-offset-0 bg-transparent cursor-pointer"
                />
                <span className="text-xs font-medium text-zinc-200">Created (Public)</span>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                {myItems.length} {myItems.length === 1 ? 'item' : 'items'}
              </span>
            </label>

            {/* Upvoted */}
            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer select-none">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={includeUpvoted}
                  onChange={(e) => setIncludeUpvoted(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 text-amber-400 focus:ring-amber-400 focus:ring-offset-0 bg-transparent cursor-pointer"
                />
                <span className="text-xs font-medium text-zinc-200">Upvoted</span>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                {upvotedItems.length} {upvotedItems.length === 1 ? 'item' : 'items'}
              </span>
            </label>

            {/* Private Vault */}
            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer select-none">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={includePrivate}
                  onChange={(e) => setIncludePrivate(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 text-amber-400 focus:ring-amber-400 focus:ring-offset-0 bg-transparent cursor-pointer"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-zinc-200">Private Vault</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                {myPrivateItems.length} {myPrivateItems.length === 1 ? 'item' : 'items'}
              </span>
            </label>
          </div>
        </div>

        {/* Format Selector */}
        <div className="space-y-2">
          <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Export Format:
          </label>
          <div className="grid grid-cols-2 gap-2">
             <button
              type="button"
              onClick={() => setFormat('pdf')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                format === 'pdf'
                  ? 'bg-white text-black border-white shadow-sm'
                  : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:text-white'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>PDF Sheet (.pdf)</span>
            </button>
            <button
              type="button"
              onClick={() => setFormat('txt')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                format === 'txt'
                  ? 'bg-white text-black border-white shadow-sm'
                  : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Plain Text (.txt)</span>
            </button>


          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
          <span className="text-xs font-mono text-zinc-500">
            {selectedCount} {selectedCount === 1 ? 'item' : 'items'} ready
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleExport}
              className="flex items-center gap-2 px-5 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
