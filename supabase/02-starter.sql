-- EO Chapter Manager: the few rows the app needs to start. No people, events
-- or companies. Run by scripts/setup-db.mjs after 01-schema.sql; it fills the
-- double-brace placeholders from .env.local. Safe to run more than once.

-- Your chapter
insert into public.chapters (chapter_name, base_city, base_country, language)
select '{{CHAPTER_NAME}}', nullif('{{CHAPTER_CITY}}', ''), nullif('{{CHAPTER_COUNTRY}}', ''), 'en'
where not exists (select 1 from public.chapters where chapter_name = '{{CHAPTER_NAME}}');

-- The brand the marketing tools write for
insert into public.brands (slug, name, primary_domain)
values ('{{CHAPTER_SLUG}}', '{{CHAPTER_NAME}}', nullif('{{CHAPTER_DOMAIN}}', ''))
on conflict do nothing;

-- Board roles (standard EO chapter board portfolios; edit in /admin later)
insert into public.board_roles (key, name, short_name, sort_order) values
  ('president', 'President', 'President', 10),
  ('president-elect', 'President-Elect', 'President-Elect', 20),
  ('membership', 'Membership', 'Membership', 30),
  ('marcoms', 'Marketing & Communications', 'Marcoms', 40),
  ('sap', 'Strategic Alliance Partner', 'SAP', 50),
  ('finance', 'Finance', 'Finance', 60),
  ('governance', 'Governance', 'Governance', 65),
  ('forum', 'Forum', 'Forum', 70),
  ('myeo', 'My EO', 'My EO', 80),
  ('learning', 'Learning', 'Learning', 90),
  ('member-engagement', 'Member Engagement', 'Member Engagement', 100),
  ('visitor-experience', 'Visitor Experience Chair', 'Visitor Experience', 105),
  ('chapter-staff', 'Chapter Staff', 'Staff', 110)
on conflict do nothing;

-- Workboards and their columns
insert into public.boards (name, slug, description, sort_order) values
  ('Marketing', 'marketing', 'Marketing work: the calendar''s posts and campaigns land here as cards.', 0),
  ('Board', 'board', 'Board members'' and the chapter manager''s tasks.', 1)
on conflict do nothing;

insert into public.board_columns (board_id, name, "position", is_done, is_not_doing)
select b.id, c.name, c.pos, c.is_done, c.is_not_doing
from public.boards b
cross join (values
  ('To do', 0, false, false),
  ('Doing', 1, false, false),
  ('Waiting', 2, false, false),
  ('Done', 3, true, false),
  ('Not Doing', 4, false, true)
) as c(name, pos, is_done, is_not_doing)
where b.slug in ('marketing', 'board')
  and not exists (select 1 from public.board_columns x where x.board_id = b.id and x.name = c.name);

-- File storage buckets (private unless noted), with the same size and type
-- limits the app checks before uploading
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('chapter-photos', 'chapter-photos', false, 26214400,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('card-attachments', 'card-attachments', false, 52428800,
    array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/webm',
      'video/quicktime', 'application/pdf', 'text/plain', 'text/csv', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip']),
  ('marketing', 'marketing', true, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
  ('revenue-verification-files', 'revenue-verification-files', false, 20971520,
    array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv',
      'image/png', 'image/jpeg']),
  ('family-day-attendee-photos', 'family-day-attendee-photos', false, null, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
