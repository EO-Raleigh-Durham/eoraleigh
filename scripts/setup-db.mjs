#!/usr/bin/env node
// Builds a new chapter's database from supabase/00-prereqs.sql,
// supabase/01-schema.sql and supabase/02-starter.sql, then checks it.
//
//   node --env-file=.env.local scripts/setup-db.mjs
//
// Reads from .env.local:
//   SUPABASE_DB_URL            Postgres connection string (Supabase: Connect > Session pooler)
//   SUPABASE_URL, SUPABASE_SECRET_KEY    for the final API check
//   NEXT_PUBLIC_ORG_NAME, NEXT_PUBLIC_CHAPTER_SHORT_NAME, NEXT_PUBLIC_CHAPTER_SLUG,
//   NEXT_PUBLIC_CHAPTER_CITY, NEXT_PUBLIC_CHAPTER_COUNTRY, NEXT_PUBLIC_CHAPTER_TIME_ZONE,
//   NEXT_PUBLIC_SITE_URL
//
// Safe to run again: if the schema is already there it skips straight to the
// starter rows and the checks.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import postgres from "postgres";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const env = (k, fallback = "") => (process.env[k] ?? "").trim() || fallback;

function fail(message) {
  console.error(`\nSetup stopped: ${message}`);
  process.exit(1);
}

const dbUrl = env("SUPABASE_DB_URL");
if (!dbUrl) fail("SUPABASE_DB_URL is not set in .env.local (Supabase dashboard > Connect > Session pooler).");
const chapterName = env("NEXT_PUBLIC_ORG_NAME");
if (!chapterName) fail("NEXT_PUBLIC_ORG_NAME (your chapter's name, e.g. \"EO Berlin\") is not set in .env.local.");

const shortName = env("NEXT_PUBLIC_CHAPTER_SHORT_NAME", chapterName);
const siteUrl = env("NEXT_PUBLIC_SITE_URL");
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const values = {
  CHAPTER_NAME: chapterName,
  CHAPTER_SLUG: env("NEXT_PUBLIC_CHAPTER_SLUG", chapterName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")),
  CHAPTER_CITY: env("NEXT_PUBLIC_CHAPTER_CITY"),
  CHAPTER_COUNTRY: env("NEXT_PUBLIC_CHAPTER_COUNTRY"),
  CHAPTER_DOMAIN: siteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
  TIME_ZONE: env("NEXT_PUBLIC_CHAPTER_TIME_ZONE", "UTC"),
  LOCAL_CURRENCY: env("NEXT_PUBLIC_CHAPTER_LOCAL_CURRENCY", "USD").toUpperCase(),
  TICKET_PREFIX: (shortName.toUpperCase().replace(/[^A-Z0-9]/g, "") || "EO").slice(0, 6),
  // "EO Berlin" -> "berlin": lets "EO Berlin Member" tickets count as member tickets.
  CHAPTER_SUFFIX_REGEX: escapeRegex(chapterName.replace(/^eo\s+/i, "").toLowerCase()) || "chapter",
};

function fill(sql) {
  const filled = sql.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (!(key in values)) fail(`unknown placeholder ${match}`);
    return values[key].replace(/'/g, "''");
  });
  return filled;
}

const read = (name) => readFileSync(join(ROOT, "supabase", name), "utf8");
const sql = postgres(dbUrl, { max: 1, prepare: false, onnotice: () => {} });

try {
  const [{ installed }] = await sql`select to_regclass('public.chapters') is not null as installed`;
  console.log("1/4 Prerequisites");
  await sql.unsafe(read("00-prereqs.sql"));
  if (installed) {
    console.log("2/4 Schema already installed, skipping");
  } else {
    console.log("2/4 Schema (about a minute)");
    await sql.unsafe(fill(read("01-schema.sql")));
  }
  console.log("3/4 Starter rows");
  await sql.unsafe(fill(read("02-starter.sql")));

  console.log("4/4 Checks");
  const [counts] = await sql`
    select
      (select count(*) from pg_tables where schemaname = 'public')::int as tables,
      (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity)::int as tables_without_rls,
      (select count(*) from pg_policies where schemaname = 'public')::int as policies,
      (select count(*) from public.board_roles)::int as board_roles,
      (select count(*) from public.chapters where chapter_name = ${chapterName})::int as chapter_rows`;
  console.log(`    ${counts.tables} tables, ${counts.policies} policies, ${counts.board_roles} board roles`);
  if (counts.tables < 100) fail(`only ${counts.tables} tables were created; expected over 100.`);
  if (counts.tables_without_rls > 0) fail(`${counts.tables_without_rls} tables have row-level security off.`);
  if (counts.chapter_rows !== 1) fail("the chapter row is missing.");
} finally {
  await sql.end();
}

// The app reads through Supabase's API, not straight from Postgres, so check
// that path too. A schema can be complete and still unreachable from the API.
const apiUrl = env("SUPABASE_URL");
const key = env("SUPABASE_SECRET_KEY");
if (apiUrl && key) {
  const res = await fetch(`${apiUrl}/rest/v1/board_roles?select=key`, {
    // New-style sb_secret_ keys go in the apikey header only; legacy JWT keys also as a Bearer token.
    headers: key.startsWith("sb_") ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` },
  });
  const rows = res.ok ? await res.json() : [];
  if (!res.ok || rows.length < 13) fail(`the API check failed (HTTP ${res.status}). Is the public schema exposed in Supabase > Settings > API?`);
  console.log("    API check passed");
} else {
  console.log("    API check skipped: set SUPABASE_URL and SUPABASE_SECRET_KEY to run it");
}
console.log(`\nDatabase ready for ${chapterName}.`);
