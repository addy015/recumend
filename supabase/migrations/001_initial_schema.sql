-- Recumend: Initial PostgreSQL Schema for Supabase

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  app_uid text unique not null,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_profiles_username on public.profiles (username);
create index if not exists idx_profiles_app_uid on public.profiles (app_uid);

-- 2. ITEMS TABLE
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  normalized_title text not null,
  category text not null check (category in ('movie', 'show', 'anime', 'book', 'game', 'yt', 'docu', 'app', 'other')),
  recommend_count integer default 1 not null,
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  constraint unique_item_category unique (normalized_title, category)
);

create index if not exists idx_items_recommend_count on public.items (recommend_count desc);
create index if not exists idx_items_recommend_count_created on public.items (recommend_count desc, created_at asc);
create index if not exists idx_items_category on public.items (category);
create index if not exists idx_items_normalized_title on public.items (normalized_title);

-- 3. RECOMMENDATIONS (VOTES) TABLE
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  item_id uuid references public.items(id) on delete cascade not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  constraint unique_user_item_rec unique (user_id, item_id)
);

create index if not exists idx_recommendations_user on public.recommendations (user_id);
create index if not exists idx_recommendations_item on public.recommendations (item_id);

-- 4. DB FUNCTION & TRIGGER TO AUTO-UPDATE RECOMMEND_COUNT
create or replace function public.update_item_recommend_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.items set recommend_count = recommend_count + 1, updated_at = now() where id = NEW.item_id;
  elsif (TG_OP = 'DELETE') then
    update public.items set recommend_count = greatest(0, recommend_count - 1), updated_at = now() where id = OLD.item_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_recommend_count on public.recommendations;
create trigger trigger_recommend_count
after insert or delete on public.recommendations
for each row execute function public.update_item_recommend_count();

-- 5. ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.recommendations enable row level security;

-- Profiles: Anyone can read, user can update their own
create policy "Profiles readable by anyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Items: Anyone can read items with recommend_count >= 1 (or all authenticated users)
create policy "Items readable by anyone" on public.items for select using (true);
create policy "Authenticated users can insert items" on public.items for insert with check (auth.role() = 'authenticated');
create policy "Users can update own created items" on public.items for update using (auth.uid() = created_by);
create policy "Users can delete own created items" on public.items for delete using (auth.uid() = created_by);

-- Recommendations: Anyone can view, logged in users manage their own votes
create policy "Recommendations readable by anyone" on public.recommendations for select using (true);
create policy "Users can add recommendation" on public.recommendations for insert with check (auth.uid() = user_id);
create policy "Users can remove recommendation" on public.recommendations for delete using (auth.uid() = user_id);
