-- ==========================================================================
-- Migration 002 — RLS policies, column-protection trigger, storage buckets,
--                 and atomic RPC helpers.
--
-- Assumes migration 001 (the table definitions in schema.sql) has already been
-- applied. This file contains ONLY the additions and is safe to re-run: every
-- statement is idempotent (drop-if-exists before create, create-or-replace,
-- on-conflict-do-nothing).
-- ==========================================================================

-- --------------------------------------------------------------------------
-- Enable RLS (no error if already enabled).
-- --------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.verifications enable row level security;
alter table public.posts         enable row level security;
alter table public.comments      enable row level security;
alter table public.post_votes    enable row level security;

-- --------------------------------------------------------------------------
-- profiles
-- Public read; a user may update only their own row. Lift/verification columns
-- are further locked down by the trigger below (service-role only).
-- --------------------------------------------------------------------------
drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read"
  on public.profiles for select
  using (true);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Prevent a normal user from touching lift / verification columns even on their
-- own row. Only the service role (server) may change these.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    if new.squat_lb     is distinct from old.squat_lb
    or new.bench_lb     is distinct from old.bench_lb
    or new.deadlift_lb  is distinct from old.deadlift_lb
    or new.is_verified  is distinct from old.is_verified
    or new.verified_at  is distinct from old.verified_at then
      raise exception 'lift/verification columns are service-role only';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- --------------------------------------------------------------------------
-- verifications — a user may read only their own requests. No client writes.
-- --------------------------------------------------------------------------
drop policy if exists "verifications own read" on public.verifications;
create policy "verifications own read"
  on public.verifications for select
  using (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- posts — public may read only non-deleted posts. No client writes.
-- --------------------------------------------------------------------------
drop policy if exists "posts public read" on public.posts;
create policy "posts public read"
  on public.posts for select
  using (is_deleted = false);

-- --------------------------------------------------------------------------
-- comments — public may read only non-deleted comments. No client writes.
-- --------------------------------------------------------------------------
drop policy if exists "comments public read" on public.comments;
create policy "comments public read"
  on public.comments for select
  using (is_deleted = false);

-- --------------------------------------------------------------------------
-- post_votes — no client policies at all. Votes are recorded by the server.
-- --------------------------------------------------------------------------

-- --------------------------------------------------------------------------
-- Atomic counter helpers (called by the server with the service role).
-- --------------------------------------------------------------------------
create or replace function public.bump_views(p_id bigint)
returns void language sql as $$
  update public.posts set views = views + 1 where id = p_id;
$$;

create or replace function public.bump_comment_count(p_id bigint, delta int)
returns void language sql as $$
  update public.posts
     set comment_count = greatest(0, comment_count + delta)
   where id = p_id;
$$;

-- --------------------------------------------------------------------------
-- Storage buckets
--   proofs      -> PRIVATE. Admin views via signed URLs only.
--   post-images -> PUBLIC read.
-- Uploads to both happen server-side with the service role (bypasses policies).
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('proofs', 'proofs', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('post-images', 'post-images', true)
  on conflict (id) do nothing;

-- Public read for post images. (No public policy for proofs => private.)
drop policy if exists "post-images public read" on storage.objects;
create policy "post-images public read"
  on storage.objects for select
  using (bucket_id = 'post-images');
