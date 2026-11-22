// Server-only. Static database schema summary embedded in the chatbot's
// system prompt. Hand-maintained: when a migration changes a table the
// chatbot should know about, update the relevant lines here. Keep the
// RESTRICTED TABLES section in sync with the grants in supabase/071_chatbot.sql
// and 124_board_reader_all_but_member_revenue.sql. The chapter connector's
// database_schema tool serves this same text.

import { CHAPTER_NAME } from "../../kernel/config/chapter.ts";

export const SCHEMA_SUMMARY = `
## Database schema (PostgreSQL, schema "public")

You query the ${CHAPTER_NAME} chapter database. Dates are timestamptz unless noted.
The chapter fiscal year runs Jul 1 to Jun 30; a fiscal year is identified by its
starting calendar year (fiscal_year_start 2026 = Jul 2026 to Jun 2027).

### Identity & membership
- people — one row per person (members, prospects, guests, staff). Columns:
  id, email, name, first_name, last_name, preferred_name, phone, whatsapp_phone,
  city, country, gender, date_of_birth, headline, bio, member_since,
  membership_status (derived from chapter_memberships by trigger:
  active_member|on_leave|alumni|not_member; count members from
  chapter_memberships, not this column), membership_type,
  company_id -> companies.id,
  forum_id -> forums.id, forum_status (placed|forum_trained|waiting_ftp|no_forum|other_chapter|null),
  is_eo_staff, is_slp, relationship_manager_id -> people.id, channel_source,
  lifecycle_stage, lead_status, member_health_status, last_activity_at.
- chapter_memberships — source of truth for who is a member. Columns: id,
  person_id -> people.id, chapter_id -> chapters.id, membership_type
  ('Primary Membership'|'Secondary Membership'), status
  (active|on_leave|elumni|terminated|transferred), start_date, end_date,
  transfer_reason, relationship_manager_id. The active roster is
  status IN ('active','on_leave').
- member_companies — person <-> company links. Columns: id, person_id,
  company_id, role (primary|secondary), title. RESTRICTED COLUMNS, see below.
- member_relationships — SLP/children links: member_person_id,
  related_person_id, relationship_type (slp|child).
- member_renewals — annual renewal tracking: person_id, cycle (e.g. '26/27'),
  status (pending|complete), completed_at, consent_at.
- member_requalifications — annual requalification form submissions:
  person_id, fiscal_year_start, confirmed_name/email/phone/company,
  employee_count, biggest_challenge, submitted_at. RESTRICTED COLUMNS, see below.
- member_signal_overrides — board-set engagement signal: person_id, signal
  (healthy|value_risk|drifting|at_risk|quiet), note, set_by, created_at.
  Latest row per person wins; overrides expire after 90 days.
- member_photos — person_id, url, is_primary, caption, sort_order.

### Companies
- companies — id, name, slug, industry, sector, website, domain, employees,
  city, country, status, founded, description, operating_countries,
  relationship_manager_id, last_activity_at. RESTRICTED COLUMNS, see below.

### Board & forums
- board_roles — portfolio definitions: id, key (slug e.g. 'finance',
  'membership'), name, short_name, sort_order, is_active.
- board_appointments — person -> role for a fiscal year: id, person_id,
  board_role_id -> board_roles.id, position (Chair|Co-Chair|Day-Chair|Committee Member),
  scope (Global|Regional|Local), fiscal_year_start (int). Current board =
  rows at max(fiscal_year_start).
- forums — peer groups: id, chapter_id, name. Members link via people.forum_id.
- chapters — chapter master data (${CHAPTER_NAME} is the only row).

### Events
- events — id, type (learning|membership|social|my_eo|forum), status
  (draft|published|open|closed|completed|cancelled), visibility, audience,
  title, blurb, speaker, location, starts_at, ends_at, capacity, featured,
  price_amount, currency, aggregate_rating (unused), survey_enabled, survey_sent_at,
  survey_sent_count, champion, slug,
  my_eo_group_id, allow_spouses, recap_published.
- event_registrations — one per person/event: id, event_id, person_id, status
  (registered|waitlisted|cancelled|attended|no_show|pending_payment),
  review_classification (normal|needs_review|spam), guest_count, ticket_code,
  checked_in_at, amount_paid, paid_at, ticket_type_id, invited_by_person_id,
  invited_by_registration_id, wants_tasting, wants_masterclass (MyEO Family
  Day session choices; non-sensitive, table-level granted like the rest of
  this table), channel_source, utm_* , referrer, landing_path,
  referral_source (first-touch marketing attribution, migration 109, same
  shape as applications).
- event_registration_attendees — extra attendee details per registration:
  id, registration_id, full_name, email, phone, company, title, food_allergy,
  created_at. (age, photo_path, and photo_consent exist on this table but are
  NOT granted to the chatbot; they hold sensitive per-attendee data for the
  MyEO Family Day event and are read only by board-or-above admins server side.)
- event_feedback — post-event survey: event_id, person_id, event_value_rating
  (1-5 immediate event value; THE event rating, average it per event type for
  chair goals, chapter events only), rating_overall (1-5 historical transformational
  growth), would_recommend, comments, loved_text, improve_text.
- event_materials — slides/recordings: event_id, kind, title, url, visible_to.
- event_ticket_types — per-event ticket tiers: event_id, name, price_amount,
  capacity, active.
- my_eo_groups — MyEO interest groups: id, name, description, host_member_id, active.

### Pipeline (prospects & partners)
- deals — Member Acquisition + Onboarding Track pipelines (HubSpot-synced):
  id, person_id, company_id, name, pipeline ('Member Acquisition'|'Onboarding Track'),
  stage, deal_status (open|closed_won|closed_lost), close_date, channel_source,
  primary_interest, relationship_manager_id, description, ql_* qualification
  booleans, closed_lost_description, closed_lost_reason, closed_won_reason,
  disqualification_reason, last_activity_at. Member Acquisition stages, in
  order: 'Connect & Qualify', 'Experience EO', 'Go <> No Go Call',
  'Revenue Verification Sent', 'Interview', 'Payment Request', 'Closed Won',
  'Closed Lost'. RESTRICTED COLUMNS, see below.
- sap_deals — Strategic Alliance Partner pipeline: id, company_id, status
  (lead|in_discussion|active|lost), deal_type (platinum|gold|silver),
  deal_owner, introduced_by, motivation, notes, last_contact_at,
  next_followup_at, closed_won_at. RESTRICTED COLUMNS, see below.
- applications — legacy /join form: person_id, company, role, industry,
  revenue_bucket (coarse bucket string), why, status, channel_source, utm_*.
- inquiries — contact-form inbox: id, person_id, kind (podcast_guest|
  partner_strategic|partner_sponsor|partner_event|contact), payload (jsonb),
  status (new|read), notes, created_at.
- tasks — follow-up tasks: title, status, due_date, assignee_id, person_id,
  company_id, deal_id.

### Content, surveys & marketing
- blog_posts — slug, title, subtitle, excerpt, category, tags, status,
  published_at, author_name, view_count, audience.
- newsletters — title, summary, sent_at, audience.
- surveys / survey_fields / survey_responses / survey_answers — survey
  templates, their questions, responses (rating 1-5 for the Pulse survey,
  person_id, submitted_at) and per-field answers.
- marketing_campaigns, email_campaigns, social_posts, web_traffic,
  ad_accounts, ad_campaigns, ad_insights, ad_performance_daily,
  ad_campaign_roi, marketing_campaign_summary — marketing performance data.
- chapter_metrics — per-fiscal-year chapter KPIs (members, retention_pct,
  chapter revenue/reserves in USD, dues_per_member_usd, initiation_fee_usd, forum_count,
  average_event_score). The in-progress year's revenue_usd is a stale
  snapshot; the dashboard calculates it live (prorated dues + initiation fees + grants + SAP cash + tickets).
- chapter_goals, board_priorities, chapter_priorities — goals and priorities.

### Board workspace: goals, Radar, meetings, workboards (124)
- strategies (year, title, body_md); objectives — a chapter priority per
  fiscal year: id, year, level, office, title, status, owner_person_id.
- key_results — a chair's goal: id, objective_id, title, target_value,
  current_value, unit, direction, status (on_track|at_risk|off_track|done),
  accountable_person_id -> people.id. kr_logs — check-ins: key_result_id,
  week_start, value, note_md, author_person_id.
- issues — On the Radar: id, title, diagnosis (goal|system|execution),
  status (open|solving|solved|dropped), assignee_person_id, filed_by (email),
  notes_md, created_at, resolved_at.
- board_meetings (meeting_on date, status upcoming|held|cancelled,
  minutes_md, fiscal_year_start); meeting_agenda_items (meeting_id, kind
  issue|announcement, issue_id, title, outcome_md, status);
  meeting_updates (meeting_id, board_role_id, person_id, body_md);
  meeting_update_comments (update_id, author_label, body); meeting_ratings
  (meeting_id, person_id, score 1-10, went_well, change_next_time).
- long_term_plan_statements, long_term_plan_metrics — the Long-Term Plan.
- boards (id, name, slug), board_columns (board_id, name, is_done,
  is_not_doing), board_members, epics, sprints; tasks are the cards
  (board_id, board_column_id, assignee_id, due_date, status); task_comments,
  task_stage_log (card moves), task_attachments.
- team_members (person_id, employment_type, status), interactions (logged
  calls, meetings and emails: kind, subject, body, person_id, occurred_at).
- deal_notes (deal_kind, deal_id, met_on, title, body, next_step),
  sap_deal_stage_events (deal_id, from/to status and stage, changed_at).
- event_vouchers, event_voucher_ticket_types, event_voucher_redemptions,
  global_event_participation, member_event_attendance (person_id, event_id,
  attended_at; an incomplete import, not a demand signal).
- marketing_content, marketing_pillars, marketing_recaps,
  marketing_asset_images, brands, brand_profiles, brand_contacts, books,
  book_chapters, tags, taggables, short_links.
- email_audiences, email_series, email_messages, email_campaign_recipients,
  email_events — outgoing email and its delivery events.
- person_companies (person_id, company_id, role, title, is_primary,
  ownership_pct).

### RESTRICTED TABLES — SELECT * fails, you MUST name columns explicitly
Member company revenue is not readable by your database role. On these
tables, query only the columns listed:
- companies: id, name, slug, industry, website, hubspot_company_id, notes,
  created_at, updated_at, employees, domain, phone, address, address2, city,
  country, country_code, sector, description, about_us, status, founded,
  fiscal_year, relationship_manager_id, last_activity_at, operating_countries,
  client_start_date, client_end_date (everything except fiscal_year_gross_revenue)
- deals: id, person_id, company_id, name, pipeline, stage, deal_status,
  currency, close_date, relationship_manager_id, primary_interest,
  channel_source, closed_lost_description, closed_lost_reason,
  closed_won_reason, disqualification_reason, disqualified_by,
  membership_start_date, membership_end_date, description,
  ql_financial_commitment, ql_founder_controlling_owner, ql_revenue_verified,
  ql_time_commitment, last_activity_at, created_at, updated_at, amount,
  global_dues
- member_companies: id, person_id, company_id, role, title, ownership_pct,
  created_at, updated_at
- member_requalifications: id, person_id, fiscal_year_start, confirmed_name,
  confirmed_email, confirmed_phone, confirmed_company, employee_count,
  biggest_challenge, submitted_at, ownership_pct
- event_registration_attendees: every column except age, photo_path,
  photo_consent (children's data) and revenue_scale
sap_deals is fully readable (SELECT * works), including amount_usd,
cash_usd, in_kind_usd and pipeline_stage.

These tables are not readable at all: company_revenue_history,
revenue_verifications, user_profiles, person_emails, access_grants, approvals,
audit_log, chatbot_actions, mcp_tool_calls, ai_calls and other system tables.
`.trim();
