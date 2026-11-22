#!/usr/bin/env node
// Resets the public demo (EO Demo Chapter) to its fictional demo data.
//
//   node --env-file=.env.local scripts/demo-reset.mjs
//
// Empties every table except the starter rows (chapters, brands, board_roles,
// boards, board_columns), loads supabase/demo/demo-data.sql, then makes sure
// the two demo sign-ins exist and point at people in the demo data.
//
// It refuses to run unless NEXT_PUBLIC_ORG_NAME is exactly "EO Demo Chapter"
// and the database holds only that chapter. Never point it at a real chapter.
//
// Reads from .env.local:
//   NEXT_PUBLIC_ORG_NAME                      must be "EO Demo Chapter"
//   SUPABASE_DB_URL                           Postgres connection string
//   SUPABASE_URL, SUPABASE_SECRET_KEY         for the sign-ins
//   DEMO_MEMBER_PASSWORD, DEMO_BOARD_PASSWORD passwords for the two demo sign-ins
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const DEMO_CHAPTER = "EO Demo Chapter";
const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
// Starter rows that 02-starter.sql creates and the app relies on. Everything else is demo data.
const KEEP = ["chapters", "brands", "board_roles", "boards", "board_columns"];
const DEMO_USERS = [
  { email: "demo-board@example.com", passwordVar: "DEMO_BOARD_PASSWORD", role: "board" },
  { email: "demo-member@example.com", passwordVar: "DEMO_MEMBER_PASSWORD", role: "member" },
];

const env = (k) => (process.env[k] ?? "").trim();
function fail(message) {
  console.error(`\nDemo reset stopped: ${message}`);
  process.exit(1);
}

if (env("NEXT_PUBLIC_ORG_NAME") !== DEMO_CHAPTER) {
  fail(`NEXT_PUBLIC_ORG_NAME must be exactly "${DEMO_CHAPTER}". This script wipes data and only runs on the demo.`);
}
for (const k of ["SUPABASE_DB_URL", "SUPABASE_URL", "SUPABASE_SECRET_KEY", ...DEMO_USERS.map((u) => u.passwordVar)]) {
  if (!env(k)) fail(`${k} is not set.`);
}

const sql = postgres(env("SUPABASE_DB_URL"), { max: 1, prepare: false, onnotice: () => {} });
const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });

async function findUser(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit || data.users.length < 200) return hit ?? null;
  }
  return null;
}

try {
  const chapters = await sql`select chapter_name from public.chapters`;
  if (chapters.length !== 1 || chapters[0].chapter_name !== DEMO_CHAPTER) {
    fail(`the database must hold exactly one chapter, "${DEMO_CHAPTER}".`);
  }

  console.log("1/3 Emptying the demo tables");
  const tables = (
    await sql`select tablename from pg_tables where schemaname = 'public' and tablename <> all(${KEEP}) order by 1`
  ).map((r) => r.tablename);
  await sql.begin(async (tx) => {
    // boards point at people and companies, so TRUNCATE ... CASCADE empties them
    // too. Keep their rows (minus those links) and put them back.
    await tx`create temp table keep_boards on commit drop as select * from public.boards`;
    await tx`create temp table keep_board_columns on commit drop as select * from public.board_columns`;
    await tx`update keep_boards set owner_id = null, client_company_id = null`;
    // Super-admin profiles survive a reset (without their person link).
    await tx`create temp table keep_admins on commit drop as
      select user_id, email, full_name, role, active from public.user_profiles
      where role = 'super_admin' and lower(email) <> all(${DEMO_USERS.map((u) => u.email)})`;
    await tx.unsafe(`truncate table ${tables.map((t) => `public."${t}"`).join(", ")} restart identity cascade`);
    await tx`insert into public.boards select * from keep_boards on conflict (id) do nothing`;
    await tx`insert into public.board_columns select * from keep_board_columns on conflict (id) do nothing`;
    await tx`insert into public.user_profiles (user_id, email, full_name, role, active)
      select k.user_id, k.email, k.full_name, k.role, k.active from keep_admins k
      where exists (select 1 from auth.users u where u.id = k.user_id)`;
    const [left] = await tx`select
      (select count(*) from public.chapters)::int as chapters,
      (select count(*) from public.board_roles)::int as board_roles,
      (select count(*) from public.board_columns)::int as board_columns`;
    if (!left.chapters || !left.board_roles || !left.board_columns) throw new Error("starter rows went missing; nothing was changed");
  });

  console.log("2/3 Loading supabase/demo/demo-data.sql");
  await sql.unsafe(readFileSync(join(ROOT, "supabase", "demo", "demo-data.sql"), "utf8"));

  console.log("3/3 Demo sign-ins");
  for (const u of DEMO_USERS) {
    const [person] = await sql`select id, name from public.people where email = ${u.email}`;
    if (!person) fail(`demo-data.sql has no person with the email ${u.email}.`);
    let user = await findUser(u.email);
    const attrs = { password: env(u.passwordVar), email_confirm: true, user_metadata: { full_name: person.name } };
    if (user) {
      const { error } = await supabase.auth.admin.updateUserById(user.id, attrs);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({ email: u.email, ...attrs });
      if (error) throw error;
      user = data.user;
    }
    await sql`
      insert into public.user_profiles (user_id, email, full_name, role, active, person_id)
      values (${user.id}, ${u.email}, ${person.name}, ${u.role}, true, ${person.id})
      on conflict (user_id) do update set email = excluded.email, full_name = excluded.full_name,
        role = excluded.role, active = true, person_id = excluded.person_id, updated_at = now()`;
    console.log(`    ${u.email} (${u.role}) -> ${person.name}`);
  }

  const counts = await sql`
    select 'people' as t, count(*)::int as n from public.people
    union all select 'chapter_memberships', count(*)::int from public.chapter_memberships where status = 'active'
    union all select 'events', count(*)::int from public.events
    union all select 'event_registrations', count(*)::int from public.event_registrations
    union all select 'deals', count(*)::int from public.deals
    union all select 'sap_deals', count(*)::int from public.sap_deals
    union all select 'survey_responses', count(*)::int from public.survey_responses`;
  console.log(`    ${counts.map((c) => `${c.n} ${c.t}`).join(", ")}`);
} finally {
  await sql.end();
}
console.log(`\n${DEMO_CHAPTER} reset.`);
