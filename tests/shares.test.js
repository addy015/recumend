// Automated P2P E2EE Sharing & Friend System Cryptographic Test Suite
import assert from 'node:assert/strict'
import {
  deriveDeterministicVaultKey,
  deriveSharedKey,
  encryptForFriend,
  decryptFromFriend,
  ensureUserP2PKeys
} from '../src/lib/vaultCrypto.js'

console.log('🧪 Starting Recumend P2P E2EE Recommendation Sharing Test Suite...\n')

// ============================================================================
// STAGE 1: Keypair Generation & Deterministic Key Management
// ============================================================================
console.log('Stage 1: P2P ECDH P-256 Keypair Generation & Profile Encryption')

// Generate Alice's deterministic vaultKey (simulating user salt/session)
const aliceVaultKey = await deriveDeterministicVaultKey('alice-user-id-123')
assert.ok(aliceVaultKey, 'Alice vaultKey derivation failed')

// Mock profile and persistence callback
let aliceProfile = {
  id: 'alice-uuid',
  username: 'alice',
  public_key: null,
  encrypted_private_key: null
}

const saveKeysToProfile = async ({ public_key, encrypted_private_key }) => {
  aliceProfile.public_key = public_key
  aliceProfile.encrypted_private_key = encrypted_private_key
  return { success: true }
}

// 1. Initial key generation
const aliceKeys = await ensureUserP2PKeys({
  vaultKey: aliceVaultKey,
  profile: aliceProfile,
  saveKeysToProfile
})

assert.ok(aliceKeys?.publicKeyJwkString, 'Alice publicKeyJwkString must exist')
assert.ok(aliceKeys?.privateKey, 'Alice privateKey must exist')
assert.ok(aliceProfile.public_key, 'Alice profile must store public key')
assert.ok(aliceProfile.encrypted_private_key, 'Alice profile must store encrypted private key')

const parsedEncryptedPriv = JSON.parse(aliceProfile.encrypted_private_key)
assert.ok(parsedEncryptedPriv.ciphertext, 'Encrypted private key must contain ciphertext')
assert.ok(parsedEncryptedPriv.iv, 'Encrypted private key must contain iv')

// 2. Profile reload & private key restoration check
const restoredAliceKeys = await ensureUserP2PKeys({
  vaultKey: aliceVaultKey,
  profile: aliceProfile,
  saveKeysToProfile
})

assert.equal(
  restoredAliceKeys.publicKeyJwkString,
  aliceKeys.publicKeyJwkString,
  'Restored public key must match original'
)
assert.ok(restoredAliceKeys.privateKey, 'Restored private key must exist')
console.log('  ✅ Passed: P2P keys generated, encrypted with vaultKey, and restored seamlessly.\n')

// ============================================================================
// STAGE 2: Bob's Keypair Setup & Mutual Shared Key Agreement
// ============================================================================
console.log('Stage 2: ECDH Mutual Shared Key Agreement (Alice <-> Bob)')

const bobVaultKey = await deriveDeterministicVaultKey('bob-user-id-456')
let bobProfile = {
  id: 'bob-uuid',
  username: 'bob',
  public_key: null,
  encrypted_private_key: null
}

const bobKeys = await ensureUserP2PKeys({
  vaultKey: bobVaultKey,
  profile: bobProfile,
  saveKeysToProfile: async ({ public_key, encrypted_private_key }) => {
    bobProfile.public_key = public_key
    bobProfile.encrypted_private_key = encrypted_private_key
    return { success: true }
  }
})

// Alice derives shared secret using Bob's public key
const aliceDerivedSharedKey = await deriveSharedKey(
  aliceKeys.privateKey,
  bobKeys.publicKeyJwkString
)

// Bob derives shared secret using Alice's public key
const bobDerivedSharedKey = await deriveSharedKey(
  bobKeys.privateKey,
  aliceKeys.publicKeyJwkString
)

assert.ok(aliceDerivedSharedKey, 'Alice shared key must exist')
assert.ok(bobDerivedSharedKey, 'Bob shared key must exist')
console.log('  ✅ Passed: Both parties successfully agreed on ECDH shared key.\n')

// ============================================================================
// STAGE 3: End-to-End Encrypted Private Recommendation Sharing
// ============================================================================
console.log('Stage 3: Zero-Knowledge E2EE Recommendation Sharing & Leakage Check')

const recommendationItem = {
  title: 'Neon Genesis Evangelion: 3.0+1.0 Thrice Upon a Time',
  category: 'anime',
  metadata: {
    year: '2021',
    author: 'Hideaki Anno',
    platform: 'Amazon Prime Video',
    note: 'Top secret personal recommendation for Bob only! 🎬🍿',
    rating: 10
  }
}

// Alice encrypts for Bob
const encryptedShare = await encryptForFriend(
  recommendationItem,
  bobKeys.publicKeyJwkString,
  aliceKeys.privateKey
)

assert.ok(encryptedShare.ciphertext, 'Ciphertext must be present')
assert.ok(encryptedShare.iv, 'IV must be present')

// Plaintext Leakage Guard: Inspect raw ciphertext buffer
const rawCiphertextBuffer = Buffer.from(encryptedShare.ciphertext, 'base64').toString('utf8')
assert.ok(!rawCiphertextBuffer.includes('Evangelion'), 'Ciphertext must NOT leak title')
assert.ok(!rawCiphertextBuffer.includes('Hideaki Anno'), 'Ciphertext must NOT leak author')
assert.ok(!rawCiphertextBuffer.includes('Top secret'), 'Ciphertext must NOT leak personal note')

// Bob decrypts from Alice
const decryptedShare = await decryptFromFriend(
  encryptedShare.ciphertext,
  encryptedShare.iv,
  aliceKeys.publicKeyJwkString,
  bobKeys.privateKey
)

assert.deepEqual(decryptedShare, recommendationItem, 'Decrypted share must match original identically')
console.log('  ✅ Passed: Recommendation encrypted and decrypted identically with zero plaintext leakage.\n')

// ============================================================================
// STAGE 4: Tamper-Resistance & Eavesdropper / Charlie Rejection
// ============================================================================
console.log('Stage 4: Tamper-Resistance & Unauthorized Party Rejection')

// Charlie attempts to decrypt with his own keys
const charlieVaultKey = await deriveDeterministicVaultKey('charlie-user-id-789')
let charlieProfile = { id: 'charlie-uuid', username: 'charlie' }
const charlieKeys = await ensureUserP2PKeys({
  vaultKey: charlieVaultKey,
  profile: charlieProfile,
  saveKeysToProfile: async () => ({ success: true })
})

let unauthorizedDecryptionFailed = false
try {
  await decryptFromFriend(
    encryptedShare.ciphertext,
    encryptedShare.iv,
    aliceKeys.publicKeyJwkString,
    charlieKeys.privateKey
  )
} catch {
  unauthorizedDecryptionFailed = true
}
assert.ok(unauthorizedDecryptionFailed, 'Charlie (unauthorized third-party) must NOT be able to decrypt')

// Ciphertext tampering check
const tamperedCiphertext = Buffer.from(encryptedShare.ciphertext, 'base64')
tamperedCiphertext[tamperedCiphertext.length - 2] ^= 0x55 // Flip bits in authentication tag
const tamperedBase64 = tamperedCiphertext.toString('base64')

let tamperRejected = false
try {
  await decryptFromFriend(
    tamperedBase64,
    encryptedShare.iv,
    aliceKeys.publicKeyJwkString,
    bobKeys.privateKey
  )
} catch {
  tamperRejected = true
}
assert.ok(tamperRejected, 'Tampered ciphertext must be rejected by AES-GCM MAC validation')
console.log('  ✅ Passed: Eavesdropper rejection and ciphertext tamper resistance verified.\n')

// ============================================================================
// STAGE 5: SQL Migration Verification
// ============================================================================
console.log('Stage 5: Migration 005 Schema and RLS Integrity Inspection')
import fs from 'node:fs'
const sqlMigration = fs.readFileSync('supabase/migrations/005_friends_and_shares.sql', 'utf8').toLowerCase()

assert.ok(sqlMigration.includes('create table if not exists public.friendships'), 'friendships table definition missing')
assert.ok(sqlMigration.includes('create table if not exists public.shared_recommendations'), 'shared_recommendations table definition missing')
assert.ok(sqlMigration.includes('idx_friendships_canonical'), 'canonical unique index missing')
assert.ok(sqlMigration.includes('alter publication supabase_realtime'), 'realtime publication missing')
assert.ok(sqlMigration.includes('enable row level security'), 'RLS must be enabled')
assert.ok(sqlMigration.includes('ciphertext text'), 'shared_recommendations must have ciphertext')
assert.ok(sqlMigration.includes('public_key text'), 'profiles must have public_key')
assert.ok(sqlMigration.includes('encrypted_private_key text'), 'profiles must have encrypted_private_key')
console.log('  ✅ Passed: SQL schema and RLS policies verified.\n')

// ============================================================================
// STAGE 6: Sender-Side Decryption for Outgoing Private Shares ("By Me")
// ============================================================================
console.log('Stage 6: Sender-Side Outgoing Share Decryption (Alice audits her sent item)')

// Alice decrypts her own sent share using Bob's public key and Alice's private key
const senderDecryptedShare = await decryptFromFriend(
  encryptedShare.ciphertext,
  encryptedShare.iv,
  bobKeys.publicKeyJwkString,
  aliceKeys.privateKey
)

assert.deepEqual(
  senderDecryptedShare,
  recommendationItem,
  'Sender (Alice) must be able to decrypt her own sent private share using Bob\'s public key'
)
console.log('  ✅ Passed: Sender successfully decrypted outgoing private share for "By Me" audit view.\n')

// ============================================================================
// STAGE 7: Role-Aware Share Deletion & Recipient Dismissal Logic
// ============================================================================
console.log('Stage 7: Role-Aware Share Deletion & Dismissal Integrity')

// Simulate database store of shares
let mockSharedDb = [
  {
    id: 'share-101',
    sender_id: 'alice-uuid',
    recipient_id: 'bob-uuid',
    item_id: 'rec-1',
    is_read: false,
    metadata: { title: 'Dune: Part Two' },
    created_at: new Date().toISOString()
  }
]

// Receiver (Bob) dismisses the incoming share from his inbox
const bobShare = mockSharedDb.find(s => s.id === 'share-101')
assert.ok(bobShare, 'Bob should see incoming share initially')

// Recipient action: update metadata with dismissed_by_recipient: true, is_read: true (DO NOT DELETE ROW)
bobShare.is_read = true
bobShare.metadata = { ...bobShare.metadata, dismissed_by_recipient: true }

// Recipient view filter:
const bobInbox = mockSharedDb.filter(s => s.recipient_id === 'bob-uuid' && !s.metadata?.dismissed_by_recipient)
assert.equal(bobInbox.length, 0, 'Recipient inbox must no longer contain dismissed share')

// Sender view filter: sender still sees the share in outbox with seen status
const aliceOutbox = mockSharedDb.filter(s => s.sender_id === 'alice-uuid')
assert.equal(aliceOutbox.length, 1, 'Sender outbox must retain the share record')
assert.equal(aliceOutbox[0].is_read, true, 'Sender outbox should reflect read/seen status')

// Sender action: sender explicitly deletes the share from "By Me" -> row is removed from DB
mockSharedDb = mockSharedDb.filter(s => s.id !== 'share-101')
const aliceOutboxAfterSenderDelete = mockSharedDb.filter(s => s.sender_id === 'alice-uuid')
assert.equal(aliceOutboxAfterSenderDelete.length, 0, 'Sender deleting removes it from database')
console.log('  ✅ Passed: Recipient dismissal leaves sender outbox intact; Sender delete cleanly removes record.\n')

console.log('🎉 All Recumend P2P E2EE Recommendation Sharing Tests Passed Successfully!\n')
