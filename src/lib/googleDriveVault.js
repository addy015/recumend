// Google Drive REST API Integration for Hidden AppDataFolder
// Silently fetches or creates the user's master encryption file (recumend_vault.json).
//
// Files saved here cannot be seen, edited, or accidentally deleted by the user inside drive.google.com,
// and other Google Drive apps cannot access it.

import {
  generateUnifiedVaultKeys,
  exportVaultBundle,
  importVaultBundle
} from './vaultCrypto.js'

// Name of the master vault file inside Google Drive AppData
const VAULT_FILE_NAME = 'recumend_vault.json'

// Local storage key used when running offline or in demo mode without Google login
const MOCK_VAULT_STORAGE_KEY = 'recumend_mock_vault_bundle'

// In-memory cache so we only fetch/decrypt the vault keys once per browser session
let cachedVaultKeys = null

// Returns the cached keys if already loaded in this session
export function getCachedVaultKeys() {
  return cachedVaultKeys
}

// Clears the cached keys (used on user logout)
export function clearCachedVaultKeys() {
  cachedVaultKeys = null
}

// ----------------------------------------------------------------------------
// Step 1: Search for Existing Vault File in Google Drive
// Looks inside the user's hidden 'appDataFolder' to see if 'recumend_vault.json' already exists.
// ----------------------------------------------------------------------------
async function findVaultFile(providerToken) {
  const query = encodeURIComponent(`name='${VAULT_FILE_NAME}' and trashed=false`)
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${providerToken}`,
      Accept: 'application/json'
    }
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Google Drive search failed (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  // Return file metadata if found, otherwise null
  return data.files && data.files.length > 0 ? data.files[0] : null
}

// ----------------------------------------------------------------------------
// Step 2: Download Vault File Content from Google Drive
// Fetches the raw JSON string from the user's Google Drive file ID.
// ----------------------------------------------------------------------------
async function downloadVaultFile(providerToken, fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${providerToken}`,
      Accept: 'application/json'
    }
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Google Drive download failed (${res.status}): ${errorText}`)
  }

  return await res.text()
}

// ----------------------------------------------------------------------------
// Step 3: Upload New Vault File to Google Drive (Multipart Request)
// Creates a new file in 'appDataFolder' containing both file metadata and JSON file contents.
// ----------------------------------------------------------------------------
async function uploadVaultFile(providerToken, bundleJsonString) {
  const boundary = '-------RecumendVaultBoundary' + Math.random().toString(36).substring(2)
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  // Metadata specifies the filename and that it belongs in the hidden appDataFolder
  const metadata = {
    name: VAULT_FILE_NAME,
    parents: ['appDataFolder']
  }

  // Combine metadata part and file content part into a multipart payload
  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    bundleJsonString +
    closeDelimiter

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${providerToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Google Drive upload failed (${res.status}): ${errorText}`)
  }

  return await res.json()
}

// ----------------------------------------------------------------------------
// Step 4: Local Fallback for Offline or Demo Mode
// If the user is running without Google login, saves keys safely in browser localStorage.
// ----------------------------------------------------------------------------
async function syncMockLocalVault(onPublicKeyReady) {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(MOCK_VAULT_STORAGE_KEY) : null
    if (stored) {
      const keys = await importVaultBundle(stored)
      cachedVaultKeys = keys
      if (onPublicKeyReady && keys.publicKeyJwkString) {
        onPublicKeyReady(keys.publicKeyJwkString)
      }
      return keys
    }

    // Generate fresh demo keys if none exist in localStorage
    const generated = await generateUnifiedVaultKeys()
    const bundleJson = await exportVaultBundle(generated)
    if (typeof window !== 'undefined') {
      localStorage.setItem(MOCK_VAULT_STORAGE_KEY, bundleJson)
    }

    const imported = await importVaultBundle(bundleJson)
    cachedVaultKeys = imported
    if (onPublicKeyReady && imported.publicKeyJwkString) {
      onPublicKeyReady(imported.publicKeyJwkString)
    }
    return imported
  } catch (err) {
    console.error('Mock vault initialization error:', err)
    throw err
  }
}

// ----------------------------------------------------------------------------
// Step 5: Main Orchestrator (Called on User Login)
// Checks if vault already exists in Google Drive:
// - If yes: Downloads it and restores keys.
// - If no: Generates fresh keys, uploads them to Google Drive, and saves public key to profile.
// ----------------------------------------------------------------------------
export async function syncUnifiedVault(providerToken, onPublicKeyReady) {
  // If keys are already in memory for this session, return them immediately
  if (cachedVaultKeys) {
    return cachedVaultKeys
  }

  // If no Google provider token is available, use local fallback
  if (!providerToken) {
    return await syncMockLocalVault(onPublicKeyReady)
  }

  try {
    // 1. Check if vault file already exists in Google Drive AppData
    const existingFile = await findVaultFile(providerToken)

    if (existingFile) {
      // 2. Download existing vault and import keys
      const downloadedJson = await downloadVaultFile(providerToken, existingFile.id)
      const keys = await importVaultBundle(downloadedJson)
      cachedVaultKeys = keys

      // Notify profile to store public key for peer-to-peer sharing
      if (onPublicKeyReady && keys.publicKeyJwkString) {
        onPublicKeyReady(keys.publicKeyJwkString)
      }
      return keys
    }

    // 3. First time user: generate fresh keys and upload to Google Drive
    const generated = await generateUnifiedVaultKeys()
    const bundleJson = await exportVaultBundle(generated)

    await uploadVaultFile(providerToken, bundleJson)

    const imported = await importVaultBundle(bundleJson)
    cachedVaultKeys = imported

    if (onPublicKeyReady && imported.publicKeyJwkString) {
      onPublicKeyReady(imported.publicKeyJwkString)
    }
    return imported
  } catch (err) {
    console.error('Unified vault synchronization error:', err)
    // If Google Drive API errors out (e.g. temporary network issue), fall back gracefully to local session
    if (err.message?.includes('Google Drive')) {
      console.warn('Falling back to local session vault due to Google Drive API error')
      return await syncMockLocalVault(onPublicKeyReady)
    }
    throw err
  }
}
