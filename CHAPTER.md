# EO Raleigh Durham: rules for this copy

This repository is EO Raleigh Durham's copy of
[dhajdu/eo-chapter-manager](https://github.com/dhajdu/eo-chapter-manager),
kept as a fork at `EO-Raleigh-Durham/eoraleigh` so upstream changes can be
synced and useful changes offered back. These rules add to `AGENTS.md`; where
they conflict, these win.

## This repository is PUBLIC

GitHub does not allow a private fork of a public repository, so everything
committed here, including the whole history, is readable by anyone on the
internet. Deleting a file later does not remove it from history or from copies
already made.

**Never commit chapter-private content.** That includes:

- Member, prospect or applicant information beyond what the chapter has chosen
  to publish on its public website: emails, phone numbers, home addresses,
  revenue, forum membership, attendance, dues status, notes
- Board material: handover notes, minutes, goals, budgets, finances, votes,
  candidate discussions, anything shown only on `/board/*` or `/admin/*`
- Anything shown only to signed-in members (`/member/*`)
- Exports, imports and backups: CSV, spreadsheets, database dumps, contact
  files, email exports, PDFs of internal documents
- Secrets of any kind (keys, passwords, connection strings, tokens). These live
  only in `.env.local`, Vercel and Supabase settings

**Where private content goes instead:** the app's database (Supabase), entered
through the app's own screens. For working files on this machine, use the
gitignored `private/` folder at the repository root.

### `src/content/` needs care

Upstream keeps some chapter content in code under `src/content/`. In this public
repository a file there is public **even when the page that shows it is
signed-in only**. Before editing any file in `src/content/`, check which route
renders it (`src/lib/access-map.ts`):

- Public pages (`/`, `/about`, public events): fine to fill in with content the
  chapter publishes anyway.
- `handovers.ts` (rendered on `/board/handover`) and anything else behind
  `/board`, `/admin` or `/member`: **leave empty here.** If the chapter needs
  it, the right fix is to move that content into the database, ideally as a
  change offered upstream.
- `directory-members.ts` (public `/directory`): only members who have agreed to
  be listed publicly, and only the fields shown there.

### Before every commit

Run `git diff --cached` and check it against the list above. If anything is
borderline, stop and ask the person you are working with. If private content
was ever pushed, say so at once: it must be treated as exposed (rotate any
secret) and history rewritten, not just deleted in a new commit.

## Staying in step with upstream

- `origin` is this fork; `upstream` is `dhajdu/eo-chapter-manager`.
- Sync with GitHub's **Sync fork** button or
  `git fetch upstream && git merge upstream/main`.
- Keep chapter-specific changes small and in as few files as possible, so
  syncs merge cleanly. Prefer environment variables and `src/content/` over
  edits to shared code.
- A change that would help every chapter goes on its own branch from
  `upstream/main`, with nothing Raleigh-specific in it, and is offered back as
  a pull request to `dhajdu/eo-chapter-manager`.
