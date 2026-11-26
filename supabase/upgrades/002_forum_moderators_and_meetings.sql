-- 002_forum_moderators_and_meetings.sql
-- For installs created before this file existed. Adds the tables behind forum
-- moderators (/board/forum) and forum dates (/member/forum):
--
--   forum_moderators     one moderator per forum per fiscal year
--   forum_moderator_log  who set or removed a moderator, and when
--   forum_meetings       one meeting per forum per month, set by the moderator
--
-- Forums are confidential peer groups. Every table has RLS on and no client
-- policies: only checked server code (secret key) reads or writes them, after
-- requireBoardOrAbove() or forumAccess(). Nothing is granted to chatbot_reader.
--
-- Additive and idempotent. Safe to rerun.

-- ---------------------------------------------------------------------------
-- 1. Moderator per forum per fiscal year
-- ---------------------------------------------------------------------------

create table if not exists public.forum_moderators (
  forum_id uuid not null references public.forums(id) on delete cascade,
  -- Calendar year the fiscal year starts in (FY 2026-27 is 2026).
  fiscal_year_start integer not null check (fiscal_year_start between 2000 and 2100),
  person_id uuid not null references public.people(id) on delete cascade,
  -- user_profiles row of whoever set it, plus their name at the time.
  set_by uuid references public.user_profiles(id) on delete set null,
  set_by_name text,
  set_at timestamptz not null default now(),
  primary key (forum_id, fiscal_year_start)
);

create index if not exists forum_moderators_person_idx
  on public.forum_moderators (person_id);

alter table public.forum_moderators enable row level security;
revoke all on public.forum_moderators from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Moderator change log (kept when a moderator is removed)
-- ---------------------------------------------------------------------------

create table if not exists public.forum_moderator_log (
  id uuid primary key default gen_random_uuid(),
  forum_id uuid not null references public.forums(id) on delete cascade,
  fiscal_year_start integer not null,
  -- null person: the moderator was removed for that year.
  person_id uuid references public.people(id) on delete set null,
  person_name text,
  set_by uuid references public.user_profiles(id) on delete set null,
  set_by_name text,
  set_at timestamptz not null default now()
);

create index if not exists forum_moderator_log_forum_idx
  on public.forum_moderator_log (forum_id, set_at desc);

alter table public.forum_moderator_log enable row level security;
revoke all on public.forum_moderator_log from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Forum meeting dates, one per forum per month
-- ---------------------------------------------------------------------------

create table if not exists public.forum_meetings (
  forum_id uuid not null references public.forums(id) on delete cascade,
  -- First day of the month the meeting belongs to (YYYY-MM-01).
  month date not null check (extract(day from month) = 1),
  meets_on date not null,
  -- Chapter local time.
  start_time time not null,
  place text check (place is null or char_length(place) <= 200),
  set_by_person_id uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (forum_id, month)
);

alter table public.forum_meetings enable row level security;
revoke all on public.forum_meetings from anon, authenticated;
