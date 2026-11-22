-- EO Chapter Manager: things the schema expects before it runs.
-- Run by scripts/setup-db.mjs. Safe to run more than once.

create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Read-only role for the board assistant (chatbot). It cannot log in until
-- you give it a password (README, "Optional: board assistant").
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'chatbot_reader') then
    create role chatbot_reader nologin;
  end if;
end $$;
