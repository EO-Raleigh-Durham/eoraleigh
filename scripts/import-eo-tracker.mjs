// One-off trial import from EO Raleigh Durham's own membership tracker.
//
//   node --env-file=.env.local scripts/import-eo-tracker.mjs <export.json> [--dry-run]
//   node --env-file=.env.local scripts/import-eo-tracker.mjs --wipe
//
// The export is a JSON snapshot taken from the tracker (contacts, forums,
// current forum placements). It is chapter data: keep it in the gitignored
// private/ folder and delete it afterwards. This script holds no data.
//
// Every run wipes what an earlier run imported, then imports again, in one
// transaction: either everything lands or nothing does. Imported rows are
// marked (people.source_site, companies.notes, deals.description) so --wipe
// removes exactly them. Every imported person is do_not_contact, so nothing
// here can email them. The tracker stays the source of truth; nothing is
// written back to it.
//
// What has no home here is listed in docs/tracker-gaps.md.

import { readFileSync } from "node:fs";
import postgres from "postgres";

const MARK = "eo-tracker-import";
const COMPANY_NOTE = "Imported from the EO membership tracker (trial)";
const DEAL_NOTE = "Imported from the EO membership tracker (trial).";

const args = process.argv.slice(2);
const wipeOnly = args.includes("--wipe");
const dryRun = args.includes("--dry-run");
const file = args.find((a) => !a.startsWith("--"));

if (!process.env.SUPABASE_DB_URL) {
  console.error("SUPABASE_DB_URL must be set (.env.local).");
  process.exit(1);
}
if (!wipeOnly && !file) {
  console.error("Usage: import-eo-tracker.mjs <export.json> [--dry-run] | --wipe");
  process.exit(1);
}

// ── Mapping rules (reviewed with the chapter before the first run) ──────────

const CHANNEL = {
  member_referral: "Referrals",
  sap_referral: "Referrals",
  website_form: "Direct Traffic",
  linkedin_outreach: "Other Campaigns",
  eo_transfer: "Offline Sources",
  eonetwork_application: "Offline Sources",
  event: "Offline Sources",
};

const STEP_STAGE = {
  new: "Connect & Qualify",
  invited: "Experience EO",
  meeting_booked: "Go <> No Go Call",
  chair_approved: "Revenue Verification Sent",
  trifecta: "Interview",
  chapter_vote: "Interview",
  global_approval: "Interview",
  dues: "Payment Request",
  member: "Closed Won",
};

const NO_DEAL_GROUPS = new Set(["newsletter_only", "slp_prospect", "sap_prospect"]);

/** The Member Acquisition deal a journey lead becomes, or null for none. */
function acquisitionDeal(c) {
  const g = c.journey_group;
  if (!g || NO_DEAL_GROUPS.has(g)) return null;
  const journey = `Tracker journey: ${g}${c.journey_step ? ` / ${c.journey_step}` : ""}.`;
  const base = { description: `${DEAL_NOTE} ${journey}` };

  if (g === "eo_board" || g === "need_to_qualify") {
    const stage = g === "need_to_qualify" ? "Connect & Qualify" : STEP_STAGE[c.journey_step] ?? "Connect & Qualify";
    return { ...base, stage, deal_status: stage === "Closed Won" ? "closed_won" : "open" };
  }
  if (g === "gone_quiet") {
    return { ...base, stage: "Closed Lost", deal_status: "closed_lost", closed_lost_description: "Process Stalled / Ghosted" };
  }
  if (g === "not_approved") {
    return {
      ...base,
      stage: "Closed Lost",
      deal_status: "closed_lost",
      closed_lost_description: "Not Qualified",
      closed_lost_reason: c.not_approved_reason || null,
    };
  }
  if (g === "eoa_candidate" || g === "handed_to_eoa") {
    return { ...base, stage: "Closed Lost", deal_status: "closed_lost", disqualification_reason: "Referred to Accelerator" };
  }
  return { ...base, stage: "Connect & Qualify", deal_status: "open" };
}

function membershipType(c) {
  if (c.status === "elumni") return "alumni";
  if (c.person_type === "slp") return "slp";
  if (c.person_type === "sap") return "sap";
  return null; // members get "member" from their chapter_memberships row
}

function splitName(name) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [null, null];
  return [parts[0], parts.length > 1 ? parts.slice(1).join(" ") : null];
}

function dateOnly(v) {
  return v ? String(v).slice(0, 10) : null;
}

/** Fiscal year start (July) for a date, as YYYY-MM-DD. */
function fyStart(today) {
  const y = today.getUTCMonth() >= 6 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
  return `${y}-07-01`;
}

// ── Database ────────────────────────────────────────────────────────────────

const sql = postgres(process.env.SUPABASE_DB_URL, { max: 1, onnotice: () => {} });

// Events this script created carry this slug prefix, so a wipe finds them.
// An event the chapter has since given its own slug is no longer ours to
// delete; on the next run it is matched by title and date instead.
const EVENT_SLUG = "tracker-";

// Tracker event type -> this system's event type. Unknown chapter events are social.
const EVENT_TYPE = {
  LEARNING: "learning",
  WEBINAR: "learning",
  GLOBAL: "learning",
  REGIONAL: "learning",
  SOCIAL: "social",
  SAP: "social",
  CHAPTER: "social",
  MYEO: "my_eo",
};

// Tracker board position key -> board_roles.key
const BOARD_ROLE = {
  president: "president",
  membership: "membership",
  marcomm: "marcoms",
  strategic_alliances: "sap",
  finance: "finance",
  governance: "governance",
  forum: "forum",
  learning: "learning",
  member_engagement: "member-engagement",
  chapter_staff: "chapter-staff",
};

/** Events run by this chapter (registrations) vs elsewhere (global participation). */
function isLocalEvent(e) {
  return e.scope === "chapter" || e.scope === "myeo";
}

function slugify(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function tableExists(tx, name) {
  const [r] = await tx`select to_regclass(${"public." + name}) is not null as ok`;
  return r.ok;
}

async function wipe(tx) {
  // Board-sheet rows point at imported people with ON DELETE RESTRICT keys
  // (tasks, key results). They must be wiped first, by their own script.
  const [{ n: sheetRows }] = await tx`
    select (select count(*) from public.board_meetings where source = 'sheet_import')
         + (select count(*) from public.tasks where metadata->>'import' = 'board-sheet') as n`;
  if (Number(sheetRows) > 0) {
    throw new Error("Board-sheet rows exist. Run scripts/import-board-sheet.mjs --wipe first, then re-run it after this.");
  }

  const people = await tx`select id from public.people where source_site = ${MARK}`;
  const ids = people.map((p) => p.id);

  const ourEvents = (await tx`select id from public.events where slug like ${EVENT_SLUG + "%"}`).map((r) => r.id);
  let registrations = 0;
  let globalParticipation = 0;
  if (ourEvents.length || ids.length) {
    registrations = (
      await tx`delete from public.event_registrations
                where event_id = any(${ourEvents}) or person_id = any(${ids}) returning id`
    ).length;
    globalParticipation = (
      await tx`delete from public.global_event_participation
                where event_id = any(${ourEvents}) or person_id = any(${ids}) returning id`
    ).length;
  }
  const events = (await tx`delete from public.events where id = any(${ourEvents}) returning id`).length;

  let moderators = 0;
  if (ids.length && (await tableExists(tx, "forum_moderators"))) {
    moderators = (await tx`delete from public.forum_moderators where person_id = any(${ids}) returning forum_id`).length;
  }
  const appointments = ids.length
    ? (await tx`delete from public.board_appointments where person_id = any(${ids}) returning id`).length
    : 0;
  const deals = ids.length
    ? await tx`delete from public.deals where person_id = any(${ids}) or description like ${DEAL_NOTE + "%"} returning id`
    : await tx`delete from public.deals where description like ${DEAL_NOTE + "%"} returning id`;
  if (ids.length) await tx`delete from public.member_companies where person_id = any(${ids})`;
  const gone = await tx`delete from public.people where source_site = ${MARK} returning id`;
  const companies = await tx`delete from public.companies where notes = ${COMPANY_NOTE} returning id`;
  // Forums have no marker column. Remove a forum only if nobody is in it any
  // more and it was never edited after creation, so a forum the chapter set up
  // or changed by hand survives a wipe.
  const forums = await tx`
    delete from public.forums f
     where f.updated_at = f.created_at
       and not exists (select 1 from public.people p where p.forum_id = f.id)
    returning id`;
  return {
    people: gone.length,
    deals: deals.length,
    companies: companies.length,
    forums: forums.length,
    events,
    registrations,
    global_participation: globalParticipation,
    board_appointments: appointments,
    forum_moderators: moderators,
  };
}

/** Events, attendance, board seats and forum moderators (optional parts of the export). */
async function importHistory(tx, data, personId, forumId) {
  const out = {};
  const now = new Date();

  // ── Events ──
  const eventId = new Map();
  const eventStart = new Map();
  let reused = 0;
  for (const e of data.events ?? []) {
    const startsAt = new Date(`${String(e.starts_at).replace(" ", "T")}Z`); // tracker stores UTC
    const local = isLocalEvent(e);
    const past = startsAt < now;
    // A matching event already here (the chapter created it, or re-slugged ours): reuse it.
    const [existing] = await tx`
      select id from public.events
       where lower(title) = lower(${e.name})
         and (starts_at at time zone 'UTC')::date = ${startsAt.toISOString().slice(0, 10)}::date
       limit 1`;
    if (existing) {
      eventId.set(e.id, existing.id);
      eventStart.set(e.id, startsAt);
      reused++;
      continue;
    }
    const location = [e.location_name || e.venue, e.address].filter(Boolean).join(", ") || null;
    const [row] = await tx`
      insert into public.events ${tx({
        type: local ? EVENT_TYPE[e.event_type_code] ?? "social" : "learning",
        scope: local ? "local" : "global",
        // History stays members-only so it does not flood the public archive.
        // Upcoming events stay draft until the chapter (or the website merge) publishes them.
        status: past ? "completed" : "draft",
        visibility: "members_only",
        audience: "member",
        title: e.name,
        location,
        starts_at: startsAt.toISOString(),
        slug: `${EVENT_SLUG}${e.id}-${slugify(e.name)}`,
        tag_label: local ? null : e.host_chapter || null,
        survey_enabled: false,
        recap_status: "none",
      })}
      returning id`;
    eventId.set(e.id, row.id);
    eventStart.set(e.id, startsAt);
  }
  out.events = { created: eventId.size - reused, matched_existing: reused };

  // ── Attendance ──
  const localEvent = new Map((data.events ?? []).map((e) => [e.id, isLocalEvent(e)]));
  // Global participation rows need an audit actor (a user_profiles id) and may
  // only name current (active or on-leave) members; former members' history
  // elsewhere has no home here and is counted instead.
  const [actor] = await tx`
    select id from public.user_profiles where role = 'super_admin' order by created_at limit 1`;
  const current = new Set(
    (
      await tx`select person_id from public.chapter_memberships
                where status in ('active', 'on_leave')
                  and membership_type in ('Primary Membership', 'Secondary Membership')`
    ).map((r) => r.person_id),
  );
  const seen = new Set();
  let regs = 0;
  let globals = 0;
  let skipped = 0;
  let globalNotCurrent = 0;
  for (const p of data.participations ?? []) {
    const ev = eventId.get(p.event_id);
    const person = personId.get(p.contact_id);
    if (!ev || !person || p.declined) {
      skipped++;
      continue;
    }
    const key = `${ev}:${person}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const past = eventStart.get(p.event_id) < now;

    if (localEvent.get(p.event_id)) {
      let status = null;
      if (p.attended) status = "attended";
      else if (p.cancelled) status = "cancelled";
      else if (p.registered) status = past ? "no_show" : "registered";
      if (!status) {
        skipped++;
        continue;
      }
      const at = p.registered_at || p.checked_in_at || eventStart.get(p.event_id).toISOString();
      await tx`
        insert into public.event_registrations ${tx({
          event_id: ev,
          person_id: person,
          status,
          guest_count: 0,
          confirmed_at: status === "cancelled" ? null : at,
          cancelled_at: status === "cancelled" ? at : null,
          checked_in_at: p.checked_in_at || null,
          notes: "Imported from the EO membership tracker (trial).",
          created_at: at,
        })}`;
      regs++;
    } else {
      if (!p.attended && !(p.registered && !past)) {
        skipped++;
        continue;
      }
      if (!actor || !current.has(person)) {
        globalNotCurrent++;
        continue;
      }
      await tx`
        insert into public.global_event_participation ${tx({
          event_id: ev,
          person_id: person,
          status: p.attended && past ? "attended" : "going",
          created_by_profile_id: actor.id,
          updated_by_profile_id: actor.id,
        })}`;
      globals++;
    }
  }
  out.attendance = {
    registrations: regs,
    global_participation: globals,
    global_skipped_not_current_member: globalNotCurrent,
    skipped,
  };

  // ── Board seats ──
  const roleId = new Map((await tx`select id, key from public.board_roles`).map((r) => [r.key, r.id]));
  let seats = 0;
  const unmappedRoles = new Set();
  for (const r of data.member_roles ?? []) {
    if (r.role_code !== "board") continue;
    const person = personId.get(r.contact_id);
    if (!person) continue;
    // "President Elect Elect" has no seat here; the tracker also records them
    // as President-Elect the following year, so it is reported, not mapped.
    const key = r.board_position === "President-Elect" ? "president-elect" : BOARD_ROLE[r.board_position_key];
    const role = key && roleId.get(key);
    if (!role) {
      unmappedRoles.add(r.board_position ?? r.board_position_key ?? "?");
      continue;
    }
    const inserted = await tx`
      insert into public.board_appointments ${tx({
        person_id: person,
        board_role_id: role,
        position: r.seat_role === "co_chair" ? "Co-Chair" : "Chair",
        scope: "Local",
        fiscal_year_start: r.fiscal_year,
      })}
      on conflict do nothing
      returning id`;
    seats += inserted.length;
  }
  out.board_appointments = seats;
  if (unmappedRoles.size) out.board_roles_not_mapped = [...unmappedRoles];

  // ── Forum moderators (needs supabase/upgrades/002) ──
  if (await tableExists(tx, "forum_moderators")) {
    let mods = 0;
    for (const r of data.member_roles ?? []) {
      if (r.role_code !== "moderator" || !r.forum_id) continue;
      const person = personId.get(r.contact_id);
      const forum = forumId.get(r.forum_id);
      if (!person || !forum) continue;
      const inserted = await tx`
        insert into public.forum_moderators ${tx({
          forum_id: forum,
          fiscal_year_start: r.fiscal_year,
          person_id: person,
          set_by_name: "EO membership tracker import",
        })}
        on conflict (forum_id, fiscal_year_start) do nothing
        returning forum_id`;
      mods += inserted.length;
    }
    out.forum_moderators = mods;
  } else {
    out.forum_moderators = "skipped: run supabase/upgrades/002_forum_moderators_and_meetings.sql first";
  }

  return out;
}

async function run() {
  const data = file ? JSON.parse(readFileSync(file, "utf8")) : null;

  const [chapter] = await sql`select id from public.chapters order by created_at limit 1`;
  if (!chapter) throw new Error("No chapter row; run scripts/setup-db.mjs first.");

  const report = {};
  try {
    await sql.begin(async (tx) => {
      report.wiped = await wipe(tx);
      if (wipeOnly) return;

      // Forums
      const forumId = new Map();
      for (const f of data.forums) {
        const [row] = await tx`
          insert into public.forums (chapter_id, name) values (${chapter.id}, ${f.name})
          on conflict (chapter_id, name) do update set name = excluded.name
          returning id`;
        forumId.set(f.id, row.id);
      }

      // Companies: one per distinct name (case-insensitive)
      const companyId = new Map();
      for (const c of data.contacts) {
        const name = (c.company ?? "").trim();
        if (!name || !c.email) continue;
        const key = name.toLowerCase();
        if (companyId.has(key)) continue;
        const [row] = await tx`
          insert into public.companies (name, industry, website, notes)
          values (${name}, ${c.industry || null}, ${c.website || null}, ${COMPANY_NOTE})
          returning id`;
        companyId.set(key, row.id);
      }

      // People
      const placement = new Map(data.current_forum.map((r) => [r.contact_id, r]));
      const personId = new Map();
      let skippedNoEmail = 0;
      for (const c of data.contacts) {
        if (!c.email) {
          skippedNoEmail++;
          continue;
        }
        const [first, last] = splitName(c.name);
        const fp = placement.get(c.id);
        const company = (c.company ?? "").trim().toLowerCase();
        const [row] = await tx`
          insert into public.people ${tx({
            email: c.email,
            name: c.name,
            first_name: first,
            last_name: last,
            phone: c.phone || null,
            headline: c.title || null,
            source_site: MARK,
            crm_id: `tracker:${c.id}`,
            company_id: company ? companyId.get(company) ?? null : null,
            membership_type: membershipType(c),
            is_slp: c.person_type === "slp",
            is_eo_staff: c.person_type === "staff",
            forum_id: fp ? forumId.get(fp.forum_id) ?? null : null,
            forum_status: fp ? "placed" : null,
            forum_placed_on: fp ? dateOnly(fp.from_date) : null,
            channel_source: CHANNEL[c.came_in_via] ?? null,
            do_not_contact: true,
            created_at: c.created_at,
          })}
          returning id`;
        personId.set(c.id, row.id);

        if (company && companyId.get(company)) {
          await tx`insert into public.member_companies (person_id, company_id, role, title)
                   values (${row.id}, ${companyId.get(company)}, 'primary', ${c.title || null})`;
        }
      }

      // SLP partner links (second pass: both people must exist)
      let partners = 0;
      for (const c of data.contacts) {
        if (c.person_type !== "slp" || !c.partner_of_contact_id) continue;
        const me = personId.get(c.id);
        const them = personId.get(c.partner_of_contact_id);
        if (!me || !them) continue;
        await tx`update public.people set slp_partner_id = ${them} where id = ${me}`;
        partners++;
      }

      // Chapter memberships (their triggers derive membership_status from these)
      let memberships = 0;
      for (const c of data.contacts) {
        const pid = personId.get(c.id);
        if (!pid) continue;
        if (c.status === "member" && (c.person_type === "member" || c.person_type === "emeritus")) {
          await tx`insert into public.chapter_memberships (person_id, chapter_id, membership_type, status, start_date)
                   values (${pid}, ${chapter.id}, 'Primary Membership', 'active', ${dateOnly(c.member_since)})`;
          memberships++;
        } else if (c.status === "elumni") {
          await tx`insert into public.chapter_memberships (person_id, chapter_id, membership_type, status, start_date, end_date)
                   values (${pid}, ${chapter.id}, 'Primary Membership', 'elumni', ${dateOnly(c.member_since)}, ${dateOnly(c.elumni_date)})`;
          memberships++;
        }
      }

      // Deals: Member Acquisition for journey leads, Onboarding Track for this FY's joiners
      const fy = fyStart(new Date());
      const dealCounts = { acquisition: 0, onboarding: 0 };
      for (const c of data.contacts) {
        const pid = personId.get(c.id);
        if (!pid) continue;
        const company = (c.company ?? "").trim().toLowerCase();
        const common = {
          person_id: pid,
          company_id: company ? companyId.get(company) ?? null : null,
          name: c.name || c.email,
          channel_source: CHANNEL[c.came_in_via] ?? null,
          created_at: c.created_at,
          last_activity_at: c.journey_step_at ?? null,
        };

        const acq = acquisitionDeal(c);
        if (acq) {
          await tx`insert into public.deals ${tx({ ...common, pipeline: "Member Acquisition", ...acq })}`;
          dealCounts.acquisition++;
        }

        const joined = dateOnly(c.member_since);
        if (c.person_type === "member" && c.status === "member" && joined && joined >= fy) {
          const placed = placement.has(c.id);
          await tx`insert into public.deals ${tx({
            ...common,
            pipeline: "Onboarding Track",
            stage: placed ? "Forum Placed" : "Awaiting Forum Training",
            deal_status: "open",
            membership_start_date: joined,
            description: `${DEAL_NOTE} Joined ${joined}.`,
          })}`;
          dealCounts.onboarding++;
        }
      }

      report.imported = {
        people: personId.size,
        skipped_no_email: skippedNoEmail,
        companies: companyId.size,
        forums: forumId.size,
        forum_placements: [...placement.keys()].filter((id) => personId.has(id)).length,
        slp_partner_links: partners,
        memberships,
        deals: dealCounts,
        ...(await importHistory(tx, data, personId, forumId)),
      };

      if (dryRun) throw new DryRun();
    });
  } catch (e) {
    if (!(e instanceof DryRun)) throw e;
    report.dry_run = "rolled back; nothing was written";
  }
  return report;
}

class DryRun extends Error {}

try {
  console.log(JSON.stringify(await run(), null, 2));
} finally {
  await sql.end();
}
