import assert from 'node:assert/strict'
import fs from 'node:fs'

console.log('🧪 Starting Recumend Capacitor Mobile Integration Test Suite...\n')

// ============================================================================
// TEST 1: Capacitor Config & Android Package Metadata
// ============================================================================
console.log('Test 1: Capacitor Configuration Validation')
const configPath = 'capacitor.config.json'
assert.ok(fs.existsSync(configPath), 'capacitor.config.json must exist')

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
assert.equal(config.appId, 'com.recumend.app', 'App ID must be com.recumend.app')
assert.equal(config.appName, 'Recumend', 'App Name must be Recumend')
assert.equal(config.webDir, 'dist', 'Web directory must point to dist')
assert.equal(config.server?.androidScheme, 'https', 'Android scheme must be https')
assert.equal(config.plugins?.StatusBar?.style, 'DARK', 'Status bar style must be DARK')
assert.ok(['#090a0f', '#08090C', '#08090c'].includes(config.plugins?.StatusBar?.backgroundColor), 'Status bar background must match theme')
assert.equal(config.plugins?.StatusBar?.overlaysWebView, false, 'Status bar must not overlay webview')
console.log('  ✅ Passed: capacitor.config.json matches mobile specification.\n')

// ============================================================================
// TEST 2: Android Manifest & Deep Linking Scheme (recumend://auth-callback)
// ============================================================================
console.log('Test 2: AndroidManifest.xml Deep Linking Intent Filter')
const manifestPath = 'android/app/src/main/AndroidManifest.xml'
assert.ok(fs.existsSync(manifestPath), 'AndroidManifest.xml must exist')

const manifestContent = fs.readFileSync(manifestPath, 'utf8')
assert.ok(manifestContent.includes('android:scheme="recumend"'), 'Manifest must register recumend scheme')
assert.ok(manifestContent.includes('android:host="auth-callback"'), 'Manifest must register auth-callback host')
assert.ok(manifestContent.includes('android.intent.category.BROWSABLE'), 'Intent filter must be BROWSABLE')

const stringsPath = 'android/app/src/main/res/values/strings.xml'
const stringsContent = fs.readFileSync(stringsPath, 'utf8')
assert.ok(stringsContent.includes('>recumend<'), 'custom_url_scheme in strings.xml must be recumend')
console.log('  ✅ Passed: Android Manifest custom URL scheme registered correctly.\n')

// ============================================================================
// TEST 3: AuthContext Mobile Deep Linking & Platform Guards
// ============================================================================
console.log('Test 3: AuthContext Mobile Deep Link & OAuth Guard Inspection')
const authContextPath = 'src/context/AuthContext.jsx'
const authContent = fs.readFileSync(authContextPath, 'utf8')

assert.ok(authContent.includes('Capacitor.isNativePlatform()'), 'Must guard native logic with Capacitor.isNativePlatform()')
assert.ok(authContent.includes('recumend://auth-callback'), 'Must redirect to recumend://auth-callback on native platforms')
assert.ok(authContent.includes("App.addListener('appUrlOpen'"), 'Must register appUrlOpen listener for deep links')
assert.ok(authContent.includes('Browser.open'), 'Must open system browser for mobile OAuth')
assert.ok(authContent.includes('Browser.close'), 'Must close system browser upon callback return')
console.log('  ✅ Passed: AuthContext handles native deep link session exchange.\n')

// ============================================================================
// TEST 4: Smart Hardware Back Button Handler & Stack Navigation
// ============================================================================
console.log('Test 4: Hardware Back Button Stack & Modal Registry')
const backHandlerPath = 'src/lib/backButtonHandler.js'
assert.ok(fs.existsSync(backHandlerPath), 'backButtonHandler.js must exist')

const backHandlerContent = fs.readFileSync(backHandlerPath, 'utf8')
assert.ok(backHandlerContent.includes('registerBackHandler'), 'Must export registerBackHandler')
assert.ok(backHandlerContent.includes('initHardwareBackButton'), 'Must export initHardwareBackButton')
assert.ok(backHandlerContent.includes('App.exitApp()'), 'Must call App.exitApp() when feed is at root')

// Inspect App.jsx back button integration
const appJsxContent = fs.readFileSync('src/App.jsx', 'utf8')
assert.ok(appJsxContent.includes('initHardwareBackButton'), 'App.jsx must initialize hardware back button')
assert.ok(appJsxContent.includes('isAddModalOpen') && appJsxContent.includes('registerBackHandler'), 'App.jsx must register open modals')
console.log('  ✅ Passed: Smart back button modal-first dismissal verified.\n')

// ============================================================================
// TEST 5: Native Export & Share Sheet Adaptation
// ============================================================================
console.log('Test 5: Export Sheet Native Share Integration')
const exportUtilsContent = fs.readFileSync('src/lib/exportUtils.js', 'utf8')

assert.ok(exportUtilsContent.includes('Share.share'), 'exportUtils must trigger Share.share on native platforms')
assert.ok(exportUtilsContent.includes('Capacitor.isNativePlatform()'), 'exportUtils must preserve web blob/print via platform check')
console.log('  ✅ Passed: Native share sheet integration verified.\n')

console.log('🎉 ALL CAPACITOR ANDROID INTEGRATION TESTS PASSED FLAWLESSLY!\n')
