-- 1. Fix default recommend_count on items table to 0
alter table public.items alter column recommend_count set default 0;

-- 2. Recalculate and synchronize exact vote counts for all existing items
update public.items i
set recommend_count = coalesce((
  select count(*) from public.recommendations r where r.item_id = i.id
), 0);
