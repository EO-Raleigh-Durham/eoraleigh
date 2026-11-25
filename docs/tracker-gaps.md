# What EO Chapter Manager lacks next to the EO Raleigh Durham tracker

A running list, kept while trialling this system with a copy of EO Raleigh
Durham's data from its own membership tracker (Laravel, private). Each item is
something the tracker does that has no home here yet: a candidate to build and
offer upstream as a pull request. Features only; no chapter data belongs in
this file (see `CHAPTER.md`).

Status: **gap** (nothing here), **partial** (something close exists),
**PR open** (offered upstream, with the link).

## People and contact records

| Item | Status | Notes |
|---|---|---|
| A person with no email | gap | `people.email` is NOT NULL and unique. Spouses/partners (SLPs), guests and some partner contacts often have none; the tracker requires email only for prospects and checks a no-email create against same-name people instead |
| Person types beyond member/SLP/SAP | gap | No emeritus, key executive, guest/visitor, accelerator participant or chapter staff type (`is_eo_staff` is a flag, not a type). `membership_type` is member, secondary_member, alumni, slp, sap |
| LinkedIn URL | gap | No column on `people` |
| Referrer on the person | gap | Only on `applications` and `event_registrations`. The tracker keeps referrer name/email/phone plus a link to the referring member's record, used by a leaderboard, merge fields and badges |
| Sponsor link | gap | The tracker links a member to their sponsoring member (`sponsor_contact_id`) |
| Key executive linked to their member | partial | `member_relationships` has `slp` and `child`, not key executive |
| Home and business addresses on the person | gap | Only `companies.address`. The tracker keeps home and office separately, extra labelled addresses, a preferred mailing address, and uses them for geocoding and drive times |
| Revenue band and position (door questions) | gap | Self-reported revenue band and role at intake, used to route a lead (EO vs Accelerator) |
| Badge name overrides | gap | Large and small badge names for printed name badges |
| Duplicate review and merge | not yet checked | |

## Recruiting pipeline

| Item | Status | Notes |
|---|---|---|
| EO's real admission steps as stages | partial | Member Acquisition has 6 working stages. The tracker's steps are New, Invited, Meeting booked, Chair approved, Trifecta (three interviews), Chapter vote, Global approval, Dues, Member. Import maps Trifecta, Chapter vote and Global approval all to Interview |
| Stage derived from milestones | gap | The tracker derives the step from dated milestones (invited, meeting, each checklist step), furthest wins, so it can't drift from what happened. Here the stage is set by hand |
| Off-board groups as live states | partial | The tracker parks leads in Need to qualify, Accelerator candidate, Handed to Accelerator, SLP prospect, SAP prospect, Newsletter only and Gone quiet, each with its own list and a way back. Here they can only be closed deals |
| Accelerator (EOA) handoff | gap | Routing under-revenue leads to the Accelerator chair, with the handoff email |
| Membership checklist per applicant | not yet checked | Membership call, application, CPA verification, Trifecta, vote, Global approval, dues, engagement handoff |
| Prospect timeline (notes, calls, meetings, emails) | partial | `deal_notes` holds notes on a deal; no timeline for a person who is not a deal |
| BCC / forward / referral email capture | gap | Inbound addresses that log emails and create leads |
| AI relationship summary per contact | gap | |

## Members and engagement

| Item | Status | Notes |
|---|---|---|
| Dated forum history | gap | One current `people.forum_id`. The tracker keeps every forum move with from/to dates, so past years' rosters stay right |
| Forum kinds and details | gap | SLP and key executive forums, holding "bucket" forums, short codes, forum numbers, formed/disbanded dates |
| Membership years | partial | `member_renewals` exists; the tracker keeps one row per member per fiscal year with renewal status and the year's frozen tier, score and totals |
| Roles by fiscal year | partial | `board_appointments` covers the board. Missing: forum moderators, regional board, elect vs active, the yearly rollover that promotes elects |
| Trainings and MyEO groups | partial | `events.my_eo_group_id` exists; per-member training records do not |
| Engagement score | gap | Rule-based score per member per year (chapter-editable rules and label cutoffs), At risk list, pre-event push to low scorers |
| Data-quality checks | gap | About 40 checks with CSVs and weekly trend |
| Event attendance history | not yet imported | Imported past events would appear on the public past-events page; needs an "imported, history only" flag |

## Other

| Item | Status | Notes |
|---|---|---|
| Bulk import | gap | No CSV or other import path; a chapter coming from a spreadsheet or another CRM has to script it |
| Admin set-password link | PR open | [#3](https://github.com/dhajdu/eo-chapter-manager/pull/3): `create-admin.mjs` printed a link that always showed "Link expired" |
| MCP setup documented | gap | The connector needs Supabase's OAuth server switched on (authorization path `/oauth/consent`); the install guide does not say so |
