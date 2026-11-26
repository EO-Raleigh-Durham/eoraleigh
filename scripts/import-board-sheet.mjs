// One-off import of EO Raleigh Durham's board tracker Google Sheet.
//
//   node --env-file=.env.local scripts/import-board-sheet.mjs <board-sheet.json> [--dry-run]
//   node --env-file=.env.local scripts/import-board-sheet.mjs --wipe
//
// The JSON is a transcription of the sheet (priorities, SMART goals, action
// items, each chair's goals, On the Radar, board meeting chair updates). It is
// board material: keep it in the gitignored private/ folder. This script holds
// no data.
//
// Where it lands:
//   Priorities          -> objectives (level company) on /board/goals
//   SMART goals         -> key_results under each priority
//   Action items        -> tasks on the board workboard
//   Each chair's goals  -> board_priorities on their board appointment
//   On the Radar        -> issues (/board/radar)
//   Board Agendas       -> board_meetings (source sheet_import) + meeting_updates
//
// People are matched by name to people already in the database (run
// import-eo-tracker.mjs first so board members exist with their appointments).
// Every run wipes what an earlier run imported, then imports again, in one
// transaction.

import { readFileSync } from "node:fs";
import postgres from "postgres";

const TASK_MARK = "board-sheet";
const KR_MARK = "board-sheet-import";
const ISSUE_MARK = "<!-- board-sheet-import -->";
const PRIORITY_MARK = "Imported from the board tracker sheet.";

const args = process.argv.slice(2);
const wipeOnly = args.includes("--wipe");
const dryRun = args.includes("--dry-run");
const file = args.find((a) => !a.startsWith("--"));

if (!process.env.SUPABASE_DB_URL) {
  console.error("SUPABASE_DB_URL must be set (.env.local).");
  process.exit(1);
}
if (!file) {
  console.error("Usage: import-board-sheet.mjs <board-sheet.json> [--dry-run] | <board-sheet.json> --wipe");
  process.exit(1);
}

const data = JSON.parse(readFileSync(file, "utf8"));
const FY = data.fiscal_year_start;

const ISSUE_STATUS = { Completed: "solved", "On Track": "solving" };

const sql = postgres(process.env.SUPABASE_DB_URL, { max: 1, onnotice: () => {} });

async function wipe(tx) {
  const titles = data.priorities.map((p) => p.title);
  const tasks = await tx`delete from public.tasks where metadata->>'import' = ${TASK_MARK} returning id`;
  const krs = await tx`delete from public.key_results where source_detail = ${KR_MARK} returning id`;
  const objectives = await tx`
    delete from public.objectives o
     where o.level = 'company' and o.year = ${FY} and o.title = any(${titles})
       and not exists (select 1 from public.key_results k where k.objective_id = o.id)
    returning id`;
  const priorities = await tx`delete from public.board_priorities where detail like ${"%" + PRIORITY_MARK} returning id`;
  const issues = await tx`delete from public.issues where notes_md like ${"%" + ISSUE_MARK + "%"} returning id`;
  const meetings = await tx`delete from public.board_meetings where source = 'sheet_import' returning id`;
  return {
    tasks: tasks.length,
    key_results: krs.length,
    objectives: objectives.length,
    board_priorities: priorities.length,
    issues: issues.length,
    meetings: meetings.length,
  };
}

async function run() {
  const report = {};
  const unmatched = new Set();
  try {
    await sql.begin(async (tx) => {
      report.wiped = await wipe(tx);
      if (wipeOnly) return;

      // Name -> person id, preferring board members of this fiscal year.
      const rows = await tx`
        select p.id, coalesce(nullif(p.name, ''), concat_ws(' ', p.first_name, p.last_name)) as name,
               exists (select 1 from public.board_appointments a
                        where a.person_id = p.id and a.fiscal_year_start = ${FY}) as on_board
          from public.people p
         where p.archived_at is null`;
      const byName = new Map();
      for (const r of rows.sort((a, b) => Number(a.on_board) - Number(b.on_board))) {
        if (r.name) byName.set(r.name.trim().toLowerCase(), r.id);
      }
      // The sheet's spelling -> the name on the person's record.
      const alias = new Map(Object.entries(data.name_aliases ?? {}).map(([k, v]) => [k.toLowerCase(), v.toLowerCase()]));
      const person = (name) => {
        if (!name || /^n\/?a$/i.test(name.trim())) return null;
        const key = name.trim().toLowerCase();
        const id = byName.get(alias.get(key) ?? key);
        if (!id) unmatched.add(name.trim());
        return id ?? null;
      };

      const roleId = new Map((await tx`select id, key from public.board_roles`).map((r) => [r.key, r.id]));
      const [workboard] = await tx`select id from public.boards where slug = 'board'`;
      const columns = workboard
        ? await tx`select id, name, is_done from public.board_columns where board_id = ${workboard.id}`
        : [];
      const todo = columns.find((c) => !c.is_done && /to ?do/i.test(c.name)) ?? columns[0];

      // ── Priorities, SMART goals, action items ──
      let krCount = 0;
      let taskCount = 0;
      for (const p of data.priorities) {
        const [obj] = await tx`
          insert into public.objectives ${tx({
            year: FY,
            level: "company",
            title: p.title,
            status: "active",
            owner_person_id: person(p.owner),
            sort_order: p.position,
          })}
          returning id`;
        for (const [i, g] of p.smart_goals.entries()) {
          const owner = person(g.owner) ?? person(p.owner);
          if (!owner) continue; // accountable_person_id is required; reported as unmatched
          await tx`
            insert into public.key_results ${tx({
              objective_id: obj.id,
              title: g.title,
              accountable_person_id: owner,
              source: "manual",
              source_detail: KR_MARK,
              status: "on_track",
              sort_order: i + 1,
            })}`;
          krCount++;
        }
        if (workboard) {
          for (const [i, a] of p.action_items.entries()) {
            await tx`
              insert into public.tasks ${tx({
                title: a.title,
                description: `Priority ${p.position}: ${p.title}`,
                status: "open",
                due_date: a.due ?? null,
                assignee_id: person(a.owner),
                board_id: workboard.id,
                board_column_id: todo?.id ?? null,
                position: (p.position * 100 + i) * 1.0,
                metadata: tx.json({ import: TASK_MARK, priority: p.position }),
              })}`;
            taskCount++;
          }
        }
      }

      // ── Each chair's own goals ──
      let goalCount = 0;
      const noSeat = [];
      for (const r of data.role_goals) {
        if (!r.goals.length) continue;
        const pid = person(r.chair);
        const role = roleId.get(r.role_key);
        const [appt] = pid && role
          ? await tx`select id from public.board_appointments
                      where person_id = ${pid} and board_role_id = ${role} and fiscal_year_start = ${FY}
                      order by position limit 1`
          : [];
        if (!appt) {
          noSeat.push(`${r.chair} (${r.role_key})`);
          continue;
        }
        const [{ max }] = await tx`select coalesce(max(position), 0) as max from public.board_priorities where board_appointment_id = ${appt.id}`;
        for (const [i, g] of r.goals.entries()) {
          await tx`
            insert into public.board_priorities ${tx({
              board_appointment_id: appt.id,
              position: Number(max) + i + 1,
              title: g.title,
              detail: [g.status ? `Status in the sheet: ${g.status}.` : null, PRIORITY_MARK].filter(Boolean).join(" "),
            })}`;
          goalCount++;
        }
      }

      // ── On the Radar ──
      let issueCount = 0;
      for (const r of data.radar) {
        const notes = [
          r.priority ? `Priority ${r.priority} on the agenda.` : null,
          r.owner ? `Owner: ${r.owner}.` : null,
          r.task ? `Task: ${r.task}${r.due ? ` (by ${r.due})` : ""}.` : null,
          r.description && r.description !== r.title ? `\n${r.description}` : null,
          `\n${ISSUE_MARK}`,
        ]
          .filter(Boolean)
          .join("\n");
        const status = ISSUE_STATUS[r.status] ?? "open";
        await tx`
          insert into public.issues ${tx({
            title: r.title,
            filed_by: r.raised_by || "Board tracker sheet",
            assignee_person_id: person(r.owner),
            status,
            notes_md: notes,
            created_at: r.date ? `${r.date}T12:00:00Z` : new Date().toISOString(),
            resolved_at: status === "solved" ? (r.due ? `${r.due}T12:00:00Z` : r.date ? `${r.date}T12:00:00Z` : null) : null,
          })}`;
        issueCount++;
      }

      // ── Board meetings and chair updates ──
      let meetingCount = 0;
      let updateCount = 0;
      const skippedMeetings = [];
      for (const m of data.meetings) {
        const [clash] = await tx`select id, source from public.board_meetings where meeting_on = ${m.date}`;
        if (clash) {
          skippedMeetings.push(m.date);
          continue;
        }
        const [meeting] = await tx`
          insert into public.board_meetings ${tx({
            meeting_on: m.date,
            fiscal_year_start: FY,
            status: "held",
            previous_minutes_approved: m.minutes_approved,
            source: "sheet_import",
          })}
          returning id`;
        meetingCount++;
        let order = 0;
        for (const [key, body] of Object.entries(m.updates)) {
          const role = roleId.get(key);
          if (role) {
            const [chair] = await tx`
              select person_id from public.board_appointments
               where board_role_id = ${role} and fiscal_year_start = ${FY}
               order by position limit 1`;
            await tx`
              insert into public.meeting_updates ${tx({
                meeting_id: meeting.id,
                board_role_id: role,
                person_id: chair?.person_id ?? null,
                body_md: body,
              })}`;
            updateCount++;
          } else {
            // No board role for it here (e.g. Accelerator): keep it as an announcement.
            await tx`
              insert into public.meeting_agenda_items ${tx({
                meeting_id: meeting.id,
                kind: "announcement",
                title: `${key[0].toUpperCase()}${key.slice(1)} update`,
                details_md: body,
                status: "discussed",
                sort_order: ++order,
              })}`;
          }
        }
      }

      report.imported = {
        objectives: data.priorities.length,
        key_results: krCount,
        tasks: taskCount,
        chair_goals: goalCount,
        issues: issueCount,
        meetings: meetingCount,
        chair_updates: updateCount,
      };
      if (noSeat.length) report.chair_goals_skipped_no_board_seat = noSeat;
      if (skippedMeetings.length) report.meetings_skipped_date_already_exists = skippedMeetings;
      if (!workboard) report.tasks_skipped = "no workboard with slug 'board'";

      if (dryRun) throw new DryRun();
    });
  } catch (e) {
    if (!(e instanceof DryRun)) throw e;
    report.dry_run = "rolled back; nothing was written";
  }
  if (unmatched.size) report.names_not_matched = [...unmatched];
  return report;
}

class DryRun extends Error {}

try {
  console.log(JSON.stringify(await run(), null, 2));
} finally {
  await sql.end();
}
