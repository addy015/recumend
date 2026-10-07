-- Enable Supabase Realtime broadcast for items & recommendations
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.recommendations;
