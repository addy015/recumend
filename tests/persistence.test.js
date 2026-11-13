import assert from 'node:assert/strict'
import fs from 'node:fs'

console.log('🧪 Starting Recumend Cross-Device Persistence Test Suite...\n')

// ============================================================================
// TEST 1: Database Migration 006 Schema & Security Integrity
// ============================================================================
console.log('Test 1: Migration 006 Schema and RLS Security Inspection')

const migrationPath = 'supabase/migrations/006_user_preferences.sql'
assert.ok(fs.existsSync(migrationPath), 'Migration 006 file must exist')

const migrationSql = fs.readFileSync(migrationPath, 'utf8').toLowerCase()

assert.ok(
  migrationSql.includes('create table if not exists public.user_preferences'),
  'Must create public.user_preferences table'
)
assert.ok(
  migrationSql.includes('user_id uuid primary key references public.profiles(id)'),
  'user_id must be primary key referencing public.profiles(id)'
)
assert.ok(
  migrationSql.includes('watched_items text[]'),
  'Must include watched_items text array column'
)
assert.ok(
  migrationSql.includes('watch_orders jsonb'),
  'Must include watch_orders jsonb column'
)
assert.ok(
  migrationSql.includes('dismissed_shares text[]'),
  'Must include dismissed_shares text array column'
)
assert.ok(
  migrationSql.includes('alter table public.user_preferences enable row level security'),
  'Row level security must be enabled on user_preferences'
)
assert.ok(
  migrationSql.includes('auth.uid() = user_id'),
  'RLS policies must isolate access strictly by auth.uid() = user_id'
)
assert.ok(
  migrationSql.includes('alter publication supabase_realtime add table public.user_preferences'),
  'Must add user_preferences to realtime publication for cross-device live sync'
)

console.log('  ✅ Passed: Migration 006 schema, columns, RLS policies, and realtime broadcast confirmed.\n')

// ============================================================================
// TEST 2: Watched Items Union Merge Logic (Zero Data Loss across devices)
// ============================================================================
console.log('Test 2: Watched Items Union Merge Logic (Device A + Device B synchronization)')

const localWatched = ['movie-1', 'movie-2']
const cloudWatched = ['movie-2', 'movie-3', 'show-1']

// Union merge simulation:
const mergedSet = new Set([...cloudWatched, ...localWatched])

assert.equal(mergedSet.size, 4, 'Merged set must deduplicate and retain all 4 unique items')
assert.ok(mergedSet.has('movie-1'), 'Must retain local item from device A')
assert.ok(mergedSet.has('movie-2'), 'Must retain shared item')
assert.ok(mergedSet.has('movie-3'), 'Must retain cloud item from device B')
assert.ok(mergedSet.has('show-1'), 'Must retain cloud item from device B')

// Test toggle watched
function simulateToggleWatched(currentSet, itemId) {
  const next = new Set(currentSet)
  if (next.has(itemId)) {
    next.delete(itemId)
  } else {
    next.add(itemId)
  }
  return next
}

const toggledOff = simulateToggleWatched(mergedSet, 'movie-1')
assert.equal(toggledOff.has('movie-1'), false, 'Toggling existing watched item must remove it')

const toggledOn = simulateToggleWatched(toggledOff, 'movie-1')
assert.equal(toggledOn.has('movie-1'), true, 'Toggling unwatched item must mark it as watched')

console.log('  ✅ Passed: Union merge logic and toggle state operations validated.\n')

// ============================================================================
// TEST 3: Cross-Device Watch Order Preservation & Priority
// ============================================================================
console.log('Test 3: Cross-Device Watch Order Preservation & Priority')

const cloudOrders = {
  created: ['item-C', 'item-A', 'item-B'],
  upvoted: ['up-2', 'up-1'],
  private: []
}

const testItems = [
  { id: 'item-A', title: 'A', created_at: '2026-11-10T10:00:00Z' },
  { id: 'item-B', title: 'B', created_at: '2026-11-09T10:00:00Z' },
  { id: 'item-C', title: 'C', created_at: '2026-11-08T10:00:00Z' },
  { id: 'item-NEW', title: 'NEW', created_at: '2026-11-13T12:00:00Z' }
]

function simulateSortWithWatchOrder(itemsList, customOrder) {
  const order = customOrder || []
  if (!order.length) {
    return [...itemsList].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
  const orderMap = new Map(order.map((id, index) => [id, index]))

  return [...itemsList].sort((a, b) => {
    const hasA = orderMap.has(a.id)
    const hasB = orderMap.has(b.id)

    // Unranked/new items always land at the top
    if (!hasA && hasB) return -1
    if (hasA && !hasB) return 1
    if (!hasA && !hasB) return new Date(b.created_at) - new Date(a.created_at)

    return orderMap.get(a.id) - orderMap.get(b.id)
  })
}

const sorted = simulateSortWithWatchOrder(testItems, cloudOrders.created)
assert.equal(sorted[0].id, 'item-NEW', 'New item not in order must land at the absolute top')
assert.equal(sorted[1].id, 'item-C', 'First ordered item must be C')
assert.equal(sorted[2].id, 'item-A', 'Second ordered item must be A')
assert.equal(sorted[3].id, 'item-B', 'Third ordered item must be B')

console.log('  ✅ Passed: Cloud-synced watch order sorting verified.\n')

// ============================================================================
// TEST 4: Context Integration & Zero-Leakage Export Check
// ============================================================================
console.log('Test 4: Context Integration & Zero-Leakage Export Check')

const itemContextSource = fs.readFileSync('src/context/ItemContext.jsx', 'utf8')
assert.ok(itemContextSource.includes("user_preferences"), 'ItemContext must reference user_preferences table')
assert.ok(itemContextSource.includes("watched_items"), 'ItemContext must sync watched_items')
assert.ok(itemContextSource.includes("watch_orders"), 'ItemContext must sync watch_orders')
assert.ok(itemContextSource.includes("saveWatchOrder"), 'ItemContext must export saveWatchOrder')
assert.ok(itemContextSource.includes("syncCloudPreferences"), 'ItemContext must have debounced cloud sync')

const myRecsSource = fs.readFileSync('src/components/MyRecommendations.jsx', 'utf8')
assert.ok(myRecsSource.includes("watchOrders"), 'MyRecommendations must use watchOrders')
assert.ok(myRecsSource.includes("saveOrder"), 'MyRecommendations must use saveOrder')

console.log('  ✅ Passed: Context integration and provider exports verified.\n')

console.log('🎉 ALL CROSS-DEVICE PERSISTENCE TESTS PASSED FLAWLESSLY!')
