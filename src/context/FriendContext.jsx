import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useItems } from './ItemContext'
import {
  ensureUserP2PKeys,
  encryptForFriend,
  decryptFromFriend
} from '../lib/vaultCrypto'

const FriendContext = createContext(null)

const LOCAL_FRIENDS_KEY = 'recumend_local_friends'
const LOCAL_SHARES_KEY = 'recumend_local_shares'
const LOCAL_SENT_SHARES_KEY = 'recumend_local_sent_shares'
const LOCAL_DISMISSED_KEY = 'recumend_dismissed_shares'

function getDismissedShareIds(userId) {
  if (typeof window === 'undefined' || !userId) return new Set()
  try {
    const raw = localStorage.getItem(`${LOCAL_DISMISSED_KEY}_${userId}`)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function addDismissedShareId(userId, shareId) {
  if (typeof window === 'undefined' || !userId || !shareId) return
  try {
    const set = getDismissedShareIds(userId)
    set.add(shareId)
    localStorage.setItem(`${LOCAL_DISMISSED_KEY}_${userId}`, JSON.stringify([...set]))
  } catch {
    // ignore
  }
}

export function FriendProvider({ children }) {
  const { user, profile, saveP2PKeysToProfile } = useAuth()
  const { vaultKeys, addItem } = useItems()

  const [friends, setFriends] = useState([])
  const [incomingRequests, setIncomingRequests] = useState([])
  const [outgoingRequests, setOutgoingRequests] = useState([])
  const [sharedItems, setSharedItems] = useState([])
  const [sentSharedItems, setSentSharedItems] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [loadingShared, setLoadingShared] = useState(false)
  const [loadingSent, setLoadingSent] = useState(false)
  const [p2pKeys, setP2pKeys] = useState(null)

  // 1. Initialize active user's ECDH P2P keypair
  useEffect(() => {
    let isMounted = true

    if (!user?.id || !vaultKeys?.vaultKey) {
      setP2pKeys(null)
      return
    }

    ensureUserP2PKeys({
      vaultKey: vaultKeys.vaultKey,
      profile,
      saveKeysToProfile: saveP2PKeysToProfile
    })
      .then((keys) => {
        if (isMounted && keys) {
          setP2pKeys(keys)
        }
      })
      .catch((err) => {
        console.warn('P2P keys initialization error:', err)
      })

    return () => {
      isMounted = false
    }
  }, [user?.id, vaultKeys?.vaultKey, profile, saveP2PKeysToProfile])

  // 2. Fetch friends list and pending friend requests
  const fetchFriends = useCallback(async () => {
    if (!user?.id) {
      setFriends([])
      setIncomingRequests([])
      setOutgoingRequests([])
      return
    }

    if (!isSupabaseConfigured) {
      try {
        const raw = localStorage.getItem(`${LOCAL_FRIENDS_KEY}_${user.id}`)
        const all = raw ? JSON.parse(raw) : []
        setFriends(all.filter((f) => f.status === 'accepted' || !f.status))
        setIncomingRequests(all.filter((f) => f.status === 'pending' && f.friend_id === user.id))
        setOutgoingRequests(all.filter((f) => f.status === 'pending' && f.user_id === user.id))
      } catch {
        setFriends([])
        setIncomingRequests([])
        setOutgoingRequests([])
      }
      return
    }

    setLoadingFriends(true)
    try {
      // Query friendships where user is either sender or recipient
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          user_profile:profiles!user_id(id, username, display_name, avatar_url, public_key),
          friend_profile:profiles!friend_id(id, username, display_name, avatar_url, public_key)
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

      if (error) {
        // Table 005 might not exist yet if migration pending
        console.warn('Friendships fetch notice:', error.message)
        setFriends([])
        setIncomingRequests([])
        setOutgoingRequests([])
        return
      }

      const acceptedList = []
      const incomingList = []
      const outgoingList = []

      for (const row of (data || [])) {
        const isUserSender = row.user_id === user.id
        const target = isUserSender ? row.friend_profile : row.user_profile
        const friendObj = {
          friendshipId: row.id,
          id: target?.id,
          username: target?.username,
          display_name: target?.display_name || target?.username,
          avatar_url: target?.avatar_url,
          public_key: target?.public_key,
          since: row.created_at,
          status: row.status
        }

        if (!friendObj.id || friendObj.id === user.id) continue

        if (row.status === 'accepted') {
          acceptedList.push(friendObj)
        } else if (row.status === 'pending') {
          if (row.friend_id === user.id) {
            // Incoming request: someone wants to add active user
            incomingList.push({
              ...friendObj,
              requestId: row.id,
              sender: row.user_profile
            })
          } else if (row.user_id === user.id) {
            // Outgoing request: active user waiting for recipient to accept
            outgoingList.push({
              ...friendObj,
              requestId: row.id,
              recipient: row.friend_profile
            })
          }
        }
      }

      setFriends(acceptedList)
      setIncomingRequests(incomingList)
      setOutgoingRequests(outgoingList)
    } catch (err) {
      console.error('Failed to fetch friends:', err)
    } finally {
      setLoadingFriends(false)
    }
  }, [user])

  // 3. Fetch shared recommendations
  const fetchSharedItems = useCallback(async () => {
    if (!user?.id) {
      setSharedItems([])
      return
    }

    if (!isSupabaseConfigured) {
      try {
        const raw = localStorage.getItem(`${LOCAL_SHARES_KEY}_${user.id}`)
        setSharedItems(raw ? JSON.parse(raw) : [])
      } catch {
        setSharedItems([])
      }
      return
    }

    setLoadingShared(true)
    try {
      const { data, error } = await supabase
        .from('shared_recommendations')
        .select(`
          id,
          sender_id,
          recipient_id,
          item_id,
          is_private_item,
          ciphertext,
          iv,
          metadata,
          note,
          is_read,
          created_at,
          sender:profiles!sender_id(id, username, display_name, avatar_url, public_key),
          item:items!item_id(*)
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Shared items fetch notice:', error.message)
        setSharedItems([])
        return
      }

      // Filter out items dismissed by recipient
      const localDismissed = getDismissedShareIds(user.id)
      const visibleData = (data || []).filter(
        (s) => !s.metadata?.dismissed_by_recipient && !localDismissed.has(s.id)
      )

      setSharedItems(visibleData)
    } catch (err) {
      console.error('Failed to fetch shared items:', err)
    } finally {
      setLoadingShared(false)
    }
  }, [user])

  // 3b. Fetch sent recommendations (Shared by me)
  const fetchSentSharedItems = useCallback(async () => {
    if (!user?.id) {
      setSentSharedItems([])
      return
    }

    if (!isSupabaseConfigured) {
      try {
        const raw = localStorage.getItem(`${LOCAL_SENT_SHARES_KEY}_${user.id}`)
        setSentSharedItems(raw ? JSON.parse(raw) : [])
      } catch {
        setSentSharedItems([])
      }
      return
    }

    setLoadingSent(true)
    try {
      const { data, error } = await supabase
        .from('shared_recommendations')
        .select(`
          id,
          sender_id,
          recipient_id,
          item_id,
          is_private_item,
          ciphertext,
          iv,
          metadata,
          note,
          is_read,
          created_at,
          recipient:profiles!recipient_id(id, username, display_name, avatar_url, public_key),
          item:items!item_id(*)
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Sent shared items fetch notice:', error.message)
        setSentSharedItems([])
        return
      }

      setSentSharedItems(data || [])
    } catch (err) {
      console.error('Failed to fetch sent shared items:', err)
    } finally {
      setLoadingSent(false)
    }
  }, [user])

  useEffect(() => {
    fetchFriends()
    fetchSharedItems()
    fetchSentSharedItems()
  }, [fetchFriends, fetchSharedItems, fetchSentSharedItems])

  // 4. Realtime subscription for incoming/outgoing shares and friend requests
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) return

    const channel = supabase
      .channel(`shares_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_recommendations',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          fetchSharedItems()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_recommendations',
          filter: `sender_id=eq.${user.id}`
        },
        () => {
          fetchSentSharedItems()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships'
        },
        () => {
          fetchFriends()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, fetchSharedItems, fetchSentSharedItems, fetchFriends])

  // 5. Search user by username (@username lookup)
  const searchUserByUsername = useCallback(async (query) => {
    const clean = String(query || '').trim().toLowerCase().replace(/^@/, '').replace(/[,()]/g, '')
    if (!clean || clean.length < 2) return []

    if (!isSupabaseConfigured) {
      const demoUsers = [
        { id: 'demo-user-123', username: 'dan_e', display_name: 'Dan Erickson', avatar_url: null, public_key: null },
        { id: 'demo-user-456', username: 'yamada', display_name: 'Kanehito Yamada', avatar_url: null, public_key: null }
      ].filter(u => u.username.includes(clean) && u.id !== user?.id)

      const friendIdSet = new Set(friends.map(f => f.id))
      const incomingReqMap = new Map(incomingRequests.map(r => [r.id, r.requestId]))
      const outgoingReqMap = new Map(outgoingRequests.map(r => [r.id, r.requestId]))

      return demoUsers.map(u => ({
        ...u,
        isFriend: friendIdSet.has(u.id),
        isIncomingPending: incomingReqMap.has(u.id),
        isOutgoingPending: outgoingReqMap.has(u.id),
        requestId: incomingReqMap.get(u.id) || outgoingReqMap.get(u.id) || null
      }))
    }

    try {
      let queryBuilder = supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, public_key')
        .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`)
        .limit(10)

      if (user?.id) {
        queryBuilder = queryBuilder.neq('id', user.id)
      }

      const { data, error } = await queryBuilder

      if (error) throw error

      const friendIdSet = new Set(friends.map(f => f.id))
      const incomingReqMap = new Map(incomingRequests.map(r => [r.id, r.requestId]))
      const outgoingReqMap = new Map(outgoingRequests.map(r => [r.id, r.requestId]))

      return (data || []).map(u => ({
        ...u,
        isFriend: friendIdSet.has(u.id),
        isIncomingPending: incomingReqMap.has(u.id),
        isOutgoingPending: outgoingReqMap.has(u.id),
        requestId: incomingReqMap.get(u.id) || outgoingReqMap.get(u.id) || null
      }))
    } catch (err) {
      console.error('Search user error:', err)
      return []
    }
  }, [user, friends, incomingRequests, outgoingRequests])

  // 6. Send friend request (recipient must accept before mutual friendship is established)
  const sendFriendRequest = useCallback(async (targetUser) => {
    if (!user?.id) return { error: 'Must be signed in to add friends' }
    if (!targetUser?.id || targetUser.id === user.id) return { error: 'Invalid friend selection' }

    if (friends.some(f => f.id === targetUser.id)) {
      return { error: 'Already connected as friends' }
    }
    if (outgoingRequests.some(r => r.id === targetUser.id)) {
      return { error: 'Friend request already sent and pending' }
    }

    if (!isSupabaseConfigured) {
      const newFriendship = {
        friendshipId: `f_${Date.now()}`,
        id: targetUser.id,
        user_id: user.id,
        friend_id: targetUser.id,
        username: targetUser.username,
        display_name: targetUser.display_name || targetUser.username,
        avatar_url: targetUser.avatar_url,
        public_key: targetUser.public_key,
        status: 'pending',
        since: new Date().toISOString()
      }
      const raw = localStorage.getItem(`${LOCAL_FRIENDS_KEY}_${user.id}`)
      const all = raw ? JSON.parse(raw) : []
      const next = [newFriendship, ...all]
      localStorage.setItem(`${LOCAL_FRIENDS_KEY}_${user.id}`, JSON.stringify(next))

      // Also persist to recipient's local storage for simulated local testing
      try {
        const rawTarget = localStorage.getItem(`${LOCAL_FRIENDS_KEY}_${targetUser.id}`)
        const allTarget = rawTarget ? JSON.parse(rawTarget) : []
        const incomingTarget = {
          ...newFriendship,
          id: user.id,
          username: profile?.username || 'curator',
          display_name: profile?.display_name || profile?.username || 'Curator',
          avatar_url: profile?.avatar_url || null,
          public_key: p2pKeys?.publicKeyJwkString || null
        }
        localStorage.setItem(`${LOCAL_FRIENDS_KEY}_${targetUser.id}`, JSON.stringify([incomingTarget, ...allTarget]))
      } catch {
        // ignore
      }

      await fetchFriends()
      return { success: true, pending: true }
    }

    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: targetUser.id,
          status: 'pending'
        })

      if (error) {
        if (error.code === '23505') {
          return { error: 'A friend connection or request already exists with this user' }
        }
        throw error
      }

      await fetchFriends()
      return { success: true, pending: true }
    } catch (err) {
      console.error('Send friend request error:', err)
      return { error: err.message || 'Failed to send friend request' }
    }
  }, [user, friends, outgoingRequests, fetchFriends, profile, p2pKeys])

  // Alias for backward compatibility
  const addFriend = sendFriendRequest

  // 7. Accept incoming friend request
  const acceptFriendRequest = useCallback(async (requestId) => {
    if (!user?.id || !requestId) return { error: 'Invalid request' }

    if (!isSupabaseConfigured) {
      const raw = localStorage.getItem(`${LOCAL_FRIENDS_KEY}_${user.id}`)
      const all = raw ? JSON.parse(raw) : []
      const next = all.map(f => f.friendshipId === requestId ? { ...f, status: 'accepted' } : f)
      localStorage.setItem(`${LOCAL_FRIENDS_KEY}_${user.id}`, JSON.stringify(next))
      await fetchFriends()
      return { success: true }
    }

    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('friend_id', user.id)

      if (error) throw error
      await fetchFriends()
      return { success: true }
    } catch (err) {
      console.error('Accept friend request error:', err)
      return { error: err.message || 'Failed to accept friend request' }
    }
  }, [user, fetchFriends])

  // 8. Decline incoming friend request
  const declineFriendRequest = useCallback(async (requestId) => {
    if (!user?.id || !requestId) return { error: 'Invalid request' }

    if (!isSupabaseConfigured) {
      const raw = localStorage.getItem(`${LOCAL_FRIENDS_KEY}_${user.id}`)
      const all = raw ? JSON.parse(raw) : []
      const next = all.filter(f => f.friendshipId !== requestId)
      localStorage.setItem(`${LOCAL_FRIENDS_KEY}_${user.id}`, JSON.stringify(next))
      await fetchFriends()
      return { success: true }
    }

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId)
        .eq('friend_id', user.id)

      if (error) throw error
      await fetchFriends()
      return { success: true }
    } catch (err) {
      console.error('Decline friend request error:', err)
      return { error: err.message || 'Failed to decline friend request' }
    }
  }, [user, fetchFriends])

  // 9. Cancel outgoing friend request
  const cancelFriendRequest = useCallback(async (requestId) => {
    if (!user?.id || !requestId) return { error: 'Invalid request' }

    if (!isSupabaseConfigured) {
      const raw = localStorage.getItem(`${LOCAL_FRIENDS_KEY}_${user.id}`)
      const all = raw ? JSON.parse(raw) : []
      const next = all.filter(f => f.friendshipId !== requestId)
      localStorage.setItem(`${LOCAL_FRIENDS_KEY}_${user.id}`, JSON.stringify(next))
      await fetchFriends()
      return { success: true }
    }

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId)
        .eq('user_id', user.id)

      if (error) throw error
      await fetchFriends()
      return { success: true }
    } catch (err) {
      console.error('Cancel friend request error:', err)
      return { error: err.message || 'Failed to cancel friend request' }
    }
  }, [user, fetchFriends])

  // 10. Remove friend (unfriend)
  const removeFriend = useCallback(async (friendId) => {
    if (!user?.id || !friendId) return { error: 'Invalid friend id' }

    if (!isSupabaseConfigured) {
      const next = friends.filter(f => f.id !== friendId)
      setFriends(next)
      localStorage.setItem(`${LOCAL_FRIENDS_KEY}_${user.id}`, JSON.stringify(next))
      return { success: true }
    }

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)

      if (error) throw error

      setFriends(prev => prev.filter(f => f.id !== friendId))
      return { success: true }
    } catch (err) {
      console.error('Remove friend error:', err)
      return { error: err.message || 'Failed to remove friend' }
    }
  }, [user, friends])

  // 8. Share an item with one or more friends (Public or E2EE Private)
  const shareItem = useCallback(async ({ item, recipientIds = [], personalNote = '' }) => {
    if (!user?.id) return { error: 'Must be signed in to share' }
    if (!item) return { error: 'No recommendation selected' }
    if (!recipientIds.length) return { error: 'Please select at least one friend' }

    const isPrivate = Boolean(item.is_private)
    const noteText = personalNote ? personalNote.trim() : null

    // For private items, ensure user has an active P2P private key
    if (isPrivate && !p2pKeys?.privateKey) {
      return { error: 'Your P2P encryption keys are still initializing. Please try again in a few seconds.' }
    }

    if (!isSupabaseConfigured) {
      // Mock local delivery for offline/demo mode
      const newShares = recipientIds.map(rId => ({
        id: `share_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sender_id: user.id,
        recipient_id: rId,
        item_id: isPrivate ? null : item.id,
        is_private_item: isPrivate,
        ciphertext: isPrivate ? 'mock_ciphertext' : null,
        iv: isPrivate ? 'mock_iv' : null,
        metadata: {
          title: item.title,
          category: item.category,
          note: item.metadata?.note
        },
        note: noteText,
        is_read: false,
        created_at: new Date().toISOString(),
        sender: profile ? {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          public_key: p2pKeys?.publicKeyJwkString
        } : null,
        item: isPrivate ? null : item
      }))

      recipientIds.forEach(rId => {
        try {
          const raw = localStorage.getItem(`${LOCAL_SHARES_KEY}_${rId}`)
          const existing = raw ? JSON.parse(raw) : []
          localStorage.setItem(`${LOCAL_SHARES_KEY}_${rId}`, JSON.stringify([...newShares.filter(s => s.recipient_id === rId), ...existing]))
        } catch {
          // ignore localstorage errors
        }
      })

      // Also persist to sender's sent shares in local/demo mode
      try {
        const rawSent = localStorage.getItem(`${LOCAL_SENT_SHARES_KEY}_${user.id}`)
        const existingSent = rawSent ? JSON.parse(rawSent) : []
        const decoratedSent = newShares.map(s => {
          const recipientFriend = friends.find(f => f.id === s.recipient_id)
          return {
            ...s,
            recipient: recipientFriend ? {
              id: recipientFriend.id,
              username: recipientFriend.username,
              display_name: recipientFriend.display_name,
              avatar_url: recipientFriend.avatar_url,
              public_key: recipientFriend.public_key
            } : null
          }
        })
        const nextSent = [...decoratedSent, ...existingSent]
        localStorage.setItem(`${LOCAL_SENT_SHARES_KEY}_${user.id}`, JSON.stringify(nextSent))
        setSentSharedItems(nextSent)
      } catch {
        // ignore local storage errors
      }

      return { success: true, count: recipientIds.length }
    }

    try {
      const recordsToInsert = []

      for (const rId of recipientIds) {
        if (!isPrivate) {
          // Public Item Sharing: direct reference
          recordsToInsert.push({
            sender_id: user.id,
            recipient_id: rId,
            item_id: item.id,
            is_private_item: false,
            metadata: {
              title: item.title,
              category: item.category,
              ...(item.metadata || {})
            },
            note: noteText,
            is_read: false
          })
        } else {
          // Private Item Sharing: E2EE via Recipient's ECDH Public Key
          const recipientFriend = friends.find(f => f.id === rId)
          let recipientPublicKey = recipientFriend?.public_key

          // If friend's public key was not cached, query it directly from profiles
          if (!recipientPublicKey) {
            const { data: profData } = await supabase
              .from('profiles')
              .select('public_key')
              .eq('id', rId)
              .single()
            recipientPublicKey = profData?.public_key
          }

          if (!recipientPublicKey) {
            return {
              error: `@${recipientFriend?.username || 'Selected friend'} has not activated their private sharing key yet.`
            }
          }

          const payload = {
            title: item.title,
            category: item.category,
            metadata: item.metadata || {},
            note: item.metadata?.note || ''
          }

          const encrypted = await encryptForFriend(
            payload,
            recipientPublicKey,
            p2pKeys.privateKey
          )

          recordsToInsert.push({
            sender_id: user.id,
            recipient_id: rId,
            item_id: null,
            is_private_item: true,
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            metadata: {
              category: item.category
            },
            note: noteText,
            is_read: false
          })
        }
      }

      const { error: insertErr } = await supabase
        .from('shared_recommendations')
        .insert(recordsToInsert)

      if (insertErr) throw insertErr

      await fetchSentSharedItems()

      return { success: true, count: recordsToInsert.length }
    } catch (err) {
      console.error('Share item error:', err)
      return { error: err.message || 'Failed to share recommendation' }
    }
  }, [user, friends, p2pKeys, profile, fetchSentSharedItems])

  // 9. Decrypt a private shared item client-side (for incoming or outgoing shares)
  const decryptSharedItem = useCallback(async (share) => {
    if (!share?.is_private_item) {
      return {
        ...share,
        title: share.item?.title || share.metadata?.title || 'Shared Item',
        category: share.item?.category || share.metadata?.category || 'other',
        metadata: share.item?.metadata || share.metadata || {},
        _isDecrypted: true
      }
    }

    if (!p2pKeys?.privateKey) {
      return {
        ...share,
        title: '[Encrypted Private Share]',
        category: share.metadata?.category || 'other',
        metadata: {},
        _isDecrypted: false,
        _decryptionFailed: false
      }
    }

    const isSender = Boolean(user?.id && share.sender_id === user.id)
    let peerPublicKey = isSender ? share.recipient?.public_key : share.sender?.public_key
    const peerId = isSender ? share.recipient_id : share.sender_id

    if (!peerPublicKey && peerId && isSupabaseConfigured) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('public_key')
          .eq('id', peerId)
          .single()
        peerPublicKey = prof?.public_key
      } catch (err) {
        console.warn('Peer public key fallback fetch notice:', err)
      }
    }

    if (!peerPublicKey) {
      return {
        ...share,
        title: isSender ? '[Private Share - Recipient Public Key Missing]' : '[Private Share - Sender Public Key Missing]',
        category: share.metadata?.category || 'other',
        metadata: {},
        _isDecrypted: false,
        _decryptionFailed: true
      }
    }

    try {
      const decrypted = await decryptFromFriend(
        share.ciphertext,
        share.iv,
        peerPublicKey,
        p2pKeys.privateKey
      )

      return {
        ...share,
        title: decrypted.title || 'Private Shared Item',
        category: decrypted.category || share.metadata?.category || 'other',
        metadata: decrypted.metadata || {},
        _isDecrypted: true,
        _decryptionFailed: false
      }
    } catch (err) {
      console.warn('Decryption of shared item failed:', err)
      return {
        ...share,
        title: '[Decryption Error]',
        category: share.metadata?.category || 'other',
        metadata: {},
        _isDecrypted: false,
        _decryptionFailed: true
      }
    }
  }, [user, p2pKeys])

  // 10. Mark a shared recommendation as read
  const markShareAsRead = useCallback(async (shareId) => {
    if (!shareId) return
    setSharedItems(prev => prev.map(s => s.id === shareId ? { ...s, is_read: true } : s))

    if (!isSupabaseConfigured) return

    try {
      await supabase
        .from('shared_recommendations')
        .update({ is_read: true })
        .eq('id', shareId)
    } catch (err) {
      console.warn('Failed to mark share as read:', err)
    }
  }, [])

  // 11. Delete a shared recommendation (role-aware: receiver dismisses from inbox only, sender deletes from sent)
  const deleteShare = useCallback(async (shareId, options = {}) => {
    if (!shareId) return { error: 'Invalid share ID' }
    const isSender = Boolean(options.isSender)

    if (isSender) {
      // SENDER deleting from "By Me"
      setSentSharedItems(prev => prev.filter(s => s.id !== shareId))

      if (!isSupabaseConfigured) {
        if (user?.id) {
          try {
            const rawSent = localStorage.getItem(`${LOCAL_SENT_SHARES_KEY}_${user.id}`)
            if (rawSent) {
              const next = JSON.parse(rawSent).filter(s => s.id !== shareId)
              localStorage.setItem(`${LOCAL_SENT_SHARES_KEY}_${user.id}`, JSON.stringify(next))
            }
          } catch {
            // ignore
          }
        }
        return { success: true }
      }

      try {
        const { error } = await supabase
          .from('shared_recommendations')
          .delete()
          .eq('id', shareId)
          .eq('sender_id', user?.id || '')

        if (error) throw error
        return { success: true }
      } catch (err) {
        console.error('Delete share error:', err)
        return { error: err.message || 'Failed to remove share' }
      }
    } else {
      // RECEIVER deleting from "With Me" (dismiss from inbox only - does NOT affect sender's sent history!)
      setSharedItems(prev => prev.filter(s => s.id !== shareId))
      if (user?.id) {
        addDismissedShareId(user.id, shareId)
      }

      if (!isSupabaseConfigured) {
        if (user?.id) {
          try {
            const rawRecv = localStorage.getItem(`${LOCAL_SHARES_KEY}_${user.id}`)
            if (rawRecv) {
              const next = JSON.parse(rawRecv).filter(s => s.id !== shareId)
              localStorage.setItem(`${LOCAL_SHARES_KEY}_${user.id}`, JSON.stringify(next))
            }
          } catch {
            // ignore
          }
        }
        return { success: true }
      }

      try {
        const currentItem = sharedItems.find(s => s.id === shareId)
        const { error } = await supabase
          .from('shared_recommendations')
          .update({
            is_read: true,
            metadata: {
              ...(currentItem?.metadata || {}),
              dismissed_by_recipient: true
            }
          })
          .eq('id', shareId)
          .eq('recipient_id', user?.id || '')

        if (error) {
          console.warn('Update dismissed metadata notice:', error)
        }
        return { success: true }
      } catch (err) {
        console.error('Dismiss share error:', err)
        return { error: err.message || 'Failed to remove share' }
      }
    }
  }, [user, sharedItems])

  // 12. Save a shared recommendation to user's own vault
  const saveSharedToVault = useCallback(async (sharedItem, { isPrivate = false }) => {
    if (!sharedItem) return { error: 'No item provided' }

    const preservedMetadata = {
      ...(sharedItem.metadata || {})
    }
    if (sharedItem.note) {
      if (preservedMetadata.note) {
        preservedMetadata.note = `${preservedMetadata.note}\n\n[Note from @${sharedItem.sender?.username || 'friend'}: "${sharedItem.note}"]`
      } else {
        preservedMetadata.note = `Note from @${sharedItem.sender?.username || 'friend'}: "${sharedItem.note}"`
      }
    }

    const res = await addItem({
      title: sharedItem.title,
      category: sharedItem.category,
      metadata: preservedMetadata,
      is_private: isPrivate
    })

    if (res?.success) {
      await markShareAsRead(sharedItem.id)
    }

    return res
  }, [addItem, markShareAsRead])

  // 13. Mark all incoming shares as read
  const markAllSharesAsRead = useCallback(async () => {
    const unreadIds = sharedItems.filter(s => !s.is_read).map(s => s.id)
    if (!unreadIds.length) return

    setSharedItems(prev => prev.map(s => ({ ...s, is_read: true })))

    if (!isSupabaseConfigured) return

    try {
      await supabase
        .from('shared_recommendations')
        .update({ is_read: true })
        .in('id', unreadIds)
    } catch (err) {
      console.warn('Failed to mark all as read:', err)
    }
  }, [sharedItems])

  const unreadCount = useMemo(() => {
    return sharedItems.filter(s => !s.is_read).length
  }, [sharedItems])

  return (
    <FriendContext.Provider value={{
      friends,
      incomingRequests,
      outgoingRequests,
      sharedItems,
      sentSharedItems,
      unreadCount,
      loadingFriends,
      loadingShared,
      loadingSent,
      p2pKeys,
      fetchFriends,
      fetchSharedItems,
      fetchSentSharedItems,
      searchUserByUsername,
      sendFriendRequest,
      addFriend,
      acceptFriendRequest,
      declineFriendRequest,
      cancelFriendRequest,
      removeFriend,
      shareItem,
      decryptSharedItem,
      markShareAsRead,
      markAllSharesAsRead,
      deleteShare,
      saveSharedToVault
    }}>
      {children}
    </FriendContext.Provider>
  )
}

export function useFriends() {
  const ctx = useContext(FriendContext)
  if (!ctx) {
    throw new Error('useFriends must be used within a FriendProvider')
  }
  return ctx
}
