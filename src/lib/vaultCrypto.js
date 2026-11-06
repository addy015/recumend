// Native Web Crypto API Module
// Handles client-side encryption for personal private recommendations
// and prepares ECDH key derivation for friend-to-friend sharing.

// Helper: Safely access the browser or runtime's built-in Web Crypto engine
function getCrypto() {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto
  }
  throw new Error('Web Crypto API is not available in this environment')
}

// Helper: Convert raw binary memory buffers into standard Base64 text (for JSON and database storage)
export function bufferToBase64(buffer) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64')
  }
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

// Helper: Convert Base64 text back into raw binary memory buffers
export function base64ToBuffer(base64) {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64')
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  }
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Helper: Convert a byte array into Base64
export function uint8ArrayToBase64(uint8) {
  return bufferToBase64(uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength))
}

// Helper: Convert Base64 back into a byte array
export function base64ToUint8Array(base64) {
  return new Uint8Array(base64ToBuffer(base64))
}

// ----------------------------------------------------------------------------
// Step 1: Generate Master Vault Keys
// Creates two keys together in one step:
// 1. AES-GCM (256-bit): Symmetric key to lock and unlock personal private items.
// 2. ECDH (P-256): Asymmetric keypair to allow peer-to-peer sharing with friends.
// ----------------------------------------------------------------------------
export async function generateUnifiedVaultKeys() {
  const crypto = getCrypto()

  // Generate AES-256 key for personal private items
  const vaultKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )

  // Generate ECDH P-256 keypair for future direct sharing with other users
  const ecdhKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )

  return { vaultKey, ecdhKeyPair }
}

// ----------------------------------------------------------------------------
// Step 2: Export Keys to a Single JSON File
// Packs both keys into a clean JSON bundle so they can be stored in Google Drive AppData.
// ----------------------------------------------------------------------------
export async function exportVaultBundle({ vaultKey, ecdhKeyPair }) {
  const crypto = getCrypto()

  // Export raw keys into standard portable JWK (JSON Web Key) format
  const vaultJwk = await crypto.subtle.exportKey('jwk', vaultKey)
  const publicJwk = await crypto.subtle.exportKey('jwk', ecdhKeyPair.publicKey)
  const privateJwk = await crypto.subtle.exportKey('jwk', ecdhKeyPair.privateKey)

  return JSON.stringify({
    version: 1,
    createdAt: new Date().toISOString(),
    vaultKey: vaultJwk,
    ecdhKeyPair: {
      publicKey: publicJwk,
      privateKey: privateJwk
    }
  })
}

// ----------------------------------------------------------------------------
// Step 3: Import Keys from JSON File Back into Usable Crypto Objects
// Reads the JSON bundle downloaded from Google Drive and restores active CryptoKey objects.
// ----------------------------------------------------------------------------
export async function importVaultBundle(bundleData) {
  const crypto = getCrypto()
  const data = typeof bundleData === 'string' ? JSON.parse(bundleData) : bundleData

  if (!data?.vaultKey || !data?.ecdhKeyPair?.publicKey || !data?.ecdhKeyPair?.privateKey) {
    throw new Error('Invalid vault bundle format')
  }

  // Restore the AES personal vault key
  const vaultKey = await crypto.subtle.importKey(
    'jwk',
    data.vaultKey,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  )

  // Restore the user's public sharing key
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    data.ecdhKeyPair.publicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  )

  // Restore the user's private sharing key
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    data.ecdhKeyPair.privateKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )

  return {
    vaultKey,
    ecdhKeyPair: { publicKey, privateKey },
    publicKeyJwkString: JSON.stringify(data.ecdhKeyPair.publicKey)
  }
}

// ----------------------------------------------------------------------------
// Step 4: Encrypt an Item
// Takes plaintext title, notes, and metadata, and encrypts them using AES-GCM 256.
// Generates a fresh random 12-byte IV (initialization vector) on every encryption.
// Returns { ciphertext: base64, iv: base64 }
// ----------------------------------------------------------------------------
export async function encryptData(data, cryptoKey) {
  const crypto = getCrypto()
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data)
  const encoded = new TextEncoder().encode(jsonStr)
  
  // 12-byte (96-bit) random IV ensures identical titles produce completely different ciphertexts
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoded
  )

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: uint8ArrayToBase64(iv)
  }
}

// ----------------------------------------------------------------------------
// Step 5: Decrypt an Item
// Takes ciphertext and IV, and decrypts back into original plaintext data.
// AES-GCM is an authenticated cipher: if anyone modifies or tampers with the ciphertext,
// this will automatically fail and throw an error to prevent forgery.
// ----------------------------------------------------------------------------
export async function decryptData(ciphertextBase64, ivBase64, cryptoKey) {
  const crypto = getCrypto()
  const ciphertext = base64ToBuffer(ciphertextBase64)
  const iv = base64ToUint8Array(ivBase64)

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  )

  const decryptedStr = new TextDecoder().decode(decryptedBuffer)
  try {
    return JSON.parse(decryptedStr)
  } catch {
    return decryptedStr
  }
}

// ----------------------------------------------------------------------------
// Step 6: Derive Shared Encryption Key for Friend-to-Friend Sharing
// Alice combines her own private key with Bob's public key to calculate a shared
// secret key that only Alice and Bob know. This enables direct P2P sharing.
// ----------------------------------------------------------------------------
export async function deriveSharedKey(myPrivateKey, theirPublicKeyJwk) {
  const crypto = getCrypto()
  const theirJwk = typeof theirPublicKeyJwk === 'string' ? JSON.parse(theirPublicKeyJwk) : theirPublicKeyJwk

  // Import friend's public key
  const theirPublicKey = await crypto.subtle.importKey(
    'jwk',
    theirJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Calculate shared AES-256 key from Alice's private key + Bob's public key
  return await crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}
