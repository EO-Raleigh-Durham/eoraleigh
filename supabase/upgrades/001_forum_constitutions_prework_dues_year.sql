-- 001_forum_constitutions_prework_dues_year.sql
-- For installs created before November 2026. New installs already have this.
-- Adds: forum constitutions (private file store per forum), board pre-work
-- answers, and the dues-year settings on chapter_metrics (dues_open,
-- secondary_dues_usd). Safe to run twice.
--
-- After running it, open your dues year on /board/historical-metrics
-- ("Members pay dues for"); until then the dues pages say dues are not open.


-- 130_forum_constitutions.sql
-- Forum constitutions: the Forum Chair picks a forum on /board/forum and
-- uploads that forum's constitution. One current file per forum; uploading
-- again replaces it, and it can be deleted.
--
-- Forums are confidential peer groups, so the bucket is private and has NO
-- storage.objects policies: anon and authenticated have no access, and only
-- the server secret key (which bypasses RLS) reads or writes it. Board users
-- get a short-lived signed URL after the app's own board check. The table has
-- RLS on and no client policies. Nothing is granted to chatbot_reader.
--
-- Additive and idempotent. Safe to rerun.

-- ---------------------------------------------------------------------------
-- 1. One constitution per forum
-- ---------------------------------------------------------------------------

create table if not exists public.forum_constitutions (
  forum_id uuid primary key references public.forums(id) on delete cascade,
  -- The name the uploader's file had; the storage key is a random id.
  file_name text not null check (char_length(file_name) between 1 and 200),
  storage_path text not null unique,
  content_type text,
  size_bytes integer check (size_bytes is null or size_bytes >= 0),
  -- user_profiles row of the uploader, plus the name as it was at upload.
  uploaded_by uuid references public.user_profiles(id) on delete set null,
  uploaded_by_name text,
  uploaded_at timestamptz not null default now()
);

alter table public.forum_constitutions enable row level security;
revoke all on public.forum_constitutions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Private bucket
-- ---------------------------------------------------------------------------

-- 20 MB per file, PDF or Word. Keep both in step with
-- src/lib/forum-constitution-files.ts (a unit test compares them).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'forum-constitutions', 'forum-constitutions', false, 20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Verification queries (run after applying):
--
--   -- 1. Bucket exists, is private, with the size limit and types
--   select id, public, file_size_limit, allowed_mime_types
--     from storage.buckets where id = 'forum-constitutions';
--   -- expect: forum-constitutions | f | 20971520 | 3 mime types
--
--   -- 2. Table has RLS on and no policies
--   select relrowsecurity from pg_class where oid = 'public.forum_constitutions'::regclass;
--   -- expect: t
--   select count(*) from pg_policies where tablename = 'forum_constitutions';
--   -- expect: 0
--
--   -- 3. Chatbot reader has nothing on the table
--   select privilege_type from information_schema.role_table_grants
--    where grantee = 'chatbot_reader' and table_name = 'forum_constitutions';
--   -- expect: no rows
--
-- Rollback (only after reverting the app change, and only if no files are
-- worth keeping):
--   drop table if exists public.forum_constitutions;
--   -- empty the bucket in the dashboard, then:
--   delete from storage.buckets where id = 'forum-constitutions';
-- ---------------------------------------------------------------------------

-- 131_board_prework_responses.sql
-- Board pre-work worksheet (FY2027-2028): each board member fills in their own
-- answers on /board/pre-work, and after the deadline the board reads one
-- combined view without names on /board/pre-work/report.
--
-- One row per board member per worksheet. Answers are a flat map of
-- field key -> text; the list of keys lives in src/lib/board-prework.ts.
--
-- These are candid personal reflections. RLS is on with no client policies:
-- anon and authenticated have no access, and only the server secret key
-- (which bypasses RLS) reads or writes it after the app's own board check.
-- Nothing is granted to chatbot_reader (Dave, 2026-11-23).
--
-- Additive and idempotent. Safe to rerun.

create table if not exists public.board_prework_responses (
  cycle text not null,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  -- Name as it was at the last save, for the "finished so far" list only.
  respondent_name text,
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  -- Set when the member marks the worksheet finished; null while in draft.
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cycle, user_id)
);

alter table public.board_prework_responses enable row level security;
revoke all on public.board_prework_responses from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Verification queries (run after applying):
--
--   -- 1. Table has RLS on and no policies
--   select relrowsecurity from pg_class where oid = 'public.board_prework_responses'::regclass;
--   -- expect: t
--   select count(*) from pg_policies where tablename = 'board_prework_responses';
--   -- expect: 0
--
--   -- 2. Neither browsers nor the chatbot reader have anything on the table
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_name = 'board_prework_responses'
--      and grantee in ('anon', 'authenticated', 'chatbot_reader');
--   -- expect: no rows
--
-- Rollback (only after reverting the app change, and only if the answers are
-- no longer needed):
--   drop table if exists public.board_prework_responses;
-- ---------------------------------------------------------------------------

-- 132_dues_year_settings.sql
-- Plan 42 phase 4: open the dues year and set its amounts on screen (24 Nov 2026).
--
-- The dues pages (/chapter-dues, /secondary-chapter-dues, bank transfer, the
-- board's dues invoices) had the dues year and amounts written into the code,
-- so each new dues year needed a code change and a deploy. They now read the
-- newest chapter_metrics row with dues_open = true: the year, the local dues
-- (dues_per_member_usd, migration 114) and the secondary-chapter dues below.
-- The board sets these on /board/historical-metrics.
--
-- Expand only and idempotent. FY2026/27 is opened at today's amounts ($2,200
-- local, $1,500 secondary), so the pages read exactly as before.
-- chapter_metrics is table-granted to chatbot_reader (071); chapter-wide dues
-- rates and an open flag are not member revenue, so they may be read there too.

alter table chapter_metrics
  add column if not exists dues_open boolean not null default false;

alter table chapter_metrics
  add column if not exists secondary_dues_usd integer
    check (secondary_dues_usd is null or secondary_dues_usd >= 0);

comment on column chapter_metrics.dues_open is
  'True for the fiscal year members currently pay dues for. The dues pages use the newest open year.';
comment on column chapter_metrics.secondary_dues_usd is
  'Secondary-chapter dues (USD) for the fiscal year.';
