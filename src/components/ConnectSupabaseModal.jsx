import React, { useState, useEffect, useRef } from 'react'
import { X, Database, Check, Copy, ExternalLink, ShieldCheck, AlertCircle, Key, Globe } from 'lucide-react'
import {
  supabaseUrl,
  supabaseAnonKey,
  saveSupabaseConfig,
  clearSupabaseConfig,
  isSupabaseConfigured,
  hasValidEnv,
  isProduction
} from '../lib/supabase'

// Full database schema SQL to create required tables, security constraints, and RLS policies
const SQL_SCHEMA = `-- 1. ENABLE EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. CREATE PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  app_uid text unique not null,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- 3. CREATE ITEMS TABLE
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  normalized_title text not null,
  category text not null,
  created_by uuid references auth.users(id) on delete set null,
  recommend_count integer default 1,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 4. CREATE RECOMMENDATIONS TABLE
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  item_id uuid references public.items(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (user_id, item_id)
);

-- 5. ENABLE ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.recommendations enable row level security;

-- Security Policies
create policy "Profiles readable by anyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Items readable by anyone" on public.items for select using (true);
create policy "Authenticated users can create items" on public.items for insert with check (auth.role() = 'authenticated');
create policy "Users can update own created items" on public.items for update using (auth.uid() = created_by);
create policy "Users can delete own created items" on public.items for delete using (auth.uid() = created_by);

create policy "Recommendations readable by anyone" on public.recommendations for select using (true);
create policy "Users can add recommendation" on public.recommendations for insert with check (auth.uid() = user_id);
create policy "Users can remove recommendation" on public.recommendations for delete using (auth.uid() = user_id);

-- 6. REALTIME BROADCAST
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.recommendations;
`

// Modal dialog helping users configure their Supabase backend connection and run schema migrations
export default function ConnectSupabaseModal({ isOpen, onClose }) {
  const [url, setUrl] = useState(supabaseUrl || '')
  const [anonKey, setAnonKey] = useState(supabaseAnonKey || '')
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const backdropMouseDownRef = useRef(false)

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Copy full SQL migration script to clipboard
  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Validate URL and key, then store in localStorage and reload page
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

  // Disconnect from Supabase and switch back to offline demo data
  const handleResetToDemo = () => {
    clearSupabaseConfig()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && backdropMouseDownRef.current) {
          onClose()
        }
        backdropMouseDownRef.current = false
      }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-zinc-950 flex items-center gap-2">
                Connect Supabase Backend
                {isSupabaseConfigured ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full font-semibold">
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-full font-semibold">
                    Demo Mode
                  </span>
                )}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Connect your PostgreSQL database for live multi-user sync and real authentication.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-zinc-950 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Setup Steps Accordion */}
        <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs space-y-2">
          <div className="flex items-center justify-between font-semibold text-zinc-900">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Quick 2-Step Supabase Setup
            </span>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-emerald-700 hover:underline inline-flex items-center gap-1"
            >
              Open Supabase Dashboard
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <ol className="list-decimal list-inside text-stone-600 space-y-1 pl-1 leading-relaxed">
            <li>Open your Supabase Project &rarr; <strong>SQL Editor</strong> &rarr; New Query.</li>
            <li>
              Click below to copy SQL Schema, paste into the query, and click <strong>Run</strong>.
            </li>
            <li>Copy your <strong>Project URL</strong> and <strong>Anon Key</strong> from Project Settings &rarr; API.</li>
          </ol>

          <button
            type="button"
            onClick={handleCopySql}
            className="w-full mt-2 py-2 px-3 bg-white hover:bg-stone-100 border border-stone-200 text-zinc-800 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">SQL Schema Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-400" />
                <span>Copy PostgreSQL Schema SQL</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {hasValidEnv && isProduction ? (
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Production Credentials Locked</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Database connection is securely managed via hosting environment variables (<code className="text-stone-800 font-mono">VITE_SUPABASE_URL</code>). In-browser modifications and demo fallback are disabled.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label htmlFor="connect-supabase-url" className="block text-[11px] font-semibold text-zinc-800 mb-1">
                Project URL (<code className="text-emerald-700 font-mono">VITE_SUPABASE_URL</code>)
              </label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="connect-supabase-url"
                  name="supabaseUrl"
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full bg-stone-50 border border-stone-200 pl-9 pr-3 py-2 text-xs text-zinc-950 placeholder:text-stone-400 rounded-xl focus:outline-none focus:border-stone-400 focus:bg-white transition-colors font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="connect-supabase-anon-key" className="block text-[11px] font-semibold text-zinc-800 mb-1">
                Anon / Public API Key (<code className="text-emerald-700 font-mono">VITE_SUPABASE_ANON_KEY</code>)
              </label>
              <div className="relative">
                <Key className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="connect-supabase-anon-key"
                  name="supabaseAnonKey"
                  type="text"
                  required
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full bg-stone-50 border border-stone-200 pl-9 pr-3 py-2 text-xs text-zinc-950 placeholder:text-stone-400 rounded-xl focus:outline-none focus:border-stone-400 focus:bg-white transition-colors font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Save & Connect
              </button>
              {isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={handleResetToDemo}
                  className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                >
                  Reset to Demo
                </button>
              )}
            </div>
          </form>
        )}

        <p className="text-[11px] text-stone-500 text-center font-mono">
          Credentials can also be stored in <code className="font-mono text-stone-700">.env</code> in the project root.
        </p>
      </div>
    </div>
  )
}
