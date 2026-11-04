import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'

// Recommendation items and votes context
const ItemContext = createContext(null)

// Storage keys for offline demo mode
const LOCAL_ITEMS_KEY = 'recumend_items_data'
const LOCAL_RECS_KEY = 'recumend_user_recs'

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
  const { user, profile } = useAuth()
  const [items, setItems] = useState([])
  const [userRecs, setUserRecs] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const votingInProgress = useRef(new Set())

  // Load items on mount (either from localStorage or Supabase database)
  useEffect(() => {
    async function loadData() {
      if (!isSupabaseConfigured) {
        // Fallback to localStorage in offline demo mode
        const savedItems = localStorage.getItem(LOCAL_ITEMS_KEY)
        let initial = savedItems ? JSON.parse(savedItems) : INITIAL_ITEMS

        setItems(initial)

        if (user?.id) {
          const savedRecs = localStorage.getItem(LOCAL_RECS_KEY)
          const recsSet = new Set(
            savedRecs
              ? JSON.parse(savedRecs)
              : ['item-1', 'item-3', 'item-5']
          )
          // Ensure all items created by the user are always recommended by them
          initial.forEach(it => {
            if (it.created_by === user.id) {
              recsSet.add(it.id)
            }
          })
          setUserRecs(recsSet)
          localStorage.setItem(LOCAL_RECS_KEY, JSON.stringify([...recsSet]))
        } else {
          setUserRecs(new Set())
        }
        setLoading(false)
        return
      }

      // Fetch items and current user's upvotes from Supabase
      try {
        const { data: dbItems, error: _err } = await supabase
          .from('items')
          .select('*, creator:profiles!created_by(id, username, display_name, avatar_url, app_uid)')
          .gte('recommend_count', 1)
          .order('recommend_count', { ascending: false })
          .order('created_at', { ascending: true })

        if (dbItems) {
          setItems(dbItems)
        }

        if (user?.id) {
          const { data: recs } = await supabase
            .from('recommendations')
            .select('item_id')
            .eq('user_id', user.id)

          const recSet = new Set(recs ? recs.map(r => r.item_id) : [])
          if (dbItems) {
            dbItems.forEach(it => {
              if (it.created_by === user.id) {
                recSet.add(it.id)
              }
            })
          }
          setUserRecs(recSet)
        } else {
          setUserRecs(new Set())
        }
      } catch (err) {
        console.error('Failed to load items from Supabase:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id, profile?.id])

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
          // Don't add items with recommend_count < 1 (intermediate state before initial recommendation trigger)
          if (!newItem || newItem.recommend_count < 1) return

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
            if (prev.some((it) => it.id === newItem.id)) {
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
            if (updated.recommend_count >= 1) {
              setItems((prev) => {
                const existing = prev.find((it) => it.id === updated.id)
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
            } else {
              setItems((prev) => prev.filter((it) => it.id !== updated.id))
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
  }, [])

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
          error: 'You recommended this item when creating it (locked at 1). Manage or delete it in My Recommendations.',
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

  // Add a new recommendation with deduplication checks
  async function addItem({ title, category, metadata = {} }) {
    if (!user) return { error: 'Must be logged in' }

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

    // Check if item already exists in this category
    const existing = items.find(
      it => it.normalized_title === norm && it.category === category
    )

    if (existing) {
      return { exists: true, item: existing }
    }

    if (!isSupabaseConfigured) {
      const newItem = {
        id: `item-${Date.now()}`,
        title: cleanTitle,
        normalized_title: norm,
        category,
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
      // Insert item with 0 count so trigger on recommendation insert brings it to exactly 1
      const { data: createdItem, error: itemErr } = await supabase
        .from('items')
        .insert({
          title: cleanTitle,
          normalized_title: norm,
          category,
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

      // Authoritative Supabase re-fetch to ensure trigger sync and exact ranking order
      try {
        const { data: dbItems } = await supabase
          .from('items')
          .select('*, creator:profiles!created_by(id, username, display_name, avatar_url, app_uid)')
          .gte('recommend_count', 1)
          .order('recommend_count', { ascending: false })
          .order('created_at', { ascending: true })

        if (dbItems && dbItems.length > 0) {
          setItems(dbItems)
        }
      } catch (refetchErr) {
        console.warn('Post-add refetch warning:', refetchErr)
      }

      return { success: true, item: finalItem }
    } catch (err) {
      console.error('Add item error:', err)
      let msg = err.message || 'Failed to add recommendation'
      if (err.code === '23505' || err.message?.includes('unique_item_category') || err.message?.includes('duplicate key')) {
        const existingItem = items.find(it => it.normalized_title === norm && it.category === category)
        if (existingItem) {
          return { exists: true, item: existingItem }
        }
        msg = `"${cleanTitle}" has already been recommended in this category.`
      } else if (err.message?.includes('Rate limit')) {
        msg = 'Please wait a few seconds before adding another recommendation.'
      }
      return { error: msg }
    }
  }

  // Update item details (creator only)
  async function updateItem(itemId, { title, category, metadata = {} }) {
    if (!user) return { error: 'Must be logged in to edit' }

    const cleanTitle = title.trim()
    const norm = normalizeTitle(cleanTitle)
    if (!norm) return { error: 'Invalid title' }

    const target = items.find(it => it.id === itemId)
    if (!target) return { error: 'Item not found' }
    if (target.created_by !== user.id) return { error: 'You can only edit your own recommendations' }

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

  // Active items filter: MUST have recommend_count >= 1
  const activeItems = useMemo(() => enrichedItems.filter(it => it.recommend_count >= 1), [enrichedItems])

  // Items created by currently logged-in user
  const myItems = useMemo(() => enrichedItems.filter(it => Boolean(user?.id && it.created_by === user.id)), [enrichedItems, user])

  // Items upvoted by user (excluding items they created)
  const upvotedItems = useMemo(() => enrichedItems.filter(it => Boolean(user?.id && userRecs.has(it.id) && it.created_by !== user.id)), [enrichedItems, user, userRecs])

  return (
    <ItemContext.Provider value={{
      items: activeItems,
      rawItems: items,
      myItems,
      upvotedItems,
      userRecs,
      loading,
      toggleRecommend,
      addItem,
      updateItem,
      deleteItem,
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
