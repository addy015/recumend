import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ItemContext = createContext(null)

const LOCAL_ITEMS_KEY = 'recumend_items_data'
const LOCAL_RECS_KEY = 'recumend_user_recs'

// Realistic initial seed data for immediate demonstration
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

export function ItemProvider({ children }) {
  const { user, profile } = useAuth()
  const [items, setItems] = useState([])
  const [userRecs, setUserRecs] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const votingInProgress = useRef(new Set())

  // Load items
  useEffect(() => {
    async function loadData() {
      if (!isSupabaseConfigured) {
        // LocalStorage fallback
        const savedItems = localStorage.getItem(LOCAL_ITEMS_KEY)
        let initial = savedItems ? JSON.parse(savedItems) : INITIAL_ITEMS

        setItems(initial)

        const savedRecs = localStorage.getItem(LOCAL_RECS_KEY)
        const recsSet = new Set(
          savedRecs
            ? JSON.parse(savedRecs)
            : (user?.id ? ['item-1', 'item-3', 'item-5'] : [])
        )
        // Ensure all items created by the user are always recommended by them
        if (user?.id) {
          initial.forEach(it => {
            if (it.created_by === user.id) {
              recsSet.add(it.id)
            }
          })
        }
        setUserRecs(recsSet)
        localStorage.setItem(LOCAL_RECS_KEY, JSON.stringify([...recsSet]))
        setLoading(false)
        return
      }

      // Supabase fetch
      try {
        const { data: dbItems, error: _err } = await supabase
          .from('items')
          .select('*, creator:profiles!created_by(id, username, display_name, avatar_url, app_uid)')
          .gte('recommend_count', 1)
          .order('recommend_count', { ascending: false })

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
        }
      } catch (err) {
        console.error('Failed to load items from Supabase:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id, profile])

  // Realtime subscription for live community updates (Supabase + LocalStorage cross-tab)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Cross-tab synchronization for LocalStorage
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

    // Supabase Realtime channel for postgres_changes on items
    const channel = supabase
      .channel('realtime_community_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'items' },
        async (payload) => {
          const newItem = payload.new
          if (newItem) {
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
                return prev.map(it => it.id === newItem.id ? { ...it, ...itemWithCreator } : it)
              }
              return [itemWithCreator, ...prev]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'items' },
        (payload) => {
          const updated = payload.new
          if (updated) {
            setItems((prev) => {
              const existing = prev.find((it) => it.id === updated.id)
              const merged = { ...updated, creator: existing?.creator || null }
              if (existing) {
                return prev.map((it) => (it.id === updated.id ? merged : it))
              }
              if (updated.recommend_count >= 1) {
                return [merged, ...prev]
              }
              return prev
            })
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
  }, [isSupabaseConfigured])

  // Normalize string for consistent dedup
  function normalizeTitle(str) {
    return str
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
  }

  // Toggle recommendation (+1 / -1)
  async function toggleRecommend(itemId) {
    if (!user) {
      return { error: 'Please sign in to recommend items' }
    }

    if (votingInProgress.current.has(itemId)) {
      return { inProgress: true }
    }
    votingInProgress.current.add(itemId)

    try {
      // Check if user is the owner/creator of the item
      const targetItem = items.find(it => it.id === itemId)
      const isOwner = targetItem && targetItem.created_by === user.id
      const isCurrentlyRecommended = userRecs.has(itemId)

      // User cannot downvote or remove recommendation from their own item
      if (isOwner && isCurrentlyRecommended) {
        return {
          error: 'You recommended this item when creating it (locked at 1). Manage or delete it in My Recommendations.',
          isOwner: true
        }
      }

      if (!isSupabaseConfigured) {
        // Local state update
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

      // Real Supabase vote
      if (isCurrentlyRecommended) {
        // Delete recommendation
        await supabase
          .from('recommendations')
          .delete()
          .match({ user_id: user.id, item_id: itemId })

        setUserRecs(prev => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      } else {
        // Insert recommendation
        await supabase
          .from('recommendations')
          .insert({ user_id: user.id, item_id: itemId })

        setUserRecs(prev => new Set(prev).add(itemId))
      }

      // Re-fetch items to get accurate trigger count
      const { data: dbItems } = await supabase
        .from('items')
        .select('*, creator:profiles!created_by(id, username, display_name, avatar_url, app_uid)')
        .gte('recommend_count', 1)
        .order('recommend_count', { ascending: false })

      if (dbItems) {
        setItems(dbItems)
      }
      return { success: true }
    } catch (err) {
      console.error('Toggle error:', err)
      return { error: err.message }
    } finally {
      votingInProgress.current.delete(itemId)
    }
  }

  // Add new item with deduplication
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

    // Check if item exists in this category
    const existing = items.find(
      it => it.normalized_title === norm && it.category === category
    )

    if (existing) {
      // Item exists: auto-recommend it if not already recommended
      if (!userRecs.has(existing.id)) {
        await toggleRecommend(existing.id)
      }
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
      setItems(prev => [finalItem, ...prev])
      setUserRecs(prev => new Set(prev).add(createdItem.id))
      return { success: true, item: finalItem }
    } catch (err) {
      console.error('Add item error:', err)
      return { error: err.message }
    }
  }

  // Update item globally (Owner only)
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
        .select()
        .single()

      if (error) throw error

      setItems(prev => prev.map(it => (it.id === itemId ? data : it)))
      return { success: true, item: data }
    } catch (err) {
      console.error('Update item error:', err)
      return { error: err.message }
    }
  }

  // Delete item globally (Owner only)
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

  // Active items filter: MUST have recommend_count >= 1
  const activeItems = items.filter(it => it.recommend_count >= 1)

  // Items created by currently logged-in user
  const myItems = items.filter(it => Boolean(user?.id && it.created_by === user.id))

  return (
    <ItemContext.Provider value={{
      items: activeItems,
      rawItems: items,
      myItems,
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

export function useItems() {
  const ctx = useContext(ItemContext)
  if (!ctx) throw new Error('useItems must be used within ItemProvider')
  return ctx
}
