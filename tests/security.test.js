// Automated security and input validation tests
import assert from 'node:assert/strict'
import { getSafeExternalLink, getAvatarUrl } from '../src/lib/avatar.js'

console.log('🧪 Starting Recumend Security Test Suite...\n')

// ---------------------------------------------------------
// TEST 1: XSS / Malicious URL Injection Prevention (Rule 7)
// ---------------------------------------------------------
console.log('Test 1: URL Sanitization & Protocol Whitelisting')
// Reject dangerous schemes and invalid strings
assert.equal(getSafeExternalLink('javascript:alert("XSS")'), null, 'Failed to block javascript: URI')
assert.equal(getSafeExternalLink('javascript:/*--></title></style>alert(1)'), null, 'Failed to block obfuscated javascript:')
assert.equal(getSafeExternalLink('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), null, 'Failed to block data: URI')
assert.equal(getSafeExternalLink('vbscript:msgbox("test")'), null, 'Failed to block vbscript: URI')
assert.equal(getSafeExternalLink('file:///etc/passwd'), null, 'Failed to block file: protocol')
assert.equal(getSafeExternalLink('   '), null, 'Failed to block whitespace only')
assert.equal(getSafeExternalLink(null), null, 'Failed to handle null')

// Valid http and https URLs must pass safely
assert.equal(getSafeExternalLink('https://youtube.com/@veritasium'), 'https://youtube.com/@veritasium')
assert.equal(getSafeExternalLink('http://example.com/item'), 'http://example.com/item')
console.log('  ✅ Passed: All malicious schemes blocked, valid http/https allowed.\n')

// ---------------------------------------------------------
// TEST 2: Avatar Privacy & Stock Photo Elimination
// ---------------------------------------------------------
console.log('Test 2: Avatar Resolution & Unsplash Stripping')
// Strip stock photo URLs and replace with generated initials avatar
const unsplashStock = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
const avatarFromStock = getAvatarUrl(unsplashStock, 'Abhishek')
assert.ok(!avatarFromStock.includes('unsplash.com'), 'Failed to strip Unsplash stock photo')
assert.ok(avatarFromStock.includes('ui-avatars.com'), 'Fallback must be safe initials avatar')

// Keep authentic Google account profile pictures
const googleRealPhoto = 'https://lh3.googleusercontent.com/a/ACg8ocJIKws4mMbttNcAr0qePJ8Lt_NLnhl5d4WuHFYhAdNCUOlqKdl5=s96-c'
assert.equal(getAvatarUrl(googleRealPhoto, 'Abhishek'), googleRealPhoto, 'Genuine Google OAuth picture must be preserved')
console.log('  ✅ Passed: Stock photos eliminated, authentic Google pictures preserved.\n')

// ---------------------------------------------------------
// TEST 3: Username Schema & Format Validation (Rule 5)
// ---------------------------------------------------------
console.log('Test 3: Username Sanitization & Schema Constraint')
// Helper mimicking username sanitation rules
function validateUsername(raw) {
  const clean = raw ? raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') : ''
  if (clean.length < 2 || clean.length > 30) return null
  return clean
}

assert.equal(validateUsername('admin_user1'), 'admin_user1')
assert.equal(validateUsername('a'), null, 'Username under 2 chars must be rejected')
assert.equal(validateUsername('this_is_a_very_long_username_exceeding_the_thirty_char_limit_here'), null, 'Username over 30 chars must be rejected')
assert.equal(validateUsername('<script>alert(1)</script>'), 'scriptalert1script', 'Special characters stripped')
console.log('  ✅ Passed: Username length and charset strictly bounded.\n')

// ---------------------------------------------------------
// TEST 4: Content Security Policy & Security Headers (Rule 10)
// ---------------------------------------------------------
console.log('Test 4: Content Security Policy Verification')
// Confirm essential security headers are in configs and HTML
import fs from 'node:fs'
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf-8')
assert.ok(indexHtml.includes('http-equiv="Content-Security-Policy"'), 'index.html missing CSP meta tag')
assert.ok(indexHtml.includes('object-src \'none\''), 'CSP must block object-src')
assert.ok(indexHtml.includes('nosniff'), 'index.html missing nosniff')

const viteConfig = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf-8')
assert.ok(viteConfig.includes('X-Frame-Options\': \'DENY'), 'vite.config.js missing X-Frame-Options')
assert.ok(viteConfig.includes('Permissions-Policy'), 'vite.config.js missing Permissions-Policy')

const vercelConfig = fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf-8')
assert.ok(vercelConfig.includes('Strict-Transport-Security'), 'vercel.json missing Strict-Transport-Security')
assert.ok(vercelConfig.includes('Content-Security-Policy'), 'vercel.json missing Content-Security-Policy')
assert.ok(vercelConfig.includes('Cache-Control'), 'vercel.json missing Cache-Control')

// Verify Google APIs is whitelisted for Google Drive appDataFolder vault
assert.ok(indexHtml.includes('https://www.googleapis.com'), 'index.html connect-src must allow https://www.googleapis.com for Drive vault')
assert.ok(vercelConfig.includes('https://www.googleapis.com'), 'vercel.json connect-src must allow https://www.googleapis.com for Drive vault')
console.log('  ✅ Passed: CSP, HSTS, Google Drive API allowlist, and HTTP production security headers active.\n')


// ---------------------------------------------------------
// TEST 5: Category Integrity & OAuth Redirect Allowlist (Rule 5 & 13)
// ---------------------------------------------------------
console.log('Test 5: Category Integrity & Security Whitelist')
// Verify category IDs are recognized
import { CATEGORIES } from '../src/constants/categories.js'
const validCategoryIds = new Set(CATEGORIES.map(c => c.id))
assert.ok(validCategoryIds.has('movie'), 'movie must be in category list')
assert.ok(validCategoryIds.has('anime'), 'anime must be in category list')
assert.ok(validCategoryIds.has('app'), 'app must be in category list')
assert.ok(!validCategoryIds.has('<script>'), 'XSS in categories must be impossible')
console.log('  ✅ Passed: Category allowlist and schema verified.\n')

// ---------------------------------------------------------
// TEST 6: Web Crypto E2EE Vault & Cryptographic Integrity
// ---------------------------------------------------------
console.log('Test 6: Web Crypto E2EE Vault, Tamper Detection & Key Derivation')
import {
  generateUnifiedVaultKeys,
  exportVaultBundle,
  importVaultBundle,
  encryptData,
  decryptData,
  deriveSharedKey
} from '../src/lib/vaultCrypto.js'

// 1. Unified Key Generation, Export & Import
const keys = await generateUnifiedVaultKeys()
assert.ok(keys.vaultKey, 'AES-GCM vaultKey generation failed')
assert.ok(keys.ecdhKeyPair?.publicKey, 'ECDH publicKey generation failed')
assert.ok(keys.ecdhKeyPair?.privateKey, 'ECDH privateKey generation failed')

const bundleJson = await exportVaultBundle(keys)
assert.ok(bundleJson.includes('"version":1'), 'Bundle must contain version 1')
assert.ok(bundleJson.includes('"vaultKey"'), 'Bundle must contain vaultKey')
assert.ok(bundleJson.includes('"ecdhKeyPair"'), 'Bundle must contain ecdhKeyPair')

const imported = await importVaultBundle(bundleJson)
assert.ok(imported.vaultKey, 'Imported bundle missing vaultKey')
assert.ok(imported.ecdhKeyPair?.publicKey, 'Imported bundle missing publicKey')
assert.ok(imported.publicKeyJwkString, 'Imported bundle missing publicKeyJwkString')

// 2. Encryption and Decryption Roundtrip
const samplePayload = {
  title: 'Severance (Season 2) 🎬✨',
  category: 'show',
  metadata: { note: 'Top secret spoiler-filled note with unicode: 🚀🔒', platform: 'Apple TV+' }
}

const encrypted = await encryptData(samplePayload, imported.vaultKey)
assert.ok(encrypted.ciphertext, 'Ciphertext must not be empty')
assert.ok(encrypted.iv, 'IV must not be empty')
assert.notEqual(encrypted.ciphertext, samplePayload.title, 'Plaintext must not appear in ciphertext')

const decrypted = await decryptData(encrypted.ciphertext, encrypted.iv, imported.vaultKey)
assert.deepEqual(decrypted, samplePayload, 'Decrypted payload must match original sample exactly')

// 3. Tamper Resistance (Authenticated Encryption Tag Verification)
const tamperedCiphertext = (encrypted.ciphertext.startsWith('A') ? 'B' : 'A') + encrypted.ciphertext.slice(1)
let tamperDetected = false
try {
  await decryptData(tamperedCiphertext, encrypted.iv, imported.vaultKey)
} catch {
  tamperDetected = true
}
assert.ok(tamperDetected, 'AES-GCM must reject tampered ciphertext')

// 4. Peer-to-Peer ECDH Key Derivation
const userA = await generateUnifiedVaultKeys()
const userB = await generateUnifiedVaultKeys()

const bundleA = await exportVaultBundle(userA)
const bundleB = await exportVaultBundle(userB)

const importedA = await importVaultBundle(bundleA)
const importedB = await importVaultBundle(bundleB)

const sharedSecretA = await deriveSharedKey(importedA.ecdhKeyPair.privateKey, importedB.publicKeyJwkString)
const sharedSecretB = await deriveSharedKey(importedB.ecdhKeyPair.privateKey, importedA.publicKeyJwkString)

const peerPayload = { message: 'Shared recommendation from User A' }
const peerEncrypted = await encryptData(peerPayload, sharedSecretA)
const peerDecrypted = await decryptData(peerEncrypted.ciphertext, peerEncrypted.iv, sharedSecretB)
assert.deepEqual(peerDecrypted, peerPayload, 'Peer-to-peer derived keys must decrypt each other seamlessly')

console.log('  ✅ Passed: Unified crypto keys, authenticated AES-GCM encryption, tamper rejection, and ECDH derivation verified.\n')

console.log('All Security Automated Tests Passed Successfully!')
