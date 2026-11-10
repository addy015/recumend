-- Migration 005: Friendships and E2EE Shared Recommendations
-- Adds peer-to-peer friend connections and zero-knowledge recommendation sharing

-- 1. Extend Profiles with ECDH Public Key and Client-Encrypted Private Key
alter table public.profiles
  add column if not exists public_key text,
  add column if not exists encrypted_private_key text;

-- 2. Friendships Table
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  friend_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  constraint unique_friendship unique (user_id, friend_id),
  constraint no_self_friend check (user_id != friend_id)
);

create index if not exists idx_friendships_user on public.friendships (user_id);
create index if not exists idx_friendships_friend on public.friendships (friend_id);
create unique index if not exists idx_friendships_canonical on public.friendships (least(user_id, friend_id), greatest(user_id, friend_id));

-- 3. Shared Recommendations Table
create table if not exists public.shared_recommendations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  item_id uuid references public.items(id) on delete cascade, -- null if private item
  is_private_item boolean not null default false,
  ciphertext text,                                            -- encrypted payload for private items
  iv text,
  metadata jsonb default '{}'::jsonb not null,                -- item category, title, platform etc.
  note text,                                                  -- personal message from sender
  is_read boolean not null default false,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_shares_recipient on public.shared_recommendations (recipient_id);
create index if not exists idx_shares_sender on public.shared_recommendations (sender_id);
create index if not exists idx_shares_unread on public.shared_recommendations (recipient_id) where (is_read = false);

-- 4. Enable Row Level Security
alter table public.friendships enable row level security;
alter table public.shared_recommendations enable row level security;

-- 5. Friendship RLS Policies
drop policy if exists "Users can view own friendships" on public.friendships;
create policy "Users can view own friendships"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "Users can add friends" on public.friendships;
create policy "Users can add friends"
  on public.friendships for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own friendships" on public.friendships;
create policy "Users can update own friendships"
  on public.friendships for update
  using (auth.uid() = friend_id or auth.uid() = user_id);

drop policy if exists "Users can remove friends" on public.friendships;
create policy "Users can remove friends"
  on public.friendships for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- 6. Shared Recommendations RLS Policies
drop policy if exists "Recipients and senders can view shares" on public.shared_recommendations;
create policy "Recipients and senders can view shares"
  on public.shared_recommendations for select
  using (auth.uid() = recipient_id or auth.uid() = sender_id);

drop policy if exists "Users can send recommendations to friends" on public.shared_recommendations;
create policy "Users can send recommendations to friends"
  on public.shared_recommendations for insert
  with check (auth.uid() = sender_id);

drop policy if exists "Recipients can update read status" on public.shared_recommendations;
create policy "Recipients can update read status"
  on public.shared_recommendations for update
  using (auth.uid() = recipient_id);

drop policy if exists "Recipients or senders can delete shares" on public.shared_recommendations;
create policy "Recipients or senders can delete shares"
  on public.shared_recommendations for delete
  using (auth.uid() = recipient_id or auth.uid() = sender_id);

-- 7. Add Tables to Supabase Realtime Publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.friendships;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.shared_recommendations;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
