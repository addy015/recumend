-- Migration 006: User Preferences for Cross-Device Persistence
-- Persists personal watched/unwatched states, custom watch orders, and preference metadata

-- 1. Create user_preferences table
create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  watched_items text[] not null default '{}'::text[],
  watch_orders jsonb not null default '{"created":[],"upvoted":[],"private":[]}'::jsonb,
  dismissed_shares text[] not null default '{}'::text[],
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_user_preferences_user on public.user_preferences (user_id);

-- 2. Enable Row Level Security (RLS)
alter table public.user_preferences enable row level security;

-- 3. Strict User Isolation Policies:
-- Only the authenticated owner can select, insert, update, or delete their own preferences
drop policy if exists "Users can view own preferences" on public.user_preferences;
create policy "Users can view own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own preferences" on public.user_preferences;
create policy "Users can insert own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own preferences" on public.user_preferences;
create policy "Users can update own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own preferences" on public.user_preferences;
create policy "Users can delete own preferences"
  on public.user_preferences for delete
  using (auth.uid() = user_id);

-- 4. Enable Supabase Realtime broadcast for live multi-device syncing
alter publication supabase_realtime add table public.user_preferences;
