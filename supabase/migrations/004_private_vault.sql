-- Recumend: Database Migration 004
-- Enables Zero-Knowledge Private Vault and prepares Public Key sharing

--------------------------------------------------------------------------------
-- Step 1: Add public_key to User Profiles
-- Stores the user's public ECDH key (as portable text) so other users can encrypt
-- recommendations directly for them in peer-to-peer sharing.
--------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists public_key text;

--------------------------------------------------------------------------------
-- Step 2: Add Encryption Columns to the Items Table
-- - is_private: Flag indicating whether this item belongs to a private personal vault.
-- - ciphertext: The AES-GCM 256-bit encrypted content (title, notes, metadata).
-- - iv: The random 12-byte initialization vector required to decrypt the ciphertext.
--------------------------------------------------------------------------------
alter table public.items 
  add column if not exists is_private boolean not null default false,
  add column if not exists ciphertext text,
  add column if not exists iv text;

--------------------------------------------------------------------------------
-- Step 3: Replace Old Unique Constraint with a Partial Unique Index
-- Old : Prevented any two items from having the same (title, category).
-- Why change: Encrypted private items all use a placeholder title (e.g. "[Encrypted Item]").
-- If the unique constraint was still global, two users couldn't both save private items!
-- Solution: Only enforce uniqueness for PUBLIC items (where is_private = false).
--------------------------------------------------------------------------------
alter table public.items drop constraint if exists unique_item_category;

create unique index if not exists idx_items_unique_public_category 
  on public.items (normalized_title, category) 
  where (is_private = false);

--------------------------------------------------------------------------------
-- Step 4: Performance Indexes
-- 1. Index private items by creator: Makes loading a user's private vault fast.
-- 2. Index created_at descending: Makes reverse-chronological feed sorting fast.
--------------------------------------------------------------------------------
create index if not exists idx_items_private_user 
  on public.items (created_by) 
  where (is_private = true);

create index if not exists idx_items_created_at_desc 
  on public.items (created_at desc);

--------------------------------------------------------------------------------
-- Step 5: Row Level Security (RLS) - Database-Level Access Control
-- Strict security rule:
-- - Anyone (public/guests) can read PUBLIC items (is_private = false).
-- - PRIVATE items (is_private = true) can ONLY be read and accessed by their creator.
-- Even if an attacker queries the database directly, private items are completely invisible!
-------------------------------------------------------------------------------
drop policy if exists "Items readable by anyone" on public.items;
drop policy if exists "Public items readable by all or private by owner" on public.items;

create policy "Public items readable by all or private by owner" on public.items
  for select using (
    is_private = false 
    or 
    (is_private = true and auth.uid() = created_by)
  );

-- Only authenticated users can insert items; private items must be owned by the creator
drop policy if exists "Authenticated users can insert items" on public.items;
create policy "Authenticated users can insert items" on public.items
  for insert with check (
    auth.role() = 'authenticated' 
    and 
    (is_private = false or auth.uid() = created_by)
  );

-- Users can only modify their own recommendations
drop policy if exists "Users can update own created items" on public.items;
create policy "Users can update own created items" on public.items
  for update using (auth.uid() = created_by);

-- Users can only delete their own recommendations
drop policy if exists "Users can delete own created items" on public.items;
create policy "Users can delete own created items" on public.items
  for delete using (auth.uid() = created_by);
