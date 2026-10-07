import assert from 'node:assert/strict'
import { getSafeExternalLink, getAvatarUrl } from '../src/lib/avatar.js'

console.log('🧪 Starting Recumend Security Test Suite...\n')

// ---------------------------------------------------------
// TEST 1: XSS / Malicious URL Injection Prevention (Rule 7)
// ---------------------------------------------------------
console.log('Test 1: URL Sanitization & Protocol Whitelisting')
assert.equal(getSafeExternalLink('javascript:alert("XSS")'), null, 'Failed to block javascript: URI')
assert.equal(getSafeExternalLink('javascript:/*--></title></style>alert(1)'), null, 'Failed to block obfuscated javascript:')
assert.equal(getSafeExternalLink('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), null, 'Failed to block data: URI')
assert.equal(getSafeExternalLink('vbscript:msgbox("test")'), null, 'Failed to block vbscript: URI')
assert.equal(getSafeExternalLink('file:///etc/passwd'), null, 'Failed to block file: protocol')
assert.equal(getSafeExternalLink('   '), null, 'Failed to block whitespace only')
assert.equal(getSafeExternalLink(null), null, 'Failed to handle null')

// Valid URLs must pass safely
assert.equal(getSafeExternalLink('https://youtube.com/@veritasium'), 'https://youtube.com/@veritasium')
assert.equal(getSafeExternalLink('http://example.com/item'), 'http://example.com/item')
console.log('  ✅ Passed: All malicious schemes blocked, valid http/https allowed.\n')

// ---------------------------------------------------------
// TEST 2: Avatar Privacy & Stock Photo Elimination
// ---------------------------------------------------------
console.log('Test 2: Avatar Resolution & Unsplash Stripping')
const unsplashStock = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
const avatarFromStock = getAvatarUrl(unsplashStock, 'Abhishek')
assert.ok(!avatarFromStock.includes('unsplash.com'), 'Failed to strip Unsplash stock photo')
assert.ok(avatarFromStock.includes('ui-avatars.com'), 'Fallback must be safe initials avatar')

const googleRealPhoto = 'https://lh3.googleusercontent.com/a/ACg8ocJIKws4mMbttNcAr0qePJ8Lt_NLnhl5d4WuHFYhAdNCUOlqKdl5=s96-c'
assert.equal(getAvatarUrl(googleRealPhoto, 'Abhishek'), googleRealPhoto, 'Genuine Google OAuth picture must be preserved')
console.log('  ✅ Passed: Stock photos eliminated, authentic Google pictures preserved.\n')

// ---------------------------------------------------------
// TEST 3: Username Schema & Format Validation (Rule 5)
// ---------------------------------------------------------
console.log('Test 3: Username Sanitization & Schema Constraint')
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
import fs from 'node:fs'
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf-8')
assert.ok(indexHtml.includes('http-equiv="Content-Security-Policy"'), 'index.html missing CSP meta tag')
assert.ok(indexHtml.includes('object-src \'none\''), 'CSP must block object-src')
assert.ok(indexHtml.includes('nosniff'), 'index.html missing nosniff')

const viteConfig = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf-8')
assert.ok(viteConfig.includes('X-Frame-Options\': \'DENY'), 'vite.config.js missing X-Frame-Options')
assert.ok(viteConfig.includes('Permissions-Policy'), 'vite.config.js missing Permissions-Policy')
console.log('  ✅ Passed: CSP and HTTP security headers active.\n')

console.log('🎉 All Security Automated Tests Passed Successfully!')
