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
