import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { syncUnifiedVault } from '../lib/googleDriveVault'
import { encryptData, decryptData } from '../lib/vaultCrypto'

// Recommendation items and votes context
const ItemContext = createContext(null)

// Storage keys for offline demo mode
const LOCAL_ITEMS_KEY = 'recumend_items_data'
const LOCAL_RECS_KEY = 'recumend_user_recs'
const LOCAL_WATCHED_KEY = 'recumend_watched_items'
const LOCAL_ORDER_KEY = 'recumend_watch_order'

function getInitialWatched(userId) {
  if (typeof window === 'undefined') return new Set()
  const key = userId || 'guest'
  try {
    const raw = localStorage.getItem(`${LOCAL_WATCHED_KEY}_${key}`)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function getInitialOrders(userId) {
  if (typeof window === 'undefined') return { created: [], upvoted: [], private: [] }
  const key = userId || 'guest'
  try {
    const raw = localStorage.getItem(`${LOCAL_ORDER_KEY}_${key}`)
    return raw ? JSON.parse(raw) : { created: [], upvoted: [], private: [] }
  } catch {
    return { created: [], upvoted: [], private: [] }
  }
}

// Default seed recommendations shown in demo mode
const INITIAL_ITEMS = [
  {
    id: 'item-1',
    title: 'Severance',
    normalized_title: 'severance',
    category: 'show',
    recommend_count: 7,
    created_by: 'demo-user-123',
    creator: { id: 'demo-user-123', username: 'dan_e', display_name: 'Dan Erickson', app_uid: 'u_dane' },
    metadata: { year: '2022', platform: 'Apple TV+', note: 'Masterpiece psychological thriller' },
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'item-2',
    title: 'Frieren: Beyond Journey\'s End',
    normalized_title: 'frieren beyond journeys end',
    category: 'anime',
    recommend_count: 6,
    created_by: 'demo-user-456',
    creator: { id: 'demo-user-456', username: 'yamada', display_name: 'Kanehito Yamada', app_uid: 'u_yamada' },
    metadata: { episodes: '28', note: 'Calm, melancholic pacing with god-tier animation' },
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'item-3',
    title: 'Veritasium',
    normalized_title: 'veritasium',
    category: 'yt',
    recommend_count: 5,
    created_by: 'demo-user-123',
    creator: { id: 'demo-user-123', username: 'dan_e', display_name: 'Dan Erickson', app_uid: 'u_dane' },
    metadata: { channel_link: 'https://youtube.com/@veritasium', topic: 'Science & Physics' },
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'item-4',
    title: 'Project Hail Mary',
    normalized_title: 'project hail mary',
    category: 'book',
    recommend_count: 4,
    created_by: 'demo-user-789',
    creator: { id: 'demo-user-789', username: 'andyw', display_name: 'Andy Weir', app_uid: 'u_andyw' },
    metadata: { author: 'Andy Weir', genre: 'Sci-Fi' },
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'item-5',
    title: 'Chrono Trigger',
    normalized_title: 'chrono trigger',
    category: 'game',
    recommend_count: 4,
    created_by: 'demo-user-123',
    creator: { id: 'demo-user-123', username: 'dan_e', display_name: 'Dan Erickson', app_uid: 'u_dane' },
    metadata: { platform: 'SNES / PC', genre: 'JRPG' },
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'item-6',
    title: 'The Social Dilemma',
    normalized_title: 'the social dilemma',
    category: 'docu',
    recommend_count: 2,
    created_by: 'demo-user-456',
    creator: { id: 'demo-user-456', username: 'yamada', display_name: 'Kanehito Yamada', app_uid: 'u_yamada' },
    metadata: { year: '2020', platform: 'Netflix' },
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  }
]

// Provider managing recommendations, user votes, and real-time feed updates
export function ItemProvider({ children }) {
  const { user, profile, providerToken, savePublicKeyToProfile } = useAuth()
  const [items, setItems] = useState([])
  const [userRecs, setUserRecs] = useState(new Set())
  const [watchedItemIds, setWatchedItemIds] = useState(() => getInitialWatched(user?.id))
  const [watchOrders, setWatchOrders] = useState(() => getInitialOrders(user?.id))
  const [loading, setLoading] = useState(true)
  const [vaultKeys, setVaultKeys] = useState(null)
  const [isVaultSyncing, setIsVaultSyncing] = useState(false)
  const [vaultError, setVaultError] = useState(null)
  const votingInProgress = useRef(new Set())
  const prefSyncTimeoutRef = useRef(null)
  const latestPreferencesRef = useRef({
    watched: getInitialWatched(user?.id),
    orders: getInitialOrders(user?.id)
  })

  // Debounced sync function to push preferences to Supabase
  const syncCloudPreferences = useCallback((watchedSet, ordersObj) => {
    if (!user?.id || !isSupabaseConfigured) return
    if (prefSyncTimeoutRef.current) clearTimeout(prefSyncTimeoutRef.current)

    prefSyncTimeoutRef.current = setTimeout(async () => {
      try {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            watched_items: [...watchedSet],
            watch_orders: ordersObj,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
      } catch (err) {
        console.warn('Preferences cloud sync notice:', err)
      }
    }, 500)
  }, [user?.id])

  // Hydrate preferences on mount and on user change
  useEffect(() => {
    const userId = user?.id || 'guest'
    const localWatched = getInitialWatched(userId)
    const localOrders = getInitialOrders(userId)

    setWatchedItemIds(localWatched)
    setWatchOrders(localOrders)
    latestPreferencesRef.current = { watched: localWatched, orders: localOrders }

    if (!user?.id || !isSupabaseConfigured) return

    let isMounted = true

    async function hydrateCloudPreferences() {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('watched_items, watch_orders')
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) {
          console.warn('Preferences fetch notice:', error.message)
          return
        }

        if (!isMounted) return

        if (data) {
          const cloudWatched = Array.isArray(data.watched_items) ? data.watched_items : []
          const cloudOrders = (data.watch_orders && typeof data.watch_orders === 'object') ? data.watch_orders : {}

          // Union merge local + cloud watched items
          const mergedWatched = new Set([...cloudWatched, ...localWatched])
          const mergedOrders = {
            created: Array.isArray(cloudOrders.created) && cloudOrders.created.length > 0 ? cloudOrders.created : (localOrders.created || []),
            upvoted: Array.isArray(cloudOrders.upvoted) && cloudOrders.upvoted.length > 0 ? cloudOrders.upvoted : (localOrders.upvoted || []),
            private: Array.isArray(cloudOrders.private) && cloudOrders.private.length > 0 ? cloudOrders.private : (localOrders.private || []),
          }

          setWatchedItemIds(mergedWatched)
          setWatchOrders(mergedOrders)
          latestPreferencesRef.current = { watched: mergedWatched, orders: mergedOrders }

          try {
            localStorage.setItem(`${LOCAL_WATCHED_KEY}_${user.id}`, JSON.stringify([...mergedWatched]))
            localStorage.setItem(`${LOCAL_ORDER_KEY}_${user.id}`, JSON.stringify(mergedOrders))
          } catch {}

          // If local had new items not yet in cloud, sync merged version back
          if (mergedWatched.size > cloudWatched.length) {
            syncCloudPreferences(mergedWatched, mergedOrders)
          }
        } else {
          // If no row exists yet, initialize with current preferences
          if (localWatched.size > 0 || (localOrders.created?.length || localOrders.upvoted?.length || localOrders.private?.length)) {
            syncCloudPreferences(localWatched, localOrders)
          }
        }
      } catch (err) {
        console.warn('Preferences hydration error:', err)
      }
    }

    hydrateCloudPreferences()

    return () => {
      isMounted = false
    }
  }, [user?.id, syncCloudPreferences])

  // Live cross-device realtime subscription
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) return

    const channel = supabase
      .channel(`user_preferences:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new) {
            const newWatched = Array.isArray(payload.new.watched_items) ? payload.new.watched_items : []
            const newOrders = (payload.new.watch_orders && typeof payload.new.watch_orders === 'object') ? payload.new.watch_orders : {}

            const nextWatched = new Set(newWatched)
            const nextOrders = {
              created: Array.isArray(newOrders.created) ? newOrders.created : [],
              upvoted: Array.isArray(newOrders.upvoted) ? newOrders.upvoted : [],
              private: Array.isArray(newOrders.private) ? newOrders.private : [],
            }

            setWatchedItemIds(nextWatched)
            setWatchOrders(nextOrders)
            latestPreferencesRef.current = { watched: nextWatched, orders: nextOrders }

            try {
              localStorage.setItem(`${LOCAL_WATCHED_KEY}_${user.id}`, JSON.stringify([...nextWatched]))
              localStorage.setItem(`${LOCAL_ORDER_KEY}_${user.id}`, JSON.stringify(nextOrders))
            } catch {}
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Toggle watched status for an item (instant pure update, zero disk I/O lag + debounced cloud sync)
  const toggleWatched = useCallback((itemId) => {
    if (!itemId) return
    setWatchedItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }

      const userId = user?.id || 'guest'
      try {
        localStorage.setItem(`${LOCAL_WATCHED_KEY}_${userId}`, JSON.stringify([...next]))
      } catch {}

      latestPreferencesRef.current = {
        ...latestPreferencesRef.current,
        watched: next
      }

      if (user?.id && isSupabaseConfigured) {
        syncCloudPreferences(next, latestPreferencesRef.current.orders)
      }

      return next
    })
  }, [user?.id, syncCloudPreferences])

  const isWatched = useCallback((itemId) => {
    return watchedItemIds.has(itemId)
  }, [watchedItemIds])

  // Save watch order per tab (instant pure update + debounced cloud sync)
  const saveWatchOrder = useCallback((tabKey, newOrderArray) => {
    const userId = user?.id || 'guest'
    setWatchOrders((prev) => {
      const next = { ...prev, [tabKey]: newOrderArray }
      try {
        localStorage.setItem(`${LOCAL_ORDER_KEY}_${userId}`, JSON.stringify(next))
      } catch {}

      latestPreferencesRef.current = {
        ...latestPreferencesRef.current,
        orders: next
      }

      if (user?.id && isSupabaseConfigured) {
        syncCloudPreferences(latestPreferencesRef.current.watched, next)
      }

      return next
    })
  }, [user?.id, syncCloudPreferences])

  // Synchronize unified encryption vault (AES-256 for personal vault + ECDH P-256 for peer sharing)
  useEffect(() => {
    let isMounted = true
    if (!user?.id) {
      setVaultKeys(null)
      setIsVaultSyncing(false)
      return
    }

    setIsVaultSyncing(true)
    setVaultError(null)

    syncUnifiedVault({
      user,
      providerToken,
      onPublicKeyReady: savePublicKeyToProfile
    })
      .then((keys) => {
        if (isMounted) {
          setVaultKeys(keys)
          setIsVaultSyncing(false)
        }
      })
      .catch((err) => {
        console.error('Vault sync error:', err)
        if (isMounted) {
          setVaultError(err.message || 'Failed to sync encryption vault')
          setIsVaultSyncing(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [user, providerToken, savePublicKeyToProfile])

  // Helper to decrypt a single private item
  const decryptSingleItem = async (item, key, fallbackKeys = []) => {
    if (!item?.is_private || !item?.ciphertext || !item?.iv) return item
    try {
      const dec = await decryptData(item.ciphertext, item.iv, key, fallbackKeys)
      if (typeof dec === 'object' && dec !== null) {
        return {
          ...item,
          title: dec.title || item.title,
          metadata: { ...(item.metadata || {}), ...(dec.metadata || {}) },
          _isDecrypted: true,
          _decryptionFailed: false
        }
      }
      return {
        ...item,
        title: dec,
        _isDecrypted: true,
        _decryptionFailed: false
      }
    } catch (err) {
      console.warn('Decryption failed for item:', item.id, err?.message || err)
      return {
        ...item,
        _isDecrypted: false,
        _decryptionFailed: true,
        _decryptionError: err?.message || 'Decryption failed'
      }
    }
  }

  // Decrypt pending private items whenever vaultKeys or items change
  useEffect(() => {
    if (!vaultKeys?.vaultKey) return
    let isCancelled = false

    async function decryptPendingItems() {
      const pending = items.filter(
        it => it.is_private && !it._isDecrypted && !it._decryptionFailed
      )
      if (pending.length === 0) return

      const decryptedList = await Promise.all(
        pending.map(async (it) => {
          if (!it.ciphertext || !it.iv) {
            if (it.title && it.title !== '[Encrypted Item]') {
              return { ...it, _isDecrypted: true, _decryptionFailed: false }
            }
            return {
              ...it,
              _isDecrypted: false,
              _decryptionFailed: true,
              _decryptionError: 'Missing encryption payload'
            }
          }
          return decryptSingleItem(it, vaultKeys.vaultKey, vaultKeys.fallbackKeys || [])
        })
      )

      if (isCancelled) return

      const updateMap = new Map(decryptedList.map(it => [it.id, it]))
      setItems(prev => prev.map(it => updateMap.get(it.id) || it))
    }

    decryptPendingItems()

    return () => {
      isCancelled = true
    }
  }, [vaultKeys, items])

  // Load items on mount (either from localStorage or Supabase database)
  useEffect(() => {
    let isCancelled = false

    async function loadData() {
      if (!isSupabaseConfigured) {
        // Fallback to localStorage in offline demo mode
        const savedItems = localStorage.getItem(LOCAL_ITEMS_KEY)
        let initial = savedItems ? JSON.parse(savedItems) : INITIAL_ITEMS

        if (isCancelled) return
        setItems(initial)

        if (user?.id) {
          const savedRecs = localStorage.getItem(LOCAL_RECS_KEY)
          const recsSet = new Set(
            savedRecs
              ? JSON.parse(savedRecs)
              : ['item-1', 'item-3', 'item-5']
          )
          // Ensure public items created by user are in recsSet
          initial.forEach(it => {
            if (it.created_by === user.id && !it.is_private) {
              recsSet.add(it.id)
            }
          })
          if (isCancelled) return
          setUserRecs(recsSet)
          localStorage.setItem(LOCAL_RECS_KEY, JSON.stringify([...recsSet]))
        } else {
          if (isCancelled) return
          setUserRecs(new Set())
        }
        setLoading(false)
        return
      }

      // Fetch public items AND user's private items from Supabase
      try {
        let publicItems = []
        let privateItems = []

        // Try querying with is_private filter (Migration 004)
        const pubRes = await supabase
          .from('items')
          .select('*, creator:profiles!created_by(id, username, display_name, avatar_url, app_uid)')
          .eq('is_private', false)
          .gte('recommend_count', 1)
          .order('recommend_count', { ascending: false })
          .order('created_at', { ascending: true })

        if (isCancelled) return

        if (pubRes.error) {
          // Fallback: If 004_private_vault.sql migration has not been run yet in Supabase SQL editor,
          // PostgREST will fail with 'column items.is_private does not exist'. Fallback to plain query.
          console.warn('Migration 004 not yet detected on Supabase (is_private filter fallback):', pubRes.error.message)
          const fallbackRes = await supabase
            .from('items')
            .select('*, creator:profiles!created_by(id, username, display_name, avatar_url, app_uid)')
            .gte('recommend_count', 1)
            .order('recommend_count', { ascending: false })
            .order('created_at', { ascending: true })
          if (isCancelled) return
          publicItems = fallbackRes.data || []
        } else {
          publicItems = pubRes.data || []
        }

        if (user?.id) {
          try {
            // Confirm session token is active to avoid RLS dropping private items
            const { data: sessData } = await supabase.auth.getSession()
            const activeUid = sessData?.session?.user?.id || user.id

            const privRes = await supabase
              .from('items')
              .select('*, creator:profiles!created_by(id, username, display_name, avatar_url, app_uid)')
              .eq('is_private', true)
              .eq('created_by', activeUid)
              .order('created_at', { ascending: false })

            if (isCancelled) return

            if (!privRes.error && privRes.data) {
              privateItems = privRes.data
            } else if (privRes.error) {
              console.warn('Private items fetch note:', privRes.error.message)
            }
          } catch (pErr) {
            console.warn('Private items query exception:', pErr)
            privateItems = []
          }
        }

        if (isCancelled) return

        // Preserve already decrypted in-memory items when refreshing items list
        setItems(prev => {
          const decryptedCache = new Map()
          prev.forEach(it => {
            if (it.is_private && it._isDecrypted) {
              decryptedCache.set(it.id, it)
            }
          })
          const incoming = [...publicItems, ...privateItems]
          return incoming.map(it => decryptedCache.get(it.id) || it)
        })

        if (user?.id) {
          const { data: recs } = await supabase
            .from('recommendations')
            .select('item_id')
            .eq('user_id', user.id)

          if (isCancelled) return

          const recSet = new Set(recs ? recs.map(r => r.item_id) : [])
          if (publicItems) {
            publicItems.forEach(it => {
              if (it.created_by === user.id) {
                recSet.add(it.id)
              }
            })
          }
          setUserRecs(recSet)
        } else {
          if (isCancelled) return
          setUserRecs(new Set())
        }
      } catch (err) {
        console.error('Failed to load items from Supabase:', err)
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isCancelled = true
    }
  }, [user?.id, profile?.id])

  // Manually or dynamically re-sync private vault items (e.g. on opening Vault tab)
  const refreshPrivateItems = useCallback(async () => {
    if (!isSupabaseConfigured || !user?.id) return
    try {
      const { data: sessData } = await supabase.auth.getSession()
      const activeUid = sessData?.session?.user?.id || user.id

      const privRes = await supabase
        .from('items')
        .select('*, creator:profiles!created_by(id, username, display_name, avatar_url, app_uid)')
        .eq('is_private', true)
        .eq('created_by', activeUid)
        .order('created_at', { ascending: false })

      if (!privRes.error && privRes.data) {
        setItems(prev => {
          const decryptedCache = new Map()
          prev.forEach(it => {
            if (it.is_private && it._isDecrypted) {
              decryptedCache.set(it.id, it)
            }
          })

          const publicOnly = prev.filter(it => !it.is_private)
          const freshPrivate = privRes.data.map(it => decryptedCache.get(it.id) || it)
          return [...publicOnly, ...freshPrivate]
        })
      }
    } catch (err) {
      console.warn('Failed to refresh private items:', err)
    }
  }, [user])

  // Realtime subscription for live item changes across tabs or Supabase channels
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Sync state across browser tabs when using localStorage
      const handleStorageChange = (e) => {
        if (e.key === LOCAL_ITEMS_KEY && e.newValue) {
          try {
            setItems(JSON.parse(e.newValue))
          } catch {
            // ignore
          }
        }
        if (e.key === LOCAL_RECS_KEY && e.newValue) {
          try {
            setUserRecs(new Set(JSON.parse(e.newValue)))
          } catch {
            // ignore
          }
        }
      }

      window.addEventListener('storage', handleStorageChange)
      return () => window.removeEventListener('storage', handleStorageChange)
    }

    // Subscribe to database changes (inserts, updates, deletes)
    const channel = supabase
      .channel('realtime_community_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'items' },
        async (payload) => {
          const newItem = payload.new
          if (!newItem) return
          if (newItem.is_private) {
            if (newItem.created_by !== user?.id) return
          } else if (newItem.recommend_count < 1) {
            return
          }

          let creatorData = null
          if (newItem.created_by) {
            const { data: p } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url, app_uid')
              .eq('id', newItem.created_by)
              .single()
            creatorData = p
          }
          const itemWithCreator = { ...newItem, creator: creatorData }
          setItems((prev) => {
            const existing = prev.find((it) => it.id === newItem.id)
            if (existing) {
              // If already decrypted in memory, do NOT overwrite with raw [Encrypted Item] from database
              if (newItem.is_private && existing._isDecrypted) {
                return prev.map(it => it.id === newItem.id ? {
                  ...newItem,
                  title: existing.title,
                  metadata: existing.metadata,
                  _isDecrypted: true,
                  _decryptionFailed: false,
                  creator: itemWithCreator.creator || existing.creator
                } : it)
              }
              return prev.map(it => it.id === newItem.id ? {
                ...it,
                ...itemWithCreator,
                recommend_count: Math.max(it.recommend_count, itemWithCreator.recommend_count),
                creator: itemWithCreator.creator || it.creator
              } : it)
            }
            return [itemWithCreator, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'items' },
        async (payload) => {
          const updated = payload.new
          if (updated) {
            if (updated.is_private) {
              if (updated.created_by !== user?.id) return
            } else if (updated.recommend_count < 1) {
              setItems((prev) => prev.filter((it) => it.id !== updated.id))
              return
            }
            setItems((prev) => {
              const existing = prev.find((it) => it.id === updated.id)
              // If already decrypted in memory, do NOT overwrite with [Encrypted Item]
              if (updated.is_private && existing?._isDecrypted) {
                return prev.map((it) => (it.id === updated.id ? {
                  ...updated,
                  title: existing.title,
                  metadata: existing.metadata,
                  _isDecrypted: true,
                  _decryptionFailed: false,
                  creator: existing.creator || null
                } : it))
              }
              const merged = { ...updated, creator: existing?.creator || null }
              if (existing) {
                return prev.map((it) => (it.id === updated.id ? merged : it))
              }
              return [merged, ...prev]
            })

            // Fetch creator profile if not already attached
            if (updated.created_by) {
              const { data: p } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, app_uid')
                .eq('id', updated.created_by)
                .single()
              if (p) {
                setItems((prev) => prev.map((it) => (it.id === updated.id ? { ...it, creator: p } : it)))
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'items' },
        (payload) => {
          const deletedId = payload.old?.id
          if (deletedId) {
            setItems((prev) => prev.filter((it) => it.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Strip punctuation and normalize whitespace for duplicate detection
  function normalizeTitle(str) {
    return str
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
  }

  // Upvote or remove upvote for an item (+1 / -1)
  async function toggleRecommend(itemId) {
    if (!user) {
      return { error: 'Please sign in to recommend items' }
    }

    // Prevent duplicate rapid clicks while request is in flight
    if (votingInProgress.current.has(itemId)) {
      return { inProgress: true }
    }
    votingInProgress.current.add(itemId)

    try {
      // Check if user is the original creator
      const targetItem = items.find(it => it.id === itemId)
      const isOwner = targetItem && targetItem.created_by === user.id
      const isCurrentlyRecommended = userRecs.has(itemId)

      // Creator's recommendation is locked at 1
      if (isOwner && isCurrentlyRecommended) {
        return {
          error: 'You already recommended this item.',
          isOwner: true
        }
      }

      if (!isSupabaseConfigured) {
        // Local state update for demo mode
        const updatedRecs = new Set(userRecs)
        if (isCurrentlyRecommended) {
          updatedRecs.delete(itemId)
        } else {
          updatedRecs.add(itemId)
        }
        setUserRecs(updatedRecs)
        localStorage.setItem(LOCAL_RECS_KEY, JSON.stringify([...updatedRecs]))

        setItems(prevItems => {
          const nextItems = prevItems.map(item => {
            if (item.id === itemId) {
              const newCount = isCurrentlyRecommended
                ? Math.max(0, item.recommend_count - 1)
                : item.recommend_count + 1
              return { ...item, recommend_count: newCount }
            }
            return item
          })
          localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(nextItems))
          return nextItems
        })
        return { success: true }
      }

      // Optimistically update vote count in state before database response
      const previousRecs = new Set(userRecs)
      const previousItems = items

      const nextRecs = new Set(userRecs)
      if (isCurrentlyRecommended) {
        nextRecs.delete(itemId)
      } else {
        nextRecs.add(itemId)
      }
      setUserRecs(nextRecs)
      setItems(prevItems => prevItems.map(item => {
        if (item.id === itemId) {
          const delta = isCurrentlyRecommended ? -1 : 1
          return { ...item, recommend_count: Math.max(0, (item.recommend_count || 0) + delta) }
        }
        return item
      }))

      try {
        if (isCurrentlyRecommended) {
          const { error: delErr } = await supabase
            .from('recommendations')
            .delete()
            .match({ user_id: user.id, item_id: itemId })
          if (delErr) throw delErr
        } else {
          const { error: insErr } = await supabase
            .from('recommendations')
            .insert({ user_id: user.id, item_id: itemId })
          if (insErr) throw insErr
        }

        // Background sync to ensure DB trigger count is exact
        const { data: dbItems } = await supabase
          .from('items')
          .select('*, creator:profiles!created_by(id, username, display_name, avatar_url, app_uid)')
          .gte('recommend_count', 1)
          .order('recommend_count', { ascending: false })
          .order('created_at', { ascending: true })

        if (dbItems) {
          setItems(dbItems)
        }
        return { success: true }
      } catch (opErr) {
        // Rollback on failure
        setUserRecs(previousRecs)
        setItems(previousItems)
        throw opErr
      }
    } catch (err) {
      console.error('Toggle error:', err)
      return { error: err.message || 'Failed to update recommendation' }
    } finally {
      votingInProgress.current.delete(itemId)
    }
  }

  // Add a new recommendation with deduplication checks (supports public and private E2EE items)
  async function addItem({ title, category, metadata = {}, is_private = false, isPrivate = false }) {
    if (!user) return { error: 'Must be logged in' }

    const targetIsPrivate = Boolean(is_private || isPrivate)
    const cleanTitle = title ? title.trim() : ''
    if (!cleanTitle || cleanTitle.length > 200) {
      return { error: 'Title must be between 1 and 200 characters' }
    }

    const ALLOWED_CATEGORIES = ['movie', 'show', 'anime', 'book', 'game', 'yt', 'docu', 'app', 'other']
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return { error: 'Invalid category selected' }
    }

    if (JSON.stringify(metadata || {}).length > 4000) {
      return { error: 'Metadata exceeds safe limit (4KB)' }
    }

    const norm = normalizeTitle(cleanTitle)
    if (!norm) return { error: 'Invalid title characters' }

    // If public item, check if it already exists in the same category
    if (!targetIsPrivate) {
      const existing = items.find(
        it => !it.is_private && it.normalized_title === norm && it.category === category
      )
      if (existing) {
        return { exists: true, duplicate: true, item: existing, existingItem: existing }
      }
    }

    // Handle Private E2EE Vault Item
    if (targetIsPrivate) {
      if (!vaultKeys?.vaultKey) {
        return { error: 'Encryption vault is still syncing with Google Drive. Please wait a few seconds and try again.' }
      }

      const encrypted = await encryptData({ title: cleanTitle, metadata }, vaultKeys.vaultKey)

      if (!isSupabaseConfigured) {
        const newItem = {
          id: `item-priv-${Date.now()}`,
          title: cleanTitle,
          normalized_title: 'enc_' + Date.now(),
          category,
          is_private: true,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          recommend_count: 0,
          created_by: user.id,
          creator: profile ? {
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            app_uid: profile.app_uid
          } : null,
          metadata,
          created_at: new Date().toISOString(),
          _isDecrypted: true
        }

        const nextItems = [newItem, ...items]
        setItems(nextItems)
        localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(nextItems))
        return { success: true, item: newItem }
      }

      try {
        const randomSuffix = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
        const { data: createdItem, error: itemErr } = await supabase
          .from('items')
          .insert({
            title: '[Encrypted Item]',
            normalized_title: 'enc_' + randomSuffix,
            category,
            is_private: true,
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            recommend_count: 0,
            created_by: user.id,
            metadata: {}
          })
          .select()
          .single()

        if (itemErr) throw itemErr

        const finalItem = {
          ...createdItem,
          title: cleanTitle,
          metadata,
          _isDecrypted: true,
          _decryptionFailed: false,
          creator: profile ? {
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            app_uid: profile.app_uid
          } : null
        }

        // Prepend to top of state (Reverse-chronological top-first placement)
        setItems(prev => [finalItem, ...prev.filter(it => it.id !== finalItem.id)])
        return { success: true, item: finalItem }
      } catch (err) {
        console.error('Add private item error:', err)
        return { error: err.message || 'Failed to save private recommendation' }
      }
    }

    if (!isSupabaseConfigured) {
      const newItem = {
        id: `item-${Date.now()}`,
        title: cleanTitle,
        normalized_title: norm,
        category,
        is_private: false,
        recommend_count: 1,
        created_by: user.id,
        creator: profile ? {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          app_uid: profile.app_uid
        } : null,
        metadata,
        created_at: new Date().toISOString()
      }

      const nextItems = [newItem, ...items]
      setItems(nextItems)
      localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(nextItems))

      const nextRecs = new Set(userRecs).add(newItem.id)
      setUserRecs(nextRecs)
      localStorage.setItem(LOCAL_RECS_KEY, JSON.stringify([...nextRecs]))

      return { success: true, item: newItem }
    }

    try {
      // Insert public item with 0 count so trigger on recommendation insert brings it to exactly 1
      const { data: createdItem, error: itemErr } = await supabase
        .from('items')
        .insert({
          title: cleanTitle,
          normalized_title: norm,
          category,
          is_private: false,
          recommend_count: 0,
          created_by: user.id,
          metadata
        })
        .select()
        .single()

      if (itemErr) throw itemErr

      // Insert user's recommendation (fires trigger: 0 -> 1)
      await supabase
        .from('recommendations')
        .insert({
          user_id: user.id,
          item_id: createdItem.id
        })

      const finalItem = {
        ...createdItem,
        is_private: false,
        recommend_count: 1,
        creator: profile ? {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          app_uid: profile.app_uid
        } : null
      }
      setItems(prev => [finalItem, ...prev.filter(it => it.id !== finalItem.id)])
      setUserRecs(prev => new Set(prev).add(createdItem.id))

      return { success: true, item: finalItem }
    } catch (err) {
      console.error('Add item error:', err)
      let msg = err.message || 'Failed to add recommendation'
      if (err.code === '23505' || err.message?.includes('unique_item_category') || err.message?.includes('duplicate key')) {
        const existingItem = items.find(it => it.normalized_title === norm && it.category === category)
        if (existingItem) {
          return { exists: true, duplicate: true, item: existingItem, existingItem: existingItem }
        }
        msg = `"${cleanTitle}" has already been recommended in this category.`
      } else if (err.message?.includes('Rate limit')) {
        msg = 'Please wait a few seconds before adding another recommendation.'
      }
      return { error: msg }
    }
  }

  // Update item details (creator only, supports private and public items)
  async function updateItem(itemId, { title, category, metadata = {} }) {
    if (!user) return { error: 'Must be logged in to edit' }

    const cleanTitle = title.trim()
    const norm = normalizeTitle(cleanTitle)
    if (!norm) return { error: 'Invalid title' }

    const target = items.find(it => it.id === itemId)
    if (!target) return { error: 'Item not found' }
    if (target.created_by !== user.id) return { error: 'You can only edit your own recommendations' }

    if (target.is_private) {
      if (!vaultKeys?.vaultKey) {
        return { error: 'Encryption vault is syncing. Please wait a moment.' }
      }
      const encrypted = await encryptData({ title: cleanTitle, metadata }, vaultKeys.vaultKey)

      if (!isSupabaseConfigured) {
        const nextItems = items.map(it => {
          if (it.id === itemId) {
            return {
              ...it,
              title: cleanTitle,
              category,
              metadata,
              ciphertext: encrypted.ciphertext,
              iv: encrypted.iv,
              _isDecrypted: true,
              _decryptionFailed: false
            }
          }
          return it
        })
        setItems(nextItems)
        localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(nextItems))
        return { success: true }
      }

      try {
        const { error: updErr } = await supabase
          .from('items')
          .update({
            category,
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            updated_at: new Date().toISOString()
          })
          .eq('id', itemId)
          .eq('created_by', user.id)

        if (updErr) throw updErr

        setItems(prev => prev.map(it => it.id === itemId ? {
          ...it,
          title: cleanTitle,
          category,
          metadata,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          _isDecrypted: true,
          _decryptionFailed: false
        } : it))

        return { success: true }
      } catch (err) {
        console.error('Update private item error:', err)
        return { error: err.message || 'Failed to update private item' }
      }
    }

    if (!isSupabaseConfigured) {
      const nextItems = items.map(it => {
        if (it.id === itemId) {
          return {
            ...it,
            title: cleanTitle,
            normalized_title: norm,
            category,
            metadata: { ...it.metadata, ...metadata }
          }
        }
        return it
      })
      setItems(nextItems)
      localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(nextItems))
      return { success: true }
    }

    try {
      const { data, error } = await supabase
        .from('items')
        .update({
          title: cleanTitle,
          normalized_title: norm,
          category,
          metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .eq('created_by', user.id)
        .select('*, creator:profiles!created_by(id, username, display_name, avatar_url, app_uid)')
        .single()

      if (error) throw error

      const existing = items.find(it => it.id === itemId)
      const merged = { ...data, creator: data.creator || existing?.creator || null }

      setItems(prev => prev.map(it => (it.id === itemId ? merged : it)))
      return { success: true, item: merged }
    } catch (err) {
      console.error('Update item error:', err)
      let msg = err.message || 'Failed to update item'
      if (err.code === '23505' || err.message?.includes('unique_item_category') || err.message?.includes('duplicate key')) {
        msg = `An item titled "${cleanTitle}" already exists in this category.`
      }
      return { error: msg }
    }
  }

  // Toggle recommendation privacy between Public and Private E2EE Vault
  async function toggleItemPrivacy(itemId) {
    if (!user) return { error: 'Must be logged in' }

    const target = items.find(it => it.id === itemId)
    if (!target) return { error: 'Item not found' }
    if (target.created_by !== user.id) return { error: 'You can only manage your own recommendations' }

    if (target.is_private) {
      // Transition: Private -> Public
      if (!target._isDecrypted && target.title === '[Encrypted Item]') {
        return { error: 'Item must be decrypted before making it public.' }
      }
      const plainTitle = target.title
      const norm = normalizeTitle(plainTitle)

      const existing = items.find(it => !it.is_private && it.normalized_title === norm && it.category === target.category && it.id !== itemId)
      if (existing) {
        return { error: `"${plainTitle}" already exists as a public recommendation in this category.` }
      }

      if (!isSupabaseConfigured) {
        setItems(prev => prev.map(it => it.id === itemId ? {
          ...it,
          is_private: false,
          ciphertext: null,
          iv: null,
          recommend_count: 1
        } : it))
        setUserRecs(prev => new Set(prev).add(itemId))
        return { success: true }
      }

      try {
        const { error: itemErr } = await supabase
          .from('items')
          .update({
            is_private: false,
            title: plainTitle,
            normalized_title: norm,
            ciphertext: null,
            iv: null,
            metadata: target.metadata || {},
            recommend_count: 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', itemId)
          .eq('created_by', user.id)

        if (itemErr) throw itemErr

        // Add creator upvote
        await supabase
          .from('recommendations')
          .insert({
            user_id: user.id,
            item_id: itemId
          })

        setItems(prev => prev.map(it => it.id === itemId ? {
          ...it,
          is_private: false,
          ciphertext: null,
          iv: null,
          recommend_count: 1
        } : it))
        setUserRecs(prev => new Set(prev).add(itemId))
        return { success: true }
      } catch (err) {
        console.error('Make public error:', err)
        return { error: err.message || 'Failed to make recommendation public' }
      }
    } else {
      // Transition: Public -> Private
      if (!vaultKeys?.vaultKey) {
        return { error: 'Encryption vault is syncing. Please wait a moment.' }
      }

      const encrypted = await encryptData({
        title: target.title,
        metadata: target.metadata || {}
      }, vaultKeys.vaultKey)

      if (!isSupabaseConfigured) {
        setItems(prev => prev.map(it => it.id === itemId ? {
          ...it,
          is_private: true,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          recommend_count: 0,
          _isDecrypted: true,
          _decryptionFailed: false
        } : it))
        setUserRecs(prev => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
        return { success: true }
      }

      try {
        // Delete all public recommendations (votes) for this item
        await supabase
          .from('recommendations')
          .delete()
          .eq('item_id', itemId)

        const randomSuffix = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
        const { error: itemErr } = await supabase
          .from('items')
          .update({
            is_private: true,
            title: '[Encrypted Item]',
            normalized_title: 'enc_' + randomSuffix,
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            metadata: {},
            recommend_count: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', itemId)
          .eq('created_by', user.id)

        if (itemErr) throw itemErr

        setItems(prev => prev.map(it => it.id === itemId ? {
          ...it,
          is_private: true,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          recommend_count: 0,
          _isDecrypted: true,
          _decryptionFailed: false
        } : it))
        setUserRecs(prev => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
        return { success: true }
      } catch (err) {
        console.error('Make private error:', err)
        return { error: err.message || 'Failed to make recommendation private' }
      }
    }
  }

  // Delete item globally (creator only)
  async function deleteItem(itemId) {
    if (!user) return { error: 'Must be logged in to delete' }

    const target = items.find(it => it.id === itemId)
    if (!target) return { error: 'Item not found' }
    if (target.created_by !== user.id) return { error: 'You can only delete your own recommendations' }

    if (!isSupabaseConfigured) {
      const nextItems = items.filter(it => it.id !== itemId)
      setItems(nextItems)
      localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(nextItems))

      const nextRecs = new Set(userRecs)
      nextRecs.delete(itemId)
      setUserRecs(nextRecs)
      localStorage.setItem(LOCAL_RECS_KEY, JSON.stringify([...nextRecs]))
      return { success: true }
    }

    try {
      // Supabase CASCADE will delete recommendations
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)
        .eq('created_by', user.id)

      if (error) throw error

      setItems(prev => prev.filter(it => it.id !== itemId))
      setUserRecs(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
      return { success: true }
    } catch (err) {
      console.error('Delete item error:', err)
      return { error: err.message }
    }
  }

  // Attach up-to-date user profile to items created by the logged-in user
  const enrichedItems = useMemo(() => {
    if (!profile?.id) return items
    return items.map((it) => {
      if (it.created_by === profile.id) {
        return {
          ...it,
          creator: {
            ...it.creator,
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            app_uid: profile.app_uid
          }
        }
      }
      return it
    })
  }, [items, profile])

  // Active public items filter: MUST be public and have recommend_count >= 1 (Isolates feed from private items)
  const activeItems = useMemo(
    () => enrichedItems.filter(it => !it.is_private && it.recommend_count >= 1),
    [enrichedItems]
  )

  // Public items created by currently logged-in user (Strictly sorted created_at DESC for top-first placement)
  const myItems = useMemo(
    () => enrichedItems
      .filter(it => Boolean(user?.id && it.created_by === user.id && !it.is_private))
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        if (dateB !== dateA) return dateB - dateA
        return String(a.id || '').localeCompare(String(b.id || ''))
      }),
    [enrichedItems, user]
  )

  // Private E2EE items created by currently logged-in user (Strictly sorted created_at DESC for top-first placement)
  const myPrivateItems = useMemo(() => {
    return enrichedItems
      .filter(it => Boolean(user?.id && it.created_by === user.id && it.is_private))
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        if (dateB !== dateA) return dateB - dateA
        return String(a.id || '').localeCompare(String(b.id || ''))
      })
  }, [enrichedItems, user])

  // Items upvoted by user (excluding items they created), sorted created_at DESC for top-first placement
  const upvotedItems = useMemo(
    () => enrichedItems
      .filter(it => Boolean(user?.id && userRecs.has(it.id) && it.created_by !== user.id && !it.is_private))
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        if (dateB !== dateA) return dateB - dateA
        return String(a.id || '').localeCompare(String(b.id || ''))
      }),
    [enrichedItems, user, userRecs]
  )

  return (
    <ItemContext.Provider value={{
      items: activeItems,
      rawItems: items,
      myItems,
      myPrivateItems,
      upvotedItems,
      userRecs,
      watchedItemIds,
      toggleWatched,
      isWatched,
      watchOrders,
      saveWatchOrder,
      saveOrder: saveWatchOrder,
      loading,
      vaultKeys,
      isVaultSyncing,
      vaultError,
      refreshPrivateItems,
      toggleRecommend,
      addItem,
      updateItem,
      deleteItem,
      toggleItemPrivacy,
      normalizeTitle
    }}>
      {children}
    </ItemContext.Provider>
  )
}

// Hook to access recommendations list and vote actions
export function useItems() {
  const ctx = useContext(ItemContext)
  if (!ctx) throw new Error('useItems must be used within ItemProvider')
  return ctx
}
