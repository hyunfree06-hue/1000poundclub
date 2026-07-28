-- ==========================================================================
-- 1000 LB CLUB — database schema
-- Run this in the Supabase SQL editor. Table/column names are fixed — do not
-- deviate. RLS policies + storage buckets are applied in the next build step
-- (Step 2). This file holds the table definitions exactly as specified.
-- ==========================================================================

-- ========== PROFILES ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  bio text,
  unit text not null default 'lb' check (unit in ('lb','kg')),
  -- verified lifts (always stored in lb, converted on input)
  squat_lb numeric,
  bench_lb numeric,
  deadlift_lb numeric,
  total_lb numeric generated always as (
    coalesce(squat_lb,0) + coalesce(bench_lb,0) + coalesce(deadlift_lb,0)
  ) stored,
  is_verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- ========== VERIFICATION REQUESTS ==========
create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  submitted_unit text not null check (submitted_unit in ('lb','kg')),
  squat numeric not null,
  bench numeric not null,
  deadlift numeric not null,
  squat_proof_path text not null,
  bench_proof_path text not null,
  deadlift_proof_path text not null,
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index on public.verifications (status, created_at desc);

-- ========== POSTS (single unified board) ==========
create table public.posts (
  id bigserial primary key,
  title text not null,
  body text not null,
  author_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  guest_password_hash text,          -- bcrypt of 4-digit PIN, never sent to client
  image_paths text[] default '{}',
  views integer not null default 0,
  votes integer not null default 0,
  comment_count integer not null default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  -- snapshot of author's stats at post time (so old posts keep their badge)
  author_tier text,
  author_total_lb numeric,
  constraint author_or_guest check (
    (author_id is not null) or (guest_name is not null and guest_password_hash is not null)
  )
);
create index on public.posts (created_at desc);

-- ========== COMMENTS ==========
create table public.comments (
  id bigserial primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  parent_id bigint references public.comments(id) on delete cascade,
  body text not null,
  author_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  guest_password_hash text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  author_tier text,
  author_total_lb numeric,
  constraint author_or_guest check (
    (author_id is not null) or (guest_name is not null and guest_password_hash is not null)
  )
);
create index on public.comments (post_id, created_at);

-- ========== VOTES (dedupe by anon cookie id or user id) ==========
create table public.post_votes (
  post_id bigint not null references public.posts(id) on delete cascade,
  voter_key text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, voter_key)
);

-- ==========================================================================
-- RLS
-- Principle: reads are public (explicit column lists in the app never touch
-- guest_password_hash). ALL writes go through server routes using the service
-- role, which bypasses RLS. We deliberately add NO client insert/update/delete
-- policies on posts/comments/verifications/post_votes so the browser cannot
-- write directly.
-- ==========================================================================

alter table public.profiles      enable row level security;
alter table public.verifications enable row level security;
alter table public.posts         enable row level security;
alter table public.comments      enable row level security;
alter table public.post_votes    enable row level security;

-- ---- profiles ----
-- Public read of profiles.
create policy "profiles public read"
  on public.profiles for select
  using (true);

-- A user may update ONLY their own row. Lift/verification columns are further
-- locked down by the trigger below (service-role only).
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

-- ---- verifications ----
-- A user may read only their own verification requests. No client writes.
create policy "verifications own read"
  on public.verifications for select
  using (auth.uid() = user_id);

-- ---- posts ----
-- Public may read only non-deleted posts.
create policy "posts public read"
  on public.posts for select
  using (is_deleted = false);

-- ---- comments ----
create policy "comments public read"
  on public.comments for select
  using (is_deleted = false);

-- ---- post_votes ----
-- No client policies at all. Votes are recorded by the server route only.

-- ==========================================================================
-- Atomic counter helpers (called by the server with the service role).
-- ==========================================================================
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

-- ==========================================================================
-- Storage buckets
--   proofs      -> PRIVATE. Admin views via signed URLs only.
--   post-images -> PUBLIC read.
-- Uploads to both happen server-side with the service role (bypasses policies).
-- ==========================================================================
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
