# Recumend — Implementation Specification

Clean, minimal community recommendation platform. Rock-solid, zero-bloat architecture.

---

## 1. Tech Stack (Battle-Tested & Stable)

| Layer | Tool | Rationale |
|---|---|---|
| **Frontend** | React 18 + Vite | Fast startup, production-stable, zero bundle lag. |
| **Styling** | Tailwind CSS v3 | Mature, stable, deterministic classes. |
| **Icons** | Lucide React | Lightweight, tree-shakeable SVG icons. |
| **Backend & DB** | Supabase (PostgreSQL 15) | Relational integrity, built-in Google OAuth, Row Level Security (RLS), instant API. Zero custom server maintenance. |
| **Auth** | Supabase Auth (Google OAuth 2.0) | Token handling, session persistence, automatic refresh handled natively. |

---

## 2. Design System: Strict Minimal Dark Mode

**Rules**:
* **No AI purple/violet gradients**.
* **No heavy glassmorphism/blurs**.
* **Palette**: True dark monochrome / zinc tones.
  * Background: `#09090b` (zinc-950)
  * Surface / Card: `#18181b` (zinc-900)
  * Border: `#27272a` (zinc-800)
  * Hover / Active: `#3f3f46` (zinc-700)
  * Primary Text: `#f4f4f5` (zinc-100)
  * Secondary Text: `#a1a1aa` (zinc-400)
  * Accent / Active State: Clean White `#ffffff` or Subtle Emerald `#10b981` (badge only).
* **Typography**: Clean system sans-serif (`Inter` or system-ui).

---

## 3. Database Schema (PostgreSQL via Supabase)

### 3.1 `profiles` Table
Stores user identities. Created automatically on first Google sign-in via DB trigger.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  app_uid text unique not null,         -- Immutable app ID: e.g. "rec_8f3a"
  username text unique not null,        -- Mutable, unique handle (lowercase)
  display_name text not null,           -- Mutable display name
  avatar_url text,                      -- Google profile picture
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for searching users by username
create index idx_profiles_username on profiles (username);
```

### 3.2 `items` Table
Single table for all categories. Flexible metadata via `jsonb`.

```sql
create table items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  normalized_title text not null,      -- Lowercase stripped (e.g. "inception")
  category text not null,               -- 'movie' | 'show' | 'anime' | 'book' | 'game' | 'yt' | 'docu' | 'other'
  recommend_count integer default 1,   -- Denormalized counter for fast sorting
  created_by uuid references profiles(id) on delete set null,
  metadata jsonb default '{}'::jsonb,   -- Category specifics (link, creator, year, etc.)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_item_category unique (normalized_title, category)
);

-- Indexes for performance
create index idx_items_recommend_count on items (recommend_count desc);
create index idx_items_category on items (category);
create index idx_items_title_search on items using gin (to_tsvector('simple', title));
```

### 3.3 `recommendations` Table (Votes / Links)
Records which user recommended which item.

```sql
create table recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  item_id uuid references items(id) on delete cascade not null,
  created_at timestamptz default now(),
  constraint unique_user_item_rec unique (user_id, item_id)
);

create index idx_recommendations_user on recommendations (user_id);
create index idx_recommendations_item on recommendations (item_id);
```

### 3.4 DB Function & Trigger: Auto Sync `recommend_count`
Keeps `recommend_count` accurate without frontend race conditions.

```sql
create or replace function update_item_recommend_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update items set recommend_count = recommend_count + 1 where id = NEW.item_id;
  elsif (TG_OP = 'DELETE') then
    update items set recommend_count = recommend_count - 1 where id = OLD.item_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trigger_recommend_count
after insert or delete on recommendations
for each row execute function update_item_recommend_count();
```

---

## 4. Core Features & Business Logic

### 4.1 Search Behavior
* **Strict Rule**: If item has `recommend_count < 1`, do not return in search results.
* **Query**:
  ```sql
  select * from items
  where recommend_count >= 1
    and title ilike '%' || :search_term || '%'
    and (:category is null or category = :category)
  order by recommend_count desc;
  ```
* **User Search**:
  ```sql
  select id, app_uid, username, display_name, avatar_url 
  from profiles 
  where username ilike '%' || :search_query || '%'
  limit 10;
  ```

### 4.2 Deduplication on Adding Items
To avoid "Inception" vs "inception ":
1. **Search First Modal**: User types title → dropdown live-searches existing items in DB.
2. If item already exists: User clicks "+1 Recommend" instead of creating duplicate.
3. If new item: Normalizes string (`trim()`, `toLowerCase()`) and creates item + automatically creates `recommendation` record for current user.

### 4.3 Profile & Identity Flow
* First Login:
  * Generates random `app_uid` (e.g. `u_` + 6 random hex chars).
  * Sets default `username` from Google email prefix + random suffix if collision.
* Edit Profile:
  * User can edit `display_name` anytime.
  * User can change `username` (checks uniqueness before save).
  * `app_uid` remains permanently fixed.
* User Profile Page (`/u/:username`):
  * Shows user's stats, joined date, and all items they recommended.

---

## 5. UI Layout & Pages

```
/ (Home / Global Feed)
 ├── Top Bar: Brand, Search Bar, Category Filter Chips, Auth Button / User Menu
 ├── Leaderboard Grid:
 │    └── Item Card: Rank Badge (#1, #2), Title, Category Chip, Recommend Count (+1 Toggle), Recommended By Avatars
 └── Add Recommendation Floating Button (Opens Search-First Modal)

/search?q=... (Global Search View)
 └── Search results for items (recommend_count >= 1) & users.

/u/:username (User Profile)
 ├── Header: Avatar, Display Name, @username, App UID, Total Recs
 └── Grid of items recommended by this user.

/settings (Account Settings)
 └── Update Display Name, Update Username, Logout.
```

---

## 6. Execution Steps (Step-by-Step)

1. **Step 1: Init Project**
   * Setup Vite React + Tailwind CSS v3.
   * Configure zinc/neutral dark palette in `tailwind.config.js`.
2. **Step 2: Supabase Project Setup**
   * Run SQL migrations for `profiles`, `items`, `recommendations`, and trigger.
   * Enable Google OAuth in Supabase dashboard.
3. **Step 3: Auth & Profile Context**
   * Build `AuthContext` with Supabase client listener.
   * Handle first-time user profile initialization.
4. **Step 4: Feed & Ranking Display**
   * Fetch items sorted by `recommend_count desc`.
   * Category filter bar (All, Movie, Show, Anime, Book, Game, YT, App/website, Other).
5. **Step 5: Recommend & Add Item Flow**
   * Deduplication search dialog.
   * Insert item or toggle existing recommendation.
6. **Step 6: Live Search & Profile Route**
   * Search input with instant filtering (count >= 1).
   * User profile view (`/u/:username`) and settings page.
7. **Step 7: Owner Rec Lock & My Recommendations Management**
   * Creator cannot downvote own items; vote permanently locked at +1.
   * Dedicated "My Recommendations" section with live edit and delete capabilities updating globally.
   * Supabase RLS update/delete policies for item creators.
8. **Step 8: Testing & Verification**
   * Edge cases: duplicate titles, user name collisions, 0-recommendation edge cases, unauthorized votes.
