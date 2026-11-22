# EO Chapter Manager: guide for AI coding agents

This file is for Claude Code, Codex, Cursor or any other coding agent working in this repository. To **install** the app for a chapter, follow `README.md` from the top. This file is for **changing** it afterwards.

EO Chapter Manager is a Next.js 16 App Router application for one EO chapter: public website, events and ticketing, member portal, board workspace, CRM and an optional board assistant. Stack: TypeScript, React 19, Tailwind v4, Supabase (Postgres, Auth, Storage), Stripe, Resend, Vercel.

## Start here

- This is Next.js 16. Before changing framework behaviour, read the guide in `node_modules/next/dist/docs/`. `cookies()` and `headers()` are async, and the route guard is `src/proxy.ts`, not `middleware.ts`.
- The chapter's identity (name, domain, emails, city, time zone, currency) comes from environment variables through `src/kernel/config/chapter.ts`. Never hardcode a chapter name, domain or address; read it from there.
- Work on a branch. Run the checks below before merging.

## Checks

```bash
npm test
npm run test:guardrails
npm run lint
npm run build
```

## Map

- `src/app/`: public, member (`/member`), board (`/board`), admin (`/admin`), API and event (`/events`, `/t/[code]`) routes
- `src/components/`: shared UI; `home/` is the homepage, `internal/` the signed-in workspace
- `src/content/`: the chapter's own words (about page, testimonials, partners, privacy text). Edit these to make the site yours
- `src/lib/`: server data access, authentication, events, CRM and assistant modules
- `src/lib/access-map.ts`: which routes need which role
- `src/proxy.ts`: session and route enforcement
- `src/lib/supabase.ts`: server-only client with the secret key; it bypasses row-level security
- `src/kernel/`, `src/entities/`: workboards, marketing calendar and shared building blocks
- `supabase/`: `00-prereqs.sql`, `01-schema.sql`, `02-starter.sql` build a new database (run by `scripts/setup-db.mjs`); `upgrades/` holds changes for existing installs
- `scripts/`: `setup-db.mjs`, `create-admin.mjs`, guardrail tests

## Authorization

Route protection is not enough. Treat every Server Action and route handler as callable from the outside.

- Check the caller inside the action before reading or writing: `requireSuperAdmin()` for admin work, `requireBoardOrAbove()` for board work, the narrower member checks where they fit.
- When an action receives a record id from the browser, check the caller may touch that record.
- Server code uses the secret key, so a missing check bypasses row-level security completely.
- Never import server-only modules into client components.
- Intentionally public flows (RSVP, surveys, dues, partner and contact forms) stay public.

Roles: `/admin/*` super admin; `/board/*` board or super admin; `/member/*` signed-in, with narrower routes in `access-map.ts`; everything else public.

## Database

- Row-level security stays on for every table. Sensitive tables have no client policy and are read only by checked server code.
- Views over protected tables use `security_invoker = true`.
- Security-definer functions set a locked `search_path`, use schema-qualified names, and revoke default execute before granting only the roles that need it.
- To change the database, add a numbered file to `supabase/upgrades/` (for example `001_add_event_notes.sql`), keep it additive and safe to run twice, and apply it to your project.

## Events and payments

- Never trust prices, capacity, ticket ownership, voucher state or payment status sent from the browser.
- Keep registration and voucher changes atomic where two people could act at once.
- Ticket emails need Resend. On-screen tickets work without it.

## Board assistant (optional)

The assistant reads through a restricted `chatbot_reader` Postgres role (`CHATBOT_DB_URL`) and can only propose changes; a board member confirms them. Never grant that role revenue columns or `user_profiles`.

## Writing style

- EO Blue `#3D46F2`, Base Blue `#0C0C31`, tokens in `src/app/globals.css`, Roboto.
- No em dashes. No full stops at the end of headings or titles.
- EO logos are in `public/logo/`: full colour on light backgrounds, white on dark.

## The demo site

`landing/` is the static landing page for eochapterdemo.com (its own Vercel project, root directory `landing`). It is not part of the app; a chapter can ignore or delete it. The demo sign-in panel and guide (`src/components/DemoLoginHint.tsx`, `DemoGuide.tsx`) appear only when `NEXT_PUBLIC_DEMO_MEMBER_LOGIN` / `NEXT_PUBLIC_DEMO_BOARD_LOGIN` are set; never set them on a real chapter.
