/**
 * Utility functions for exporting recommendations as TXT and PDF * 
 *                  Display name    username
 * Title       Category        Platform/Source     Note
 */

import { CATEGORIES } from '../constants/categories.js'

// Helper to sanitize filename
function getSanitizedFilename(name, ext) {
  const clean = String(name || 'recumend')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
  const dateStr = new Date().toISOString().split('T')[0]
  return `${clean}_recs_${dateStr}.${ext}`
}

// Get display category label
function getCategoryLabel(catId, customCat) {
  if (catId === 'other' && customCat) return customCat
  const found = CATEGORIES.find(c => c.id === catId)
  return found?.label || catId || 'Other'
}

// Get platform or source link
function getPlatformOrSource(item) {
  return (
    item.metadata?.platform ||
    item.metadata?.author ||
    item.metadata?.topic ||
    item.metadata?.channel_link ||
    item.metadata?.custom_category ||
    '-'
  )
}

/**
 * Format recommendation items into clean text columns
 */
export function formatRecsAsText({ userProfile, items = [] }) {
  const displayName = userProfile?.display_name || userProfile?.username || 'Curator'
  const username = userProfile?.username ? `@${userProfile.username}` : ''

  const header = `                  ${displayName}    ${username}\n\n` +
    `Title`.padEnd(34) +
    `Category`.padEnd(22) +
    `Platform/Source`.padEnd(26) +
    `Note\n` +
    `------------------------------------------------------------------------------------------------------------------------\n`

  const rows = items.map((item) => {
    const title = String(item.title || 'Untitled').slice(0, 32).padEnd(34)
    const category = String(getCategoryLabel(item.category, item.metadata?.custom_category)).slice(0, 20).padEnd(22)
    const source = String(getPlatformOrSource(item)).slice(0, 24).padEnd(26)
    const note = item.metadata?.note ? `"${item.metadata.note}"` : '-'
    return `${title}${category}${source}${note}`
  }).join('\n')

  const footer = `\n------------------------------------------------------------------------------------------------------------------------\n` +
    `Total: ${items.length} recommendation${items.length === 1 ? '' : 's'} • Exported from recumend.vercel.app\n`

  return header + rows + footer
}

/**
 * Trigger dynamic client-side text download ONLY on user click
 */
export function downloadRecsText({ userProfile, items = [] }) {
  const content = formatRecsAsText({ userProfile, items })
  const filename = getSanitizedFilename(userProfile?.username || 'my', 'txt')

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()

  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 200)
}

/**
 * Open a printable window styled for PDF export
 * (Triggers browser native 'Save as PDF' / Print)
 */
export function printRecsAsPdf({ userProfile, items = [] }) {
  const displayName = userProfile?.display_name || userProfile?.username || 'Curator'
  const username = userProfile?.username ? `@${userProfile.username}` : ''

  const rowsHtml = items.map((item) => {
    const title = item.title || 'Untitled'
    const category = getCategoryLabel(item.category, item.metadata?.custom_category)
    const source = getPlatformOrSource(item)
    const note = item.metadata?.note ? `"${item.metadata.note}"` : '-'

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 8px; font-weight: 600; color: #111827;">${escapeHtml(title)}</td>
        <td style="padding: 10px 8px; color: #4b5563; font-family: monospace; font-size: 11px;">${escapeHtml(category)}</td>
        <td style="padding: 10px 8px; color: #4b5563; font-size: 11px;">${escapeHtml(source)}</td>
        <td style="padding: 10px 8px; color: #374151; font-style: italic; font-size: 11px;">${escapeHtml(note)}</td>
      </tr>
    `
  }).join('')

  const printWindow = window.open('', '_blank', 'width=850,height=900')
  if (!printWindow) {
    alert('Please allow popups to export as PDF')
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(username)}-recs</title>
      <style>
        @page {
          size: auto;
          margin: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #111827;
          background: #ffffff;
          margin: 0;
          padding: 18mm 20mm;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .app-title {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          text-transform: uppercase;
          margin: 0;
        }
        .user-line {
          font-size: 14px;
          color: #4b5563;
          margin-top: 6px;
          font-family: monospace;
        }
        .user-line strong {
          color: #111827;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 12px;
        }
        th {
          padding: 8px 8px;
          border-top: 1.5px solid #111827;
          border-bottom: 1.5px solid #111827;
          font-size: 11px;
          font-family: monospace;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #111827;
        }
        .footer {
          margin-top: 32px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 11px;
          color: #6b7280;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="app-title">recumend</h1>
        <div class="user-line">
          <strong>${escapeHtml(displayName)}</strong> - &nbsp; ${escapeHtml(username)}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 32%;">Title</th>
            <th style="width: 20%;">Category</th>
            <th style="width: 20%;">Platform/Source</th>
            <th style="width: 28%;">Note</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        Total: ${items.length} recommendation${items.length === 1 ? '' : 's'} • recumend.vercel.app
      </div>

      <script>
        window.onload = function() {
          window.focus();
          window.print();
        };
      </script>
    </body>
    </html>
  `)
  printWindow.document.close()
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
