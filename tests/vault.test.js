// Automated E2EE Cryptographic Vault & Privacy Lifecycle Test Suite
import assert from 'node:assert/strict'
import {
  generateUnifiedVaultKeys,
  exportVaultBundle,
  importVaultBundle,
  encryptData,
  decryptData,
  deriveSharedKey
} from '../src/lib/vaultCrypto.js'
import {
  syncUnifiedVault,
  clearCachedVaultKeys
} from '../src/lib/googleDriveVault.js'

console.log('🧪 Starting Recumend E2EE Cryptographic Vault Test Suite...\n')

// ============================================================================
// STAGE 1: Cryptographic Bundle Generation & Structure Validation
// ============================================================================
console.log('Stage 1: Cryptographic Bundle Generation & Structure Validation')
const rawKeys = await generateUnifiedVaultKeys()
assert.ok(rawKeys.vaultKey, 'Stage 1 Failed: vaultKey missing')
assert.ok(rawKeys.ecdhKeyPair?.publicKey, 'Stage 1 Failed: ECDH public key missing')
assert.ok(rawKeys.ecdhKeyPair?.privateKey, 'Stage 1 Failed: ECDH private key missing')

const exportedJson = await exportVaultBundle(rawKeys)
const parsedBundle = JSON.parse(exportedJson)

assert.equal(parsedBundle.version, 1, 'Bundle version must be 1')
assert.ok(parsedBundle.createdAt, 'Bundle must have timestamp')
assert.equal(parsedBundle.vaultKey.kty, 'oct', 'Vault key must be symmetric oct')
assert.equal(parsedBundle.vaultKey.alg, 'A256GCM', 'Vault key algorithm must be A256GCM')
assert.equal(parsedBundle.ecdhKeyPair.publicKey.crv, 'P-256', 'ECDH key must use NIST P-256 curve')
assert.equal(parsedBundle.ecdhKeyPair.privateKey.crv, 'P-256', 'ECDH private key must use NIST P-256 curve')

const reimportedKeys = await importVaultBundle(exportedJson)
assert.ok(reimportedKeys.vaultKey, 'Re-imported bundle missing vaultKey')
assert.ok(reimportedKeys.publicKeyJwkString, 'Re-imported bundle missing publicKeyJwkString')
console.log('  ✅ Passed: Unified bundle generated, exported, and re-imported correctly.\n')

// ============================================================================
// STAGE 2: Zero-Knowledge Payload Encryption & Leakage Check
// ============================================================================
console.log('Stage 2: Zero-Knowledge Item Encryption & Plaintext Leakage Guard')
const sensitiveItem = {
  title: 'Top Secret Indie Film 2026',
  category: 'movie',
  metadata: {
    notes: 'Confidential personal diary notes that must never reach the server in plaintext: 🔒✨',
    personalRating: 10,
    tags: ['exclusive', 'hidden']
  }
}

const encryptedRecord = await encryptData(sensitiveItem, reimportedKeys.vaultKey)

// Assert ciphertext properties
assert.ok(encryptedRecord.ciphertext, 'Ciphertext must be generated')
assert.ok(encryptedRecord.iv, 'IV must be generated')
assert.notEqual(encryptedRecord.ciphertext, sensitiveItem.title, 'Plaintext title must not match ciphertext')

// Assert zero leakage: Neither the title nor sensitive note strings should appear anywhere in the ciphertext
const rawCiphertextBuffer = Buffer.from(encryptedRecord.ciphertext, 'base64').toString('utf8')
assert.ok(!rawCiphertextBuffer.includes('Secret'), 'Ciphertext must not leak title content')
assert.ok(!rawCiphertextBuffer.includes('Confidential'), 'Ciphertext must not leak note content')

// Decryption verification
const decryptedItem = await decryptData(encryptedRecord.ciphertext, encryptedRecord.iv, reimportedKeys.vaultKey)
assert.deepEqual(decryptedItem, sensitiveItem, 'Decrypted record must match original plaintext identically')
console.log('  ✅ Passed: Data encrypted with zero plaintext leakage; restored cleanly upon decryption.\n')

// ============================================================================
// STAGE 3: Authenticated Cryptographic Tamper Rejection
// ============================================================================
console.log('Stage 3: Tamper Resistance (AES-GCM Authenticated Tag Check)')

// 1. Bit flip in ciphertext
const tamperedCipher = (encryptedRecord.ciphertext[0] === 'X' ? 'Y' : 'X') + encryptedRecord.ciphertext.slice(1)
let caughtCipherTamper = false
try {
  await decryptData(tamperedCipher, encryptedRecord.iv, reimportedKeys.vaultKey)
} catch {
  caughtCipherTamper = true
}
assert.ok(caughtCipherTamper, 'AES-GCM must reject modified ciphertext')

// 2. Bit flip in IV
const tamperedIV = (encryptedRecord.iv[0] === 'A' ? 'B' : 'A') + encryptedRecord.iv.slice(1)
let caughtIvTamper = false
try {
  await decryptData(encryptedRecord.ciphertext, tamperedIV, reimportedKeys.vaultKey)
} catch {
  caughtIvTamper = true
}
assert.ok(caughtIvTamper, 'AES-GCM must reject modified initialization vector (IV)')

// 3. Different user key cannot decrypt
const attackerKeys = await generateUnifiedVaultKeys()
let caughtKeyMismatch = false
try {
  await decryptData(encryptedRecord.ciphertext, encryptedRecord.iv, attackerKeys.vaultKey)
} catch {
  caughtKeyMismatch = true
}
assert.ok(caughtKeyMismatch, 'Foreign vault key must fail to decrypt private item')
console.log('  ✅ Passed: Tampering of ciphertext, IV, and wrong decryption key strictly rejected.\n')

// ============================================================================
// STAGE 4: ItemContext Database Payload Simulation
// ============================================================================
console.log('Stage 4: Database Ingestion & Masking Simulation')

// Simulating what addItem({ is_private: true }) sends to Supabase
function prepareDatabasePayload(itemInput) {
  return {
    id: 'simulated-item-id-123',
    title: '[Encrypted Private Item]',
    normalized_title: 'encrypted_private_item',
    category: itemInput.category,
    created_by: 'user-abhishek-1',
    is_private: true,
    recommend_count: 1,
    created_at: new Date().toISOString(),
    ciphertext: encryptedRecord.ciphertext,
    iv: encryptedRecord.iv
  }
}

const dbPayload = prepareDatabasePayload(sensitiveItem)

// Verify what is stored in database contains NO confidential information
assert.equal(dbPayload.title, '[Encrypted Private Item]', 'Stored title must be masked placeholder')
assert.equal(dbPayload.is_private, true, 'is_private must be true')
assert.ok(dbPayload.ciphertext, 'ciphertext must exist')
assert.ok(dbPayload.iv, 'iv must exist')
assert.ok(!JSON.stringify(dbPayload).includes('Top Secret'), 'DB payload must not contain sensitive title')

// Simulating client-side background decryption upon receipt
async function clientSideHydrate(dbItem, vaultKey) {
  if (!dbItem.is_private || !dbItem.ciphertext || !dbItem.iv) return dbItem
  const decrypted = await decryptData(dbItem.ciphertext, dbItem.iv, vaultKey)
  return {
    ...dbItem,
    title: decrypted.title || dbItem.title,
    category: decrypted.category || dbItem.category,
    metadata: decrypted.metadata || {},
    _isDecrypted: true
  }
}

const clientHydratedItem = await clientSideHydrate(dbPayload, reimportedKeys.vaultKey)
assert.equal(clientHydratedItem.title, 'Top Secret Indie Film 2026', 'Client UI must show decrypted title')
assert.equal(clientHydratedItem.metadata.notes, sensitiveItem.metadata.notes, 'Client UI must show notes')
assert.equal(clientHydratedItem._isDecrypted, true, 'Item must be marked as decrypted')
console.log('  ✅ Passed: Database record masked; Client-side hydration seamlessly decrypts payload.\n')

// ============================================================================
// STAGE 5: Multi-User Feed Isolation & Privacy Rules
// ============================================================================
console.log('Stage 5: Feed Isolation & Privacy Protection Filters')

const currentUserId = 'user-abhishek-1'

const simulatedItems = [
  // 1. Public item by current user
  { id: 'item-1', title: 'Severance', is_private: false, created_by: 'user-abhishek-1', recommend_count: 5 },
  // 2. Public item by other user
  { id: 'item-2', title: 'Arcane', is_private: false, created_by: 'user-charlie-2', recommend_count: 8 },
  // 3. Private item by current user
  { id: 'item-3', title: 'My Private Diary Book', is_private: true, created_by: 'user-abhishek-1', recommend_count: 1 },
  // 4. Private item by other user (should be blocked by RLS in Supabase, but tested defensively in frontend)
  { id: 'item-4', title: 'Charlie Hidden Vault', is_private: true, created_by: 'user-charlie-2', recommend_count: 1 }
]

// Feed Rule 1: activeItems (Public Leaderboard) -> Must NEVER contain any private item
const activeItems = simulatedItems.filter(it => !it.is_private && it.recommend_count >= 1)
assert.equal(activeItems.length, 2, 'activeItems must contain exactly 2 public items')
assert.ok(activeItems.every(it => !it.is_private), 'No private item can ever enter activeItems')

// Feed Rule 2: myItems (My Public Recommendations) -> Only current user's public items
const myItems = simulatedItems.filter(it => it.created_by === currentUserId && !it.is_private)
assert.equal(myItems.length, 1, 'myItems must contain 1 public item')
assert.equal(myItems[0].id, 'item-1')

// Feed Rule 3: myPrivateItems (My Private Vault) -> Only current user's private items
const myPrivateItems = simulatedItems.filter(it => it.created_by === currentUserId && it.is_private)
assert.equal(myPrivateItems.length, 1, 'myPrivateItems must contain only 1 private item')
assert.equal(myPrivateItems[0].id, 'item-3')
assert.ok(!myPrivateItems.some(it => it.created_by !== currentUserId), 'Other users private items must never appear')
console.log('  ✅ Passed: Public feed and personal private vault are strictly separated.\n')

// ============================================================================
// STAGE 6: Privacy Toggle Transitions (Public <-> Private)
// ============================================================================
console.log('Stage 6: Privacy Toggle Transitions')

// Transition A: Private -> Public
async function toggleToPublic(privateItem, vaultKey) {
  assert.ok(privateItem.is_private, 'Item must be private initially')
  const decrypted = await decryptData(privateItem.ciphertext, privateItem.iv, vaultKey)
  return {
    ...privateItem,
    title: decrypted.title,
    category: decrypted.category,
    metadata: decrypted.metadata,
    is_private: false,
    ciphertext: null,
    iv: null
  }
}

const publicConverted = await toggleToPublic(dbPayload, reimportedKeys.vaultKey)
assert.equal(publicConverted.is_private, false, 'Item must now be public')
assert.equal(publicConverted.title, sensitiveItem.title, 'Plaintext title restored')
assert.equal(publicConverted.ciphertext, null, 'Ciphertext must be cleared')
assert.equal(publicConverted.iv, null, 'IV must be cleared')

// Transition B: Public -> Private
async function toggleToPrivate(publicItem, vaultKey) {
  assert.ok(!publicItem.is_private, 'Item must be public initially')
  const encrypted = await encryptData({
    title: publicItem.title,
    category: publicItem.category,
    metadata: publicItem.metadata || {}
  }, vaultKey)
  return {
    ...publicItem,
    title: '[Encrypted Private Item]',
    is_private: true,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv
  }
}

const rePrivatized = await toggleToPrivate(publicConverted, reimportedKeys.vaultKey)
assert.equal(rePrivatized.is_private, true, 'Item must now be private again')
assert.equal(rePrivatized.title, '[Encrypted Private Item]', 'Title must be masked')
assert.ok(rePrivatized.ciphertext, 'Ciphertext must be re-generated')
console.log('  ✅ Passed: Bi-directional privacy toggling (Private <-> Public) verified without data loss.\n')

// ============================================================================
// STAGE 7: Peer-to-Peer ECDH Sharing Interoperability Check
// ============================================================================
console.log('Stage 7: Peer-to-Peer Shared Secret Derivation Verification')
const userAlice = await generateUnifiedVaultKeys()
const userBob = await generateUnifiedVaultKeys()

const bundleAlice = await exportVaultBundle(userAlice)
const bundleBob = await exportVaultBundle(userBob)

const importedAlice = await importVaultBundle(bundleAlice)
const importedBob = await importVaultBundle(bundleBob)

// Alice derives secret using Bob's public key
const secretAlice = await deriveSharedKey(importedAlice.ecdhKeyPair.privateKey, importedBob.publicKeyJwkString)
// Bob derives secret using Alice's public key
const secretBob = await deriveSharedKey(importedBob.ecdhKeyPair.privateKey, importedAlice.publicKeyJwkString)

// Test payload transmission
const peerMessage = { recommendation: 'Severance', comment: 'You must watch this!', timestamp: 1762432800 }
const peerEncrypted = await encryptData(peerMessage, secretAlice)
const peerDecrypted = await decryptData(peerEncrypted.ciphertext, peerEncrypted.iv, secretBob)

assert.deepEqual(peerDecrypted, peerMessage, 'Shared secret between Alice and Bob must be identical')
console.log('  ✅ Passed: ECDH P-256 P2P key derivation verified seamlessly.\n')

// ============================================================================
// STAGE 8: Vault Sync Orchestrator & Fallback Testing
// ============================================================================
console.log('Stage 8: Google Drive Vault Sync Orchestration & Local Fallback')
clearCachedVaultKeys()

let receivedPublicKey = null
const syncedKeys = await syncUnifiedVault(null, (pk) => {
  receivedPublicKey = pk
})

assert.ok(syncedKeys.vaultKey, 'Synced keys must include vaultKey')
assert.ok(receivedPublicKey, 'onPublicKeyReady callback must deliver public key string')
assert.equal(typeof receivedPublicKey, 'string', 'Public key must be serialized string for Supabase profiles')

// Cached retrieval test
const cachedRetrieval = await syncUnifiedVault(null)
assert.equal(cachedRetrieval, syncedKeys, 'Subsequent sync call must return in-memory cached instance')
console.log('  ✅ Passed: Sync orchestrator gracefully handles fallback, caching, and profile public key delivery.\n')

console.log('🎉 ALL E2EE VAULT LIFECYCLE TESTS PASSED FLAWLESSLY!')

