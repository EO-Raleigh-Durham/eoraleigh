# EO Chapter Manager

Run your EO chapter on one platform: a public website, events and ticketing, a member portal and directory, a board workspace with goals and workboards, a membership and partner CRM, dues, surveys, and an optional AI board assistant.

Next.js 16 · Supabase · Vercel · Stripe · Resend. MIT licence. Built by an EO chapter and shared with every chapter.

- **See it running:** https://eochapterdemo.com explains it, with a two-minute video and a click-through tour. The live demo of a made-up chapter is at https://app.eochapterdemo.com; its login page signs you in to the member portal or the board portal with one click.
- **Not an official EO Global product.** It uses the EO brand guidelines so it looks right for a chapter. Check with your region before you launch.

---

## Set it up with an AI agent

This README is a runbook written for an AI coding agent: Claude Code, Codex, Cursor or similar. Open the agent in an empty folder and say:

> Follow the README at https://github.com/dhajdu/eo-chapter-manager and set it up for **EO &lt;your chapter&gt;**. Give me the website link at the end.

The agent does the work; you log in to three services when it asks, answer seven questions (including where to host the data), and approve the costs. Plan on about an hour.

**What you need:** accounts on [GitHub](https://github.com), [Supabase](https://supabase.com) (free to start) and [Vercel](https://vercel.com) (the Pro plan, because the app runs hourly background jobs). Optional: [Stripe](https://stripe.com) for paid tickets and dues, [Resend](https://resend.com) for email, [Anthropic](https://console.anthropic.com) for the board assistant.

---

## Runbook for the agent

Work through the steps in order. Run every command from the repository root. Each step ends with a check; do not move on until it passes. Never print secret values back to the operator except where a step says so.

### Step 0: access

Check all three now, together:

```bash
gh auth status
supabase projects list
vercel whoami </dev/null
```

`supabase projects list` may first print "Cannot find project ref. Have you run supabase link?"; that is harmless if the list follows.

Install missing tools with the operator's package manager (`brew install gh supabase/tap/supabase`, `npm i -g vercel`). `supabase login`, `vercel login` and `gh auth login` open a browser, so **ask the operator to run any that fail**, all at once. At the same time, confirm they are happy for you to create a Supabase project and a Vercel project on their accounts (both can cost money), and tell them the names you will use.

Every `vercel` command below ends in `</dev/null`. Without it, the CLI waits for keyboard input forever when an agent runs it.

You also need Node.js 20.9 or later (`node --version`).

### Step 1: the chapter's details

Ask the operator these questions in one message:

1. The chapter's full name, as members say it (for example `EO Berlin`), and a short label for tight spaces (offer one, for example `EOBER`)
2. The website address it will use (for example `https://www.eoberlin.org`), or "none yet". If none, use `https://<chapter-slug>-chapter-manager.vercel.app`, which is the address Vercel will give the project in Step 5; check it there
3. The main city, country and two-letter country code
4. The time zone (offer the IANA name you think fits, for example `Europe/Berlin`) and its short label (`CET`)
5. The public contact email (for example `hello@eoberlin.org`)
6. The first admin: name and email address
7. Where the data and website should be hosted. Explain that the database region cannot be changed after Step 2, that some countries' laws require member data to stay in the country or region (for example the GDPR in the EU), and suggest the matching pair from the region table in `docs/installation.md` ("Where your data and website live") nearest the chapter. Use their answer for the Supabase region in Step 2 and `vercel.json` in Step 5

`<chapter-slug>` below means the chapter name in lowercase with dashes, for example `eo-berlin`.

Then create the repo copy and the settings file:

```bash
gh repo create <their-github-account>/<chapter-slug>-chapter-manager --private --template dhajdu/eo-chapter-manager --clone
cd <chapter-slug>-chapter-manager
cp .env.local.example .env.local
npm ci
```

`.env.local.example` lists every setting with a comment line above it. Fill in the "required" block of `.env.local` from the answers: write the value straight after the `=`, and quote any value with a space in it (`NEXT_PUBLIC_ORG_NAME="EO Berlin"`). Generate the four random secrets with `openssl rand -hex 32`. Leave the Supabase lines for Step 2.

**Check:** this lists the required settings still empty; only the Supabase ones should remain:

```bash
node -e 'const t=require("fs").readFileSync(".env.local","utf8");const req=t.split("---------------------------------------------------------------- optional")[0];console.log(req.split("\n").filter(l=>/^[A-Z0-9_]+=\s*$/.test(l)).join("\n")||"all required settings filled")'
```

### Step 2: Supabase

```bash
supabase orgs list
DB_PASSWORD=$(openssl rand -hex 24)    # hex, so it needs no escaping in connection strings
supabase projects create <chapter-slug>-chapter-manager --org-id <ORG_ID> --region <the region agreed in Step 1> --db-password "$DB_PASSWORD"
```

Tell the operator the database password once and ask them to save it in their password manager now; Supabase cannot show it again.

Record the project ref and fill in `.env.local`:

- `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`: `https://<ref>.supabase.co`
- Keys: `supabase projects api-keys --project-ref <ref> --reveal -o json`. Use `anon` for `NEXT_PUBLIC_SUPABASE_ANON_KEY`, the `sb_publishable_` key for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the `sb_secret_` key for `SUPABASE_SECRET_KEY`. **Without `--reveal` the secret key comes back masked and every request fails with 401.** The legacy `service_role` key also works as `SUPABASE_SECRET_KEY`.
- `SUPABASE_DB_URL`: the **session pooler** address, `postgres://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require`. Some projects are on `aws-0-` instead of `aws-1-`; if one says "tenant not found", try the other. Do not use `db.<ref>.supabase.co`: it is IPv6 only and fails on many networks. Do not use port 6543.

Finally, tell Supabase the site's address, or password-reset links break. If `SUPABASE_ACCESS_TOKEN` is set (a personal token from supabase.com > Account > Access Tokens), do it with the API:

```bash
curl -s -X PATCH "https://api.supabase.com/v1/projects/<ref>/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"site_url":"<site url>","uri_allow_list":"<site url>/**,http://localhost:3000/**"}' -o /dev/null -w '%{http_code}\n'
```

`200` means done. Otherwise ask the operator to set it in the dashboard: **Authentication > URL Configuration**, Site URL to the site address, and `<site url>/**` and `http://localhost:3000/**` under Redirect URLs.

### Step 3: the database

```bash
node --env-file=.env.local scripts/setup-db.mjs
```

It runs `supabase/00-prereqs.sql`, `01-schema.sql` and `02-starter.sql`, fills in the chapter's name, slug and time zone, and checks the result: over 100 tables, row-level security on every table, 13 board roles, and an API read that works.

**Build the database only this way.** `01-schema.sql` contains placeholders such as `{{CHAPTER_NAME}}` that the script fills; pasting it into the SQL editor by hand fails. If the script stops, fix what it says and run it again: it skips what is already done.

**Check:** the last line reads `Database ready for <chapter name>.`

### Step 4: run it locally

```bash
npm run build
npm run dev
```

Open http://localhost:3000. The home page should show the chapter's name. Stop the server with Ctrl+C in its own terminal (not a broad `pkill`, which can stop other projects' servers).

### Step 5: Vercel

Your settings live in `.env.local`, which is never committed (`.gitignore` covers `.env*`); Vercel gets them separately. Create the Vercel project; this also connects it to the GitHub copy:

```bash
vercel link --yes --project <chapter-slug>-chapter-manager </dev/null
```

Add every non-empty value from `.env.local` to the project, for production and preview, except `SUPABASE_DB_URL` (only the setup script uses it):

```bash
grep -E '^[A-Z0-9_]+=' .env.local | while IFS='=' read -r key value; do
  [ "$key" = SUPABASE_DB_URL ] && continue
  value=$(printf '%s' "$value" | sed -E 's/[[:space:]]+#.*$//; s/[[:space:]]+$//; s/^"(.*)"$/\1/')
  [ -z "$value" ] && continue
  # The value arrives on stdin, so no </dev/null here. --force replaces an existing value;
  # the empty "" after preview means all preview branches.
  printf '%s' "$value" | vercel env add "$key" production --force || echo "FAILED production $key"
  printf '%s' "$value" | vercel env add "$key" preview "" --force || echo "FAILED preview $key"
done
vercel env ls </dev/null
```

Every key should appear twice, once for Production and once for Preview. Deploy by pushing to GitHub; Vercel builds every push to `main`. Do not use `vercel deploy`.

```bash
git commit --allow-empty -m "First deploy" && git push
```

`vercel.json` ships with the server region set to Singapore (`sin1`). Before this push, change `regions` to the Vercel region agreed in Step 1, the one that matches the Supabase region (for example `fra1` with Frankfurt). Commit that change.

**Check:** `vercel ls </dev/null` shows a Ready production deployment. Open it.

If the chapter has its own domain: `vercel domains add <domain> </dev/null`, then give the operator the DNS records Vercel prints. Until DNS is live, set `NEXT_PUBLIC_SITE_URL` to the `.vercel.app` address in both `.env.local` and Vercel.

### Step 6: the first admin

```bash
node --env-file=.env.local scripts/create-admin.mjs <admin email> "<Admin Name>"
```

It prints a one-time link. Give it to the operator: opening it lets the admin set a password. After that they sign in at `/login` (or `/admin/login`, where `/admin` and `/board` send signed-out visitors) and reach `/admin` and `/board`.

### Step 7: hand over

Report to the operator:

- the live website link, and `/login`
- that they should save the database password if they have not
- what is switched off until they add keys: email (Resend), payments (Stripe), the board assistant (Anthropic)
- where the data is hosted (the Supabase and Vercel regions), to record in the chapter handbook
- the next steps below, and the guides in `docs/`

---

## After setup: make it your chapter's

- **Logo:** put your chapter's official lockup in `public/logo/` as `primary.svg` (on light backgrounds) and `white.svg` (on dark). The repo ships the plain EO mark.
- **Words:** everything chapter-specific lives in `src/content/`: the about page, member testimonials, partners, privacy policy, home page sections. Edit those files; the pages read them.
- **Photos:** `public/images/` holds plain blue placeholders. Replace them with your own, keeping the file names.
- **Privacy policy:** `src/content/privacy-policy.tsx` is a generic draft. Have it reviewed for your country before launch.
- **People and events:** add board members, members, forums and events in `/admin` and `/board`.

## Practice install with sample data

To try everything before using real data, do a separate install whose `NEXT_PUBLIC_ORG_NAME` is exactly `"EO Demo Chapter"`, then load the fictional chapter that runs on the demo site:

```bash
DEMO_MEMBER_PASSWORD=<choose one> DEMO_BOARD_PASSWORD=<choose one> node --env-file=.env.local scripts/demo-reset.mjs
```

It refuses to run on any other chapter name, because it empties the database first. Sign in as `demo-board@example.com` or `demo-member@example.com` with the passwords you chose. Never load sample data into your real chapter.

## Optional features

| Feature | What to add |
|---|---|
| Email (tickets, reminders, newsletters) | `RESEND_API_KEY`, `EMAIL_FROM`, `MARKETING_POSTAL_ADDRESS`, and a verified sending domain in Resend |
| Paid tickets and dues | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and a Stripe webhook to `<site>/api/stripe/webhook` |
| Board assistant | `ANTHROPIC_API_KEY`, then give the read-only role a password and set `CHATBOT_DB_URL` (below) |
| Site analytics on board pages | Vercel Web Analytics on, then `VERCEL_ANALYTICS_TOKEN`, `VERCEL_ANALYTICS_TEAM_ID`, `VERCEL_ANALYTICS_PROJECT_ID` |

Board assistant database role, run once with the database password:

```sql
alter role chatbot_reader login password '<openssl rand -hex 24>';
```

Then `CHATBOT_DB_URL=postgres://chatbot_reader.<ref>:<that password>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require`.

## Updating later

New versions of EO Chapter Manager are published to this repo. To take one, merge it into your copy (`git remote add upstream https://github.com/dhajdu/eo-chapter-manager && git fetch upstream && git merge upstream/main`), then apply any new files in `supabase/upgrades/` in number order. Your `src/content/` files and logo are yours; resolve merge conflicts there in your favour.

## Guides

- [Installation guide](docs/installation.md): the long version of the steps above, for people: accounts and costs, where to host the data, email, payments, your own domain, a launch checklist and troubleshooting.
- [Maintenance guide](docs/maintenance.md): running it year to year: the new board each July, members, backups, updates, costs and security.

## For developers

`AGENTS.md` is the guide for changing the code: map, security rules and checks. Before merging a change, run `npm test`, `npm run test:guardrails`, `npm run lint` and `npm run build`.
