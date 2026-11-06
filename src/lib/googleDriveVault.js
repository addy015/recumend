// Automatically derives a deterministic AES-256 vault key for each user using
// PBKDF2 (100,000 iterations with SHA-256).
//
// This guarantees:
// 1. Same key on all devices, browsers (Safari, Chrome, Firefox, Edge, Mobile),
//    ports (5173, 5174), and domains (localhost, recumend.vercel.app).
// 2. Zero network requests/403 errors/network timeouts.
// 3. Backward-compatible fallback for previously encrypted items.
import {
  deriveDeterministicVaultKey,
  importVaultBundle
} from './vaultCrypto.js'

// Legacy fallback storage key
const LEGACY_VAULT_STORAGE_KEY = 'recumend_mock_vault_bundle'

// In-memory cache so derivation only occurs once per user session
let cachedVaultKeys = null
let cachedUserId = null

// Returns the cached keys if already loaded in this session
export function getCachedVaultKeys() {
  return cachedVaultKeys
}

// Clears the cached keys (used on user logout)
export function clearCachedVaultKeys() {
  cachedVaultKeys = null
  cachedUserId = null
}

// ----------------------------------------------------------------------------
// Automatic Vault Synchronization
// Called on user login or session initialization.
// ----------------------------------------------------------------------------
export async function syncUnifiedVault(arg1, arg2) {
  let user = null
  let onPublicKeyReady = null

  if (arg1 && typeof arg1 === 'object' && !('byteLength' in arg1) && ('user' in arg1 || 'onPublicKeyReady' in arg1)) {
    user = arg1.user || null
    onPublicKeyReady = arg1.onPublicKeyReady || null
  } else {
    onPublicKeyReady = arg2 || null
  }

  const userId = user?.id || 'demo_user'

  // Return memory cached keys immediately if user matches
  if (cachedVaultKeys && cachedUserId === userId) {
    return cachedVaultKeys
  }

  // 1. Derive deterministic personal vault key for this user
  const vaultKey = await deriveDeterministicVaultKey(userId)

  // 2. Load any legacy local bundle as fallback key so previously encrypted items still decrypt
  const fallbackKeys = []
  if (typeof window !== 'undefined') {
    const legacySaved = localStorage.getItem(`recumend_vault_${userId}`) || localStorage.getItem(LEGACY_VAULT_STORAGE_KEY)
    if (legacySaved) {
      try {
        const legacy = await importVaultBundle(legacySaved)
        if (legacy?.vaultKey) {
          fallbackKeys.push(legacy.vaultKey)
        }
      } catch {
        // ignore legacy parse errors
      }
    }
  }

  const result = {
    vaultKey,
    fallbackKeys
  }

  cachedVaultKeys = result
  cachedUserId = userId
  return result
}
