/**
 * Utility functions for exporting recommendations as TXT and PDF
 *
 * Format:
 *                  Display name    username
 * Title       Category        Platform/Source     Note
 */

import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { CATEGORIES } from '../constants/categories.js'

// Helper to sanitize filename
export function getSanitizedFilename(name, ext) {
  const clean = String(name || 'recumend')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
  const dateStr = new Date().toISOString().split('T')[0]
  return `${clean}_recs_${dateStr}.${ext}`
}

// Get display category label
export function getCategoryLabel(catId, customCat) {
  if (catId === 'other' && customCat) return customCat
  const found = CATEGORIES.find(c => c.id === catId)
  return found?.label || catId || 'Other'
}

// Get platform or source link
export function getPlatformOrSource(item) {
  return (
    item.metadata?.platform ||
    item.metadata?.author ||
    item.metadata?.topic ||
    item.metadata?.channel_link ||
    item.metadata?.custom_category ||
    '-'
  )
}

// Helper to estimate string width in Helvetica font to achieve clean centering
function estimateTextWidth(str, fontSize, isBold = false) {
  if (!str) return 0
  let units = 0
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    if (ch === 32) units += 278
    else if (ch >= 65 && ch <= 90) {
      if ('MW'.includes(str[i])) units += isBold ? 944 : 889
      else if ('IJ'.includes(str[i])) units += isBold ? 389 : 333
      else units += isBold ? 722 : 667
    } else if (ch >= 97 && ch <= 122) {
      if ('mw'.includes(str[i])) units += isBold ? 833 : 778
      else if ('ijlftr'.includes(str[i])) units += isBold ? 333 : 278
      else units += isBold ? 611 : 556
    } else if (ch >= 48 && ch <= 57) units += isBold ? 611 : 556
    else if ('.,:;!|/'.includes(str[i])) units += isBold ? 300 : 278
    else if ('()[]{}'.includes(str[i])) units += isBold ? 389 : 333
    else if ('@#%&'.includes(str[i])) units += isBold ? 889 : 778
    else units += isBold ? 600 : 500
  }
  return (units / 1000) * fontSize
}

/**
 * Format recommendation items into clean text columns
 */
export function formatRecsAsText({ userProfile, items = [] }) {
  const displayName = userProfile?.display_name || userProfile?.username || 'Curator'
  const cleanUsername = userProfile?.username ? `@${String(userProfile.username).replace(/^@/, '')}` : ''
  const userLine = cleanUsername ? `${displayName} (${cleanUsername})` : displayName
  const countLine = `${items.length} Recs. | recumend.vercel.app`

  const TABLE_WIDTH = 120
  function centerText(text, width = TABLE_WIDTH) {
    const s = String(text || '').trim()
    if (s.length >= width) return s
    const leftPad = Math.floor((width - s.length) / 2)
    return ' '.repeat(leftPad) + s
  }

  const header = `${centerText('RECUMEND')}\n` +
    `${centerText(userLine)}\n` +
    `${centerText(countLine)}\n\n` +
    `Title`.padEnd(34) +
    `Category`.padEnd(22) +
    `Platform/Source`.padEnd(26) +
    `Note\n` +
    `------------------------------------------------------------------------------------------------------------------------\n`

  const rows = items.map((item) => {
    const title = String(item.title || 'Untitled').slice(0, 32).padEnd(34)
    const category = String(getCategoryLabel(item.category, item.metadata?.custom_category)).slice(0, 20).padEnd(22)
    const source = String(getPlatformOrSource(item)).slice(0, 24).padEnd(26)
    const note = item.metadata?.note && item.metadata.note !== '-' ? `"${item.metadata.note}"` : '-'
    return `${title}${category}${source}${note}`
  }).join('\n')

  return header + rows + '\n'
}

/**
 * Clean, lightweight, zero-dependency PDF 1.4 generator
 * Outputs a valid, conforming binary PDF string with table formatting & pagination.
 */
export function buildRecsPdfBinary({ userProfile, items = [] }) {
  const displayName = userProfile?.display_name || userProfile?.username || 'Curator'
  const cleanUsername = userProfile?.username ? `@${String(userProfile.username).replace(/^@/, '')}` : ''
  const userLine = cleanUsername ? `${displayName} (${cleanUsername})` : displayName
  const countLine = `${items.length} Recs. | recumend.vercel.app`

  const PAGE_WIDTH = 595.28 // A4 width
  const PAGE_HEIGHT = 841.89 // A4 height
  const MARGIN_X = 40
  const MARGIN_BOTTOM = 35

  const colWidths = [160, 95, 110, 150] // Title, Category, Source, Note
  const colX = [
    MARGIN_X,
    MARGIN_X + colWidths[0],
    MARGIN_X + colWidths[0] + colWidths[1],
    MARGIN_X + colWidths[0] + colWidths[1] + colWidths[2]
  ]

  function escapePdf(str) {
    if (!str) return ''
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, '?') // Strictly printable ASCII for standard PDF fonts
  }

  function truncate(str, maxLen) {
    if (!str) return '-'
    const s = String(str).trim()
    return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s
  }

  const pages = []
  let currentPage = []
  let currentY = PAGE_HEIGHT - 36

  function startPage(isFirst) {
    currentPage = []
    currentY = PAGE_HEIGHT - 36

    if (isFirst) {
      // 1. Line 1: RECUMEND (18pt Bold, centered)
      const brandText = 'RECUMEND'
      const brandWidth = estimateTextWidth(brandText, 18, true)
      const brandX = ((PAGE_WIDTH - brandWidth) / 2).toFixed(2)
      currentPage.push(`BT /F2 18 Tf 0.05 0.05 0.07 rg ${brandX} ${currentY - 14} Td (${brandText}) Tj ET`)
      currentY -= 20

      // 2. Line 2: Displayname (username) (10.5pt, centered)
      const userWidth = estimateTextWidth(userLine, 10.5, false)
      const userX = ((PAGE_WIDTH - userWidth) / 2).toFixed(2)
      currentPage.push(`BT /F1 10.5 Tf 0.25 0.25 0.28 rg ${userX} ${currentY - 9} Td (${escapePdf(userLine)}) Tj ET`)
      currentY -= 15

      // 3. Line 3: (no. of recs) Recs. | recumend.vercel.app (8.5pt, centered)
      const metaWidth = estimateTextWidth(countLine, 8.5, false)
      const metaX = ((PAGE_WIDTH - metaWidth) / 2).toFixed(2)
      currentPage.push(`BT /F1 8.5 Tf 0.45 0.45 0.48 rg ${metaX} ${currentY - 7} Td (${escapePdf(countLine)}) Tj ET`)
      currentY -= 18
    } else {
      const subText = 'RECUMEND'
      const subWidth = estimateTextWidth(subText, 10, true)
      const subX = ((PAGE_WIDTH - subWidth) / 2).toFixed(2)
      currentPage.push(`BT /F2 10 Tf 0.4 0.4 0.4 rg ${subX} ${currentY - 8} Td (${subText}) Tj ET`)
      currentY -= 16
    }

    // Header top border
    currentPage.push(`0.15 0.15 0.20 RG 1.2 w ${MARGIN_X} ${currentY} m ${PAGE_WIDTH - MARGIN_X} ${currentY} l S`)
    currentY -= 14

    // Table Column Headers
    currentPage.push(`BT /F2 9 Tf 0.1 0.1 0.15 rg ${colX[0]} ${currentY} Td (TITLE) Tj ET`)
    currentPage.push(`BT /F2 9 Tf 0.1 0.1 0.15 rg ${colX[1]} ${currentY} Td (CATEGORY) Tj ET`)
    currentPage.push(`BT /F2 9 Tf 0.1 0.1 0.15 rg ${colX[2]} ${currentY} Td (PLATFORM/SOURCE) Tj ET`)
    currentPage.push(`BT /F2 9 Tf 0.1 0.1 0.15 rg ${colX[3]} ${currentY} Td (NOTE) Tj ET`)
    currentY -= 6

    // Header bottom border
    currentPage.push(`0.15 0.15 0.20 RG 1 w ${MARGIN_X} ${currentY} m ${PAGE_WIDTH - MARGIN_X} ${currentY} l S`)
    currentY -= 4

    pages.push(currentPage)
  }

  startPage(true)

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const rowHeight = 22
    if (currentY - rowHeight < MARGIN_BOTTOM) {
      startPage(false)
    }

    currentY -= 14
    const title = truncate(item.title || 'Untitled', 28)
    const cat = truncate(getCategoryLabel(item.category, item.metadata?.custom_category), 16)
    const src = truncate(getPlatformOrSource(item), 18)
    const note = truncate(item.metadata?.note || '-', 26)

    currentPage.push(`BT /F2 8.5 Tf 0.08 0.08 0.12 rg ${colX[0]} ${currentY} Td (${escapePdf(title)}) Tj ET`)
    currentPage.push(`BT /F1 8 Tf 0.35 0.35 0.40 rg ${colX[1]} ${currentY} Td (${escapePdf(cat)}) Tj ET`)
    currentPage.push(`BT /F1 8 Tf 0.35 0.35 0.40 rg ${colX[2]} ${currentY} Td (${escapePdf(src)}) Tj ET`)
    currentPage.push(`BT /F3 8 Tf 0.30 0.30 0.35 rg ${colX[3]} ${currentY} Td (${escapePdf(note)}) Tj ET`)

    currentY -= 6
    // Row light divider
    currentPage.push(`0.88 0.88 0.90 RG 0.5 w ${MARGIN_X} ${currentY} m ${PAGE_WIDTH - MARGIN_X} ${currentY} l S`)
  }

  // Build PDF Objects (Footers completely removed as requested)
  const totalPages = pages.length
  const pageObjIds = []
  const contentObjIds = []
  let nextObjId = 6

  for (let p = 0; p < totalPages; p++) {
    pageObjIds.push(nextObjId++)
    contentObjIds.push(nextObjId++)
  }

  const catalogObj = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`
  const pagesObj = `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${totalPages} >>\nendobj`
  const fontRegObj = `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj`
  const fontBoldObj = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj`
  const fontOblObj = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>\nendobj`

  const bodyObjects = [catalogObj, pagesObj, fontRegObj, fontBoldObj, fontOblObj]

  for (let p = 0; p < totalPages; p++) {
    const pageId = pageObjIds[p]
    const contentId = contentObjIds[p]
    const streamData = pages[p].join('\n')
    const streamLen = streamData.length

    const pageDef = `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>\nendobj`
    const contentDef = `${contentId} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamData}\nendstream\nendobj`

    bodyObjects.push(pageDef, contentDef)
  }

  let pdfText = `%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`
  const xrefOffsets = [0]

  for (const obj of bodyObjects) {
    xrefOffsets.push(pdfText.length)
    pdfText += `${obj}\n`
  }

  const startXref = pdfText.length
  pdfText += `xref\n0 ${bodyObjects.length + 1}\n`
  pdfText += `0000000000 65535 f \n`
  for (let i = 1; i <= bodyObjects.length; i++) {
    pdfText += `${String(xrefOffsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdfText += `trailer\n<< /Size ${bodyObjects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`

  return pdfText
}

// Convert binary string to base64
function binaryToBase64(binStr) {
  if (typeof btoa === 'function') {
    return btoa(binStr)
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(binStr, 'binary').toString('base64')
  }
  return ''
}

// Request filesystem permissions safely on Android
async function ensureStoragePermissions() {
  if (!Capacitor.isNativePlatform()) return true
  try {
    const status = await Filesystem.checkPermissions()
    if (status.publicStorage !== 'granted') {
      const request = await Filesystem.requestPermissions()
      return request.publicStorage === 'granted'
    }
    return true
  } catch (err) {
    console.warn('Filesystem permissions check not required or bypassed:', err)
    return true
  }
}

/**
 * Trigger dynamic text download.
 * On Native Mobile: Saves directly to device Documents folder.
 * On Web: Direct browser file download.
 */
export async function downloadRecsText({ userProfile, items = [] }) {
  const content = formatRecsAsText({ userProfile, items })
  const filename = getSanitizedFilename(userProfile?.username || 'my', 'txt')

  // On native mobile platforms (Android/iOS):
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureStoragePermissions()
      const fileRes = await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      })
      return { success: true, savedToDocuments: true, filename, uri: fileRes?.uri }
    } catch (err) {
      console.warn('Failed to save directly to Documents, attempting fallback share:', err)
      // Graceful fallback to cache + share if storage permission was strictly denied by user
      try {
        const cacheRes = await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        })
        await Share.share({
          title: 'My Recommendations - Recumend',
          files: [cacheRes.uri],
          dialogTitle: 'Save Recommendations'
        })
        return { success: true, savedToDocuments: false, filename }
      } catch (shareErr) {
        console.error('Export failed completely:', shareErr)
        return { success: false, error: shareErr?.message }
      }
    }
  }

  // On Web (Standard browser download):
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

  return { success: true, savedToDocuments: false, filename }
}

/**
 * PDF Export:
 * On Native Mobile: Generates a genuine .pdf file and downloads straight into device Documents storage.
 * On Web: Retains the native styled print dialog / window preview.
 */
export async function printRecsAsPdf({ userProfile, items = [] }) {
  const displayName = userProfile?.display_name || userProfile?.username || 'Curator'
  const username = userProfile?.username ? `@${userProfile.username}` : ''
  const filename = getSanitizedFilename(userProfile?.username || 'my', 'pdf')

  // On native mobile platforms (Android/iOS):
  // Generate real PDF binary and save directly to phone's Documents folder!
  if (Capacitor.isNativePlatform()) {
    try {
      const pdfBinary = buildRecsPdfBinary({ userProfile, items })
      const base64Data = binaryToBase64(pdfBinary)
      await ensureStoragePermissions()

      const fileRes = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents
      })

      return { success: true, savedToDocuments: true, filename, uri: fileRes?.uri }
    } catch (err) {
      console.warn('Direct PDF write to Documents failed, falling back to share:', err)
      try {
        const pdfBinary = buildRecsPdfBinary({ userProfile, items })
        const base64Data = binaryToBase64(pdfBinary)
        const cacheRes = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache
        })
        await Share.share({
          title: `${displayName} (${username}) - Recumend PDF`,
          files: [cacheRes.uri],
          dialogTitle: 'Save Recommendations PDF'
        })
        return { success: true, savedToDocuments: false, filename }
      } catch (shareErr) {
        console.error('Native PDF export failed:', shareErr)
        return { success: false, error: shareErr?.message }
      }
    }
  }

  // On Web: Directly download the generated .pdf file (no popup blockers, no print window)
  const pdfBinary = buildRecsPdfBinary({ userProfile, items })
  const len = pdfBinary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = pdfBinary.charCodeAt(i) & 0xff
  }

  const blob = new Blob([bytes], { type: 'application/pdf' })
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

  return { success: true, savedToDocuments: false, filename }
}
