# Maintenance guide

How to keep EO Chapter Manager running from year to year: who looks after what, the new board each July, members and access, backups, updates, costs and security.

It is written for the chapter manager and whoever on the board owns the chapter's technology. Many tasks below are a single sentence you can give your AI coding agent (Claude Code, Codex, Cursor or similar), opened in the chapter's copy of the code. Those are marked **Ask the agent**.

- [Who looks after what](#who-looks-after-what)
- [The maintenance calendar](#the-maintenance-calendar)
- [Accounts and passwords](#accounts-and-passwords)
- [Who can sign in, and to what](#who-can-sign-in-and-to-what)
- [Members](#members)
- [The new board each July](#the-new-board-each-july)
- [Background jobs](#background-jobs)
- [Backups and restoring](#backups-and-restoring)
- [Taking updates](#taking-updates)
- [Undoing a bad change](#undoing-a-bad-change)
- [Security](#security)
- [Costs](#costs)
- [Where to look when something is wrong](#where-to-look-when-something-is-wrong)

---

## Who looks after what

| Role | Usually | Looks after |
|---|---|---|
| **Technology owner** | The chapter manager, or a board member who stays more than one term | The GitHub, Supabase and Vercel accounts, backups, updates, keys |
| **Chapter manager** | Staff | Members, events, the board list, day-to-day questions |
| **Board** | Each chair | Their own goals, events and pages in `/board` |

The technology owner should not change every year. If they do, run [the account hand-over](#when-someone-leaves) first.

---

## The maintenance calendar

**Every week**
- Glance at the board's chapter dashboard. Missing numbers usually mean an event or member was not entered.

**Every month**
- Check that background jobs ran (see [Background jobs](#background-jobs)).
- Check that a backup exists for the last few days (Supabase > Database > Backups).
- Check the bills on Supabase, Vercel and, if used, Resend and Anthropic.

**Every quarter**
- Look for a new version of EO Chapter Manager and take it (see [Taking updates](#taking-updates)).
- Open **Supabase > Advisors** and fix anything marked security.
- Review who has admin access at `/admin/users`.

**Every year, April to June**
- Enter next year's board (see [The new board each July](#the-new-board-each-july)).
- Set next year's dues, metrics and goals.
- Mark members who did not renew.

**Every year, July**
- Check the new board can sign in to `/board`.
- Hand over accounts if the technology owner changes.

---

## Accounts and passwords

Keep all of these in the chapter's shared password manager, not in one person's head or inbox:

- GitHub, Supabase and Vercel logins (ideally under a chapter email address)
- The **database password** from installation. Supabase cannot show it again; without it you cannot restore a backup or run upgrades by hand
- Stripe, Resend and Anthropic logins, if used
- The domain registrar login (where your web address is managed)
- A copy of `.env.local`, the settings file. It holds every key the site uses

Turn on two-factor sign-in for GitHub, Supabase, Vercel and Stripe.

### When someone leaves

When the technology owner or chapter manager changes:

1. Add the new person to the GitHub repository, the Supabase organisation and the Vercel team, as owners.
2. Remove the person leaving from all three, and from Stripe and Resend.
3. Change their role at `/admin/users` (or deactivate them).
4. If they ever had a copy of `.env.local`, change the keys (see [Changing keys](#changing-keys)).

---

## Who can sign in, and to what

Everyone signs in at `/login`, either with an emailed link or a password.

| Role | Reaches | How someone gets it |
|---|---|---|
| **Guest** | Public pages, their own tickets | Anyone who signs in |
| **Member** | `/member`: events, tickets, directory, chapter news | Automatic: their email is on a member record with an active (or on-leave) membership |
| **Board** | `/board` and `/member` | Automatic: they hold a Chair or Co-Chair appointment for the current board year. Can also be set by hand at `/admin/users` |
| **Contractor** | Selected board pages | Granted at `/admin/users/contractors`, sponsored by a current chair |
| **Super admin** | Everything, including `/admin` | Set at `/admin/users` by another super admin |

Members do not need an invitation. If their email is on file, they go to `/login`, enter it and click the link they receive.

To add someone by hand (for example a new staff member), use `/admin/users/new`, then tell them to sign in at `/login` with their email. To remove someone, set them to inactive at `/admin/users`; their history is kept.

Keep at least **two** super admins, so the chapter is never locked out.

---

## Members

### Adding members

New members need a person record with their email and an active membership. Member records can come from the membership pipeline (`/board/prospects`) or be added in bulk.

**Ask the agent:** "Add these new members to the database with an active primary membership starting today: [names and emails]." The agent runs SQL like this in **Supabase > SQL Editor**, which you can also run yourself:

```sql
-- 1. The people. Put one line per new member in both lists. Skips emails already on file.
insert into people (name, email)
values ('Alex Example', 'alex@example.com')
on conflict (email) do nothing;

-- 2. Their memberships.
insert into chapter_memberships (person_id, chapter_id, membership_type, status, start_date)
select p.id, (select id from chapters limit 1), 'Primary Membership', 'active', current_date
from people p
where p.email in ('alex@example.com')
  and not exists (select 1 from chapter_memberships m where m.person_id = p.id and m.status = 'active');
```

Then fill in company, forum and photo from `/board/members`.

### Members who leave

Change the membership status. The possible values are `active`, `on_leave`, `elumni`, `terminated` and `transferred`. The person becomes a guest the next time they sign in; their history stays.

```sql
update chapter_memberships m
set status = 'terminated', end_date = current_date
from people p
where p.id = m.person_id and lower(p.email) = lower('alex@example.com') and m.status = 'active';
```

**Ask the agent:** "Mark these members as no longer active from 30 June: [emails]."

There is no screen for membership status yet; it is on the list of improvements. Until then, use the agent or the SQL above.

---

## The new board each July

EO's year runs from 1 July to 30 June. The year is named by the year it starts: `2027` means July 2027 to June 2028.

### How the change-over works

Board access comes from **board appointments**: who holds which role (President, Membership, Forum and so on) as Chair or Co-Chair, for which year. The site always uses the newest board year that has already started. So:

- You can enter next year's board in April. Nothing changes until 1 July.
- On 1 July, the new board gets `/board` access and the public board page shows them. Nothing needs to be run that day.
- If nobody enters a new board, last year's board keeps access. Do not let that happen.

People with a board role set by hand at `/admin/users` keep it until someone changes it.

### Step 1: enter next year's board (April to June)

Each incoming board member needs a person record with the email they will sign in with.

**Ask the agent:** "Add the board appointments for the year starting July 2027: President [email], Membership [email], ... Co-Chair of Marketing [email]."

The SQL it runs looks like this:

```sql
insert into board_appointments (person_id, board_role_id, position, scope, fiscal_year_start)
select p.id, r.id, v.position::board_position, 'Local'::appointment_scope, 2027
from (values
  ('president@example.com',  'president',       'Chair'),
  ('elect@example.com',      'president-elect', 'Chair'),
  ('membership@example.com', 'membership',      'Chair'),
  ('cochair@example.com',    'marcoms',         'Co-Chair')
) as v(email, role_key, position)
join people p on lower(p.email) = lower(v.email)
join board_roles r on r.key = v.role_key
on conflict do nothing;
```

The role keys are: `president`, `president-elect`, `membership`, `marcoms`, `sap`, `finance`, `governance`, `forum`, `myeo`, `learning`, `member-engagement`, `visitor-experience` and `chapter-staff`. Each role has one Chair per year and any number of Co-Chairs.

Check what was entered:

```sql
select a.fiscal_year_start, r.name, a.position, p.full_name, p.email
from board_appointments a join board_roles r on r.id = a.board_role_id join people p on p.id = a.person_id
where a.fiscal_year_start = 2027 order by r.sort_order, a.position;
```

Add board photos at `/board/photos` or ask the agent to attach them.

### Step 2: next year's numbers and goals

- **Chapter metrics and dues rates:** `/board/historical-metrics`. Add the new year, with the dues per member and initiation fee. The chapter dashboard uses this row.
- **Goals:** `/board/goals`. The new board sets its priorities, key results and each chair's goal, usually at the first board meeting.
- **Handover notes:** the outgoing team writes their reflections at `/board/handover` before they leave.

### Step 3: the dues page

The online dues page (`/chapter-dues`) has the dues year and amount written into the code, so they change with a small code update each year.

**Ask the agent:** "Update the dues page for the year starting July 2027 with dues of US$X." It changes `DUES_FY_START` in `src/lib/dues.ts` and `DUES_AMOUNT` (in cents) in `src/app/chapter-dues/actions.ts`, and the secondary-chapter amount in `src/app/secondary-chapter-dues/actions.ts` if that changed. The change goes live when pushed to GitHub.

### Step 4: on 1 July

- Ask two incoming board members to sign in and open `/board`.
- Check the public board page shows the new board.
- Change by-hand roles at `/admin/users` for anyone leaving the board.

---

## Background jobs

Vercel runs these on a schedule. They need the Vercel Pro plan and the `CRON_SECRET` setting.

| Job | When | What it does |
|---|---|---|
| Event survey | Hourly | Emails the feedback survey once per event, 1 to 72 hours after it ends |
| Release unpaid seats | Hourly | Frees seats held for a payment that was never completed |
| Content sync | Hourly | Keeps the marketing calendar and board cards in step |
| Deliverable sweep | Daily | Deletes abandoned uploads and long-archived card files |
| Closed cards | Daily | Posts the day's closed revenue cards to a Lark chat, if Lark is set up |
| Weekly sprints | Mondays | Opens the next week's sprint on boards that use sprints |
| Monthly goals | 1st of the month | Recalculates measurable key results from live data |

To check they run: **Vercel > your project > Settings > Cron Jobs** lists each job and its last run. Most jobs also record every run in the database:

```sql
select * from routine_runs order by started_at desc limit 20;
```

If your chapter uses Lark, set `LARK_OPS_WEBHOOK_URL` and the site posts an alert after a job fails twice in a row.

---

## Backups and restoring

### What to back up

| What | Where it lives | Backed up by |
|---|---|---|
| Members, events, payments, everything entered on the site | Supabase database | Supabase's daily backups (Pro plan), plus your own monthly copy |
| Uploaded photos and files | Supabase Storage | **Not** in the database backups. Download them yourself (below) |
| The code, logo, words and photos in the repository | GitHub | GitHub keeps every version |
| Settings and keys | `.env.local` and Vercel | Your password manager |

### Daily backups

The Supabase **Pro** plan keeps a daily backup for 7 days. The free plan keeps none. Move to Pro before real member data goes in. Check **Supabase > Database > Backups** monthly.

### Your own monthly copy

Keep one copy outside Supabase, in the chapter's own storage, so the chapter is safe even if the account is lost.

**Ask the agent:** "Make a full backup of the database and the storage files into a dated folder." Or run it yourself with the database password:

```bash
pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges -Fc -f "backup-$(date +%Y-%m-%d).dump"
```

`pg_dump` comes with PostgreSQL; use the same major version as the database or newer (Supabase shows it under **Settings > Infrastructure**). To copy the storage files, use the Supabase dashboard (**Storage**, download each folder) or ask the agent to download them with the Supabase command-line tool.

Treat backup files as confidential: they contain every member's details.

### Restoring

- **From a Supabase daily backup:** Supabase > Database > Backups > Restore. It replaces the whole database with that day's copy; anything entered since is lost. The site is down for a few minutes.
- **From your own copy:** create a new Supabase project, restore the file into it with `pg_restore`, then point the site at the new project's keys. **Ask the agent** to do it; it is the same as moving region.

Practise a restore once a year on a separate test project, so you know it works before you need it.

---

## Taking updates

New versions of EO Chapter Manager are published to [github.com/dhajdu/eo-chapter-manager](https://github.com/dhajdu/eo-chapter-manager). Taking one is optional; the site keeps working without it. Take updates at least for security fixes.

**Ask the agent:** "Take the latest EO Chapter Manager update into our copy, keep our content and logo, apply any new database upgrades, and test it on a preview before it goes live."

What happens:

1. The agent merges the new version into a **branch**, not straight into the live site. Your files in `src/content/`, `public/logo/` and `public/images/` are yours; where both sides changed them, it keeps yours.
2. If the update has new files in `supabase/upgrades/`, it applies them to the database in number order. Each is written to be safe to run twice. **Make a backup first.**
3. Vercel builds a **preview** of the branch at its own address. Click through the main pages there: home, events, `/member`, `/board`.
4. When the preview looks right, the branch is merged into `main` and goes live.

By hand, the same steps are:

```bash
git remote add upstream https://github.com/dhajdu/eo-chapter-manager   # once
git fetch upstream
git switch -c update-$(date +%Y-%m)
git merge upstream/main
npm ci && npm test && npm run build
git push -u origin HEAD        # Vercel builds a preview
```

Then open a pull request on GitHub and merge it when the preview works.

---

## Undoing a bad change

- **A code or content change broke the site:** in **Vercel > Deployments**, open the last good deployment and choose **Instant Rollback** (or **Promote to Production**). The old version is live again within a minute. Then fix or undo the change in GitHub, because the next push will replace the rollback.
- **Data was deleted or damaged:** restore from a backup (above). If only a few records are affected, restore the backup into a separate test project and copy the records across, rather than rolling back the whole chapter. **Ask the agent** to help.

---

## Security

- **Never share `.env.local`** or paste its contents into email or chat. It contains the key that can read and change every record.
- **Never set the demo settings** (`NEXT_PUBLIC_DEMO_MEMBER_LOGIN`, `NEXT_PUBLIC_DEMO_BOARD_LOGIN`) on a real chapter. They show sign-in details on the login page to anyone.
- **Keep row-level security on.** Supabase > Advisors warns if a table is exposed. The site's server code is the only thing that reads sensitive tables.
- **Review access every quarter** at `/admin/users`: remove people who left the board or staff.

### Changing keys

Change the keys if `.env.local` may have leaked, or when someone who had it leaves:

1. **Supabase:** Settings > API Keys: create a new secret key and revoke the old one. Change the database password under Settings > Database.
2. **Stripe, Resend, Anthropic:** create a new key in each dashboard and delete the old one.
3. **The four random secrets** (`CRON_SECRET`, `UNSUBSCRIBE_SECRET`, `RSVP_ANTISPAM_SECRET`, `MCP_RECEIPT_SECRET`): generate new ones with `openssl rand -hex 32`. Changing `UNSUBSCRIBE_SECRET` makes unsubscribe links in emails already sent stop working, so change it only if it leaked.
4. Update `.env.local` and the Vercel settings, then redeploy.

**Ask the agent:** "Rotate our Supabase secret key and update Vercel."

---

## Costs

Typical monthly costs for one chapter:

| Service | Plan | About |
|---|---|---|
| Vercel | Pro | US$20 |
| Supabase | Pro (daily backups) | US$25 |
| Resend | Free up to 3,000 emails, then Pro | US$0 to 20 |
| Anthropic | Pay as you go | A few dollars |
| Stripe | Per payment | No monthly fee |
| Domain | Yearly | US$10 to 50 a year |

Set a spending limit or alert in Vercel and Anthropic, and check the bills monthly.

---

## Where to look when something is wrong

| Problem | Look here |
|---|---|
| A page shows an error | **Vercel > Logs**, filtered to the time it happened |
| The site will not build after a change | **Vercel > Deployments**, the failed one, Build Logs. The last good version stays live |
| Sign-in emails do not arrive | **Supabase > Authentication > Logs**; and whether custom SMTP is set (see the installation guide) |
| Other emails do not arrive | **Resend > Emails**; check `RESEND_API_KEY` and the verified domain |
| A payment did not mark the ticket paid | **Stripe > Developers > Webhooks**, the endpoint's recent deliveries |
| A background job did not run | **Vercel > Settings > Cron Jobs**, and `routine_runs` |
| A board member cannot reach `/board` | Their appointment for the current year (the check query in [Step 1](#step-1-enter-next-years-board-april-to-june)), and that they sign in with the same email |
| A member signs in but only sees guest pages | Their email on file and an `active` membership (see [Members](#members)) |
| Someone changed a record and you need to know who | `audit_log` in the Supabase table editor |

**Ask the agent** with the error message and what you were doing. It can read the logs, find the cause and propose a fix, which you approve before it goes live. Problems with the software itself can be reported at [github.com/dhajdu/eo-chapter-manager/issues](https://github.com/dhajdu/eo-chapter-manager/issues).
