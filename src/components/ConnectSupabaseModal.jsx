import React, { useState } from 'react'
import { X, Database, Check, Copy, ExternalLink, AlertCircle, Key, Globe, ShieldCheck } from 'lucide-react'
import { isSupabaseConfigured, supabaseUrl, supabaseAnonKey, saveSupabaseConfig, clearSupabaseConfig } from '../lib/supabase'

const SQL_SCHEMA = `-- Recumend: Initial PostgreSQL Schema for Supabase

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

-- 4. TAMPER PROTECTION & TRIGGER TO AUTO-UPDATE RECOMMEND_COUNT (Rule 12 & 24)
create or replace function public.protect_item_columns()
returns trigger as $$
begin
  if current_setting('recumend.is_vote_trigger', true) is distinct from 'true' then
    NEW.recommend_count := OLD.recommend_count;
  end if;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := timezone('utc'::text, now());
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_protect_item_columns on public.items;
create trigger trigger_protect_item_columns
before update on public.items
for each row execute function public.protect_item_columns();

create or replace function public.update_item_recommend_count()
returns trigger as $$
begin
  perform set_config('recumend.is_vote_trigger', 'true', true);
  if (TG_OP = 'INSERT') then
    update public.items set recommend_count = recommend_count + 1 where id = NEW.item_id;
  elsif (TG_OP = 'DELETE') then
    update public.items set recommend_count = greatest(1, recommend_count - 1) where id = OLD.item_id;
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

create policy "Profiles readable by anyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Items readable by anyone" on public.items for select using (true);
create policy "Authenticated users can insert items" on public.items for insert with check (auth.role() = 'authenticated');
create policy "Users can update own created items" on public.items for update using (auth.uid() = created_by);
create policy "Users can delete own created items" on public.items for delete using (auth.uid() = created_by);

create policy "Recommendations readable by anyone" on public.recommendations for select using (true);
create policy "Users can add recommendation" on public.recommendations for insert with check (auth.uid() = user_id);
create policy "Users can remove recommendation" on public.recommendations for delete using (auth.uid() = user_id);

-- 6. REALTIME BROADCAST
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.recommendations;
`

export default function ConnectSupabaseModal({ isOpen, onClose }) {
  const [url, setUrl] = useState(supabaseUrl || '')
  const [anonKey, setAnonKey] = useState(supabaseAnonKey || '')
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  if (!isOpen) return null

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = (e) => {
    e.preventDefault()
    setErrorMsg(null)

    const cleanUrl = url.trim()
    const cleanKey = anonKey.trim()

    if (!cleanUrl.startsWith('https://')) {
      setErrorMsg('Supabase URL must start with https:// (e.g. https://your-project.supabase.co)')
      return
    }

    if (cleanKey.length < 20) {
      setErrorMsg('Please enter a valid Supabase anon/public key.')
      return
    }

    saveSupabaseConfig(cleanUrl, cleanKey)
  }

  const handleResetToDemo = () => {
    clearSupabaseConfig()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 p-4 sm:p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-zinc-100 flex items-center gap-2">
                Connect Supabase Backend
                {isSupabaseConfigured ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    Demo Mode
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Connect your PostgreSQL database for live multi-user sync and real authentication.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Setup Steps Accordion */}
        <div className="p-3.5 bg-zinc-950 border border-zinc-800 text-xs space-y-2">
          <div className="flex items-center justify-between font-semibold text-zinc-200">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Quick 2-Step Supabase Setup
            </span>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              Open Supabase Dashboard
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <ol className="list-decimal list-inside text-zinc-400 space-y-1 pl-1 leading-relaxed">
            <li>Open your Supabase Project &rarr; <strong>SQL Editor</strong> &rarr; New Query.</li>
            <li>
              Click below to copy SQL Schema, paste into the query, and click <strong>Run</strong>.
            </li>
            <li>Copy your <strong>Project URL</strong> and <strong>Anon Key</strong> from Project Settings &rarr; API.</li>
          </ol>

          <button
            type="button"
            onClick={handleCopySql}
            className="w-full mt-2 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">SQL Schema Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy PostgreSQL Schema SQL</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Project URL (<code className="text-emerald-400 font-mono">VITE_SUPABASE_URL</code>)
            </label>
            <div className="relative">
              <Globe className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Anon / Public API Key (<code className="text-emerald-400 font-mono">VITE_SUPABASE_ANON_KEY</code>)
            </label>
            <div className="relative">
              <Key className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors shadow-sm"
            >
              Save & Connect
            </button>
            {isSupabaseConfigured && (
              <button
                type="button"
                onClick={handleResetToDemo}
                className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors border border-zinc-700/60"
              >
                Reset to Demo
              </button>
            )}
          </div>
        </form>

        <p className="text-[11px] text-zinc-500 text-center">
          Credentials can also be stored in <code className="font-mono text-zinc-400">.env</code> in the project root.
        </p>
      </div>
    </div>
  )
}
