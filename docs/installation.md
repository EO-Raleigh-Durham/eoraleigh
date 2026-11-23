# Installation guide

This guide is for the person setting up EO Chapter Manager for a chapter: usually the chapter manager, with a board member who approves the costs. It explains what happens at each step, what you decide, and how to fix the common problems.

The short version lives in the [README](../README.md): you open an AI coding agent, paste one sentence, and the agent follows the README as a runbook. This guide is the long version, for when you want to understand the install, check the agent's work, or do it by hand.

- [Before you start](#before-you-start)
- [Decisions to make first](#decisions-to-make-first)
- [What the install does, step by step](#what-the-install-does-step-by-step)
- [Turning on email, payments and the assistant](#turning-on-email-payments-and-the-assistant)
- [Your own web address](#your-own-web-address)
- [Make it your chapter's](#make-it-your-chapters)
- [Launch checklist](#launch-checklist)
- [Troubleshooting](#troubleshooting)

---

## Before you start

### Who should do it

One person runs the install from start to finish, in one sitting of about an hour. They need to be comfortable copying and pasting, and able to sign in to the accounts below. No programming is needed when an AI agent does the work.

Set the accounts up under a **chapter email address** (for example `tech@yourchapter.org`), not a personal one. Board members change every year; the accounts should stay with the chapter.

### Accounts you need

| Service | What it is for | Plan and cost |
|---|---|---|
| [GitHub](https://github.com) | Holds your chapter's copy of the code | Free |
| [Supabase](https://supabase.com) | The database, member sign-ins and file storage | Free to start; the Pro plan (about US$25 a month) adds daily backups and is recommended once real members use it |
| [Vercel](https://vercel.com) | Hosts the website and runs the hourly background jobs | Pro plan, about US$20 a month. The free plan does not run hourly jobs |

Optional, add them now or later:

| Service | Turns on | Cost |
|---|---|---|
| [Resend](https://resend.com) | All email: tickets, reminders, newsletters, password resets from your own address | Free up to 3,000 emails a month, then from US$20 a month |
| [Stripe](https://stripe.com) | Paid tickets and dues | A fee per payment, no monthly cost |
| [Anthropic](https://console.anthropic.com) | The board's AI assistant | Pay per use, usually a few dollars a month |

### Tools on the computer

The agent installs what is missing, but it helps to know what it uses: Node.js 20.9 or later, Git, and the command-line tools for GitHub (`gh`), Supabase (`supabase`) and Vercel (`vercel`). On a Mac, the agent installs them with Homebrew and npm. Windows works too, through WSL.

### The AI agent

Any coding agent that can run commands works: Claude Code, Codex, Cursor and similar. Open it in a new, empty folder. The agent will stop and ask you to sign in to each service in your browser; that is expected.

---

## Decisions to make first

The agent asks for these in one message. Have the answers ready.

1. **Chapter name and short label.** The full name as members say it (`EO Berlin`) and a short label for tight spaces (`EOBER`).
2. **Web address.** The address the site will use (`https://www.eoberlin.org`). If the chapter has no domain yet, the site starts on a free Vercel address and you add the domain later (see [Your own web address](#your-own-web-address)).
3. **City, country and two-letter country code.** (`Berlin`, `Germany`, `DE`.)
4. **Time zone.** The standard name (`Europe/Berlin`) and the short label shown next to times (`CET`). Every event time on the site uses it.
5. **Public contact email.** Shown on the site (`hello@eoberlin.org`).
6. **First admin.** The name and email of the person who will run the site. They get a link to set their password at the end.

7. **Where the data and website are hosted.** The most important technical decision, and the hardest to change later. Read the next section before you answer.

One more choice:

- **Local currency.** Prices are kept in US dollars. You can add a second local currency (for example `EUR`) with a fixed planning rate, used on the board's dashboards.

---

## Where your data and website live

The site holds personal data about your members: names, contact details, companies, dues and attendance. Where that data is stored matters for the law, for your members' trust and for speed. Decide it with the board before the install, and write the decision in the chapter handbook.

### Two places, two choices

| | What it holds | Where it is chosen | Can it change later? |
|---|---|---|---|
| **Supabase** (the database) | All member and chapter data, sign-ins, uploaded photos and files | The region picked when the project is created (Step 2) | **No.** Moving means creating a new project in the new region and copying the data across. Plan for an afternoon of work and a short outage |
| **Vercel** (the website) | No stored data. It runs the pages and passes data between visitors and the database | `regions` in `vercel.json` (Step 5) | Yes, any time: change one line and push |

Pages and images are also cached on Vercel's worldwide network so the site loads fast everywhere; that copy holds public pages only, not member data.

### How to choose

1. **Follow the law that applies to your chapter.** Data-protection laws such as the GDPR (EU and UK) set rules on where personal data may go and how it is protected. Some countries require personal data to be stored inside the country, or require a filing before it is sent abroad. If you are unsure, ask a member who is a lawyer, or your region. This decision outranks everything below.
2. **Otherwise, pick the region nearest your members.** Data in Frankfurt serves a German chapter quickly; the same data in Singapore makes every page slower for them.
3. **Put the website in the same region as the database.** Every page asks the database for data, often several times. Across oceans, each trip adds a noticeable delay.

### Matching regions

Use a pair from the same row. The Supabase name is what the agent passes when it creates the project; the Vercel code goes in `vercel.json`.

| Members mostly in | Supabase region | Vercel region |
|---|---|---|
| Germany, central Europe | Frankfurt (`eu-central-1`) | `fra1` |
| UK | London (`eu-west-2`) | `lhr1` |
| Ireland, western Europe | Ireland (`eu-west-1`) | `dub1` |
| France | Paris (`eu-west-3`) | `cdg1` |
| Nordics | Stockholm (`eu-north-1`) | `arn1` |
| US east, Latin America north | N. Virginia (`us-east-1`) | `iad1` |
| US west | N. California (`us-west-1`) | `sfo1` |
| Canada | Canada Central (`ca-central-1`) | `iad1` (the nearest, unless Vercel lists a Canadian region) |
| Brazil, South America | São Paulo (`sa-east-1`) | `gru1` |
| India | Mumbai (`ap-south-1`) | `bom1` |
| Southeast Asia | Singapore (`ap-southeast-1`) | `sin1` |
| Japan | Tokyo (`ap-northeast-1`) | `hnd1` |
| Korea | Seoul (`ap-northeast-2`) | `icn1` |
| Australia, New Zealand | Sydney (`ap-southeast-2`) | `syd1` |

Both companies add regions over time; check the current lists at [vercel.com/docs/regions](https://vercel.com/docs/regions) and in Supabase's new-project form if yours is not here. The template ships with `sin1`; the agent changes it to your choice before the first deploy.

### Other services that see member data

The optional services also process some member data, mostly in the United States:

- **Stripe** sees the name and email of whoever pays, and their card details (the site never sees the card).
- **Resend** sees the email addresses and content of every email the site sends.
- **Anthropic** sees the questions board members ask the assistant and the data it reads to answer them.

If your law requires it, sign each company's data processing agreement (all of them, and Supabase and Vercel, offer one in their dashboards or on request), and list these services in your privacy policy.

### Who owns it

Your chapter owns its accounts, its database and its copy of the code. Nobody else, including the people who publish EO Chapter Manager, can see your data. That also means nobody else can recover it: keep the database password and account logins in the chapter's password manager, and switch on backups (see the [maintenance guide](maintenance.md)).

---

## What the install does, step by step

The README numbers these Step 0 to Step 7. Here is what each one means for you.

### Step 0: access

The agent checks it can reach GitHub, Supabase and Vercel. If it cannot, it asks you to run a sign-in command, which opens a browser window. Sign in with the chapter's accounts. The agent also tells you the names of the projects it will create and asks you to agree to the costs.

### Step 1: the chapter's copy and settings

The agent creates a **private** repository on your GitHub account from the EO Chapter Manager template, for example `eo-berlin-chapter-manager`. This is your chapter's own copy. Nothing you change there affects other chapters.

It then writes a settings file, `.env.local`, with your answers and four random secrets. This file holds passwords and keys. It never goes to GitHub, and you should not email or share it. The same values are copied into Vercel in Step 5.

### Step 2: the Supabase project

The agent creates the database project and a database password.

> **Save the database password now**, in the chapter's password manager. Supabase cannot show it again. You need it for upgrades and for restoring backups.

It also tells Supabase your site's address. Without this, password-reset emails point to the wrong place. If the agent cannot do it automatically, it asks you to open Supabase, go to **Authentication > URL Configuration**, and enter the site address as the Site URL, plus `<site address>/**` under Redirect URLs.

### Step 3: the database

One script, `scripts/setup-db.mjs`, builds the whole database: over 100 tables, the security rules on every table, the 13 standard EO board roles, starter workboards and the storage folders for photos and files. It fills in your chapter's name and time zone as it goes.

The last line should read `Database ready for <your chapter name>.` If the script stops part way, it says why; fix that and run it again. It skips what is already done.

### Step 4: a local test

The agent builds the site and starts it on the computer at `http://localhost:3000`. You should see the home page with your chapter's name. This proves the code and the database work together before anything goes public.

### Step 5: Vercel

The agent creates the Vercel project, connects it to the GitHub copy, and copies the settings across. From now on, **every change pushed to GitHub publishes the site automatically**. Nobody uploads files by hand.

When it finishes, the site is live at a `.vercel.app` address.

### Step 6: the first admin

The agent creates the first admin account and prints a one-time link. Open it to set a password. Then sign in at `/login`. Admins reach the admin area at `/admin` and the board portal at `/board`.

### Step 7: hand-over

The agent reports the site's address, reminds you about the database password, and lists what is still switched off. Write these down in the chapter's handbook, together with which accounts own GitHub, Supabase and Vercel.

---

## Turning on email, payments and the assistant

Each of these is optional. The site works without them: tickets show on screen, and paid tickets and the assistant are hidden. You can ask the agent to do any of these later ("turn on email using Resend").

New settings always go in two places: `.env.local` on the computer, and **Vercel > your project > Settings > Environment Variables** (for Production and Preview). Vercel only picks up a new setting on the next deployment, so after adding one, redeploy from the Vercel dashboard or push any change to GitHub.

### Email with Resend

1. Create a Resend account and add your sending domain (for example `yourchapter.org`). Resend shows three or four DNS records; add them where your domain is managed and wait until Resend says **Verified**.
2. Create an API key and set `RESEND_API_KEY`.
3. Set `EMAIL_FROM`, for example `"EO Berlin <hello@yourchapter.org>"`, using the verified domain.
4. Set `MARKETING_POSTAL_ADDRESS` to the chapter's postal address. Most countries' email laws require it in newsletters.
5. Optional: in Resend, add a webhook to `<site address>/api/webhooks/resend (no slash at the end)` and put its signing secret in `RESEND_WEBHOOK_SECRET`, so bounces and complaints are recorded.

To send Supabase's own sign-in and password emails from your domain too, add Resend as the SMTP server in **Supabase > Authentication > Emails > SMTP Settings**. Without this, Supabase sends them from its own address with a low hourly limit.

### Payments with Stripe

1. In Stripe, copy the secret key into `STRIPE_SECRET_KEY`. Use the test key (`sk_test_`) first.
2. Add a webhook endpoint: **Developers > Webhooks > Add endpoint**, address `<site address>/api/stripe/webhook`, with these events: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`.
3. Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Buy a ticket to a test event with Stripe's test card `4242 4242 4242 4242`. The ticket should appear on screen and the registration should show as paid in the board's event page.
5. When that works, repeat steps 1 to 3 with the live keys.

The webhook is what marks a ticket as paid. If payments go through in Stripe but tickets stay unpaid, the webhook address or secret is wrong.

### The board assistant

1. Create an Anthropic API key and set `ANTHROPIC_API_KEY`.
2. The assistant reads the database through a separate read-only account that cannot see revenue figures or private profiles. Give that account a password by running this once in **Supabase > SQL Editor**:

   ```sql
   alter role chatbot_reader login password '<a long random password>';
   ```

3. Set `CHATBOT_DB_URL` to `postgres://chatbot_reader.<project ref>:<that password>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require`.

The assistant only proposes changes; a board member confirms each one.

### Site analytics on the board pages

Turn on **Web Analytics** in the Vercel project, create a Vercel access token, and set `VERCEL_ANALYTICS_TOKEN`, `VERCEL_ANALYTICS_TEAM_ID` and `VERCEL_ANALYTICS_PROJECT_ID`.

---

## Your own web address

1. In Vercel, open the project's **Settings > Domains** and add the domain (for example `www.eoberlin.org`, and `eoberlin.org` to redirect to it).
2. Vercel shows the DNS records to add. Add them where the domain is managed. It usually works within an hour.
3. Change `NEXT_PUBLIC_SITE_URL` to the new address in Vercel and in `.env.local`, then redeploy.
4. In Supabase, **Authentication > URL Configuration**: update the Site URL and add `<new address>/**` to Redirect URLs.
5. If you use Stripe or Resend webhooks, change their addresses to the new domain.

If you are moving from an old website, keep the old site running until the new address works, then switch the DNS.

---

## Make it your chapter's

- **Logo.** Put the chapter's official logo files in `public/logo/`: `primary.svg` for light backgrounds and `white.svg` for dark ones. Get them from your region or EO Global's brand portal.
- **Words.** Everything written about your chapter lives in `src/content/`: the about page, testimonials, partners, the privacy policy and the home page sections. Edit those files (or ask the agent: "change the about page to say ...").
- **Photos.** `public/images/` holds plain placeholders. Replace them with your own photos, keeping the same file names.
- **Privacy policy.** `src/content/privacy-policy.tsx` is a general draft. Have it checked for your country before launch.
- **People and events.** Add the board, members, forums and events in `/admin` and `/board`. See the [maintenance guide](maintenance.md) for the yearly board change.

Every change to these files goes live when it is pushed to GitHub.

---

## Launch checklist

Before telling members about the site:

- [ ] The site loads on its own domain, with the chapter's logo and name
- [ ] The first admin can sign in, and can reach `/admin` and `/board`
- [ ] The current board is entered, and each board member can sign in to `/board`
- [ ] Members are imported, and a test member can sign in to `/member`
- [ ] A password reset email arrives and its link opens your site, not `localhost`
- [ ] A free event RSVP works and shows a ticket
- [ ] If Stripe is on: a test paid ticket is marked paid, then live keys are in place
- [ ] If Resend is on: a ticket email arrives from your domain and is not in spam
- [ ] The privacy policy has been reviewed
- [ ] The database password, and the owner of each account, are written in the chapter handbook
- [ ] Supabase is on the Pro plan (daily backups) once real member data is in

---

## Troubleshooting

| What you see | Likely cause and fix |
|---|---|
| Every page says it cannot reach the database, or requests fail with 401 | The secret key was copied masked. Get it again with `supabase projects api-keys --project-ref <ref> --reveal` and update `SUPABASE_SECRET_KEY` in `.env.local` and Vercel |
| The setup script says "tenant not found" | The database address uses the wrong pooler. Change `aws-1-` to `aws-0-` in `SUPABASE_DB_URL` (or the other way round) |
| The setup script cannot connect at all | The address uses `db.<ref>.supabase.co`, which many networks cannot reach. Use the session pooler address from the README, port 5432 |
| Password-reset links open `localhost` or an error page | The Site URL in Supabase is wrong. Fix it under **Authentication > URL Configuration** |
| A new setting has no effect on the live site | Vercel only reads settings at build time. Redeploy |
| The agent waits forever after a `vercel` command | The command was run without `</dev/null` at the end. Stop it and run it again with that ending |
| Paid tickets stay unpaid | The Stripe webhook address or `STRIPE_WEBHOOK_SECRET` is wrong, or the four events are not selected |
| No emails arrive | `RESEND_API_KEY` or `EMAIL_FROM` is missing, or the sending domain is not verified in Resend |
| Background jobs (survey emails, reminders) never run | The Vercel project is on the free plan, or `CRON_SECRET` is missing |
| The build fails on Vercel after a change | Open the failed deployment in Vercel and read the log, or ask the agent to read it. The previous version stays live until a build succeeds |

Still stuck? Ask your agent to read this guide and the README and diagnose the problem; it can run the checks for you. You can also open an issue on the [GitHub repository](https://github.com/dhajdu/eo-chapter-manager/issues).
