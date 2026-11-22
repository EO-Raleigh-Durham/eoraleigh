# Database upgrades

New installs never need these: `scripts/setup-db.mjs` builds the current
structure from `../01-schema.sql`.

When a new version of EO Chapter Manager changes the database, the change
arrives here as a numbered file (`001_short_description.sql`, `002_...`).
After merging a new version into your copy, run each new file once, in number
order, against your database (Supabase SQL editor or `psql`). Each file is
written to be safe to run twice.
