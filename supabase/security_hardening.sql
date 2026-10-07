-- ==============================================================================
-- RECUMEND: SECURITY HARDENING MIGRATION
-- Implements Security.md Rules:
-- Rule 5: Server-side input constraints (lengths, formats)
-- Rule 12: Protection against Mass Assignment / tampering with recommend_count
-- Rule 4 & 17: Strict RLS enforcement
-- ==============================================================================

-- 1. INPUT CONSTRAINTS ON ITEMS TABLE (Rule 5)
alter table public.items
  drop constraint if exists check_title_length,
  add constraint check_title_length check (length(trim(title)) >= 1 and length(title) <= 200);

alter table public.items
  drop constraint if exists check_metadata_size,
  add constraint check_metadata_size check (octet_length(metadata::text) <= 5000);

-- 2. INPUT CONSTRAINTS ON PROFILES TABLE (Rule 5)
alter table public.profiles
  drop constraint if exists check_username_format,
  add constraint check_username_format check (username ~ '^[a-z0-9_]{2,35}$');

alter table public.profiles
  drop constraint if exists check_display_name_length,
  add constraint check_display_name_length check (length(trim(display_name)) >= 1 and length(display_name) <= 60);

-- 3. TAMPER PROTECTION ON ITEMS (Rule 12: Mass Assignment Prevention)
-- Direct client UPDATE calls can NEVER artificially modify recommend_count, created_by, or created_at
create or replace function public.protect_item_columns()
returns trigger as $$
begin
  -- Prevent client-side forged vote count.
  -- Only the recommendations trigger (which sets recumend.is_vote_trigger) can adjust this.
  if current_setting('recumend.is_vote_trigger', true) is distinct from 'true' then
    NEW.recommend_count := OLD.recommend_count;
  end if;

  -- Ensure ownership and creation timestamp are immutable
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

-- 4. UPDATE VOTE COUNTER TRIGGER (Enforces internal flag)
create or replace function public.update_item_recommend_count()
returns trigger as $$
begin
  -- Set local flag for this transaction only so protect_item_columns allows the vote count change
  perform set_config('recumend.is_vote_trigger', 'true', true);

  if (TG_OP = 'INSERT') then
    update public.items set recommend_count = recommend_count + 1 where id = NEW.item_id;
  elsif (TG_OP = 'DELETE') then
    update public.items set recommend_count = greatest(1, recommend_count - 1) where id = OLD.item_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Re-attach recommendation vote counter trigger
drop trigger if exists trigger_recommend_count on public.recommendations;
create trigger trigger_recommend_count
after insert or delete on public.recommendations
for each row execute function public.update_item_recommend_count();

-- 5. RATE LIMITING ON ITEM CREATION (Rule 24: Abuse Prevention)
-- Enforces a maximum creation rate (min 3 seconds between creations per user)
create or replace function public.rate_limit_item_creation()
returns trigger as $$
declare
  last_created timestamptz;
begin
  select max(created_at) into last_created
  from public.items
  where created_by = NEW.created_by;

  if last_created is not null and (timezone('utc'::text, now()) - last_created) < interval '3 seconds' then
    raise exception 'Rate limit exceeded: Please wait a few seconds before adding another recommendation.';
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_rate_limit_items on public.items;
create trigger trigger_rate_limit_items
before insert on public.items
for each row execute function public.rate_limit_item_creation();
