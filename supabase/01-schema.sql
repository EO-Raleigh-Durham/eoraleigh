-- EO Chapter Manager database structure. Generated from a production
-- schema; contains no rows. Do not run by hand: scripts/setup-db.mjs fills
-- the double-brace placeholders from your .env.local and runs it.

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: access_area; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.access_area AS ENUM (
    'sap_pipeline'
);


--
-- Name: ad_platform; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ad_platform AS ENUM (
    'google',
    'meta',
    'linkedin'
);


--
-- Name: application_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.application_status AS ENUM (
    'pending',
    'review',
    'coffee_scheduled',
    'coffee_complete',
    'approved',
    'declined'
);


--
-- Name: appointment_scope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.appointment_scope AS ENUM (
    'Global',
    'Regional',
    'Local'
);


--
-- Name: blog_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.blog_status AS ENUM (
    'draft',
    'scheduled',
    'published',
    'archived'
);


--
-- Name: board_position; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.board_position AS ENUM (
    'Chair',
    'Co-Chair',
    'Day-Chair',
    'Committee Member'
);


--
-- Name: channel_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.channel_source AS ENUM (
    'Organic Search',
    'Paid Search',
    'Email Marketing',
    'Organic Social',
    'Referrals',
    'Other Campaigns',
    'Direct Traffic',
    'Offline Sources',
    'Paid Social',
    'AI Referrals'
);


--
-- Name: chapter_membership_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.chapter_membership_status AS ENUM (
    'active',
    'on_leave',
    'elumni',
    'terminated',
    'transferred'
);


--
-- Name: chapter_membership_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.chapter_membership_type AS ENUM (
    'Primary Membership',
    'Secondary Membership'
);


--
-- Name: closed_lost_description; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.closed_lost_description AS ENUM (
    'Not Qualified',
    'Timing',
    'Bad Timing',
    'Too Busy / No Bandwidth',
    'Value Not Clear',
    'Price / Dues Objection',
    'Forum Commitment Concern',
    'Confidentiality / Trust Concern',
    'Already in Another Peer Group',
    'Chapter Fit Misalignment',
    'Decision Maker Not Engaged',
    'Process Stalled / Ghosted',
    'Geography / Language Barrier',
    'Chose Different Option',
    'Other (Specify in Notes)'
);


--
-- Name: company_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.company_role AS ENUM (
    'owner_founder',
    'executive',
    'staff'
);


--
-- Name: company_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.company_status AS ENUM (
    'Active',
    'Inactive'
);


--
-- Name: content_audience; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.content_audience AS ENUM (
    'community',
    'member',
    'board'
);


--
-- Name: deal_pipeline; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.deal_pipeline AS ENUM (
    'Member Acquisition',
    'Onboarding Track'
);


--
-- Name: deal_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.deal_status AS ENUM (
    'open',
    'closed_won',
    'closed_lost'
);


--
-- Name: disqualification_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.disqualification_reason AS ENUM (
    'Revenue Too Low',
    'Duplicate',
    'Not a Majority Controller',
    'No Response/Ghosted',
    'Application Incomplete',
    'Not a Good Fit',
    'Referred to Accelerator',
    'Declined to Pay',
    'Already a Member',
    'Blocked by EO',
    'Withdrew Application',
    'Rejected by Chapter - Assigning to New Chapter'
);


--
-- Name: eo_region; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.eo_region AS ENUM (
    'Asia Pacific',
    'Canada',
    'Europe',
    'Japan',
    'LAC',
    'MEPA',
    'North Asia',
    'South Asia',
    'US Central',
    'US East',
    'US West'
);


--
-- Name: event_scope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_scope AS ENUM (
    'local',
    'global'
);


--
-- Name: event_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_status AS ENUM (
    'draft',
    'published',
    'open',
    'closed',
    'completed',
    'cancelled'
);


--
-- Name: event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_type AS ENUM (
    'learning',
    'membership',
    'social',
    'my_eo',
    'forum'
);


--
-- Name: event_visibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_visibility AS ENUM (
    'members_only',
    'members_plus_spouses',
    'public'
);


--
-- Name: forum_placement_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.forum_placement_status AS ENUM (
    'placed',
    'waiting_ftp',
    'no_forum',
    'other_chapter',
    'forum_trained'
);


--
-- Name: global_event_participation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.global_event_participation_status AS ENUM (
    'going',
    'attended'
);


--
-- Name: inquiry_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inquiry_kind AS ENUM (
    'podcast_guest',
    'partner_strategic',
    'partner_sponsor',
    'partner_event',
    'contact'
);


--
-- Name: lark_upload_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lark_upload_status AS ENUM (
    'pending',
    'uploaded',
    'failed'
);


--
-- Name: lifecycle_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lifecycle_stage AS ENUM (
    'Lead',
    'Marketing Qualified Lead',
    'Sales Qualified Lead',
    'Opportunity',
    'Customer'
);


--
-- Name: member_company_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.member_company_role AS ENUM (
    'primary',
    'secondary'
);


--
-- Name: member_health_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.member_health_status AS ENUM (
    'Healthy',
    'At-Risk'
);


--
-- Name: member_relationship_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.member_relationship_type AS ENUM (
    'slp',
    'child'
);


--
-- Name: membership_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.membership_status AS ENUM (
    'active_member',
    'on_leave',
    'alumni',
    'not_member'
);


--
-- Name: membership_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.membership_type AS ENUM (
    'member',
    'secondary_member',
    'alumni',
    'slp',
    'sap'
);


--
-- Name: personal_interest; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.personal_interest AS ENUM (
    'Forum Fan',
    'Learner',
    'Leader',
    'Networker'
);


--
-- Name: position_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.position_level AS ENUM (
    'Global',
    'Regional',
    'Chapter'
);


--
-- Name: position_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.position_type AS ENUM (
    'Board Member',
    'Committee Member',
    'Champion'
);


--
-- Name: registration_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.registration_status AS ENUM (
    'pending_payment',
    'registered',
    'waitlisted',
    'cancelled',
    'attended',
    'no_show'
);


--
-- Name: renewal_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.renewal_status AS ENUM (
    'pending',
    'complete'
);


--
-- Name: sap_deal_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sap_deal_status AS ENUM (
    'lead',
    'in_discussion',
    'active',
    'lost'
);


--
-- Name: sap_deal_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sap_deal_type AS ENUM (
    'platinum',
    'gold',
    'silver'
);


--
-- Name: sap_pipeline_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sap_pipeline_stage AS ENUM (
    'contacted',
    'meeting',
    'proposal'
);


--
-- Name: survey_field_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.survey_field_type AS ENUM (
    'short_text',
    'long_text',
    'email',
    'number',
    'single_choice',
    'multi_choice',
    'dropdown',
    'rating',
    'yes_no',
    'date'
);


--
-- Name: survey_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.survey_kind AS ENUM (
    'transformational_growth_pulse',
    'event_feedback',
    'membership_renewal',
    'other'
);


--
-- Name: survey_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.survey_status AS ENUM (
    'draft',
    'published',
    'closed'
);


--
-- Name: task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_status AS ENUM (
    'open',
    'in_progress',
    'completed',
    'cancelled'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'board',
    'member',
    'guest',
    'contractor'
);


--
-- Name: append_task_position(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.append_task_position(p_board_id uuid, p_column_id uuid) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_top integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_column_id::text));
  select coalesce(max(t.position), 0) into v_top
    from public.tasks t
   where t.board_id = p_board_id and t.board_column_id = p_column_id and t.archived_at is null;
  return v_top + 1;
end;
$$;


--
-- Name: attach_standard_checkout_session(uuid, text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attach_standard_checkout_session(p_registration_id uuid, p_stripe_session_id text, p_expected_amount integer, p_expected_currency text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
declare
  v_reg public.event_registrations%rowtype;
  v_currency text := upper(btrim(coalesce(p_expected_currency, '')));
begin
  if nullif(btrim(coalesce(p_stripe_session_id, '')), '') is null then
    raise exception 'Stripe session is required' using errcode = '22023';
  end if;
  if p_expected_amount is null or p_expected_amount <= 0 then
    raise exception 'expected amount must be positive' using errcode = '22023';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'expected currency must be a three-letter code' using errcode = '22023';
  end if;

  select * into v_reg
    from public.event_registrations
   where id = p_registration_id
   for update;
  if not found then
    raise exception 'registration not found' using errcode = 'P0002';
  end if;

  if v_reg.voucher_id is not null
     or v_reg.status <> 'pending_payment'
     or v_reg.review_classification = 'spam'
     or v_reg.stripe_payment_intent_id is not null
     or v_reg.amount_paid is not null
     or v_reg.paid_at is not null
     or v_reg.confirmed_at is not null then
    raise exception 'registration is not an active standard checkout' using errcode = '22023';
  end if;
  if v_reg.price_final_total is distinct from p_expected_amount
     or v_reg.price_currency is distinct from v_currency then
    raise exception 'checkout amount or currency mismatch' using errcode = '22023';
  end if;

  if v_reg.stripe_session_id is not null then
    if v_reg.stripe_session_id is distinct from p_stripe_session_id then
      raise exception 'checkout does not match active registration' using errcode = '22023';
    end if;
    return true;
  end if;

  update public.event_registrations
     set stripe_session_id = p_stripe_session_id
   where id = p_registration_id;
  return true;
end;
$_$;


--
-- Name: FUNCTION attach_standard_checkout_session(p_registration_id uuid, p_stripe_session_id text, p_expected_amount integer, p_expected_currency text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.attach_standard_checkout_session(p_registration_id uuid, p_stripe_session_id text, p_expected_amount integer, p_expected_currency text) IS 'Atomically binds a standard pending registration to its Stripe session after verifying the stored payment quote.';


--
-- Name: attach_voucher_checkout_session(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attach_voucher_checkout_session(p_registration_id uuid, p_stripe_session_id text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  update public.event_registrations er set stripe_session_id = p_stripe_session_id
   where er.id = p_registration_id and er.status = 'pending_payment'
     and er.review_classification <> 'spam';
  if not found then return false; end if;
  update public.event_voucher_redemptions r set stripe_session_id = p_stripe_session_id
   where r.registration_id = p_registration_id and r.state = 'reserved'
     and r.reserved_until > clock_timestamp();
  if not found then raise exception 'voucher reservation is not active' using errcode = '22023'; end if;
  return true;
end;
$$;


--
-- Name: blog_posts_follow_marketing_unpublish(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.blog_posts_follow_marketing_unpublish() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  update public.blog_posts
     set status = 'draft', updated_at = now()
   where marketing_content_id = new.id
     and status = 'published';
  return null;
end;
$$;


--
-- Name: bump_short_link_clicks(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bump_short_link_clicks(p_code text) RETURNS void
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$
  update public.short_links
     set clicks = clicks + 1
   where code = p_code;
$$;


--
-- Name: campaign_recipient_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.campaign_recipient_stats(p_campaign_id uuid) RETURNS TABLE(status text, n bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select r.status, count(*) as n
  from public.email_campaign_recipients r
  where r.campaign_id = p_campaign_id
  group by r.status
  union all
  select 'sent'::text, c.recipients::bigint
  from public.email_campaigns c
  where c.id = p_campaign_id
    and c.source in ('hubspot', 'wix')
    and c.recipients > 0
    and not exists (select 1 from public.email_campaign_recipients r2 where r2.campaign_id = p_campaign_id);
$$;


--
-- Name: chapter_memberships_sync_person_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.chapter_memberships_sync_person_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    update public.people p
       set membership_status = p.membership_status
     where p.id = new.person_id;
  end if;
  if tg_op in ('UPDATE', 'DELETE') and (tg_op = 'DELETE' or old.person_id is distinct from new.person_id) then
    update public.people p
       set membership_status = p.membership_status
     where p.id = old.person_id;
  end if;
  return null;
end
$$;


--
-- Name: claim_campaign_batch(uuid, integer, interval); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_campaign_batch(p_campaign_id uuid, p_limit integer, p_reclaim_after interval DEFAULT '00:30:00'::interval) RETURNS TABLE(id uuid, person_id uuid, email text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  update public.email_campaign_recipients r
  set status = 'pending', claimed_at = null
  where r.campaign_id = p_campaign_id
    and r.status = 'claimed'
    and r.claimed_at < now() - p_reclaim_after;

  return query
  update public.email_campaign_recipients r
  set status = 'claimed', claimed_at = now()
  where r.id in (
    select r2.id
    from public.email_campaign_recipients r2
    where r2.campaign_id = p_campaign_id
      and r2.status = 'pending'
      and (r2.send_after is null or r2.send_after <= now())
    order by r2.send_after nulls first, r2.created_at, r2.id
    limit p_limit
    for update skip locked
  )
  returning r.id, r.person_id, r.email;
end;
$$;


--
-- Name: claim_effect(text, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_effect(p_key text, p_routine text, p_run uuid, p_kind text) RETURNS TABLE(id uuid, attempt integer)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  insert into public.automation_effects (key, routine_id, run_id, kind, status)
  values (p_key, p_routine, p_run, p_kind, 'claimed')
  on conflict (key) do update
    set status = 'claimed',
        attempt = public.automation_effects.attempt + 1,
        claimed_at = now(),
        run_id = excluded.run_id,
        routine_id = excluded.routine_id
    where public.automation_effects.status = 'released'
  returning public.automation_effects.id, public.automation_effects.attempt;
$$;


--
-- Name: claim_tick(text, text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_tick(p_routine text, p_tick text, p_mode text, p_host text, p_step_s integer) RETURNS uuid
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  insert into public.routine_runs (routine_id, tick_key, mode, host, status, started_at, step_deadline_at)
  values (p_routine, p_tick, p_mode, p_host, 'running', now(), now() + make_interval(secs => p_step_s))
  on conflict (routine_id, tick_key, mode) where tick_key is not null and status in ('running', 'waiting', 'ok', 'skipped')
  do nothing
  returning id;
$$;


--
-- Name: close_won_handoff(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.close_won_handoff(source_deal_id uuid) RETURNS TABLE(onboarding_deal_id uuid, membership_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  src public.deals%rowtype;
  chapter_row_id uuid;
  new_onboarding_id uuid;
  new_membership_id uuid;
begin
  select * into src from public.deals where id = source_deal_id for update;
  if not found then
    raise exception 'deal % not found', source_deal_id;
  end if;
  if src.pipeline <> 'Member Acquisition' then
    raise exception 'deal % is not a Member Acquisition deal', source_deal_id;
  end if;

  update public.deals
     set stage = 'Closed Won',
         deal_status = 'closed_won',
         close_date = now(),
         last_activity_at = now()
   where id = source_deal_id;

  select id into chapter_row_id
    from public.chapters
   where chapter_name = '{{CHAPTER_NAME}}'
   limit 1;

  select id into new_onboarding_id
    from public.deals
   where pipeline = 'Onboarding Track'
     and person_id = src.person_id
     and deal_status = 'open'
   limit 1;

  if new_onboarding_id is null then
    insert into public.deals
      (name, pipeline, stage, deal_status, person_id, company_id,
       relationship_manager_id, primary_interest, last_activity_at)
    values
      ('Onboarding: ' || src.name, 'Onboarding Track', 'Welcome Email', 'open',
       src.person_id, src.company_id, src.relationship_manager_id,
       src.primary_interest, now())
    returning id into new_onboarding_id;
  end if;

  if src.person_id is not null then
    select id into new_membership_id
      from public.chapter_memberships
     where person_id = src.person_id
       and chapter_id = chapter_row_id
       and status in ('active', 'on_leave')
     limit 1;

    if new_membership_id is null then
      insert into public.chapter_memberships
        (person_id, chapter_id, membership_type, status, start_date,
         relationship_manager_id)
      values
        (src.person_id, chapter_row_id,
         coalesce(src.primary_interest, 'Primary Membership'),
         'active', current_date, src.relationship_manager_id)
      returning id into new_membership_id;
    end if;
  end if;

  return query select new_onboarding_id, new_membership_id;
end;
$$;


--
-- Name: current_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_role() RETURNS public.user_role
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  SELECT role FROM user_profiles WHERE user_id = auth.uid() AND active = true;
$$;


--
-- Name: derive_membership_status(uuid, public.membership_status); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.derive_membership_status(p_person_id uuid, p_current public.membership_status) RETURNS public.membership_status
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select case
    when bool_or(cm.status = 'active') then 'active_member'::public.membership_status
    when bool_or(cm.status = 'on_leave') then 'on_leave'::public.membership_status
    when bool_or(cm.status = 'elumni') then 'alumni'::public.membership_status
    when count(cm.id) > 0 then 'not_member'::public.membership_status
    when p_current in ('active_member', 'on_leave') then 'not_member'::public.membership_status
    else p_current
  end
  from public.chapter_memberships cm
  where cm.person_id = p_person_id
$$;


--
-- Name: email_delivery_stats(timestamp with time zone, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.email_delivery_stats(p_since timestamp with time zone DEFAULT NULL::timestamp with time zone, p_campaign_id uuid DEFAULT NULL::uuid) RETURNS TABLE(event_type text, unique_emails bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select e.event_type, count(distinct e.resend_email_id) as unique_emails
  from public.email_events e
  where (p_since is null or e.occurred_at >= p_since)
    and (p_campaign_id is null or e.campaign_id = p_campaign_id)
  group by e.event_type
  union all
  select x.event_type, x.n
  from public.email_campaigns c
  cross join lateral (values
    ('delivered'::text, c.delivered::bigint),
    ('opened'::text, c.opens::bigint),
    ('clicked'::text, c.clicks::bigint),
    ('bounced'::text, c.bounces::bigint)
  ) as x (event_type, n)
  where p_campaign_id is not null
    and c.id = p_campaign_id
    and c.source in ('hubspot', 'wix')
    and x.n > 0
    and not exists (select 1 from public.email_events e2 where e2.campaign_id = p_campaign_id);
$$;


--
-- Name: enforce_global_event_participation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_global_event_participation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_event_scope public.event_scope;
  v_event_starts_at timestamptz;
  v_has_eligible_membership boolean;
begin
  if tg_op = 'INSERT' then
    if new.created_by_profile_id is null or new.updated_by_profile_id is null then
      raise exception using
        errcode = '22023',
        message = 'global event participation requires created and updated audit actors';
    end if;

    if new.removed_at is not null or new.removed_by_profile_id is not null then
      raise exception using
        errcode = '22023',
        message = 'global event participation must be inserted as an active row';
    end if;

    new.created_at := statement_timestamp();
    new.updated_at := new.created_at;
  else
    if new.created_at is distinct from old.created_at then
      raise exception using
        errcode = '22023',
        message = 'global event participation creation time is immutable';
    end if;

    if new.created_by_profile_id is distinct from old.created_by_profile_id
       and new.created_by_profile_id is not null then
      raise exception using
        errcode = '22023',
        message = 'global event participation creator is immutable';
    end if;

    if old.removed_at is not null then
      if new.event_id is distinct from old.event_id
         or new.person_id is distinct from old.person_id
         or new.status is distinct from old.status
         or new.removed_at is distinct from old.removed_at
         or (
           new.removed_by_profile_id is distinct from old.removed_by_profile_id
           and new.removed_by_profile_id is not null
         ) then
        raise exception using
          errcode = '22023',
          message = 'removed global event participation audit rows are immutable';
      end if;
    elsif new.removed_by_profile_id is not null then
      if new.removed_at is null then
        new.removed_at := statement_timestamp();
      end if;
    elsif new.removed_at is not null then
      raise exception using
        errcode = '22023',
        message = 'soft removal requires a removal audit actor';
    end if;

    if (
      new.event_id is distinct from old.event_id
      or new.person_id is distinct from old.person_id
      or new.status is distinct from old.status
      or new.removed_at is distinct from old.removed_at
      or new.removed_by_profile_id is distinct from old.removed_by_profile_id
    ) and new.updated_by_profile_id is null then
      raise exception using
        errcode = '22023',
        message = 'global event participation changes require an updated audit actor';
    end if;

    new.updated_at := statement_timestamp();
  end if;

  if tg_op = 'INSERT' or new.event_id is distinct from old.event_id then
    select e.scope, e.starts_at
      into v_event_scope, v_event_starts_at
      from public.events e
     where e.id = new.event_id;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'global event participation references an unknown event';
    end if;

    if v_event_scope is distinct from 'global' then
      raise exception using
        errcode = '23514',
        message = 'global event participation requires an event with global scope';
    end if;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    select e.scope, e.starts_at
      into v_event_scope, v_event_starts_at
      from public.events e
     where e.id = new.event_id;
  end if;

  if (
    tg_op = 'INSERT'
    or new.event_id is distinct from old.event_id
    or new.status is distinct from old.status
  ) and new.status = 'attended' and v_event_starts_at > statement_timestamp() then
    raise exception using
      errcode = '22023',
      message = 'global event participation cannot be Attended before the event starts';
  end if;

  if tg_op = 'INSERT' or new.person_id is distinct from old.person_id then
    select exists (
      select 1
        from public.chapter_memberships cm
        join public.chapters c on c.id = cm.chapter_id
       where cm.person_id = new.person_id
         and c.chapter_name = '{{CHAPTER_NAME}}'
         and cm.membership_type in (
           'Primary Membership'::public.chapter_membership_type,
           'Secondary Membership'::public.chapter_membership_type
         )
         and cm.status in (
           'active'::public.chapter_membership_status,
           'on_leave'::public.chapter_membership_status
         )
    ) into v_has_eligible_membership;

    if not v_has_eligible_membership then
      raise exception using
        errcode = '23514',
        message = 'global event participation requires an active or on-leave {{CHAPTER_NAME}} member';
    end if;
  end if;

  return new;
end
$$;


--
-- Name: event_payment_currency_manifest_fingerprint(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.event_payment_currency_manifest_fingerprint(p_batch_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select encode(extensions.digest(convert_to(coalesce(string_agg(
    jsonb_build_array(
      e.registration_id::text,
      e.amount_total,
      e.currency,
      e.evidence_source,
      e.source_system,
      e.source_record_id,
      e.source_payload_sha256,
      to_char(e.evidence_observed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'),
      case when e.payment_recorded_at is null then null else
        to_char(e.payment_recorded_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') end,
      e.stripe_session_id,
      e.stripe_payment_intent_id,
      e.recorded_by
    )::text,
    E'\n' order by e.registration_id
  ), ''), 'UTF8'), 'sha256'), 'hex')
    from public.event_payment_currency_reconciliation_evidence e
   where e.batch_id = p_batch_id;
$$;


--
-- Name: finalize_event_payment_currency_reconciliation(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_event_payment_currency_reconciliation(p_batch_id uuid, p_executed_by text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_batch public.event_payment_currency_reconciliation_batches%rowtype;
  v_evidence_count integer;
  v_stripe_evidence_count integer;
  v_non_stripe_evidence_count integer;
  v_approval_count integer;
  v_distinct_approver_count integer;
  v_manifest_fingerprint text;
  v_invalid_registration_count integer;
begin
  if nullif(btrim(coalesce(p_executed_by, '')), '') is null then
    raise exception 'repair executor identity is required' using errcode = '22023';
  end if;

  select * into v_batch
    from public.event_payment_currency_reconciliation_batches
   where id = p_batch_id
   for update;
  if not found then
    raise exception 'currency reconciliation batch not found' using errcode = 'P0002';
  end if;
  if v_batch.finalized_at is not null then
    return true;
  end if;
  if v_batch.expected_registration_count <> 74 then
    raise exception 'production repair requires exactly 74 legacy registration records'
      using errcode = '22023';
  end if;

  select count(*) into v_evidence_count
    from public.event_payment_currency_reconciliation_evidence e
   where e.batch_id = p_batch_id;
  select public.event_payment_currency_manifest_fingerprint(p_batch_id)
    into v_manifest_fingerprint;
  if v_evidence_count <> v_batch.expected_registration_count then
    raise exception 'evidence count % does not match expected production cohort %',
      v_evidence_count, v_batch.expected_registration_count using errcode = '22023';
  end if;
  select
    count(*) filter (where evidence_source in ('stripe_api', 'stripe_export')),
    count(*) filter (where evidence_source in ('finance_ledger', 'payment_import'))
    into v_stripe_evidence_count, v_non_stripe_evidence_count
    from public.event_payment_currency_reconciliation_evidence
   where batch_id = p_batch_id;
  if v_stripe_evidence_count <> 5 or v_non_stripe_evidence_count <> 69 then
    raise exception 'production repair requires exactly 5 Stripe and 69 finance/import evidence rows'
      using errcode = '22023';
  end if;
  if v_manifest_fingerprint is distinct from v_batch.expected_manifest_fingerprint then
    raise exception 'evidence manifest fingerprint changed after approval'
      using errcode = '22023';
  end if;

  select count(*), count(distinct lower(btrim(approved_by)))
    into v_approval_count, v_distinct_approver_count
    from public.event_payment_currency_reconciliation_approvals
   where batch_id = p_batch_id
     and manifest_fingerprint is not distinct from v_manifest_fingerprint;
  if v_approval_count <> 2 or v_distinct_approver_count <> 2
     or not exists (
       select 1 from public.event_payment_currency_reconciliation_approvals
        where batch_id = p_batch_id and approval_role = 'platform_owner'
     )
     or not exists (
       select 1 from public.event_payment_currency_reconciliation_approvals
        where batch_id = p_batch_id and approval_role = 'finance_owner'
     ) then
    raise exception 'distinct platform and finance approvals are required for this manifest'
      using errcode = '22023';
  end if;

  perform 1
    from public.event_payment_currency_reconciliation_evidence e
    join public.event_registrations er on er.id = e.registration_id
   where e.batch_id = p_batch_id
   order by e.registration_id
   for update of er;

  select count(*) into v_invalid_registration_count
    from public.event_payment_currency_reconciliation_evidence e
    left join public.event_registrations er on er.id = e.registration_id
   where e.batch_id = p_batch_id
     and (
       er.id is null
       or er.amount_paid is null
       or er.amount_paid is distinct from e.amount_total
       or er.price_final_total is distinct from e.amount_total
       or er.voucher_id is not null
       or num_nonnulls(er.price_unit_amount, er.price_quantity,
            er.price_base_total, er.price_discount_total) <> 0
       or (
         e.evidence_source in ('stripe_api', 'stripe_export')
         and (er.stripe_session_id is null or er.stripe_payment_intent_id is null)
       )
       or (
         e.evidence_source in ('finance_ledger', 'payment_import')
         and (er.stripe_session_id is not null or er.stripe_payment_intent_id is not null)
       )
       or exists (
         select 1
           from public.event_payment_currency_repair_audit prior_audit
          where prior_audit.registration_id = er.id
            and prior_audit.batch_id <> p_batch_id
       )
     );
  if v_invalid_registration_count > 0 then
    raise exception '% evidence row(s) do not identify a repairable compact legacy snapshot',
      v_invalid_registration_count using errcode = '22023';
  end if;

  insert into public.event_payment_currency_repair_audit (
    batch_id, evidence_id, registration_id,
    old_amount_paid, new_amount_paid,
    old_price_final_total, new_price_final_total,
    old_price_currency, new_price_currency,
    old_stripe_session_id, new_stripe_session_id,
    old_stripe_payment_intent_id, new_stripe_payment_intent_id,
    old_paid_at, new_paid_at, was_changed, executed_by
  )
  select
    p_batch_id, e.id, er.id,
    er.amount_paid, e.amount_total,
    er.price_final_total, e.amount_total,
    er.price_currency, e.currency,
    er.stripe_session_id,
    case when e.evidence_source in ('stripe_api', 'stripe_export')
      then e.stripe_session_id else er.stripe_session_id end,
    er.stripe_payment_intent_id,
    case when e.evidence_source in ('stripe_api', 'stripe_export')
      then e.stripe_payment_intent_id else er.stripe_payment_intent_id end,
    er.paid_at, coalesce(e.payment_recorded_at, er.paid_at),
    (er.amount_paid, er.price_final_total, er.price_currency,
      er.stripe_session_id, er.stripe_payment_intent_id, er.paid_at)
      is distinct from
    (e.amount_total, e.amount_total, e.currency,
      case when e.evidence_source in ('stripe_api', 'stripe_export')
        then e.stripe_session_id else er.stripe_session_id end,
      case when e.evidence_source in ('stripe_api', 'stripe_export')
        then e.stripe_payment_intent_id else er.stripe_payment_intent_id end,
      coalesce(e.payment_recorded_at, er.paid_at)),
    p_executed_by
  from public.event_payment_currency_reconciliation_evidence e
  join public.event_registrations er on er.id = e.registration_id
  where e.batch_id = p_batch_id;

  perform set_config(
    'app.event_payment_currency_repair_batch', p_batch_id::text, true
  );

  update public.event_registrations er
     set price_currency = e.currency,
         stripe_session_id = case
           when e.evidence_source in ('stripe_api', 'stripe_export')
             then e.stripe_session_id
           else er.stripe_session_id
         end,
         stripe_payment_intent_id = case
           when e.evidence_source in ('stripe_api', 'stripe_export')
             then e.stripe_payment_intent_id
           else er.stripe_payment_intent_id
         end,
         paid_at = coalesce(e.payment_recorded_at, er.paid_at)
    from public.event_payment_currency_reconciliation_evidence e
   where e.batch_id = p_batch_id
     and e.registration_id = er.id
     and (er.amount_paid, er.price_final_total, er.price_currency,
          er.stripe_session_id, er.stripe_payment_intent_id, er.paid_at)
       is distinct from
         (e.amount_total, e.amount_total, e.currency,
          case when e.evidence_source in ('stripe_api', 'stripe_export')
            then e.stripe_session_id else er.stripe_session_id end,
          case when e.evidence_source in ('stripe_api', 'stripe_export')
            then e.stripe_payment_intent_id else er.stripe_payment_intent_id end,
          coalesce(e.payment_recorded_at, er.paid_at));

  -- The same local repair capability lets the batch trigger accept only this
  -- final state transition. It cannot be reused outside this transaction.
  update public.event_payment_currency_reconciliation_batches
     set finalized_by = p_executed_by,
         finalized_at = clock_timestamp()
   where id = p_batch_id;

  return true;
end;
$$;


--
-- Name: finalize_standard_event_registration(uuid, text, text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_standard_event_registration(p_registration_id uuid, p_stripe_session_id text, p_stripe_payment_intent_id text, p_amount_paid integer, p_currency text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
declare
  v_reg public.event_registrations%rowtype;
  v_currency text := upper(btrim(coalesce(p_currency, '')));
  v_now timestamptz := clock_timestamp();
begin
  if nullif(btrim(coalesce(p_stripe_session_id, '')), '') is null then
    raise exception 'Stripe session is required' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_stripe_payment_intent_id, '')), '') is null then
    raise exception 'payment intent is required' using errcode = '22023';
  end if;
  if p_amount_paid is null or p_amount_paid <= 0 or v_currency !~ '^[A-Z]{3}$' then
    raise exception 'valid checkout amount and currency are required' using errcode = '22023';
  end if;

  select * into v_reg
    from public.event_registrations
   where id = p_registration_id
   for update;
  if not found then
    raise exception 'registration not found' using errcode = 'P0002';
  end if;
  if v_reg.voucher_id is not null then
    raise exception 'voucher checkout requires voucher finalization' using errcode = '22023';
  end if;
  if v_reg.stripe_session_id is distinct from p_stripe_session_id then
    raise exception 'checkout does not match active registration' using errcode = '22023';
  end if;
  if v_reg.price_final_total is distinct from p_amount_paid
     or v_reg.price_currency is distinct from v_currency then
    raise exception 'checkout amount or currency mismatch' using errcode = '22023';
  end if;

  -- An exact Stripe retry returns without updating the row. This preserves the
  -- first completion timestamps and any later registration lifecycle status.
  if v_reg.paid_at is not null then
    if v_reg.stripe_payment_intent_id is distinct from p_stripe_payment_intent_id
       or v_reg.amount_paid is distinct from p_amount_paid
       or v_reg.confirmed_at is null then
      raise exception 'completed payment provenance does not match' using errcode = '22023';
    end if;
    return true;
  end if;

  if v_reg.status <> 'pending_payment'
     or v_reg.stripe_payment_intent_id is not null
     or v_reg.amount_paid is not null
     or v_reg.confirmed_at is not null then
    raise exception 'registration is not awaiting this payment' using errcode = '22023';
  end if;

  update public.event_registrations
     set status = 'registered',
         stripe_payment_intent_id = p_stripe_payment_intent_id,
         amount_paid = p_amount_paid,
         paid_at = v_now,
         confirmed_at = v_now
   where id = p_registration_id;
  return true;
end;
$_$;


--
-- Name: FUNCTION finalize_standard_event_registration(p_registration_id uuid, p_stripe_session_id text, p_stripe_payment_intent_id text, p_amount_paid integer, p_currency text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.finalize_standard_event_registration(p_registration_id uuid, p_stripe_session_id text, p_stripe_payment_intent_id text, p_amount_paid integer, p_currency text) IS 'Atomically validates and finalizes a standard Stripe event checkout with exact replay-safe timestamps.';


--
-- Name: finalize_voucher_registration(uuid, text, text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_voucher_registration(p_registration_id uuid, p_stripe_session_id text, p_stripe_payment_intent_id text, p_amount_paid integer, p_currency text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_reg public.event_registrations%rowtype;
  v_red public.event_voucher_redemptions%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if nullif(btrim(p_stripe_payment_intent_id), '') is null then
    raise exception 'payment intent is required for paid voucher checkout' using errcode = '22023';
  end if;
  select * into v_reg from public.event_registrations where id = p_registration_id for update;
  if not found then raise exception 'registration not found' using errcode = 'P0002'; end if;
  select * into v_red from public.event_voucher_redemptions
   where registration_id = p_registration_id for update;
  if not found then raise exception 'voucher redemption not found' using errcode = 'P0002'; end if;
  if v_red.state = 'redeemed' and v_reg.status in ('registered', 'attended') then
    return true;
  end if;
  if v_reg.status <> 'pending_payment' or v_red.state <> 'reserved'
     or v_reg.stripe_session_id is distinct from p_stripe_session_id
     or v_red.stripe_session_id is distinct from p_stripe_session_id then
    raise exception 'checkout does not match active voucher reservation' using errcode = '22023';
  end if;
  if p_amount_paid is distinct from v_reg.price_final_total
     or upper(p_currency) is distinct from v_reg.price_currency then
    raise exception 'checkout amount or currency mismatch' using errcode = '22023';
  end if;
  update public.event_registrations set status = 'registered',
    stripe_payment_intent_id = p_stripe_payment_intent_id, amount_paid = p_amount_paid,
    paid_at = v_now, confirmed_at = v_now
  where id = p_registration_id;
  update public.event_voucher_redemptions set state = 'redeemed', redeemed_at = v_now,
    reserved_until = null where id = v_red.id;
  return true;
end;
$$;


--
-- Name: generate_ticket_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_ticket_id() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '{{TICKET_PREFIX}}-';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * 32 + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;


--
-- Name: increment_blog_view(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_blog_view(post_slug text) RETURNS integer
    LANGUAGE sql
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  update blog_posts
    set view_count = view_count + 1, last_viewed_at = now()
    where slug = post_slug
    returning view_count;
$$;


--
-- Name: is_board_or_above(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_board_or_above() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'board') AND active = true
  );
$$;


--
-- Name: is_super_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND role = 'super_admin' AND active = true
  );
$$;


--
-- Name: merge_people(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.merge_people(p_keep uuid, p_loser uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $_$
declare
  fk record;
begin
  if p_keep = p_loser then
    raise exception 'merge_people: keep and loser must differ (%)', p_keep;
  end if;
  if not exists (select 1 from people where id = p_keep) then
    raise exception 'merge_people: keep % not found', p_keep;
  end if;
  if not exists (select 1 from people where id = p_loser) then
    raise notice 'merge_people: loser % not found; nothing to do', p_loser;
    return;
  end if;

  -- move the loser's emails onto the keeper (demoted; keeper keeps its primary)
  update person_emails
     set person_id = p_keep, is_primary = false, updated_at = now()
   where person_id = p_loser;

  -- pre-resolve full-key unique collisions (drop the loser's duplicate row)
  delete from event_feedback l where l.person_id = p_loser
    and exists (select 1 from event_feedback k where k.person_id = p_keep and k.event_id = l.event_id);
  delete from event_registrations l where l.person_id = p_loser
    and exists (select 1 from event_registrations k where k.person_id = p_keep and k.event_id = l.event_id);
  delete from event_reminders_sent l where l.person_id = p_loser
    and exists (select 1 from event_reminders_sent k where k.person_id = p_keep and k.event_id = l.event_id and k.kind = l.kind);
  delete from member_companies l where l.person_id = p_loser
    and exists (select 1 from member_companies k where k.person_id = p_keep and k.company_id = l.company_id);
  delete from member_renewals l where l.person_id = p_loser
    and exists (select 1 from member_renewals k where k.person_id = p_keep and k.cycle = l.cycle);
  delete from member_requalifications l where l.person_id = p_loser
    and exists (select 1 from member_requalifications k where k.person_id = p_keep and k.fiscal_year_start = l.fiscal_year_start);
  delete from board_appointments l where l.person_id = p_loser
    and exists (select 1 from board_appointments k where k.person_id = p_keep
                and k.board_role_id = l.board_role_id and k.position = l.position
                and k.scope = l.scope and k.fiscal_year_start = l.fiscal_year_start);
  delete from member_relationships l where l.member_person_id = p_loser
    and exists (select 1 from member_relationships k where k.member_person_id = p_keep
                and k.related_person_id = l.related_person_id and k.relationship_type = l.relationship_type);
  delete from member_relationships l where l.related_person_id = p_loser
    and exists (select 1 from member_relationships k where k.related_person_id = p_keep
                and k.member_person_id = l.member_person_id and k.relationship_type = l.relationship_type);

  -- pre-resolve partial "one active per chapter" collisions
  delete from chapter_memberships l where l.person_id = p_loser
    and l.status in ('active','on_leave')
    and exists (select 1 from chapter_memberships k where k.person_id = p_keep
                and k.chapter_id = l.chapter_id and k.status in ('active','on_leave'));

  -- pre-resolve partial "one primary" collisions by demoting the loser's
  update member_companies set role = 'secondary'
    where person_id = p_loser and role = 'primary'
      and exists (select 1 from member_companies k where k.person_id = p_keep and k.role = 'primary');
  update member_photos set is_primary = false
    where person_id = p_loser and is_primary
      and exists (select 1 from member_photos k where k.person_id = p_keep and k.is_primary);

  -- blanket repoint: every FK column that references people.id
  for fk in
    select distinct tc.table_name as tbl, kcu.column_name as col
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
    where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
      and ccu.table_name = 'people' and ccu.column_name = 'id'
      and tc.table_name <> 'person_emails'
  loop
    execute format('update %I set %I = $1 where %I = $2', fk.tbl, fk.col, fk.col)
      using p_keep, p_loser;
  end loop;

  -- a merge can't leave the keeper related to itself
  delete from member_relationships where member_person_id = p_keep and related_person_id = p_keep;

  delete from people where id = p_loser;
end;
$_$;


--
-- Name: people_derive_membership_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.people_derive_membership_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.membership_status := public.derive_membership_status(new.id, new.membership_status);
  return new;
end
$$;


--
-- Name: people_fill_source(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.people_fill_source() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if new.source is null then
    new.source := coalesce(new.channel_source::text, new.source_site);
  end if;
  return new;
end;
$$;


--
-- Name: prevent_event_payment_currency_approval_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_event_payment_currency_approval_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  raise exception 'currency reconciliation approvals are immutable'
    using errcode = '22000';
end;
$$;


--
-- Name: prevent_event_payment_currency_audit_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_event_payment_currency_audit_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  raise exception 'currency repair audit is immutable' using errcode = '22000';
end;
$$;


--
-- Name: protect_event_payment_currency_batch(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_event_payment_currency_batch() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_repair_batch_id uuid := nullif(
    current_setting('app.event_payment_currency_repair_batch', true), ''
  )::uuid;
begin
  if tg_op = 'DELETE' then
    raise exception 'currency reconciliation batches cannot be deleted'
      using errcode = '22000';
  end if;

  if v_repair_batch_id = old.id
     and old.finalized_at is null
     and new.finalized_at is not null
     and nullif(btrim(coalesce(new.finalized_by, '')), '') is not null
     and (
       select count(*)
         from public.event_payment_currency_repair_audit a
        where a.batch_id = old.id
     ) = old.expected_registration_count
     and (
       select count(*)
         from public.event_payment_currency_reconciliation_approvals a
        where a.batch_id = old.id
     ) = 2
     and (new.id, new.cohort_label, new.expected_registration_count,
          new.expected_manifest_fingerprint, new.evidence_artifact_reference,
          new.created_by, new.created_at)
       is not distinct from
         (old.id, old.cohort_label, old.expected_registration_count,
          old.expected_manifest_fingerprint, old.evidence_artifact_reference,
          old.created_by, old.created_at) then
    return new;
  end if;

  if old.finalized_at is not null or exists (
    select 1
      from public.event_payment_currency_reconciliation_approvals a
     where a.batch_id = old.id
  ) then
    raise exception 'approved currency reconciliation batches are immutable'
      using errcode = '22000';
  end if;

  if new.finalized_at is not null or new.finalized_by is not null then
    raise exception 'only the approved reconciliation finalizer can close a batch'
      using errcode = '22000';
  end if;
  return new;
end;
$$;


--
-- Name: protect_event_payment_currency_evidence(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_event_payment_currency_evidence() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_old_batch_id uuid;
  v_new_batch_id uuid;
begin
  if tg_op <> 'INSERT' then
    v_old_batch_id := old.batch_id;
  end if;
  if tg_op <> 'DELETE' then
    v_new_batch_id := new.batch_id;
  end if;

  -- Serialize evidence mutations with the approval trigger's batch-row lock.
  -- An insert that starts before the first approval commits must not miss that
  -- approval and strand an immutable 75-row manifest.
  perform 1
    from public.event_payment_currency_reconciliation_batches b
   where b.id = v_old_batch_id or b.id = v_new_batch_id
   order by b.id
   for update;

  if exists (
    select 1
      from public.event_payment_currency_reconciliation_batches b
     where (b.id = v_old_batch_id or b.id = v_new_batch_id)
       and b.finalized_at is not null
  ) or exists (
    select 1
      from public.event_payment_currency_reconciliation_approvals a
     where a.batch_id = v_old_batch_id or a.batch_id = v_new_batch_id
  ) then
    raise exception 'approved currency reconciliation evidence is immutable'
      using errcode = '22000';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;


--
-- Name: protect_global_event_scope_with_participation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_global_event_scope_with_participation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if new.starts_at > statement_timestamp()
     and exists (
       select 1
         from public.global_event_participation gep
        where gep.event_id = old.id
          and gep.status = 'attended'
          and gep.removed_at is null
     ) then
    raise exception using
      errcode = '23514',
      message = 'an event with confirmed attendance cannot start in the future';
  end if;

  if old.scope = 'global'
     and new.scope is distinct from 'global'
     and exists (
       select 1
         from public.global_event_participation gep
        where gep.event_id = old.id
          and gep.removed_at is null
     ) then
    raise exception using
      errcode = '23514',
      message = 'remove active global event participation before changing event scope';
  end if;

  if old.scope is distinct from 'global'
     and new.scope = 'global'
     and (
       exists (
         select 1 from public.event_registrations er
          where er.event_id = old.id
       )
       or exists (
         select 1 from public.event_ticket_types ett
          where ett.event_id = old.id
       )
       or exists (
         select 1 from public.event_vouchers ev
          where ev.event_id = old.id
       )
     ) then
    raise exception using
      errcode = '23514',
      message = 'remove local registrations, ticket types, and vouchers before changing event scope to global';
  end if;

  return new;
end
$$;


--
-- Name: protect_standard_checkout_session(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_standard_checkout_session() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_repair_batch_text text := nullif(
    current_setting('app.event_payment_currency_repair_batch', true), ''
  );
  v_repair_batch_id uuid;
  v_repair_allowed boolean := false;
  v_reconciliation_owner name;
begin
  if v_repair_batch_text is not null then
    select pg_catalog.pg_get_userbyid(c.relowner)
      into v_reconciliation_owner
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'event_payment_currency_reconciliation_batches';

    if current_user = v_reconciliation_owner then
      v_repair_batch_id := v_repair_batch_text::uuid;
      select exists (
        select 1
          from public.event_payment_currency_reconciliation_evidence e
          join public.event_payment_currency_reconciliation_batches b
            on b.id = e.batch_id
          join public.event_payment_currency_repair_audit a
            on a.batch_id = e.batch_id
           and a.evidence_id = e.id
           and a.registration_id = e.registration_id
         where e.batch_id = v_repair_batch_id
           and e.registration_id = old.id
           and e.evidence_source in ('stripe_api', 'stripe_export')
           and b.finalized_at is null
           and a.was_changed
           and a.new_amount_paid = new.amount_paid
           and a.new_price_final_total = new.price_final_total
           and a.new_price_currency = new.price_currency
           and a.new_stripe_session_id is not distinct from new.stripe_session_id
           and a.new_stripe_payment_intent_id is not distinct from new.stripe_payment_intent_id
           and a.new_paid_at is not distinct from new.paid_at
           and new.amount_paid = e.amount_total
           and new.price_final_total = e.amount_total
           and new.price_currency = e.currency
           and new.stripe_session_id is not distinct from e.stripe_session_id
           and new.stripe_payment_intent_id is not distinct from e.stripe_payment_intent_id
           and new.paid_at is not distinct from coalesce(e.payment_recorded_at, old.paid_at)
           and new.status is not distinct from old.status
           and new.confirmed_at is not distinct from old.confirmed_at
      ) into v_repair_allowed;
    end if;
  end if;

  if not v_repair_allowed
     and old.voucher_id is null
     and old.stripe_session_id is not null
     and new.stripe_session_id is distinct from old.stripe_session_id then
    raise exception 'standard checkout session is immutable' using errcode = '22000';
  end if;
  return new;
end;
$$;


--
-- Name: protect_voucher_price_snapshots(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_voucher_price_snapshots() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_repair_batch_text text := nullif(
    current_setting('app.event_payment_currency_repair_batch', true), ''
  );
  v_repair_batch_id uuid;
  v_repair_allowed boolean := false;
  v_reconciliation_owner name;
begin
  if v_repair_batch_text is not null then
    select pg_catalog.pg_get_userbyid(c.relowner)
      into v_reconciliation_owner
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'event_payment_currency_reconciliation_batches';

    if current_user = v_reconciliation_owner then
      v_repair_batch_id := v_repair_batch_text::uuid;
      select exists (
        select 1
          from public.event_payment_currency_reconciliation_evidence e
          join public.event_payment_currency_reconciliation_batches b
            on b.id = e.batch_id
          join public.event_payment_currency_repair_audit a
            on a.batch_id = e.batch_id
           and a.evidence_id = e.id
           and a.registration_id = e.registration_id
         where e.batch_id = v_repair_batch_id
           and e.registration_id = old.id
           and b.finalized_at is null
           and a.was_changed
           and a.new_amount_paid = new.amount_paid
           and a.new_price_final_total = new.price_final_total
           and a.new_price_currency = new.price_currency
           and a.new_stripe_session_id is not distinct from new.stripe_session_id
           and a.new_stripe_payment_intent_id is not distinct from new.stripe_payment_intent_id
           and a.new_paid_at is not distinct from new.paid_at
           and new.amount_paid = e.amount_total
           and new.price_final_total = e.amount_total
           and new.price_currency = e.currency
           and new.stripe_session_id is not distinct from
             case when e.evidence_source in ('stripe_api', 'stripe_export')
               then e.stripe_session_id else old.stripe_session_id end
           and new.stripe_payment_intent_id is not distinct from
             case when e.evidence_source in ('stripe_api', 'stripe_export')
               then e.stripe_payment_intent_id else old.stripe_payment_intent_id end
           and new.paid_at is not distinct from coalesce(e.payment_recorded_at, old.paid_at)
           and new.status is not distinct from old.status
           and new.confirmed_at is not distinct from old.confirmed_at
      ) into v_repair_allowed;
    end if;
  end if;

  if old.price_base_total is not null and
    (new.voucher_id, new.voucher_code_snapshot, new.voucher_campaign_snapshot,
     new.voucher_percent_snapshot, new.price_unit_amount, new.price_quantity,
     new.price_base_total, new.price_discount_total)
    is distinct from
    (old.voucher_id, old.voucher_code_snapshot, old.voucher_campaign_snapshot,
     old.voucher_percent_snapshot, old.price_unit_amount, old.price_quantity,
     old.price_base_total, old.price_discount_total)
  then
    raise exception 'registration voucher snapshots are immutable' using errcode = '22000';
  end if;

  if not v_repair_allowed
     and old.price_final_total is not null
     and new.price_final_total is distinct from old.price_final_total then
    raise exception 'registration price snapshots are immutable' using errcode = '22000';
  end if;
  if not v_repair_allowed
     and old.price_currency is not null
     and new.price_currency is distinct from old.price_currency then
    raise exception 'registration price snapshots are immutable' using errcode = '22000';
  end if;

  if old.amount_paid is null and new.amount_paid is not null then
    if new.price_final_total is null then
      new.price_final_total := new.amount_paid;
    end if;
  end if;

  if old.amount_paid is not null and not v_repair_allowed then
    if (new.amount_paid, new.stripe_session_id, new.stripe_payment_intent_id)
       is distinct from
       (old.amount_paid, old.stripe_session_id, old.stripe_payment_intent_id) then
      raise exception 'registration payment provenance is immutable' using errcode = '22000';
    end if;

    if new.paid_at is distinct from old.paid_at then
      new.paid_at := old.paid_at;
      new.confirmed_at := old.confirmed_at;
      new.status := old.status;
    end if;
  end if;

  return new;
end;
$$;


--
-- Name: protect_voucher_redemption_snapshots(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_voucher_redemption_snapshots() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if (new.voucher_id, new.registration_id, new.primary_email, new.discounted_seat_quantity,
      new.voucher_code_snapshot, new.campaign_label_snapshot, new.discount_percent_snapshot,
      new.ticket_type_id_snapshot, new.ticket_name_snapshot, new.unit_amount_snapshot,
      new.base_total_snapshot, new.discount_total_snapshot, new.final_total_snapshot,
      new.currency_snapshot)
    is distinct from
     (old.voucher_id, old.registration_id, old.primary_email, old.discounted_seat_quantity,
      old.voucher_code_snapshot, old.campaign_label_snapshot, old.discount_percent_snapshot,
      old.ticket_type_id_snapshot, old.ticket_name_snapshot, old.unit_amount_snapshot,
      old.base_total_snapshot, old.discount_total_snapshot, old.final_total_snapshot,
      old.currency_snapshot)
  then
    raise exception 'voucher redemption snapshots are immutable' using errcode = '22000';
  end if;
  return new;
end;
$$;


--
-- Name: refresh_team_members(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_team_members() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  with latest as (
    select max(fiscal_year_start) as fy from public.board_appointments
  ),
  staff as (
    select up.person_id
      from public.user_profiles up
     where up.active and up.person_id is not null and up.role in ('board', 'super_admin')
    union
    select ba.person_id
      from public.board_appointments ba, latest
     where ba.fiscal_year_start = latest.fy
       and ba.position in ('Chair', 'Co-Chair')
       and ba.person_id is not null
  )
  insert into public.team_members (person_id, status, start_date)
  select s.person_id, 'active', current_date from staff s
  on conflict (person_id) do update
    set status = 'active', end_date = null
    where public.team_members.status <> 'active';

  update public.team_members tm
     set status = 'ended', end_date = current_date
   where tm.status <> 'ended'
     and not exists (
       select 1 from public.user_profiles up
        where up.person_id = tm.person_id and up.active and up.role in ('board', 'super_admin'))
     and not exists (
       select 1 from public.board_appointments ba
        where ba.person_id = tm.person_id
          and ba.position in ('Chair', 'Co-Chair')
          and ba.fiscal_year_start = (select max(fiscal_year_start) from public.board_appointments));
end;
$$;


--
-- Name: refresh_team_members_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_team_members_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  perform public.refresh_team_members();
  return null;
end;
$$;


--
-- Name: register_for_event(uuid, uuid, text, integer, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.register_for_event(p_event_id uuid, p_person_id uuid, p_seat_status text, p_guest_count integer, p_ticket_type_id uuid, p_ticket_code text) RETURNS TABLE(registration_id uuid, status text, waitlist_position integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_capacity integer;
  v_taken integer;
  v_status text;
  v_wlpos integer;
  v_id uuid;
  v_ticket_capacity integer;
  v_ticket_taken integer;
begin
  if p_seat_status not in ('registered', 'pending_payment') then
    raise exception 'invalid seat status %', p_seat_status;
  end if;

  select capacity into v_capacity
    from public.events
   where id = p_event_id
   for update;
  if not found then
    raise exception 'event % not found', p_event_id using errcode = 'P0002';
  end if;

  if v_capacity is null then
    v_status := p_seat_status;
  else
    select coalesce(sum(1 + er.guest_count), 0) into v_taken
      from public.event_registrations er
     where er.event_id = p_event_id
       and er.status in ('registered', 'attended', 'pending_payment')
       and er.review_classification <> 'spam';
    if v_taken + 1 + coalesce(p_guest_count, 0) <= v_capacity then
      v_status := p_seat_status;
    else
      v_status := 'waitlisted';
      select coalesce(max(er.waitlist_position), 0) + 1 into v_wlpos
        from public.event_registrations er
       where er.event_id = p_event_id
         and er.status = 'waitlisted'
         and er.review_classification <> 'spam';
    end if;
  end if;

  if v_status <> 'waitlisted' and p_ticket_type_id is not null then
    select t.capacity into v_ticket_capacity
      from public.event_ticket_types t
     where t.id = p_ticket_type_id
       and t.event_id = p_event_id;
    if v_ticket_capacity is not null then
      select coalesce(sum(1 + er.guest_count), 0) into v_ticket_taken
        from public.event_registrations er
       where er.event_id = p_event_id
         and er.ticket_type_id = p_ticket_type_id
         and er.person_id <> p_person_id
         and er.status in ('registered', 'attended', 'pending_payment')
         and er.review_classification <> 'spam';
      if v_ticket_taken + 1 + coalesce(p_guest_count, 0) > v_ticket_capacity then
        raise exception 'ticket_sold_out' using errcode = '22023';
      end if;
    end if;
  end if;

  insert into public.event_registrations
    (event_id, person_id, status, waitlist_position, guest_count,
     ticket_type_id, ticket_code)
  values
    (p_event_id, p_person_id, v_status::public.registration_status, v_wlpos,
     coalesce(p_guest_count, 0), p_ticket_type_id, p_ticket_code)
  returning id into v_id;

  return query select v_id, v_status, v_wlpos;
end;
$$;


--
-- Name: register_myeo_family_day(uuid, uuid, boolean, boolean, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.register_myeo_family_day(p_event_id uuid, p_person_id uuid, p_wants_tasting boolean, p_wants_masterclass boolean, p_attendee_count integer, p_ticket_code text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_ticket_type_id uuid;
  v_capacity integer;
  v_taken integer;
  v_confirmed_ticket_type_id uuid;
  v_status public.registration_status;
  v_price_amount integer;
  v_currency text;
  v_id uuid;
begin
  if p_attendee_count is null or p_attendee_count < 1 then
    raise exception 'at least one attendee is required' using errcode = 'P0001';
  end if;

  v_status := 'registered';

  if p_wants_masterclass then
    select id, capacity, price_amount, upper(currency)
      into v_ticket_type_id, v_capacity, v_price_amount, v_currency
      from public.event_ticket_types
     where event_id = p_event_id
       and name = 'Chocolate-making Masterclass'
       and active = true
     for update;
    if not found then
      raise exception 'masterclass ticket type not configured for event %', p_event_id
        using errcode = 'P0002';
    end if;

    select coalesce(sum(1 + er.guest_count), 0) into v_taken
      from public.event_registrations er
     where er.ticket_type_id = v_ticket_type_id
       and er.status in ('registered', 'attended')
       and er.review_classification <> 'spam';

    if v_capacity is not null and v_taken + p_attendee_count > v_capacity then
      raise exception 'The masterclass is full' using errcode = 'P0001';
    end if;

    v_confirmed_ticket_type_id := v_ticket_type_id;
    v_status := 'pending_payment';
  end if;

  insert into public.event_registrations
    (event_id, person_id, status, guest_count, wants_tasting, wants_masterclass,
     ticket_type_id, ticket_code, price_final_total, price_currency)
  values
    (p_event_id, p_person_id, v_status, greatest(p_attendee_count - 1, 0),
     p_wants_tasting, p_wants_masterclass, v_confirmed_ticket_type_id, p_ticket_code,
     case when p_wants_masterclass then v_price_amount * p_attendee_count else null end,
     case when p_wants_masterclass then v_currency else null end)
  returning id into v_id;

  return v_id;
end;
$$;


--
-- Name: register_myeo_family_day_party(uuid, uuid, uuid, boolean, boolean, boolean, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.register_myeo_family_day_party(p_registration_id uuid, p_event_id uuid, p_person_id uuid, p_wants_tasting boolean, p_wants_masterclass boolean, p_waiver_accepted boolean, p_ticket_code text, p_registration_email text, p_attendees jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_event_slug text;
  v_event_status public.event_status;
  v_ticket_type_id uuid;
  v_capacity integer;
  v_price_amount integer;
  v_currency text;
  v_taken integer;
  v_status public.registration_status := 'registered';
  v_attendee_count integer;
  v_attendee jsonb;
  v_attendee_id uuid;
  v_full_name text;
  v_age integer;
  v_food_allergy text;
  v_photo_consent boolean;
  v_photo_path text;
  v_expected_jpg_path text;
  v_expected_png_path text;
begin
  if p_registration_id is null or p_event_id is null or p_person_id is null then
    raise exception 'registration, event, and person ids are required' using errcode = '22023';
  end if;
  if not coalesce(p_wants_tasting, false) and not coalesce(p_wants_masterclass, false) then
    raise exception 'at least one Family Day session is required' using errcode = '22023';
  end if;
  if not coalesce(p_waiver_accepted, false) then
    raise exception 'waiver acceptance is required' using errcode = '22023';
  end if;
  if p_ticket_code is null or btrim(p_ticket_code) = '' then
    raise exception 'ticket code is required' using errcode = '22023';
  end if;
  if p_registration_email is null
     or length(p_registration_email) > 320
     or position('@' in p_registration_email) = 0 then
    raise exception 'valid registration email is required' using errcode = '22023';
  end if;
  if p_attendees is null or jsonb_typeof(p_attendees) <> 'array' then
    raise exception 'attendees must be a JSON array' using errcode = '22023';
  end if;

  v_attendee_count := jsonb_array_length(p_attendees);
  if v_attendee_count < 1 or v_attendee_count > 20 then
    raise exception 'attendee count must be between 1 and 20' using errcode = '22023';
  end if;

  select e.slug, e.status
    into v_event_slug, v_event_status
    from public.events e
   where e.id = p_event_id
   -- FOR SHARE blocks a concurrent status change but remains compatible with
   -- the event foreign-key lock taken by the legacy RPC after it locks the
   -- ticket row. FOR UPDATE here would create an event-to-ticket versus
   -- ticket-to-event deadlock during the migration-first rollout.
   for share;
  if not found then
    raise exception 'event % not found', p_event_id using errcode = 'P0002';
  end if;
  if v_event_slug is distinct from 'myeo-family-day' then
    raise exception 'invalid Family Day event' using errcode = '22023';
  end if;
  if v_event_status not in ('open', 'published') then
    raise exception 'Family Day registration is not open' using errcode = '22023';
  end if;

  if p_wants_masterclass then
    select t.id, t.capacity, t.price_amount, upper(t.currency)
      into v_ticket_type_id, v_capacity, v_price_amount, v_currency
      from public.event_ticket_types t
     where t.event_id = p_event_id
       and t.name = 'Chocolate-making Masterclass'
       and t.active = true
     for update;
    if not found then
      raise exception 'masterclass ticket type not configured for event %', p_event_id
        using errcode = 'P0002';
    end if;

    select coalesce(sum(1 + er.guest_count), 0)
      into v_taken
      from public.event_registrations er
     where er.ticket_type_id = v_ticket_type_id
       and er.status in ('registered', 'attended', 'pending_payment')
       and er.review_classification <> 'spam';

    if v_capacity is not null and v_taken + v_attendee_count > v_capacity then
      raise exception 'The masterclass is full' using errcode = 'P0001';
    end if;
    v_status := 'pending_payment';
  end if;

  insert into public.event_registrations
    (id, event_id, person_id, status, guest_count, wants_tasting,
     wants_masterclass, ticket_type_id, ticket_code, waiver_accepted_at,
     price_final_total, price_currency)
  values
    (p_registration_id, p_event_id, p_person_id, v_status,
     v_attendee_count - 1, coalesce(p_wants_tasting, false),
     coalesce(p_wants_masterclass, false),
     v_ticket_type_id, p_ticket_code, now(),
     case when p_wants_masterclass then v_price_amount * v_attendee_count else null end,
     case when p_wants_masterclass then v_currency else null end);

  for v_attendee in
    select value from jsonb_array_elements(p_attendees)
  loop
    if jsonb_typeof(v_attendee) <> 'object' then
      raise exception 'each attendee must be an object' using errcode = '22023';
    end if;

    begin
      v_attendee_id := nullif(v_attendee ->> 'id', '')::uuid;
      v_age := nullif(v_attendee ->> 'age', '')::integer;
      v_photo_consent := coalesce((v_attendee ->> 'photo_consent')::boolean, false);
    exception when invalid_text_representation then
      raise exception 'attendee id, age, or consent is invalid' using errcode = '22023';
    end;

    v_full_name := btrim(coalesce(v_attendee ->> 'full_name', ''));
    v_food_allergy := nullif(btrim(coalesce(v_attendee ->> 'food_allergy', '')), '');
    v_photo_path := nullif(btrim(coalesce(v_attendee ->> 'photo_path', '')), '');

    if v_attendee_id is null then
      raise exception 'attendee id is required' using errcode = '22023';
    end if;
    if v_full_name = '' or length(v_full_name) > 200 then
      raise exception 'attendee name is required and must be at most 200 characters'
        using errcode = '22023';
    end if;
    if v_age is not null and (v_age < 0 or v_age > 120) then
      raise exception 'attendee age must be between 0 and 120' using errcode = '22023';
    end if;
    if v_food_allergy is not null and length(v_food_allergy) > 300 then
      raise exception 'attendee allergy note must be at most 300 characters'
        using errcode = '22023';
    end if;

    v_expected_jpg_path := p_registration_id::text || '/' || v_attendee_id::text || '.jpg';
    v_expected_png_path := p_registration_id::text || '/' || v_attendee_id::text || '.png';
    if v_photo_path is not null and not v_photo_consent then
      raise exception 'a photo path requires consent' using errcode = '22023';
    end if;
    if v_photo_path is not null
       and v_photo_path <> v_expected_jpg_path
       and v_photo_path <> v_expected_png_path then
      raise exception 'photo path does not belong to this registration and attendee'
        using errcode = '22023';
    end if;

    insert into public.event_registration_attendees
      (id, registration_id, full_name, email, phone, age, food_allergy,
       photo_consent, photo_path)
    values
      (v_attendee_id, p_registration_id, v_full_name, p_registration_email,
       '', v_age, v_food_allergy, v_photo_consent, v_photo_path);
  end loop;

  return p_registration_id;
end;
$$;


--
-- Name: reject_global_event_registration(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_global_event_registration() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_event_scope public.event_scope;
begin
  -- Serialize against scope changes so a stale local RSVP cannot race an
  -- event conversion and leave an operational registration on a global event.
  select e.scope
    into v_event_scope
    from public.events e
   where e.id = new.event_id
   for share;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'event registration references an unknown event';
  end if;

  if v_event_scope = 'global' then
    raise exception using
      errcode = '23514',
      message = 'global event registration is managed externally';
  end if;

  return new;
end
$$;


--
-- Name: release_voucher_registration(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_voucher_registration(p_registration_id uuid, p_stripe_session_id text, p_reason text DEFAULT 'payment_not_completed'::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_red public.event_voucher_redemptions%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  select * into v_red from public.event_voucher_redemptions
   where registration_id = p_registration_id for update;
  if not found then return false; end if;
  if v_red.state = 'released' then return true; end if;
  if v_red.state = 'redeemed' then return false; end if;
  if p_stripe_session_id is null and v_red.stripe_session_id is not null then
    return false;
  end if;
  if p_stripe_session_id is not null and v_red.stripe_session_id is distinct from p_stripe_session_id then
    return false;
  end if;
  update public.event_registrations set status = 'cancelled', cancelled_at = v_now,
    cancellation_reason = coalesce(nullif(p_reason, ''), 'payment_not_completed')
  where id = p_registration_id and status = 'pending_payment';
  update public.event_voucher_redemptions set state = 'released', released_at = v_now,
    reserved_until = null, release_reason = coalesce(nullif(p_reason, ''), 'payment_not_completed')
  where id = v_red.id;
  return true;
end;
$$;


--
-- Name: renew_voucher_checkout_attempt(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.renew_voucher_checkout_attempt(p_registration_id uuid, p_stripe_session_id text, p_hold_minutes integer DEFAULT 30) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_red public.event_voucher_redemptions%rowtype;
  v_attempt integer;
begin
  if nullif(btrim(p_stripe_session_id), '') is null then
    raise exception 'prior Stripe session is required' using errcode = '22023';
  end if;
  if p_hold_minutes < 1 or p_hold_minutes > 60 then
    raise exception 'invalid hold duration' using errcode = '22023';
  end if;

  perform 1 from public.event_registrations
   where id = p_registration_id
     and status = 'pending_payment'::public.registration_status
     and stripe_session_id = p_stripe_session_id
   for update;
  if not found then
    raise exception 'checkout does not match pending registration' using errcode = '22023';
  end if;

  select * into v_red from public.event_voucher_redemptions
   where registration_id = p_registration_id for update;
  if not found or v_red.state <> 'reserved'
     or v_red.stripe_session_id is distinct from p_stripe_session_id then
    raise exception 'checkout does not match active voucher reservation' using errcode = '22023';
  end if;

  update public.event_registrations
     set stripe_session_id = null
   where id = p_registration_id;
  update public.event_voucher_redemptions
     set checkout_attempt = checkout_attempt + 1,
         stripe_session_id = null,
         reserved_until = clock_timestamp() + make_interval(mins => p_hold_minutes + 15)
   where id = v_red.id
   returning checkout_attempt into v_attempt;
  return v_attempt;
end;
$$;


--
-- Name: reserve_event_registration_with_voucher(uuid, uuid, text, uuid, text, integer, text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reserve_event_registration_with_voucher(p_event_id uuid, p_person_id uuid, p_primary_email text, p_ticket_type_id uuid, p_voucher_code text, p_guest_count integer, p_ticket_code text, p_hold_minutes integer DEFAULT 30, p_inviter_ticket_code text DEFAULT NULL::text) RETURNS TABLE(registration_id uuid, registration_status text, waitlist_position integer, redemption_id uuid, redemption_state text, unit_amount integer, quantity integer, base_total integer, discount_total integer, final_total integer, currency text, checkout_attempt integer, reused boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
declare
  v_now timestamptz := clock_timestamp();
  v_capacity integer;
  v_taken integer;
  v_ticket_taken integer;
  v_ticket public.event_ticket_types%rowtype;
  v_voucher public.event_vouchers%rowtype;
  v_qty integer := 1 + coalesce(p_guest_count, 0);
  v_base integer;
  v_discount integer;
  v_final integer;
  v_used integer;
  v_email_used integer;
  v_status text;
  v_wlpos integer;
  v_registration_id uuid;
  v_redemption_id uuid;
  v_checkout_attempt integer;
  v_existing public.event_registrations%rowtype;
  v_existing_redemption public.event_voucher_redemptions%rowtype;
  v_waitlist_promotion boolean := false;
  v_inviter_registration_id uuid;
begin
  if p_person_id is null or nullif(lower(btrim(p_primary_email)), '') is null then
    raise exception 'person and primary email are required' using errcode = '22023';
  end if;
  if p_guest_count is null or p_guest_count < 0 or p_guest_count > 19 then
    raise exception 'invalid guest count' using errcode = '22023';
  end if;
  if p_hold_minutes < 1 or p_hold_minutes > 60 then
    raise exception 'invalid hold duration' using errcode = '22023';
  end if;

  select e.capacity into v_capacity
    from public.events e where e.id = p_event_id for update;
  if not found then
    raise exception 'event not found' using errcode = 'P0002';
  end if;

  -- Release only abandoned pre-checkout holds. Once a Stripe session is
  -- attached, Stripe expiry or failure events own the release lifecycle so a
  -- delayed success webhook cannot lose a paid registration.
  with released as (
    update public.event_voucher_redemptions r
       set state = 'released', released_at = v_now,
           release_reason = coalesce(r.release_reason, 'hold_expired')
      from public.event_vouchers ev
     where r.voucher_id = ev.id and ev.event_id = p_event_id
       and r.state = 'reserved' and r.reserved_until <= v_now
       and r.stripe_session_id is null
    returning r.registration_id
  )
  update public.event_registrations er
     set status = 'cancelled'::public.registration_status,
         cancelled_at = v_now,
         cancellation_reason = 'payment_not_completed'
   where er.id in (select released.registration_id from released)
     and er.status = 'pending_payment'::public.registration_status;

  select * into v_ticket from public.event_ticket_types t
   where t.id = p_ticket_type_id and t.event_id = p_event_id and t.active = true;
  if not found then
    raise exception 'invalid ticket selection' using errcode = '22023';
  end if;
  if v_ticket.max_attendees is not null and v_qty > v_ticket.max_attendees then
    raise exception 'ticket attendee limit exceeded' using errcode = '22023';
  end if;

  select * into v_voucher from public.event_vouchers v
   where v.event_id = p_event_id and v.code = upper(btrim(p_voucher_code))
   for update;
  if not found then
    raise exception 'voucher_not_found' using errcode = 'P0002';
  end if;
  if not v_voucher.active or (v_voucher.starts_at is not null and v_now < v_voucher.starts_at)
     or (v_voucher.ends_at is not null and v_now >= v_voucher.ends_at) then
    raise exception 'voucher_inactive' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.event_voucher_ticket_types x
     where x.voucher_id = v_voucher.id and x.ticket_type_id = v_ticket.id
  ) then
    raise exception 'voucher_ineligible' using errcode = '22023';
  end if;

  if nullif(btrim(p_inviter_ticket_code), '') is not null then
    if not v_voucher.team_invite_enabled then
      raise exception 'invite_invalid' using errcode = '22023';
    end if;
    select er.id into v_inviter_registration_id
      from public.event_registrations er
      join public.event_ticket_types inviter_ticket on inviter_ticket.id = er.ticket_type_id
     where er.event_id = p_event_id
       and er.ticket_code = upper(btrim(p_inviter_ticket_code))
       and er.status in ('registered', 'attended')
       and er.review_classification <> 'spam'
       and er.voucher_id is null
       and (
         (er.amount_paid > 0 and nullif(btrim(er.stripe_payment_intent_id), '') is not null)
         or lower(btrim(inviter_ticket.name)) ~ '^(eo( {{CHAPTER_SUFFIX_REGEX}})? )?member$'
       );
    if not found then
      raise exception 'invite_invalid' using errcode = '22023';
    end if;
  end if;

  v_base := v_ticket.price_amount * v_qty;
  -- Round half up once at registration-total level, consistently for preview and charge.
  v_discount := ((v_base::bigint * v_voucher.discount_percent + 50) / 100)::integer;
  v_final := v_base - v_discount;

  select * into v_existing from public.event_registrations er
   where er.event_id = p_event_id and er.person_id = p_person_id
     and er.review_classification <> 'spam'
   for update;
  if found then
    if v_existing.invited_by_registration_id is distinct from v_inviter_registration_id then
      raise exception 'registration inviter cannot change' using errcode = '22023';
    end if;
    select * into v_existing_redemption from public.event_voucher_redemptions r
     where r.registration_id = v_existing.id for update;
    if found and v_existing_redemption.voucher_id = v_voucher.id
       and v_existing_redemption.state = 'reserved'
       and (v_existing_redemption.stripe_session_id is not null
         or v_existing_redemption.reserved_until > v_now)
       and v_existing.status = 'pending_payment'::public.registration_status
       and v_existing.ticket_type_id = v_ticket.id
       and v_existing.guest_count = p_guest_count then
      return query select v_existing.id, v_existing.status::text, v_existing.waitlist_position,
        v_existing_redemption.id, v_existing_redemption.state,
        v_existing.price_unit_amount, v_existing.price_quantity, v_existing.price_base_total,
        v_existing.price_discount_total, v_existing.price_final_total, v_existing.price_currency,
        v_existing_redemption.checkout_attempt, true;
      return;
    end if;
    if v_existing_redemption.id is null
       and v_existing.status = 'waitlisted'::public.registration_status then
      v_waitlist_promotion := true;
    elsif not (v_existing_redemption.voucher_id = v_voucher.id
      and v_existing_redemption.state = 'released'
      and v_existing.status = 'cancelled'::public.registration_status) then
      raise unique_violation using message = 'person is already registered for this event';
    end if;
    -- Snapshot rows are immutable. A released retry may only reuse the row when
    -- its original inputs and newly calculated price are identical.
    if not v_waitlist_promotion and
       (v_existing.ticket_type_id, v_existing.guest_count, v_existing.price_base_total,
        v_existing.price_discount_total, v_existing.price_final_total)
       is distinct from (v_ticket.id, p_guest_count, v_base, v_discount, v_final) then
      raise exception 'released checkout inputs changed; create a support-assisted registration'
        using errcode = '22023';
    end if;
  end if;

  select coalesce(sum(1 + er.guest_count), 0) into v_taken
    from public.event_registrations er
   where er.event_id = p_event_id
     and er.status in ('registered', 'attended', 'pending_payment')
     and er.review_classification <> 'spam';
  if v_capacity is not null and v_taken + v_qty > v_capacity then
    v_status := 'waitlisted';
    if v_waitlist_promotion then
      v_wlpos := v_existing.waitlist_position;
    else
      select coalesce(max(er.waitlist_position), 0) + 1 into v_wlpos
        from public.event_registrations er
       where er.event_id = p_event_id and er.status = 'waitlisted'
         and er.review_classification <> 'spam';
    end if;
    if v_existing.id is null then
      insert into public.event_registrations
        (event_id, person_id, status, waitlist_position, guest_count, ticket_type_id, ticket_code,
         invited_by_registration_id)
      values (p_event_id, p_person_id, 'waitlisted', v_wlpos, p_guest_count, v_ticket.id,
        p_ticket_code, v_inviter_registration_id)
      returning id into v_registration_id;
    else
      update public.event_registrations set status = 'waitlisted', waitlist_position = v_wlpos,
        cancelled_at = null, cancellation_reason = null where id = v_existing.id
      returning id into v_registration_id;
    end if;
    return query select v_registration_id, v_status, v_wlpos, null::uuid, null::text,
      v_ticket.price_amount, v_qty, v_base, v_discount, v_final, upper(v_ticket.currency),
      null::integer, false;
    return;
  end if;

  select coalesce(sum(1 + er.guest_count), 0) into v_ticket_taken
    from public.event_registrations er
   where er.event_id = p_event_id and er.ticket_type_id = v_ticket.id
     and er.status in ('registered', 'attended', 'pending_payment')
     and er.review_classification <> 'spam';
  if v_ticket.capacity is not null and v_ticket_taken + v_qty > v_ticket.capacity then
    v_status := 'waitlisted';
    if v_waitlist_promotion then
      v_wlpos := v_existing.waitlist_position;
    else
      select coalesce(max(er.waitlist_position), 0) + 1 into v_wlpos
        from public.event_registrations er
       where er.event_id = p_event_id and er.status = 'waitlisted'
         and er.review_classification <> 'spam';
    end if;
    if v_existing.id is null then
      insert into public.event_registrations
        (event_id, person_id, status, waitlist_position, guest_count, ticket_type_id, ticket_code,
         invited_by_registration_id)
      values (p_event_id, p_person_id, 'waitlisted', v_wlpos, p_guest_count, v_ticket.id,
        p_ticket_code, v_inviter_registration_id)
      returning id into v_registration_id;
    else
      update public.event_registrations set status = 'waitlisted', waitlist_position = v_wlpos,
        cancelled_at = null, cancellation_reason = null where id = v_existing.id
      returning id into v_registration_id;
    end if;
    return query select v_registration_id, v_status, v_wlpos, null::uuid, null::text,
      v_ticket.price_amount, v_qty, v_base, v_discount, v_final, upper(v_ticket.currency),
      null::integer, false;
    return;
  end if;

  select coalesce(sum(r.discounted_seat_quantity), 0) into v_used
    from public.event_voucher_redemptions r
    join public.event_registrations er on er.id = r.registration_id
   where r.voucher_id = v_voucher.id
     and er.review_classification <> 'spam'
     and (r.state = 'redeemed' or (r.state = 'reserved'
       and (r.stripe_session_id is not null or r.reserved_until > v_now)));
  if v_voucher.discounted_seat_limit is not null and v_used + v_qty > v_voucher.discounted_seat_limit then
    raise exception 'voucher_exhausted' using errcode = '22023';
  end if;
  select coalesce(sum(r.discounted_seat_quantity), 0) into v_email_used
    from public.event_voucher_redemptions r
    join public.event_registrations er on er.id = r.registration_id
   where r.voucher_id = v_voucher.id and r.primary_email = lower(btrim(p_primary_email))
     and er.review_classification <> 'spam'
     and (r.state = 'redeemed' or (r.state = 'reserved'
       and (r.stripe_session_id is not null or r.reserved_until > v_now)));
  if v_voucher.per_email_seat_limit is not null and v_email_used + v_qty > v_voucher.per_email_seat_limit then
    raise exception 'voucher_email_limit' using errcode = '22023';
  end if;

  v_status := case when v_final = 0 then 'registered' else 'pending_payment' end;
  if v_existing.id is null then
    insert into public.event_registrations
      (event_id, person_id, status, guest_count, ticket_type_id, ticket_code,
       voucher_id, voucher_code_snapshot, voucher_campaign_snapshot, voucher_percent_snapshot,
       price_unit_amount, price_quantity, price_base_total, price_discount_total,
       price_final_total, price_currency, confirmed_at, invited_by_registration_id)
    values
      (p_event_id, p_person_id, v_status::public.registration_status, p_guest_count, v_ticket.id,
       p_ticket_code, v_voucher.id, v_voucher.code, v_voucher.campaign_label,
       v_voucher.discount_percent, v_ticket.price_amount, v_qty, v_base, v_discount,
       v_final, upper(v_ticket.currency), case when v_final = 0 then v_now else null end,
       v_inviter_registration_id)
    returning id into v_registration_id;
  else
    update public.event_registrations set status = v_status::public.registration_status,
      waitlist_position = null, cancelled_at = null, cancellation_reason = null,
      guest_count = p_guest_count, ticket_type_id = v_ticket.id,
      ticket_code = case when v_waitlist_promotion then p_ticket_code else ticket_code end,
      voucher_id = v_voucher.id, voucher_code_snapshot = v_voucher.code,
      voucher_campaign_snapshot = v_voucher.campaign_label,
      voucher_percent_snapshot = v_voucher.discount_percent,
      price_unit_amount = v_ticket.price_amount, price_quantity = v_qty,
      price_base_total = v_base, price_discount_total = v_discount,
      price_final_total = v_final, price_currency = upper(v_ticket.currency),
      confirmed_at = case when v_final = 0 then v_now else null end
    where id = v_existing.id returning id into v_registration_id;
  end if;

  if v_existing_redemption.id is null then
    insert into public.event_voucher_redemptions as redemption
      (voucher_id, registration_id, primary_email, discounted_seat_quantity, state,
       reserved_until, voucher_code_snapshot, campaign_label_snapshot,
       discount_percent_snapshot, ticket_type_id_snapshot, ticket_name_snapshot,
       unit_amount_snapshot, base_total_snapshot, discount_total_snapshot,
       final_total_snapshot, currency_snapshot, redeemed_at)
    values
      (v_voucher.id, v_registration_id, lower(btrim(p_primary_email)), v_qty,
       case when v_final = 0 then 'redeemed' else 'reserved' end,
       case when v_final = 0 then null else v_now + make_interval(mins => p_hold_minutes + 15) end,
       v_voucher.code, v_voucher.campaign_label, v_voucher.discount_percent,
       v_ticket.id, v_ticket.name, v_ticket.price_amount, v_base, v_discount, v_final,
       upper(v_ticket.currency), case when v_final = 0 then v_now else null end)
    returning redemption.id, redemption.checkout_attempt into v_redemption_id, v_checkout_attempt;
  else
    update public.event_voucher_redemptions as redemption set state = 'reserved',
      reserved_until = v_now + make_interval(mins => p_hold_minutes + 15),
      checkout_attempt = redemption.checkout_attempt + 1,
      stripe_session_id = null, released_at = null, release_reason = null
    where id = v_existing_redemption.id
    returning redemption.id, redemption.checkout_attempt into v_redemption_id, v_checkout_attempt;
  end if;

  return query select v_registration_id, v_status, null::integer, v_redemption_id,
    case when v_final = 0 then 'redeemed' else 'reserved' end,
    v_ticket.price_amount, v_qty, v_base, v_discount, v_final, upper(v_ticket.currency),
    v_checkout_attempt, false;
end;
$_$;


--
-- Name: FUNCTION reserve_event_registration_with_voucher(p_event_id uuid, p_person_id uuid, p_primary_email text, p_ticket_type_id uuid, p_voucher_code text, p_guest_count integer, p_ticket_code text, p_hold_minutes integer, p_inviter_ticket_code text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.reserve_event_registration_with_voucher(p_event_id uuid, p_person_id uuid, p_primary_email text, p_ticket_type_id uuid, p_voucher_code text, p_guest_count integer, p_ticket_code text, p_hold_minutes integer, p_inviter_ticket_code text) IS 'Atomically reserves event capacity and eligible voucher inventory using immutable integer-cent snapshots and optional validated inviter attribution.';


--
-- Name: set_event_registration_inviter(uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_event_registration_inviter(p_registration_id uuid, p_event_id uuid, p_inviter_registration_id uuid, p_expected_inviter_registration_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  raise exception 'This inviter editor is outdated. Refresh the page and try again.'
    using errcode = '55000';
end;
$$;


--
-- Name: set_event_registration_inviter_person(uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_event_registration_inviter_person(p_registration_id uuid, p_event_id uuid, p_inviter_person_id uuid, p_expected_inviter_person_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_target public.event_registrations%rowtype;
begin
  select * into v_target
    from public.event_registrations
   where id = p_registration_id and event_id = p_event_id
   for update;
  if not found then
    raise exception 'Registration not found for this event' using errcode = '22023';
  end if;
  if v_target.person_id = p_inviter_person_id then
    raise exception 'A person cannot invite themselves' using errcode = '22023';
  end if;
  if v_target.review_classification = 'spam'
     or v_target.status in ('cancelled', 'no_show') then
    raise exception 'Only active, non-spam registrations can be attributed'
      using errcode = '22023';
  end if;
  if not exists (
    select 1
      from public.people person
     where person.id = p_inviter_person_id
       and (
         person.is_eo_staff = true
         or exists (
           select 1
             from public.chapter_memberships membership
             join public.chapters chapter on chapter.id = membership.chapter_id
            where membership.person_id = person.id
              and chapter.chapter_name = '{{CHAPTER_NAME}}'
              and membership.status in ('active', 'on_leave')
         )
       )
  ) then
    raise exception 'Inviter must be a current {{CHAPTER_NAME}} member or chapter staff'
      using errcode = '22023';
  end if;
  if v_target.invited_by_person_id is not distinct from p_inviter_person_id then
    raise exception 'This inviter is already selected' using errcode = '22023';
  end if;
  if v_target.invited_by_person_id is distinct from p_expected_inviter_person_id then
    return false;
  end if;

  update public.event_registrations
     set invited_by_person_id = p_inviter_person_id
   where id = p_registration_id;
  return true;
end;
$$;


--
-- Name: set_event_registration_review(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_event_registration_review(p_registration_id uuid, p_event_id uuid, p_classification text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_capacity integer;
  v_status text;
  v_guest_count integer;
  v_person_id uuid;
  v_voucher_id uuid;
  v_current_classification text;
  v_taken integer;
  v_voucher public.event_vouchers%rowtype;
  v_redemption public.event_voucher_redemptions%rowtype;
  v_used integer;
  v_email_used integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_classification not in ('normal', 'needs_review', 'spam') then
    raise exception 'invalid review classification %', p_classification;
  end if;

  select capacity into v_capacity
    from public.events
   where id = p_event_id
   for update;
  if not found then
    raise exception 'event % not found', p_event_id using errcode = 'P0002';
  end if;

  select status::text, guest_count, person_id, voucher_id, review_classification
    into v_status, v_guest_count, v_person_id, v_voucher_id, v_current_classification
    from public.event_registrations
   where id = p_registration_id
     and event_id = p_event_id;
  if not found then
    raise exception 'registration % not found', p_registration_id using errcode = 'P0002';
  end if;

  if p_classification <> 'spam' and exists (
    select 1
      from public.event_registrations er
     where er.event_id = p_event_id
       and er.person_id = v_person_id
       and er.id <> p_registration_id
       and er.review_classification <> 'spam'
  ) then
    raise exception 'A replacement registration already exists for this person and event'
      using errcode = 'P0001';
  end if;

  if p_classification <> 'spam'
     and v_capacity is not null
     and v_status in ('registered', 'attended', 'pending_payment') then
    select coalesce(sum(1 + er.guest_count), 0) into v_taken
      from public.event_registrations er
     where er.event_id = p_event_id
       and er.id <> p_registration_id
       and er.status in ('registered', 'attended', 'pending_payment')
       and er.review_classification <> 'spam';
    if v_taken + 1 + coalesce(v_guest_count, 0) > v_capacity then
      raise exception 'Not enough event capacity to restore this registration'
        using errcode = 'P0001';
    end if;
  end if;

  if v_current_classification = 'spam'
     and p_classification <> 'spam'
     and v_voucher_id is not null then
    select * into v_voucher
      from public.event_vouchers
     where id = v_voucher_id
     for update;
    select * into v_redemption
      from public.event_voucher_redemptions
     where registration_id = p_registration_id
     for update;

    if found and (
      v_redemption.state = 'redeemed'
      or (v_redemption.state = 'reserved' and (
        v_redemption.stripe_session_id is not null
        or v_redemption.reserved_until > v_now
      ))
    ) then
      select coalesce(sum(r.discounted_seat_quantity), 0) into v_used
        from public.event_voucher_redemptions r
        join public.event_registrations er on er.id = r.registration_id
       where r.voucher_id = v_voucher_id
         and r.registration_id <> p_registration_id
         and er.review_classification <> 'spam'
         and (r.state = 'redeemed' or (r.state = 'reserved' and (
           r.stripe_session_id is not null or r.reserved_until > v_now
         )));
      if v_voucher.discounted_seat_limit is not null
         and v_used + v_redemption.discounted_seat_quantity > v_voucher.discounted_seat_limit then
        raise exception 'Voucher capacity has been consumed by another registration'
          using errcode = 'P0001';
      end if;

      select coalesce(sum(r.discounted_seat_quantity), 0) into v_email_used
        from public.event_voucher_redemptions r
        join public.event_registrations er on er.id = r.registration_id
       where r.voucher_id = v_voucher_id
         and r.registration_id <> p_registration_id
         and r.primary_email = v_redemption.primary_email
         and er.review_classification <> 'spam'
         and (r.state = 'redeemed' or (r.state = 'reserved' and (
           r.stripe_session_id is not null or r.reserved_until > v_now
         )));
      if v_voucher.per_email_seat_limit is not null
         and v_email_used + v_redemption.discounted_seat_quantity > v_voucher.per_email_seat_limit then
        raise exception 'Voucher email limit has been consumed by another registration'
          using errcode = 'P0001';
      end if;
    end if;
  end if;

  update public.event_registrations
     set review_classification = p_classification
   where id = p_registration_id
     and event_id = p_event_id;
end;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: snapshot_standard_registration_price(uuid, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.snapshot_standard_registration_price(p_registration_id uuid, p_amount integer, p_currency text, p_stripe_session_id text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
declare
  v_reg public.event_registrations%rowtype;
  v_currency text := upper(btrim(coalesce(p_currency, '')));
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'paid checkout amount must be positive' using errcode = '22023';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'checkout currency must be a three-letter code' using errcode = '22023';
  end if;

  select * into v_reg
    from public.event_registrations
   where id = p_registration_id
   for update;
  if not found then
    raise exception 'registration not found' using errcode = 'P0002';
  end if;
  if v_reg.voucher_id is not null then
    raise exception 'registration is not an active standard checkout' using errcode = '22023';
  end if;
  if p_stripe_session_id is not null
     and v_reg.stripe_session_id is distinct from p_stripe_session_id then
    raise exception 'checkout does not match active registration' using errcode = '22023';
  end if;

  if v_reg.paid_at is not null then
    if p_stripe_session_id is null
       or v_reg.stripe_session_id is distinct from p_stripe_session_id
       or v_reg.price_final_total is distinct from p_amount
       or v_reg.price_currency is distinct from v_currency then
      raise exception 'completed payment provenance does not match' using errcode = '22023';
    end if;
    return true;
  end if;
  if v_reg.status <> 'pending_payment' then
    raise exception 'registration is not an active standard checkout' using errcode = '22023';
  end if;

  if v_reg.price_final_total is null and v_reg.price_currency is null then
    update public.event_registrations
       set price_final_total = p_amount,
           price_currency = v_currency
     where id = p_registration_id;
    return true;
  end if;
  if v_reg.price_final_total is distinct from p_amount
     or v_reg.price_currency is distinct from v_currency then
    raise exception 'released checkout amount or currency changed' using errcode = '22023';
  end if;
  return true;
end;
$_$;


--
-- Name: sprints_set_week(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sprints_set_week() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
begin
  new.week := case when new.starts_on is null then null else to_char(new.starts_on, 'IYYY-"W"IW') end;
  return new;
end;
$$;


--
-- Name: sync_event_registration_inviter_person(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_event_registration_inviter_person() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_inviter_person_id uuid;
  v_inviter_event_id uuid;
begin
  if new.invited_by_registration_id is not null and tg_op = 'INSERT' then
    select person_id, event_id
      into v_inviter_person_id, v_inviter_event_id
      from public.event_registrations
     where id = new.invited_by_registration_id;
    if not found or v_inviter_event_id <> new.event_id then
      raise exception 'Inviter registration must belong to the same event'
        using errcode = '22023';
    end if;
    new.invited_by_person_id := v_inviter_person_id;
  elsif new.invited_by_registration_id is not null
     and new.invited_by_registration_id is distinct from old.invited_by_registration_id then
    select person_id, event_id
      into v_inviter_person_id, v_inviter_event_id
      from public.event_registrations
     where id = new.invited_by_registration_id;
    if not found or v_inviter_event_id <> new.event_id then
      raise exception 'Inviter registration must belong to the same event'
        using errcode = '22023';
    end if;
    new.invited_by_person_id := v_inviter_person_id;
  end if;
  return new;
end;
$$;


--
-- Name: sync_people_membership(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_people_membership() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
declare
  pid uuid := coalesce(new.person_id, old.person_id);
  b   record;
begin
  select
    (array_agg(status order by (status = 'active') desc, start_date desc))[1]          as status,
    (array_agg(membership_type order by (status = 'active') desc, start_date desc))[1] as mt,
    min(start_date)                                                                     as first_start
  into b
  from chapter_memberships
  where person_id = pid and status in ('active', 'on_leave');

  if b.status is not null then
    update people set
      membership_status = case b.status
                            when 'active'   then 'active_member'::membership_status
                            when 'on_leave' then 'on_leave'::membership_status
                            else membership_status end,
      membership_type   = case b.mt
                            when 'Primary Membership'   then 'member'::membership_type
                            when 'Secondary Membership' then 'secondary_member'::membership_type
                            else membership_type end,
      member_since      = b.first_start,
      updated_at        = now()
    where id = pid;
  else
    -- no active/on-leave membership remains -> step a former member down to alumni
    update people set
      membership_status = case when membership_status in ('active_member', 'on_leave')
                               then 'alumni'::membership_status else membership_status end,
      updated_at        = now()
    where id = pid;
  end if;

  return null;
end $$;


--
-- Name: sync_person_primary_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_person_primary_email() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_owner uuid;
begin
  select pe.person_id
    into v_owner
    from public.person_emails pe
   where pe.email = new.email;

  if v_owner is not null and v_owner <> new.id then
    raise exception using
      errcode = '23505',
      message = 'person email ownership conflict',
      table = 'person_emails',
      constraint = 'person_emails_email_unique';
  end if;

  update public.person_emails
     set is_primary = false,
         updated_at = now()
   where person_id = new.id
     and is_primary
     and email <> new.email;

  if v_owner = new.id then
    update public.person_emails
       set is_primary = true,
           updated_at = now()
     where person_id = new.id
       and email = new.email;
  else
    insert into public.person_emails (person_id, email, is_primary, source)
    values (new.id, new.email, true, 'people.email');
  end if;

  return new;
end;
$$;


--
-- Name: tasks_children_follow_card(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tasks_children_follow_card() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
begin
  if new.parent_task_id is not null then
    return null;
  end if;
  if new.status in ('done', 'not_doing') then
    update public.tasks
       set status = new.status,
           completed_at = case when new.status = 'done' then coalesce(new.completed_at, now()) else null end
     where parent_task_id = new.id and status = 'open' and archived_at is null;
  elsif new.status = 'open' and old.status = 'not_doing' then
    update public.tasks
       set status = 'open', completed_at = null
     where parent_task_id = new.id and status = 'not_doing' and archived_at is null;
  end if;
  return null;
end;
$$;


--
-- Name: update_event_voucher_configuration(uuid, uuid, text, text, integer, timestamp with time zone, timestamp with time zone, integer, integer, boolean, text, uuid[], boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_event_voucher_configuration(p_event_id uuid, p_voucher_id uuid, p_code text, p_campaign_label text, p_discount_percent integer, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_discounted_seat_limit integer, p_per_email_seat_limit integer, p_active boolean, p_internal_notes text, p_eligible_ticket_ids uuid[], p_team_invite_enabled boolean, p_allow_rule_changes boolean) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_voucher public.event_vouchers%rowtype;
  v_has_history boolean;
  v_consumed integer;
  v_ticket_count integer;
begin
  select * into v_voucher from public.event_vouchers
   where id = p_voucher_id and event_id = p_event_id for update;
  if not found then
    raise exception 'voucher not found for this event' using errcode = 'P0002';
  end if;
  select exists (
    select 1 from public.event_voucher_redemptions where voucher_id = p_voucher_id
  ) into v_has_history;
  select coalesce(sum(r.discounted_seat_quantity), 0) into v_consumed
    from public.event_voucher_redemptions r
    join public.event_registrations er on er.id = r.registration_id
   where r.voucher_id = p_voucher_id and r.state in ('reserved', 'redeemed')
     and er.review_classification <> 'spam';

  if v_has_history and p_allow_rule_changes then
    raise exception 'voucher rules are locked after registration history exists' using errcode = '22023';
  end if;
  if v_has_history and p_discounted_seat_limit is not null and
     (v_voucher.discounted_seat_limit is null or p_discounted_seat_limit < v_consumed or
      p_discounted_seat_limit < v_voucher.discounted_seat_limit) then
    raise exception 'discounted seat limit cannot decrease after use' using errcode = '22023';
  end if;
  if v_has_history and p_per_email_seat_limit is not null and
     (v_voucher.per_email_seat_limit is null or
      p_per_email_seat_limit < v_voucher.per_email_seat_limit) then
    raise exception 'per-email seat limit cannot decrease after use' using errcode = '22023';
  end if;

  if p_allow_rule_changes then
    select count(*) into v_ticket_count from public.event_ticket_types
     where event_id = p_event_id and id = any(p_eligible_ticket_ids);
    if coalesce(array_length(p_eligible_ticket_ids, 1), 0) = 0 or
       v_ticket_count <> array_length(p_eligible_ticket_ids, 1) then
      raise exception 'every eligible ticket must belong to this event' using errcode = '22023';
    end if;
    if p_team_invite_enabled and array_length(p_eligible_ticket_ids, 1) <> 1 then
      raise exception 'team invitation vouchers must apply to exactly one ticket'
        using errcode = '22023';
    end if;
    update public.event_vouchers set
      code = upper(btrim(p_code)), campaign_label = p_campaign_label,
      discount_percent = p_discount_percent, starts_at = p_starts_at,
      ends_at = p_ends_at, discounted_seat_limit = p_discounted_seat_limit,
      per_email_seat_limit = p_per_email_seat_limit, active = p_active,
      internal_notes = p_internal_notes,
      team_invite_enabled = p_team_invite_enabled
    where id = p_voucher_id;
    delete from public.event_voucher_ticket_types where voucher_id = p_voucher_id;
    insert into public.event_voucher_ticket_types (voucher_id, ticket_type_id)
      select p_voucher_id, ticket_id from unnest(p_eligible_ticket_ids) as ticket_id;
  else
    if p_team_invite_enabled and (
      select count(*) from public.event_voucher_ticket_types
       where voucher_id = p_voucher_id
    ) <> 1 then
      raise exception 'team invitation vouchers must apply to exactly one ticket'
        using errcode = '22023';
    end if;
    update public.event_vouchers set
      campaign_label = p_campaign_label, ends_at = p_ends_at,
      discounted_seat_limit = p_discounted_seat_limit,
      per_email_seat_limit = p_per_email_seat_limit, active = p_active,
      internal_notes = p_internal_notes,
      team_invite_enabled = p_team_invite_enabled
    where id = p_voucher_id;
  end if;
  return true;
end;
$$;


--
-- Name: validate_event_payment_currency_approval(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_event_payment_currency_approval() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_batch public.event_payment_currency_reconciliation_batches%rowtype;
  v_evidence_count integer;
  v_manifest_fingerprint text;
begin
  select * into v_batch
    from public.event_payment_currency_reconciliation_batches
   where id = new.batch_id
   for update;
  if not found or v_batch.finalized_at is not null then
    raise exception 'currency reconciliation batch is not open'
      using errcode = '22023';
  end if;
  if new.approved_at > clock_timestamp() then
    raise exception 'currency reconciliation approval time cannot be in the future'
      using errcode = '22023';
  end if;

  select count(*) into v_evidence_count
    from public.event_payment_currency_reconciliation_evidence e
   where e.batch_id = new.batch_id;
  if v_evidence_count <> v_batch.expected_registration_count then
    raise exception 'cannot approve incomplete currency evidence: expected %, found %',
      v_batch.expected_registration_count, v_evidence_count using errcode = '22023';
  end if;

  select public.event_payment_currency_manifest_fingerprint(new.batch_id)
    into v_manifest_fingerprint;
  if v_manifest_fingerprint is distinct from v_batch.expected_manifest_fingerprint
     or new.manifest_fingerprint is distinct from v_manifest_fingerprint then
    raise exception 'approval fingerprint does not match the evidence manifest'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from public.event_payment_currency_reconciliation_approvals a
     where a.batch_id = new.batch_id
       and lower(btrim(a.approved_by)) = lower(btrim(new.approved_by))
  ) then
    raise exception 'platform and finance approvals require distinct owners'
      using errcode = '22023';
  end if;
  return new;
end;
$$;


--
-- Name: validate_event_voucher_ticket_type(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_event_voucher_ticket_type() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_voucher_event uuid;
  v_ticket_event uuid;
begin
  select event_id into v_voucher_event from public.event_vouchers where id = new.voucher_id;
  select event_id into v_ticket_event from public.event_ticket_types where id = new.ticket_type_id;
  if v_voucher_event is null or v_ticket_event is null or v_voucher_event <> v_ticket_event then
    raise exception 'voucher and ticket type must belong to the same event' using errcode = '23514';
  end if;
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_profile_id uuid NOT NULL,
    area public.access_area NOT NULL,
    can_edit boolean DEFAULT true NOT NULL,
    sponsor_person_id uuid,
    expires_at date NOT NULL,
    revoked_at timestamp with time zone,
    granted_by uuid,
    nda_version text,
    nda_accepted_at timestamp with time zone,
    nda_accepted_name text,
    nda_accepted_ip text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ad_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_accounts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    platform public.ad_platform NOT NULL,
    external_account_id text NOT NULL,
    name text NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    connected_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ad_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_campaigns (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    account_id uuid NOT NULL,
    external_campaign_id text,
    name text NOT NULL,
    objective text,
    channel_source public.channel_source,
    utm_campaign text,
    status text DEFAULT 'active'::text NOT NULL,
    budget_amount numeric,
    budget_type text,
    target_cpa numeric,
    target_roas numeric,
    flight_start date,
    flight_end date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    marketing_campaign_id uuid
);


--
-- Name: ad_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_insights (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    campaign_id uuid NOT NULL,
    date date NOT NULL,
    ad_set text,
    ad_name text,
    spend numeric DEFAULT 0 NOT NULL,
    impressions bigint DEFAULT 0 NOT NULL,
    clicks bigint DEFAULT 0 NOT NULL,
    conversions numeric DEFAULT 0 NOT NULL,
    video_views bigint DEFAULT 0 NOT NULL,
    engagements bigint DEFAULT 0 NOT NULL,
    reach bigint,
    currency text DEFAULT 'USD'::text NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    person_id uuid NOT NULL,
    company text,
    role text,
    industry text,
    revenue_bucket text,
    why text,
    status public.application_status DEFAULT 'pending'::public.application_status NOT NULL,
    hubspot_deal_id text,
    notes text,
    decided_at timestamp with time zone,
    decided_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    channel_source public.channel_source,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    referrer text,
    landing_path text
);


--
-- Name: ad_campaign_roi; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ad_campaign_roi WITH (security_invoker='true') AS
 SELECT c.id AS campaign_id,
    c.account_id,
    a.platform,
    c.name AS campaign_name,
    c.objective,
    c.channel_source,
    c.utm_campaign,
    c.budget_amount,
    c.target_cpa,
    c.flight_start,
    c.flight_end,
    COALESCE(spend.spend, (0)::numeric) AS spend,
    COALESCE(spend.impressions, (0)::numeric) AS impressions,
    COALESCE(spend.clicks, (0)::numeric) AS clicks,
    COALESCE(spend.conversions, (0)::numeric) AS platform_conversions,
    COALESCE(app.applications, (0)::bigint) AS applications,
    COALESCE(app.approved, (0)::bigint) AS approved_members,
        CASE
            WHEN (COALESCE(app.applications, (0)::bigint) > 0) THEN round((COALESCE(spend.spend, (0)::numeric) / (app.applications)::numeric), 2)
            ELSE NULL::numeric
        END AS cost_per_application,
        CASE
            WHEN (COALESCE(app.approved, (0)::bigint) > 0) THEN round((COALESCE(spend.spend, (0)::numeric) / (app.approved)::numeric), 2)
            ELSE NULL::numeric
        END AS cost_per_member,
        CASE
            WHEN (COALESCE(spend.impressions, (0)::numeric) > (0)::numeric) THEN round(((100.0 * spend.clicks) / spend.impressions), 2)
            ELSE NULL::numeric
        END AS ctr_pct,
        CASE
            WHEN (COALESCE(spend.clicks, (0)::numeric) > (0)::numeric) THEN round((spend.spend / spend.clicks), 2)
            ELSE NULL::numeric
        END AS cpc
   FROM (((public.ad_campaigns c
     JOIN public.ad_accounts a ON ((a.id = c.account_id)))
     LEFT JOIN ( SELECT ad_insights.campaign_id,
            sum(ad_insights.spend) AS spend,
            sum(ad_insights.impressions) AS impressions,
            sum(ad_insights.clicks) AS clicks,
            sum(ad_insights.conversions) AS conversions
           FROM public.ad_insights
          GROUP BY ad_insights.campaign_id) spend ON ((spend.campaign_id = c.id)))
     LEFT JOIN ( SELECT applications.utm_campaign,
            count(*) AS applications,
            count(*) FILTER (WHERE (applications.status = 'approved'::public.application_status)) AS approved
           FROM public.applications
          WHERE (applications.utm_campaign IS NOT NULL)
          GROUP BY applications.utm_campaign) app ON ((app.utm_campaign = c.utm_campaign)));


--
-- Name: ad_performance_daily; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ad_performance_daily WITH (security_invoker='true') AS
 SELECT i.campaign_id,
    i.date,
    c.name AS campaign_name,
    a.platform,
    sum(i.spend) AS spend,
    sum(i.impressions) AS impressions,
    sum(i.clicks) AS clicks,
    sum(i.conversions) AS conversions,
        CASE
            WHEN (sum(i.impressions) > (0)::numeric) THEN round(((100.0 * sum(i.clicks)) / sum(i.impressions)), 2)
            ELSE NULL::numeric
        END AS ctr_pct,
        CASE
            WHEN (sum(i.clicks) > (0)::numeric) THEN round((sum(i.spend) / sum(i.clicks)), 2)
            ELSE NULL::numeric
        END AS cpc,
        CASE
            WHEN (sum(i.impressions) > (0)::numeric) THEN round(((1000.0 * sum(i.spend)) / sum(i.impressions)), 2)
            ELSE NULL::numeric
        END AS cpm,
        CASE
            WHEN (sum(i.conversions) > (0)::numeric) THEN round((sum(i.spend) / sum(i.conversions)), 2)
            ELSE NULL::numeric
        END AS cpa
   FROM ((public.ad_insights i
     JOIN public.ad_campaigns c ON ((c.id = i.campaign_id)))
     JOIN public.ad_accounts a ON ((a.id = c.account_id)))
  GROUP BY i.campaign_id, i.date, c.name, a.platform;


--
-- Name: ai_calls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    site text NOT NULL,
    class text NOT NULL,
    provider text NOT NULL,
    model text NOT NULL,
    input_tokens integer,
    output_tokens integer,
    cache_read_tokens integer,
    cache_write_tokens integer,
    cost_usd numeric(12,6),
    latency_ms integer NOT NULL,
    prompt_version text NOT NULL,
    input_hash text NOT NULL,
    run_id uuid,
    ok boolean NOT NULL,
    error_kind text,
    CONSTRAINT ai_calls_class_check CHECK ((class = ANY (ARRAY['S'::text, 'C'::text, 'B'::text, 'A'::text]))),
    CONSTRAINT ai_calls_error_kind_check CHECK ((error_kind = ANY (ARRAY['refusal'::text, 'max_tokens'::text, 'timeout'::text, 'connection'::text, 'rate_limit'::text, 'api_error'::text, 'unknown'::text]))),
    CONSTRAINT ai_calls_provider_check CHECK ((provider = ANY (ARRAY['anthropic'::text, 'openrouter'::text, 'google'::text])))
);


--
-- Name: TABLE ai_calls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_calls IS 'One row per model call made by the ported routines and screens, with tokens and cost. edge8 kernel table.';


--
-- Name: approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_type text NOT NULL,
    subject_id text NOT NULL,
    requested_by uuid,
    approver_person_id uuid,
    approver_permission text,
    state text DEFAULT 'pending'::text NOT NULL,
    decided_by uuid,
    decided_at timestamp with time zone,
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT approvals_state_check CHECK ((state = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text]))),
    CONSTRAINT approvals_subject_id_check CHECK ((btrim(subject_id) <> ''::text)),
    CONSTRAINT approvals_subject_type_check CHECK ((btrim(subject_type) <> ''::text))
);


--
-- Name: TABLE approvals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.approvals IS 'Approval requests a routine parks on (a writer draft to publish, a broadcast to send). edge8 kernel table.';


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    record_id text,
    operation text NOT NULL,
    actor_label text,
    actor_person_id uuid,
    old_data jsonb,
    new_data jsonb,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE audit_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.audit_log IS 'Append-only trail of writes made through the ported edge8 screens and routines. edge8 kernel table.';


--
-- Name: automation_effects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automation_effects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    routine_id text NOT NULL,
    run_id uuid,
    kind text NOT NULL,
    status text NOT NULL,
    attempt integer DEFAULT 1 NOT NULL,
    claimed_at timestamp with time zone DEFAULT now() NOT NULL,
    done_at timestamp with time zone,
    provider_ref text,
    detail jsonb,
    summary text,
    CONSTRAINT automation_effects_kind_check CHECK ((kind = ANY (ARRAY['lark'::text, 'publish'::text, 'webhook'::text]))),
    CONSTRAINT automation_effects_shadow_key CHECK (((status = 'shadow'::text) = (key ~~ 'shadow:%'::text))),
    CONSTRAINT automation_effects_shadow_says_what CHECK (((status <> 'shadow'::text) OR (length(btrim(COALESCE(summary, ''::text))) > 0))),
    CONSTRAINT automation_effects_status_check CHECK ((status = ANY (ARRAY['claimed'::text, 'done'::text, 'released'::text, 'unknown'::text, 'shadow'::text]))),
    CONSTRAINT automation_effects_summary_length CHECK (((summary IS NULL) OR (length(summary) <= 500)))
);


--
-- Name: TABLE automation_effects; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.automation_effects IS 'Ledger that makes a routine''s outside effect (a Lark notice, a publish, a webhook) happen once. edge8 kernel table.';


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    subtitle text,
    excerpt text,
    blocks jsonb,
    external_url text,
    category text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    hero_image_url text,
    read_time_minutes integer,
    featured boolean DEFAULT false NOT NULL,
    author_name text,
    author_role text,
    series text,
    series_total integer,
    meta_title text,
    meta_description text,
    og_image_url text,
    canonical_url text,
    status public.blog_status DEFAULT 'draft'::public.blog_status NOT NULL,
    published_at timestamp with time zone,
    view_count integer DEFAULT 0 NOT NULL,
    last_viewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    primary_keyword text,
    secondary_keywords text[] DEFAULT '{}'::text[] NOT NULL,
    audience text DEFAULT 'public'::text NOT NULL,
    event_id uuid,
    marketing_content_id uuid,
    CONSTRAINT blog_posts_audience_check CHECK ((audience = ANY (ARRAY['public'::text, 'members'::text])))
);


--
-- Name: COLUMN blog_posts.event_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.event_id IS 'The event this post recaps. Tagging a post publishes a recap onto that event page.';


--
-- Name: COLUMN blog_posts.marketing_content_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.marketing_content_id IS 'The marketing calendar entry (marketing_content) whose publish wrote this post; null for posts made in /board/blogs.';


--
-- Name: board_appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_appointments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    person_id uuid NOT NULL,
    board_role_id uuid NOT NULL,
    "position" public.board_position,
    scope public.appointment_scope DEFAULT 'Local'::public.appointment_scope NOT NULL,
    fiscal_year_start integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: board_columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_columns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    board_id uuid NOT NULL,
    name text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    is_done boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    wip_limit integer,
    is_not_doing boolean DEFAULT false NOT NULL,
    CONSTRAINT board_columns_done_or_not_doing CHECK ((NOT (is_done AND is_not_doing))),
    CONSTRAINT board_columns_wip_limit_positive CHECK (((wip_limit IS NULL) OR (wip_limit > 0)))
);


--
-- Name: board_meetings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_meetings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meeting_on date NOT NULL,
    starts_at time without time zone DEFAULT '15:00:00'::time without time zone NOT NULL,
    ends_at time without time zone,
    location text,
    online_link text,
    fiscal_year_start integer NOT NULL,
    status text DEFAULT 'upcoming'::text NOT NULL,
    previous_minutes_approved boolean,
    minutes_md text,
    recording_url text,
    source text DEFAULT 'web'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT board_meetings_source_check CHECK ((source = ANY (ARRAY['web'::text, 'sheet_import'::text]))),
    CONSTRAINT board_meetings_status_check CHECK ((status = ANY (ARRAY['upcoming'::text, 'held'::text, 'cancelled'::text])))
);


--
-- Name: board_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    board_id uuid NOT NULL,
    person_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE board_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.board_members IS 'Who is on a Workboard (edge8 port). Unrelated to the board of directors (board_appointments).';


--
-- Name: board_prework_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_prework_responses (
    cycle text NOT NULL,
    user_id uuid NOT NULL,
    respondent_name text,
    answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    submitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT board_prework_responses_answers_check CHECK ((jsonb_typeof(answers) = 'object'::text))
);


--
-- Name: board_priorities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_priorities (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    board_appointment_id uuid NOT NULL,
    "position" integer NOT NULL,
    title text NOT NULL,
    detail text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    chapter_priority_id uuid,
    objective_id uuid,
    key_result_id uuid
);


--
-- Name: board_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_roles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    short_name text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: boards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.boards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    client_company_id uuid,
    owner_id uuid,
    status text DEFAULT 'active'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    archived_at timestamp with time zone,
    archived_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ai_program_id uuid
);


--
-- Name: TABLE boards; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.boards IS 'A Workboard (edge8 port): a kanban of cards. Unrelated to the board of directors (board_appointments).';


--
-- Name: COLUMN boards.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.boards.metadata IS 'Board settings; {"content_board": true} marks the board the marketing calendar syncs to.';


--
-- Name: book_chapters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book_chapters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    book_id uuid NOT NULL,
    sort_order integer NOT NULL,
    part text,
    title text NOT NULL,
    body_md text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.books (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id uuid NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    subtitle text,
    format text DEFAULT 'nonfiction'::text NOT NULL,
    audience text,
    description text,
    reader_path text,
    status text DEFAULT 'draft'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT books_format_check CHECK ((format = ANY (ARRAY['nonfiction'::text, 'fable'::text]))),
    CONSTRAINT books_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published_web'::text, 'published_amazon'::text])))
);


--
-- Name: brand_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id uuid NOT NULL,
    person_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: brand_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_profiles (
    brand_id uuid NOT NULL,
    positioning text,
    audience text,
    voice_md text,
    offer text,
    primary_cta text,
    content_rules_md text,
    updated_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    author_md text,
    rules_md text,
    channels_md text,
    process_md text,
    blog_styles_md text,
    editing_lens_md text,
    seo_lens_md text,
    image_style_md text,
    preferred_blog_types text[] DEFAULT '{}'::text[] NOT NULL,
    preferred_image_styles text[] DEFAULT '{}'::text[] NOT NULL,
    preferred_social_styles text[] DEFAULT '{}'::text[] NOT NULL,
    auto_publish boolean DEFAULT false NOT NULL
);


--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    primary_domain text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chapter_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapter_goals (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    fiscal_year_start integer NOT NULL,
    net_growth_target_pct numeric NOT NULL,
    risk_lapse_rate numeric DEFAULT 0.45 NOT NULL,
    source_note text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chapter_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapter_memberships (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    person_id uuid NOT NULL,
    chapter_id uuid NOT NULL,
    membership_type public.chapter_membership_type NOT NULL,
    status public.chapter_membership_status DEFAULT 'active'::public.chapter_membership_status NOT NULL,
    start_date date,
    end_date date,
    transfer_reason text,
    relationship_manager_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chapter_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapter_metrics (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    fiscal_year text NOT NULL,
    fiscal_year_start integer NOT NULL,
    president text,
    members integer,
    retention_pct numeric(5,2),
    revenue_usd integer,
    revenue_per_member_usd integer,
    forum_count integer,
    forum_health text,
    chapter_events integer,
    average_event_score numeric(3,1),
    end_of_year_reserves_usd integer,
    eo_grants_usd integer,
    sap_usd integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    dues_per_member_usd integer,
    initiation_fee_usd integer,
    dues_open boolean DEFAULT false NOT NULL,
    secondary_dues_usd integer,
    CONSTRAINT chapter_metrics_dues_per_member_usd_check CHECK (((dues_per_member_usd IS NULL) OR (dues_per_member_usd >= 0))),
    CONSTRAINT chapter_metrics_initiation_fee_usd_check CHECK (((initiation_fee_usd IS NULL) OR (initiation_fee_usd >= 0))),
    CONSTRAINT chapter_metrics_secondary_dues_usd_check CHECK (((secondary_dues_usd IS NULL) OR (secondary_dues_usd >= 0)))
);


--
-- Name: COLUMN chapter_metrics.dues_per_member_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chapter_metrics.dues_per_member_usd IS 'Local chapter dues per member (USD) for the fiscal year. The live FY''s revenue counts active members x this rate as dues.';


--
-- Name: COLUMN chapter_metrics.initiation_fee_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chapter_metrics.initiation_fee_usd IS 'One-time initiation fee per new member (USD) for the fiscal year. The live FY''s revenue counts it once for each member who joined that year.';


--
-- Name: COLUMN chapter_metrics.dues_open; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chapter_metrics.dues_open IS 'True for the fiscal year members currently pay dues for. The dues pages use the newest open year.';


--
-- Name: COLUMN chapter_metrics.secondary_dues_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chapter_metrics.secondary_dues_usd IS 'Secondary-chapter dues (USD) for the fiscal year.';


--
-- Name: chapter_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapter_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    uploaded_by uuid,
    uploaded_by_profile uuid,
    caption text,
    storage_path text NOT NULL,
    thumb_path text NOT NULL,
    width integer,
    height integer,
    size_bytes integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    uploader_email text,
    uploader_person_id uuid,
    email_matches_member boolean DEFAULT true NOT NULL,
    uploader_ip_hash text,
    via_public_upload boolean DEFAULT false NOT NULL,
    marketing_consent_at timestamp with time zone,
    marketing_consent_version text,
    CONSTRAINT chapter_photos_caption_check CHECK (((caption IS NULL) OR (char_length(caption) <= 500))),
    CONSTRAINT chapter_photos_height_check CHECK (((height IS NULL) OR (height > 0))),
    CONSTRAINT chapter_photos_marketing_consent_version_check CHECK (((marketing_consent_version IS NULL) OR (char_length(marketing_consent_version) <= 40))),
    CONSTRAINT chapter_photos_size_bytes_check CHECK (((size_bytes IS NULL) OR (size_bytes >= 0))),
    CONSTRAINT chapter_photos_uploader_email_check CHECK (((uploader_email IS NULL) OR (char_length(uploader_email) <= 320))),
    CONSTRAINT chapter_photos_width_check CHECK (((width IS NULL) OR (width > 0)))
);


--
-- Name: chapter_priorities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapter_priorities (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    fiscal_year_start integer NOT NULL,
    "position" integer NOT NULL,
    title text NOT NULL,
    detail text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chapters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapters (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    chapter_name text NOT NULL,
    region public.eo_region,
    area text,
    base_city text,
    base_state text,
    base_country text,
    language text,
    accelerator_program boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chatbot_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chatbot_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposed_by uuid NOT NULL,
    proposed_email text NOT NULL,
    tool text NOT NULL,
    input jsonb NOT NULL,
    summary text NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    before_state jsonb,
    result jsonb,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    decided_at timestamp with time zone,
    executed_at timestamp with time zone,
    CONSTRAINT chatbot_actions_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'confirmed'::text, 'executed'::text, 'failed'::text, 'cancelled'::text, 'expired'::text])))
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    slug text,
    industry text,
    website text,
    hubspot_company_id text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    employees integer,
    domain text,
    phone text,
    address text,
    address2 text,
    city text,
    country text,
    country_code text,
    sector text,
    description text,
    about_us text,
    status public.company_status DEFAULT 'Active'::public.company_status NOT NULL,
    founded date,
    fiscal_year text,
    fiscal_year_gross_revenue numeric,
    relationship_manager_id uuid,
    last_activity_at timestamp with time zone,
    operating_countries text[] DEFAULT '{}'::text[] NOT NULL,
    client_start_date date,
    client_end_date date,
    CONSTRAINT companies_fy_gross_revenue_nonneg CHECK (((fiscal_year_gross_revenue IS NULL) OR (fiscal_year_gross_revenue >= (0)::numeric))),
    CONSTRAINT companies_headcount_nonneg CHECK (((employees IS NULL) OR (employees >= 0)))
);


--
-- Name: COLUMN companies.client_start_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.companies.client_start_date IS 'edge8 client start date, read by marketing audiences; chapters have no clients, so it stays empty.';


--
-- Name: COLUMN companies.client_end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.companies.client_end_date IS 'edge8 client end date; empty for chapters.';


--
-- Name: company_revenue_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_revenue_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    fiscal_year text NOT NULL,
    revenue_usd numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: deal_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deal_kind text NOT NULL,
    deal_id uuid NOT NULL,
    author_profile_id uuid,
    met_on date NOT NULL,
    title text,
    body text NOT NULL,
    next_step text,
    source text DEFAULT 'web'::text NOT NULL,
    CONSTRAINT deal_notes_body_check CHECK (((btrim(body) <> ''::text) AND (char_length(body) <= 20000))),
    CONSTRAINT deal_notes_deal_kind_check CHECK ((deal_kind = ANY (ARRAY['sap'::text, 'prospect'::text]))),
    CONSTRAINT deal_notes_next_step_check CHECK (((next_step IS NULL) OR (char_length(next_step) <= 500))),
    CONSTRAINT deal_notes_source_check CHECK ((source = ANY (ARRAY['web'::text, 'connector'::text]))),
    CONSTRAINT deal_notes_title_check CHECK (((title IS NULL) OR (char_length(title) <= 200)))
);


--
-- Name: TABLE deal_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.deal_notes IS 'Meeting notes on an SAP deal (deal_kind sap, sap_deals.id) or a membership prospect (deal_kind prospect, deals.id), newest first on the deal page.';


--
-- Name: COLUMN deal_notes.met_on; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.deal_notes.met_on IS 'The day the meeting or call happened (chapter date).';


--
-- Name: COLUMN deal_notes.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.deal_notes.source IS 'Where the note was written: web (the deal page) or connector (an AI assistant through the site /api/mcp).';


--
-- Name: deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deals (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    person_id uuid,
    company_id uuid,
    name text NOT NULL,
    pipeline public.deal_pipeline NOT NULL,
    stage text NOT NULL,
    deal_status public.deal_status DEFAULT 'open'::public.deal_status NOT NULL,
    amount numeric,
    currency text DEFAULT 'USD'::text NOT NULL,
    close_date timestamp with time zone,
    relationship_manager_id uuid,
    primary_interest public.chapter_membership_type,
    channel_source public.channel_source,
    closed_lost_description public.closed_lost_description,
    closed_lost_reason text,
    closed_won_reason text,
    disqualification_reason public.disqualification_reason,
    disqualified_by text,
    global_dues numeric,
    membership_start_date date,
    membership_end_date date,
    description text,
    ql_financial_commitment boolean,
    ql_founder_controlling_owner boolean,
    ql_revenue_verified boolean,
    ql_time_commitment boolean,
    last_activity_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deals_amount_nonneg CHECK (((amount IS NULL) OR (amount >= (0)::numeric))),
    CONSTRAINT deals_global_dues_nonneg CHECK (((global_dues IS NULL) OR (global_dues >= (0)::numeric)))
);


--
-- Name: edge8_deals; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.edge8_deals WITH (security_invoker='true') AS
 SELECT id,
    person_id,
    company_id,
        CASE (deal_status)::text
            WHEN 'open'::text THEN 'open'::text
            WHEN 'closed_won'::text THEN 'won'::text
            ELSE 'lost'::text
        END AS status,
    NULL::timestamp with time zone AS archived_at,
    stage,
    created_at,
    updated_at
   FROM public.deals d
  WHERE ((pipeline)::text = 'Member Acquisition'::text);


--
-- Name: VIEW edge8_deals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.edge8_deals IS 'EO''s Member Acquisition deals in edge8''s shape (status open | won | lost), read by marketing audiences: a person with an open deal is a prospect.';


--
-- Name: email_agent_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_agent_skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    version integer NOT NULL,
    body_md text NOT NULL,
    note text,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_agent_skills_version_check CHECK ((version >= 1))
);


--
-- Name: email_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    brand_id uuid,
    audience_id uuid NOT NULL,
    from_email text,
    reply_to text,
    sources jsonb DEFAULT '[]'::jsonb NOT NULL,
    cadence_days integer DEFAULT 14 NOT NULL,
    send_hour smallint DEFAULT 8 NOT NULL,
    review_mode text DEFAULT 'sample'::text NOT NULL,
    sample_size integer DEFAULT 5 NOT NULL,
    max_words integer DEFAULT 150 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    CONSTRAINT email_agents_cadence_days_check CHECK (((cadence_days >= 1) AND (cadence_days <= 365))),
    CONSTRAINT email_agents_max_words_check CHECK (((max_words >= 20) AND (max_words <= 2000))),
    CONSTRAINT email_agents_review_mode_check CHECK ((review_mode = ANY (ARRAY['hold_all'::text, 'sample'::text]))),
    CONSTRAINT email_agents_sample_size_check CHECK (((sample_size >= 1) AND (sample_size <= 100))),
    CONSTRAINT email_agents_send_hour_check CHECK (((send_hour >= 0) AND (send_hour <= 23)))
);


--
-- Name: email_audiences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_audiences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    rules jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone
);


--
-- Name: email_campaign_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_campaign_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    person_id uuid NOT NULL,
    email text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    skip_reason text,
    resend_email_id text,
    error text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    claimed_at timestamp with time zone,
    send_after timestamp with time zone,
    CONSTRAINT email_campaign_recipients_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'claimed'::text, 'sent'::text, 'skipped'::text, 'failed'::text])))
);


--
-- Name: email_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_campaigns (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    marketing_campaign_id uuid,
    name text NOT NULL,
    subject text NOT NULL,
    channel_source public.channel_source DEFAULT 'Email Marketing'::public.channel_source,
    utm_campaign text,
    audience text,
    sent_at timestamp with time zone,
    recipients integer DEFAULT 0 NOT NULL,
    delivered integer DEFAULT 0 NOT NULL,
    opens integer DEFAULT 0 NOT NULL,
    clicks integer DEFAULT 0 NOT NULL,
    unsubscribes integer DEFAULT 0 NOT NULL,
    bounces integer DEFAULT 0 NOT NULL,
    conversions numeric DEFAULT 0 NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    preheader text,
    body_md text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    segment jsonb DEFAULT '{}'::jsonb NOT NULL,
    from_email text,
    reply_to text,
    batch_size integer DEFAULT 150 NOT NULL,
    scheduled_at timestamp with time zone,
    approved_at timestamp with time zone,
    approved_by text,
    created_by text,
    brand_id uuid,
    blocks jsonb DEFAULT '{}'::jsonb NOT NULL,
    agent_step text,
    agent_error text,
    agent_started_at timestamp with time zone,
    agent_notes jsonb DEFAULT '{}'::jsonb NOT NULL,
    summary_posted_at timestamp with time zone,
    audience_id uuid,
    series_id uuid,
    archived_at timestamp with time zone,
    archived_by text,
    CONSTRAINT email_campaigns_batch_size_check CHECK (((batch_size >= 1) AND (batch_size <= 1000))),
    CONSTRAINT email_campaigns_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'sending'::text, 'sent'::text, 'cancelled'::text, 'missed'::text])))
);


--
-- Name: COLUMN email_campaigns.recipients; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_campaigns.recipients IS 'Send statistic for rows from before the marketing system; for broadcasts sent through the marketing system, counts come from email_campaign_recipients and email_events.';


--
-- Name: COLUMN email_campaigns.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_campaigns.status IS 'Valid values: [draft, approved, sending, sent, cancelled, missed]. Rows from before the marketing system (source hubspot or wix) are past sends, marked sent.';


--
-- Name: email_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resend_email_id text NOT NULL,
    event_type text NOT NULL,
    recipient text NOT NULL,
    person_id uuid,
    campaign_id uuid,
    subject text,
    occurred_at timestamp with time zone NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    svix_id text,
    message_id uuid,
    CONSTRAINT email_events_type_check CHECK ((event_type = ANY (ARRAY['sent'::text, 'delivered'::text, 'delivery_delayed'::text, 'bounced'::text, 'complained'::text, 'opened'::text, 'clicked'::text, 'failed'::text])))
);


--
-- Name: email_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    person_id uuid NOT NULL,
    routine_run_id uuid,
    status text DEFAULT 'drafted'::text NOT NULL,
    hold_reason text,
    skip_reason text,
    subject text DEFAULT ''::text NOT NULL,
    body_md text DEFAULT ''::text NOT NULL,
    facts jsonb DEFAULT '[]'::jsonb NOT NULL,
    edited_at timestamp with time zone,
    approved_by text,
    approved_at timestamp with time zone,
    send_after timestamp with time zone,
    claimed_at timestamp with time zone,
    sent_at timestamp with time zone,
    resend_email_id text,
    error text,
    interaction_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_messages_status_check CHECK ((status = ANY (ARRAY['drafted'::text, 'held'::text, 'approved'::text, 'sending'::text, 'sent'::text, 'skipped'::text, 'cancelled'::text])))
);


--
-- Name: email_series; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_series (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    audience_id uuid NOT NULL,
    brand_id uuid,
    subject text DEFAULT ''::text NOT NULL,
    from_email text,
    reply_to text,
    time_zone text DEFAULT '{{TIME_ZONE}}'::text NOT NULL,
    draft_weekday smallint DEFAULT 1 NOT NULL,
    draft_hour smallint DEFAULT 8 NOT NULL,
    send_weekday smallint DEFAULT 3 NOT NULL,
    send_hour smallint DEFAULT 8 NOT NULL,
    batch_size integer DEFAULT 150 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    body_template text DEFAULT ''::text NOT NULL,
    CONSTRAINT email_series_batch_size_check CHECK (((batch_size >= 1) AND (batch_size <= 1000))),
    CONSTRAINT email_series_draft_hour_check CHECK (((draft_hour >= 0) AND (draft_hour <= 23))),
    CONSTRAINT email_series_draft_weekday_check CHECK (((draft_weekday >= 0) AND (draft_weekday <= 6))),
    CONSTRAINT email_series_send_hour_check CHECK (((send_hour >= 0) AND (send_hour <= 23))),
    CONSTRAINT email_series_send_weekday_check CHECK (((send_weekday >= 0) AND (send_weekday <= 6)))
);


--
-- Name: epics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    board_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    color text,
    status text DEFAULT 'active'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    archived_at timestamp with time zone,
    archived_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: event_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_name text NOT NULL,
    event_id uuid NOT NULL,
    subscriber text NOT NULL,
    ok boolean NOT NULL,
    error text,
    duration_ms integer,
    delivered_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE event_deliveries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.event_deliveries IS 'One row per event handed to one subscriber, and whether it succeeded. edge8 kernel table.';


--
-- Name: event_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_feedback (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    person_id uuid NOT NULL,
    rating_overall smallint,
    rating_speaker smallint,
    would_recommend boolean,
    comments text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    loved_text text,
    improve_text text,
    event_value_rating smallint,
    CONSTRAINT event_feedback_event_value_rating_check CHECK (((event_value_rating >= 1) AND (event_value_rating <= 5))),
    CONSTRAINT event_feedback_rating_overall_check CHECK (((rating_overall >= 1) AND (rating_overall <= 10))),
    CONSTRAINT event_feedback_rating_speaker_check CHECK (((rating_speaker >= 1) AND (rating_speaker <= 10)))
);


--
-- Name: COLUMN event_feedback.rating_overall; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.event_feedback.rating_overall IS 'Legacy FY2025/26 transformational-growth score (1-5). No longer written; kept for history only.';


--
-- Name: COLUMN event_feedback.event_value_rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.event_feedback.event_value_rating IS 'THE event rating: 1 Not valuable to 5 Extremely valuable, one row per event per person. Dashboards and chair goals read this column only.';


--
-- Name: event_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_materials (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    kind text NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    uploaded_by_person_id uuid,
    visible_to text DEFAULT 'registered'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_materials_kind_check CHECK ((kind = ANY (ARRAY['slides'::text, 'recording'::text, 'handout'::text, 'cert'::text, 'photos'::text, 'recap'::text]))),
    CONSTRAINT event_materials_visible_to_check CHECK ((visible_to = ANY (ARRAY['registered'::text, 'attended'::text, 'all'::text])))
);


--
-- Name: event_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_name text NOT NULL,
    dedupe_key text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    claimed_at timestamp with time zone,
    attempts integer DEFAULT 0 NOT NULL,
    published_at timestamp with time zone,
    last_error text,
    CONSTRAINT event_outbox_dedupe_key_check CHECK ((btrim(dedupe_key) <> ''::text)),
    CONSTRAINT event_outbox_event_name_check CHECK ((btrim(event_name) <> ''::text)),
    CONSTRAINT event_outbox_payload_check CHECK ((jsonb_typeof(payload) = 'object'::text))
);


--
-- Name: TABLE event_outbox; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.event_outbox IS 'Domain events (a card completed, a post published) waiting to reach their subscribers. edge8 kernel table.';


--
-- Name: event_payment_currency_reconciliation_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_payment_currency_reconciliation_approvals (
    batch_id uuid NOT NULL,
    approval_role text NOT NULL,
    approved_by text NOT NULL,
    manifest_fingerprint text NOT NULL,
    approved_at timestamp with time zone NOT NULL,
    CONSTRAINT event_payment_currency_reconciliatio_manifest_fingerprint_check CHECK ((manifest_fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT event_payment_currency_reconciliation_appro_approval_role_check CHECK ((approval_role = ANY (ARRAY['platform_owner'::text, 'finance_owner'::text]))),
    CONSTRAINT event_payment_currency_reconciliation_approva_approved_by_check CHECK ((NULLIF(btrim(approved_by), ''::text) IS NOT NULL))
);


--
-- Name: event_payment_currency_reconciliation_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_payment_currency_reconciliation_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cohort_label text NOT NULL,
    expected_registration_count integer NOT NULL,
    expected_manifest_fingerprint text NOT NULL,
    evidence_artifact_reference text NOT NULL,
    created_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    finalized_by text,
    finalized_at timestamp with time zone,
    CONSTRAINT event_payment_currency_recon_expected_manifest_fingerprin_check CHECK ((expected_manifest_fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT event_payment_currency_reconc_evidence_artifact_reference_check CHECK ((NULLIF(btrim(evidence_artifact_reference), ''::text) IS NOT NULL)),
    CONSTRAINT event_payment_currency_reconc_expected_registration_count_check CHECK ((expected_registration_count = 74)),
    CONSTRAINT event_payment_currency_reconciliation_batche_cohort_label_check CHECK ((NULLIF(btrim(cohort_label), ''::text) IS NOT NULL)),
    CONSTRAINT event_payment_currency_reconciliation_batches_check CHECK (((finalized_by IS NULL) = (finalized_at IS NULL))),
    CONSTRAINT event_payment_currency_reconciliation_batches_created_by_check CHECK ((NULLIF(btrim(created_by), ''::text) IS NOT NULL))
);


--
-- Name: event_payment_currency_reconciliation_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_payment_currency_reconciliation_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    registration_id uuid NOT NULL,
    amount_total integer NOT NULL,
    currency text NOT NULL,
    evidence_source text NOT NULL,
    source_system text NOT NULL,
    source_record_id text NOT NULL,
    source_payload_sha256 text NOT NULL,
    evidence_observed_at timestamp with time zone NOT NULL,
    payment_recorded_at timestamp with time zone,
    stripe_session_id text,
    stripe_payment_intent_id text,
    recorded_by text NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_payment_currency_reconciliati_source_payload_sha256_check CHECK ((source_payload_sha256 ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT event_payment_currency_reconciliation_ev_source_record_id_check CHECK ((NULLIF(btrim(source_record_id), ''::text) IS NOT NULL)),
    CONSTRAINT event_payment_currency_reconciliation_evi_evidence_source_check CHECK ((evidence_source = ANY (ARRAY['stripe_api'::text, 'stripe_export'::text, 'finance_ledger'::text, 'payment_import'::text]))),
    CONSTRAINT event_payment_currency_reconciliation_evide_source_system_check CHECK ((NULLIF(btrim(source_system), ''::text) IS NOT NULL)),
    CONSTRAINT event_payment_currency_reconciliation_eviden_amount_total_check CHECK ((amount_total > 0)),
    CONSTRAINT event_payment_currency_reconciliation_evidenc_recorded_by_check CHECK ((NULLIF(btrim(recorded_by), ''::text) IS NOT NULL)),
    CONSTRAINT event_payment_currency_reconciliation_evidence_check CHECK ((((evidence_source = ANY (ARRAY['stripe_api'::text, 'stripe_export'::text])) AND (stripe_session_id IS NOT NULL) AND (NULLIF(btrim(stripe_session_id), ''::text) IS NOT NULL) AND (stripe_payment_intent_id IS NOT NULL) AND (NULLIF(btrim(stripe_payment_intent_id), ''::text) IS NOT NULL) AND (payment_recorded_at IS NOT NULL)) OR ((evidence_source = ANY (ARRAY['finance_ledger'::text, 'payment_import'::text])) AND (stripe_session_id IS NULL) AND (stripe_payment_intent_id IS NULL)))),
    CONSTRAINT event_payment_currency_reconciliation_evidence_currency_check CHECK (((currency = upper(currency)) AND (currency = ANY (ARRAY['USD'::text, '{{LOCAL_CURRENCY}}'::text]))))
);


--
-- Name: event_payment_currency_repair_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_payment_currency_repair_audit (
    batch_id uuid NOT NULL,
    evidence_id uuid NOT NULL,
    registration_id uuid NOT NULL,
    old_amount_paid integer,
    new_amount_paid integer NOT NULL,
    old_price_final_total integer,
    new_price_final_total integer NOT NULL,
    old_price_currency text,
    new_price_currency text NOT NULL,
    old_stripe_session_id text,
    new_stripe_session_id text,
    old_stripe_payment_intent_id text,
    new_stripe_payment_intent_id text,
    old_paid_at timestamp with time zone,
    new_paid_at timestamp with time zone,
    was_changed boolean NOT NULL,
    executed_by text NOT NULL,
    executed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_payment_currency_repair_audit_executed_by_check CHECK ((NULLIF(btrim(executed_by), ''::text) IS NOT NULL))
);


--
-- Name: event_registration_attendees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_registration_attendees (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    registration_id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    company text,
    title text,
    food_allergy text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    age integer,
    photo_path text,
    photo_consent boolean DEFAULT false NOT NULL,
    role_in_company text,
    revenue_scale text,
    CONSTRAINT event_registration_attendees_age_range CHECK (((age IS NULL) OR ((age >= 0) AND (age <= 120)))),
    CONSTRAINT event_registration_attendees_photo_needs_consent CHECK (((photo_path IS NULL) OR (photo_consent = true))),
    CONSTRAINT event_registration_attendees_rise4_vetting_check CHECK (
CASE
    WHEN (role_in_company IS NULL) THEN (revenue_scale IS NULL)
    WHEN (role_in_company = ANY (ARRAY['Founder / Co-founder / Owner / Shareholder'::text, 'Key Executive'::text])) THEN ((company IS NOT NULL) AND (btrim(company) <> ''::text) AND (revenue_scale IS NOT NULL) AND (revenue_scale = ANY (ARRAY['Below $2,500'::text, '$2,500 to $1 million'::text, 'Above $1 million'::text])))
    WHEN (role_in_company = ANY (ARRAY['Strategic Alliance Partner (Sponsor)'::text, 'Company Staff'::text, 'Sponsor'::text])) THEN ((company IS NOT NULL) AND (btrim(company) <> ''::text) AND (revenue_scale IS NULL))
    WHEN (role_in_company = ANY (ARRAY['Chapter SLP'::text, 'EO Visiting Member'::text, 'SAP (Significant Life Partner of a chapter member)'::text])) THEN ((company IS NULL) AND (revenue_scale IS NULL))
    ELSE false
END)
);


--
-- Name: event_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_registrations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    person_id uuid NOT NULL,
    status public.registration_status DEFAULT 'registered'::public.registration_status NOT NULL,
    waitlist_position integer,
    guest_count integer DEFAULT 0 NOT NULL,
    confirmed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stripe_session_id text,
    stripe_payment_intent_id text,
    amount_paid integer,
    paid_at timestamp with time zone,
    ticket_id text DEFAULT public.generate_ticket_id() NOT NULL,
    ticket_type text,
    coupon_code text,
    ticket_code text,
    checked_in_at timestamp with time zone,
    confirmation_sent_at timestamp with time zone,
    ticket_type_id uuid,
    waiver_accepted_at timestamp with time zone,
    review_classification text DEFAULT 'normal'::text NOT NULL,
    voucher_id uuid,
    voucher_code_snapshot text,
    voucher_campaign_snapshot text,
    voucher_percent_snapshot integer,
    price_unit_amount integer,
    price_quantity integer,
    price_base_total integer,
    price_discount_total integer,
    price_final_total integer,
    price_currency text,
    invited_by_registration_id uuid,
    is_prospect boolean DEFAULT false NOT NULL,
    invited_by_person_id uuid,
    wants_tasting boolean DEFAULT false NOT NULL,
    wants_masterclass boolean DEFAULT false NOT NULL,
    channel_source public.channel_source,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    referrer text,
    landing_path text,
    referral_source text,
    CONSTRAINT event_registrations_amount_paid_nonnegative CHECK (((amount_paid IS NULL) OR (amount_paid >= 0))),
    CONSTRAINT event_registrations_paid_snapshot_present CHECK (((amount_paid IS NULL) OR ((price_final_total IS NOT NULL) AND (price_currency IS NOT NULL) AND (amount_paid = price_final_total)))),
    CONSTRAINT event_registrations_price_snapshot_valid CHECK (((num_nonnulls(price_unit_amount, price_quantity, price_base_total, price_discount_total, price_final_total, price_currency) = 0) OR ((num_nonnulls(price_unit_amount, price_quantity, price_base_total, price_discount_total) = 0) AND (voucher_id IS NULL) AND (price_final_total IS NOT NULL) AND (price_currency IS NOT NULL) AND (price_final_total >= 0) AND (price_currency ~ '^[A-Z]{3}$'::text)) OR ((num_nonnulls(price_unit_amount, price_quantity, price_base_total, price_discount_total, price_final_total, price_currency) = 6) AND (price_unit_amount >= 0) AND (price_quantity > 0) AND (price_base_total >= 0) AND (price_discount_total >= 0) AND (price_final_total >= 0) AND (price_base_total = (price_discount_total + price_final_total)) AND (price_currency ~ '^[A-Z]{3}$'::text)))),
    CONSTRAINT event_registrations_review_classification_check CHECK ((review_classification = ANY (ARRAY['normal'::text, 'needs_review'::text, 'spam'::text]))),
    CONSTRAINT event_registrations_voucher_percent_range CHECK (((voucher_percent_snapshot IS NULL) OR ((voucher_percent_snapshot >= 1) AND (voucher_percent_snapshot <= 100))))
);


--
-- Name: event_reminders_sent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_reminders_sent (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    person_id uuid NOT NULL,
    kind text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_reminders_sent_kind_check CHECK ((kind = ANY (ARRAY['t_minus_7'::text, 't_minus_1'::text, 'day_of'::text, 'post_event'::text])))
);


--
-- Name: event_ticket_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_ticket_types (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price_amount integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    capacity integer,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    max_attendees integer,
    CONSTRAINT event_ticket_types_capacity_nonneg CHECK (((capacity IS NULL) OR (capacity >= 0))),
    CONSTRAINT event_ticket_types_max_attendees_positive CHECK (((max_attendees IS NULL) OR (max_attendees > 0))),
    CONSTRAINT event_ticket_types_price_nonneg CHECK ((price_amount >= 0))
);


--
-- Name: event_voucher_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_voucher_redemptions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    voucher_id uuid NOT NULL,
    registration_id uuid NOT NULL,
    primary_email text NOT NULL,
    discounted_seat_quantity integer NOT NULL,
    state text NOT NULL,
    reserved_until timestamp with time zone,
    stripe_session_id text,
    checkout_attempt integer DEFAULT 1 NOT NULL,
    voucher_code_snapshot text NOT NULL,
    campaign_label_snapshot text NOT NULL,
    discount_percent_snapshot integer NOT NULL,
    ticket_type_id_snapshot uuid NOT NULL,
    ticket_name_snapshot text NOT NULL,
    unit_amount_snapshot integer NOT NULL,
    base_total_snapshot integer NOT NULL,
    discount_total_snapshot integer NOT NULL,
    final_total_snapshot integer NOT NULL,
    currency_snapshot text NOT NULL,
    redeemed_at timestamp with time zone,
    released_at timestamp with time zone,
    release_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_voucher_redemptions_amounts_valid CHECK (((unit_amount_snapshot >= 0) AND (base_total_snapshot >= 0) AND (discount_total_snapshot >= 0) AND (final_total_snapshot >= 0) AND (base_total_snapshot = (discount_total_snapshot + final_total_snapshot)) AND (currency_snapshot ~ '^[A-Z]{3}$'::text))),
    CONSTRAINT event_voucher_redemptions_checkout_attempt_positive CHECK ((checkout_attempt > 0)),
    CONSTRAINT event_voucher_redemptions_email_normalized CHECK ((primary_email = lower(btrim(primary_email)))),
    CONSTRAINT event_voucher_redemptions_percent_range CHECK (((discount_percent_snapshot >= 1) AND (discount_percent_snapshot <= 100))),
    CONSTRAINT event_voucher_redemptions_quantity_positive CHECK ((discounted_seat_quantity > 0)),
    CONSTRAINT event_voucher_redemptions_state_timestamps CHECK ((((state = 'reserved'::text) AND (reserved_until IS NOT NULL) AND (redeemed_at IS NULL) AND (released_at IS NULL)) OR ((state = 'redeemed'::text) AND (redeemed_at IS NOT NULL) AND (released_at IS NULL)) OR ((state = 'released'::text) AND (released_at IS NOT NULL) AND (redeemed_at IS NULL)))),
    CONSTRAINT event_voucher_redemptions_state_valid CHECK ((state = ANY (ARRAY['reserved'::text, 'redeemed'::text, 'released'::text])))
);


--
-- Name: event_voucher_ticket_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_voucher_ticket_types (
    voucher_id uuid NOT NULL,
    ticket_type_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: event_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_vouchers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    code text NOT NULL,
    campaign_label text NOT NULL,
    discount_percent integer NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    discounted_seat_limit integer,
    per_email_seat_limit integer,
    team_invite_enabled boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    internal_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_vouchers_active_window_order CHECK (((starts_at IS NULL) OR (ends_at IS NULL) OR (starts_at < ends_at))),
    CONSTRAINT event_vouchers_campaign_label_length CHECK ((char_length(campaign_label) <= 200)),
    CONSTRAINT event_vouchers_campaign_label_present CHECK ((btrim(campaign_label) <> ''::text)),
    CONSTRAINT event_vouchers_code_normalized CHECK (((code = upper(btrim(code))) AND (code ~ '^[A-Z0-9][A-Z0-9_-]{1,63}$'::text))),
    CONSTRAINT event_vouchers_discount_percent_range CHECK (((discount_percent >= 1) AND (discount_percent <= 100))),
    CONSTRAINT event_vouchers_discounted_seat_limit_positive CHECK (((discounted_seat_limit IS NULL) OR (discounted_seat_limit > 0))),
    CONSTRAINT event_vouchers_internal_notes_length CHECK (((internal_notes IS NULL) OR (char_length(internal_notes) <= 2000))),
    CONSTRAINT event_vouchers_per_email_seat_limit_positive CHECK (((per_email_seat_limit IS NULL) OR (per_email_seat_limit > 0)))
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    type public.event_type NOT NULL,
    status public.event_status DEFAULT 'draft'::public.event_status NOT NULL,
    visibility public.event_visibility DEFAULT 'members_only'::public.event_visibility NOT NULL,
    title text NOT NULL,
    blurb text,
    speaker text,
    location text,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone,
    capacity integer,
    cover_image_url text,
    featured boolean DEFAULT false NOT NULL,
    cta_label text,
    cta_href text,
    tag_label text,
    my_eo_group_id uuid,
    submitted_by_person_id uuid,
    approved_by_person_id uuid,
    approved_at timestamp with time zone,
    cancelled_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    price_amount integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    aggregate_rating numeric(3,1),
    survey_enabled boolean DEFAULT true NOT NULL,
    champion text,
    audience public.content_audience,
    allow_spouses boolean DEFAULT false NOT NULL,
    primary_keyword text,
    secondary_keywords text[] DEFAULT '{}'::text[] NOT NULL,
    recap_blocks jsonb,
    recap_published boolean DEFAULT false NOT NULL,
    slug text,
    scope public.event_scope DEFAULT 'local'::public.event_scope NOT NULL,
    collect_attendee_details boolean DEFAULT false NOT NULL,
    allow_guests boolean DEFAULT false NOT NULL,
    max_guests_per_member integer,
    guest_price_amount integer DEFAULT 0 NOT NULL,
    price_note text,
    recap_status text DEFAULT 'none'::text NOT NULL,
    recap_source_post_id uuid,
    recap_generated_at timestamp with time zone,
    recap_stats_snapshot jsonb,
    survey_sent_at timestamp with time zone,
    survey_sent_count integer,
    CONSTRAINT events_aggregate_rating_check CHECK (((aggregate_rating IS NULL) OR ((aggregate_rating >= (0)::numeric) AND (aggregate_rating <= (10)::numeric)))),
    CONSTRAINT events_guest_price_amount_nonneg CHECK ((guest_price_amount >= 0)),
    CONSTRAINT events_max_guests_per_member_nonneg CHECK (((max_guests_per_member IS NULL) OR (max_guests_per_member >= 0))),
    CONSTRAINT events_price_amount_nonneg CHECK ((price_amount >= 0)),
    CONSTRAINT events_recap_status_check CHECK ((recap_status = ANY (ARRAY['none'::text, 'due'::text, 'published'::text, 'failed'::text])))
);


--
-- Name: COLUMN events.aggregate_rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.aggregate_rating IS 'Unused legacy column. Event ratings live in event_feedback.event_value_rating.';


--
-- Name: COLUMN events.price_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.price_note IS 'Display-only fee label shown in place of the computed price on the public event page (e.g. "US$800/person"). Does not affect RSVP/checkout, which is driven solely by price_amount / ticket types. Use for fees collected offline (bank transfer).';


--
-- Name: COLUMN events.recap_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.recap_status IS 'Recap workflow state: none, due (event ended, awaiting a tagged post), published, failed (generation error).';


--
-- Name: COLUMN events.recap_source_post_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.recap_source_post_id IS 'The blog post the current recap was generated from.';


--
-- Name: COLUMN events.recap_stats_snapshot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.recap_stats_snapshot IS 'Stats and testimonials frozen at generation time. Refreshed only on regeneration.';


--
-- Name: COLUMN events.survey_sent_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.survey_sent_at IS 'When the automatic post-event survey email went out (null = not sent yet).';


--
-- Name: COLUMN events.survey_sent_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.survey_sent_count IS 'How many people the automatic post-event survey email was sent to.';


--
-- Name: forum_constitutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_constitutions (
    forum_id uuid NOT NULL,
    file_name text NOT NULL,
    storage_path text NOT NULL,
    content_type text,
    size_bytes integer,
    uploaded_by uuid,
    uploaded_by_name text,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT forum_constitutions_file_name_check CHECK (((char_length(file_name) >= 1) AND (char_length(file_name) <= 200))),
    CONSTRAINT forum_constitutions_size_bytes_check CHECK (((size_bytes IS NULL) OR (size_bytes >= 0)))
);


--
-- Name: forums; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forums (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    chapter_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: global_event_participation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_event_participation (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    person_id uuid NOT NULL,
    status public.global_event_participation_status DEFAULT 'going'::public.global_event_participation_status NOT NULL,
    created_by_profile_id uuid,
    updated_by_profile_id uuid,
    removed_by_profile_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    removed_at timestamp with time zone,
    CONSTRAINT global_event_participation_removal_audit_complete CHECK (((removed_at IS NOT NULL) OR (removed_by_profile_id IS NULL)))
);

ALTER TABLE ONLY public.global_event_participation FORCE ROW LEVEL SECURITY;


--
-- Name: inquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inquiries (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    person_id uuid,
    kind public.inquiry_kind NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind text NOT NULL,
    subject text,
    body text,
    person_id uuid,
    company_id uuid,
    owner_id uuid,
    subject_type text,
    subject_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    category text,
    CONSTRAINT interactions_category_check CHECK (((category IS NULL) OR (category = ANY (ARRAY['workboard'::text, 'one_on_one'::text, 'goals'::text, 'reviews'::text, 'onboarding'::text, 'people_ops'::text, 'client'::text, 'marketing'::text, 'account'::text, 'other'::text]))))
);


--
-- Name: TABLE interactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.interactions IS 'One message sent to or received from a person by the platform (broadcast deliveries, notices). edge8 kernel table.';


--
-- Name: issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    diagnosis text DEFAULT 'system'::text NOT NULL,
    key_result_id uuid,
    filed_by text NOT NULL,
    assignee_person_id uuid,
    status text DEFAULT 'open'::text NOT NULL,
    notes_md text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    CONSTRAINT issues_diagnosis_check CHECK ((diagnosis = ANY (ARRAY['goal'::text, 'system'::text, 'execution'::text]))),
    CONSTRAINT issues_status_check CHECK ((status = ANY (ARRAY['open'::text, 'solving'::text, 'solved'::text, 'dropped'::text])))
);


--
-- Name: key_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.key_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid NOT NULL,
    title text NOT NULL,
    target_value numeric,
    current_value numeric DEFAULT 0 NOT NULL,
    unit text,
    direction text DEFAULT 'up'::text NOT NULL,
    delivery_mix text DEFAULT 'human'::text NOT NULL,
    accountable_person_id uuid NOT NULL,
    executing_agent text,
    source text DEFAULT 'manual'::text NOT NULL,
    source_detail text,
    status text DEFAULT 'on_track'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT key_results_delivery_mix_check CHECK ((delivery_mix = ANY (ARRAY['human'::text, 'ai'::text, 'blended'::text]))),
    CONSTRAINT key_results_direction_check CHECK ((direction = ANY (ARRAY['up'::text, 'down'::text]))),
    CONSTRAINT key_results_source_check CHECK ((source = ANY (ARRAY['agent'::text, 'manual'::text]))),
    CONSTRAINT key_results_status_check CHECK ((status = ANY (ARRAY['on_track'::text, 'at_risk'::text, 'off_track'::text, 'done'::text])))
);


--
-- Name: kr_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kr_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_result_id uuid NOT NULL,
    week_start date NOT NULL,
    value numeric,
    note_md text,
    author_kind text NOT NULL,
    author_agent text,
    author_person_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kr_logs_author_kind_check CHECK ((author_kind = ANY (ARRAY['agent'::text, 'human'::text]))),
    CONSTRAINT kr_logs_author_required CHECK ((((author_kind = 'agent'::text) AND (author_agent IS NOT NULL)) OR ((author_kind = 'human'::text) AND (author_person_id IS NOT NULL))))
);


--
-- Name: long_term_plan_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.long_term_plan_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_key text NOT NULL,
    label text NOT NULL,
    unit text NOT NULL,
    fiscal_year_start integer NOT NULL,
    period_label text NOT NULL,
    value_numeric numeric,
    value_text text,
    entry text DEFAULT 'input'::text NOT NULL,
    note text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT long_term_plan_metrics_entry_check CHECK ((entry = ANY (ARRAY['calculated'::text, 'input'::text, 'staff'::text]))),
    CONSTRAINT long_term_plan_metrics_one_value CHECK (((value_numeric IS NOT NULL) OR (value_text IS NOT NULL))),
    CONSTRAINT long_term_plan_metrics_unit_check CHECK ((unit = ANY (ARRAY['count'::text, 'percent'::text, 'usd'::text, 'text'::text])))
);


--
-- Name: long_term_plan_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.long_term_plan_statements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    section text NOT NULL,
    pillar text,
    item_no integer NOT NULL,
    part_no integer DEFAULT 1 NOT NULL,
    title text,
    body text NOT NULL,
    year_accomplished text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT long_term_plan_statements_pillar_check CHECK ((pillar = ANY (ARRAY['leadership'::text, 'operational_excellence'::text, 'member_value'::text, 'growth'::text]))),
    CONSTRAINT long_term_plan_statements_pillar_required CHECK (((section = 'pillar'::text) = (pillar IS NOT NULL))),
    CONSTRAINT long_term_plan_statements_section_check CHECK ((section = ANY (ARRAY['vision'::text, 'pillar'::text, 'resource'::text])))
);


--
-- Name: marketing_asset_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_asset_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entry_id uuid NOT NULL,
    url text NOT NULL,
    prompt_used text,
    model text,
    is_selected boolean DEFAULT false NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketing_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_campaigns (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    slug text,
    objective text,
    status text DEFAULT 'active'::text NOT NULL,
    utm_campaign text,
    fiscal_year integer,
    planned_budget numeric,
    target_leads integer,
    target_members integer,
    target_cpa numeric,
    owner text,
    starts_on date,
    ends_on date,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    brand_id uuid,
    pillar_id uuid,
    seo_geo_md text,
    created_by text,
    idea text,
    writer_step text,
    writer_started_at timestamp with time zone,
    writer_error text,
    CONSTRAINT marketing_campaigns_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'done'::text, 'archived'::text]))),
    CONSTRAINT marketing_campaigns_writer_step_check CHECK (((writer_step IS NULL) OR (writer_step = ANY (ARRAY['draft'::text, 'edit'::text, 'seo'::text, 'exhibits'::text, 'hero'::text, 'links'::text, 'assemble'::text, 'validate'::text, 'ready'::text, 'publish'::text, 'channels'::text, 'done'::text]))))
);


--
-- Name: social_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_posts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    marketing_campaign_id uuid,
    platform text NOT NULL,
    external_post_id text,
    url text,
    posted_at timestamp with time zone,
    format text,
    impressions bigint DEFAULT 0 NOT NULL,
    reach bigint,
    engagements bigint DEFAULT 0 NOT NULL,
    clicks bigint DEFAULT 0 NOT NULL,
    video_views bigint DEFAULT 0 NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: web_traffic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.web_traffic (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    date date NOT NULL,
    channel_source public.channel_source,
    utm_campaign text,
    landing_path text,
    sessions integer DEFAULT 0 NOT NULL,
    pageviews integer DEFAULT 0 NOT NULL,
    unique_visitors integer DEFAULT 0 NOT NULL,
    bounce_rate numeric,
    avg_session_seconds integer,
    conversions numeric DEFAULT 0 NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketing_campaign_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.marketing_campaign_summary WITH (security_invoker='true') AS
 SELECT mc.id,
    mc.name,
    mc.slug,
    mc.objective,
    mc.status,
    mc.fiscal_year,
    mc.planned_budget,
    mc.target_members,
    mc.target_cpa,
    mc.utm_campaign,
    mc.starts_on AS start_date,
    mc.ends_on AS end_date,
    COALESCE(paid.spend, (0)::numeric) AS paid_spend,
    COALESCE(paid.impressions, (0)::numeric) AS paid_impressions,
    COALESCE(paid.clicks, (0)::numeric) AS paid_clicks,
    COALESCE(em.sends, (0)::bigint) AS emails_sent,
    COALESCE(em.opens, (0)::bigint) AS email_opens,
    COALESCE(em.clicks, (0)::bigint) AS email_clicks,
    COALESCE(so.impressions, (0)::numeric) AS social_impressions,
    COALESCE(so.engagements, (0)::numeric) AS social_engagements,
    COALESCE(wt.sessions, (0)::bigint) AS web_sessions,
    COALESCE(app.applications, (0)::bigint) AS applications,
    COALESCE(app.approved, (0)::bigint) AS members,
        CASE
            WHEN (COALESCE(app.approved, (0)::bigint) > 0) THEN round((COALESCE(paid.spend, (0)::numeric) / (app.approved)::numeric), 2)
            ELSE NULL::numeric
        END AS cost_per_member
   FROM (((((public.marketing_campaigns mc
     LEFT JOIN ( SELECT ac.marketing_campaign_id AS mcid,
            sum(i.spend) AS spend,
            sum(i.impressions) AS impressions,
            sum(i.clicks) AS clicks
           FROM (public.ad_campaigns ac
             JOIN public.ad_insights i ON ((i.campaign_id = ac.id)))
          WHERE (ac.marketing_campaign_id IS NOT NULL)
          GROUP BY ac.marketing_campaign_id) paid ON ((paid.mcid = mc.id)))
     LEFT JOIN ( SELECT email_campaigns.marketing_campaign_id AS mcid,
            sum(email_campaigns.recipients) AS sends,
            sum(email_campaigns.opens) AS opens,
            sum(email_campaigns.clicks) AS clicks
           FROM public.email_campaigns
          WHERE (email_campaigns.marketing_campaign_id IS NOT NULL)
          GROUP BY email_campaigns.marketing_campaign_id) em ON ((em.mcid = mc.id)))
     LEFT JOIN ( SELECT social_posts.marketing_campaign_id AS mcid,
            sum(social_posts.impressions) AS impressions,
            sum(social_posts.engagements) AS engagements
           FROM public.social_posts
          WHERE (social_posts.marketing_campaign_id IS NOT NULL)
          GROUP BY social_posts.marketing_campaign_id) so ON ((so.mcid = mc.id)))
     LEFT JOIN ( SELECT web_traffic.utm_campaign,
            sum(web_traffic.sessions) AS sessions
           FROM public.web_traffic
          WHERE (web_traffic.utm_campaign IS NOT NULL)
          GROUP BY web_traffic.utm_campaign) wt ON ((wt.utm_campaign = mc.utm_campaign)))
     LEFT JOIN ( SELECT applications.utm_campaign,
            count(*) AS applications,
            count(*) FILTER (WHERE (applications.status = 'approved'::public.application_status)) AS approved
           FROM public.applications
          WHERE (applications.utm_campaign IS NOT NULL)
          GROUP BY applications.utm_campaign) app ON ((app.utm_campaign = mc.utm_campaign)));


--
-- Name: marketing_channel_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_channel_metrics (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    platform text NOT NULL,
    channel_source public.channel_source,
    metric text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    value numeric NOT NULL,
    unit text DEFAULT 'count'::text NOT NULL,
    yoy_pct numeric,
    source text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketing_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    brand_id uuid,
    pillar text,
    channel text NOT NULL,
    status text DEFAULT 'idea'::text NOT NULL,
    publish_date date,
    parent_id uuid,
    copy_md text,
    asset_url text,
    notes text,
    sort_order double precision DEFAULT 0 NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pillar_id uuid,
    posted_url text,
    blog_style text,
    image_type text,
    seo_md text,
    image_brief_md text,
    image_style text,
    social_style text,
    image_url text,
    broadcast_id uuid,
    campaign_id uuid,
    slug text,
    title_tag text,
    meta_description text,
    excerpt text,
    primary_keyword text,
    category text,
    category_slug text,
    read_time text,
    published_at timestamp with time zone,
    body_html text,
    ai_search_question text,
    attributes_best_guess boolean DEFAULT false NOT NULL,
    CONSTRAINT marketing_calendar_image_type_check CHECK (((image_type IS NULL) OR (image_type = ANY (ARRAY['real'::text, 'ai'::text, 'mixed'::text, 'none'::text])))),
    CONSTRAINT marketing_content_channel_check CHECK ((channel = ANY (ARRAY['blog'::text, 'email'::text, 'linkedin'::text, 'facebook'::text, 'twitter'::text]))),
    CONSTRAINT marketing_content_status_check CHECK ((status = ANY (ARRAY['idea'::text, 'drafted'::text, 'approved'::text, 'scheduled'::text, 'published'::text, 'skipped'::text])))
);


--
-- Name: marketing_pillars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_pillars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id uuid NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketing_recaps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_recaps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    period_month date NOT NULL,
    readout text NOT NULL,
    suggestions jsonb DEFAULT '[]'::jsonb NOT NULL,
    metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    model text,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mcp_tool_calls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mcp_tool_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_profile_id uuid NOT NULL,
    client_id text NOT NULL,
    portfolio text,
    tool text NOT NULL,
    subject_ids text[] DEFAULT '{}'::text[] NOT NULL,
    result_count integer,
    outcome text NOT NULL,
    latency_ms integer NOT NULL,
    CONSTRAINT mcp_tool_calls_client_id_check CHECK ((btrim(client_id) <> ''::text)),
    CONSTRAINT mcp_tool_calls_latency_ms_check CHECK ((latency_ms >= 0)),
    CONSTRAINT mcp_tool_calls_outcome_check CHECK ((outcome = ANY (ARRAY['ok'::text, 'refused'::text, 'invalid'::text, 'error'::text]))),
    CONSTRAINT mcp_tool_calls_result_count_check CHECK ((result_count >= 0)),
    CONSTRAINT mcp_tool_calls_tool_check CHECK ((btrim(tool) <> ''::text))
);


--
-- Name: TABLE mcp_tool_calls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mcp_tool_calls IS 'One tool call made through the chapter connector (the site /api/mcp) by one person from one app, read or write, with the record ids it named and how it ended; never what it returned.';


--
-- Name: COLUMN mcp_tool_calls.user_profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mcp_tool_calls.user_profile_id IS 'The person the connector token belongs to (user_profiles.id), the person the call ran as.';


--
-- Name: COLUMN mcp_tool_calls.client_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mcp_tool_calls.client_id IS 'The OAuth client (the app: Claude, ChatGPT, Grok) the token was issued to, as Supabase Auth names it.';


--
-- Name: COLUMN mcp_tool_calls.portfolio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mcp_tool_calls.portfolio IS 'The ?portfolio= filter the connection was made with; null when none.';


--
-- Name: COLUMN mcp_tool_calls.subject_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mcp_tool_calls.subject_ids IS 'Record ids (uuid-shaped values) the call named in its input, in order; never names or text.';


--
-- Name: COLUMN mcp_tool_calls.result_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mcp_tool_calls.result_count IS 'How many records the call returned; null for a write or a single record.';


--
-- Name: COLUMN mcp_tool_calls.outcome; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mcp_tool_calls.outcome IS 'ok, refused (no such tool for this person, or outside their reach), invalid (input failed validation or the tool refused it), error.';


--
-- Name: meeting_agenda_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_agenda_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meeting_id uuid NOT NULL,
    kind text NOT NULL,
    issue_id uuid,
    title text NOT NULL,
    details_md text,
    outcome_md text,
    status text DEFAULT 'planned'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    added_by_person_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT meeting_agenda_items_kind_check CHECK ((kind = ANY (ARRAY['issue'::text, 'announcement'::text]))),
    CONSTRAINT meeting_agenda_items_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'discussed'::text, 'deferred'::text])))
);


--
-- Name: meeting_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meeting_id uuid NOT NULL,
    person_id uuid NOT NULL,
    score smallint NOT NULL,
    went_well text,
    change_next_time text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT meeting_ratings_score_check CHECK (((score >= 1) AND (score <= 10)))
);


--
-- Name: meeting_update_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_update_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    update_id uuid NOT NULL,
    author_person_id uuid,
    author_label text,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: meeting_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meeting_id uuid NOT NULL,
    board_role_id uuid NOT NULL,
    person_id uuid,
    body_md text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: member_companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_id uuid NOT NULL,
    company_id uuid NOT NULL,
    role public.member_company_role NOT NULL,
    title text,
    ownership_pct numeric(5,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT member_companies_ownership_pct_check CHECK (((ownership_pct >= (0)::numeric) AND (ownership_pct <= (100)::numeric)))
);


--
-- Name: member_event_attendance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.member_event_attendance WITH (security_invoker='true') AS
 WITH attendance_evidence AS (
         SELECT er.event_id,
            er.person_id,
            COALESCE(er.checked_in_at, e.starts_at) AS attended_at,
            'registration'::text AS attendance_source,
            e.title AS event_title,
            e.starts_at AS event_starts_at,
            e.status AS event_status,
            e.type AS event_type,
            e.scope AS event_scope,
            1 AS source_priority
           FROM (public.event_registrations er
             JOIN public.events e ON ((e.id = er.event_id)))
          WHERE ((er.review_classification <> 'spam'::text) AND ((er.status = 'attended'::public.registration_status) OR (er.checked_in_at IS NOT NULL)))
        UNION ALL
         SELECT gep.event_id,
            gep.person_id,
            e.starts_at AS attended_at,
            'global_cohort'::text AS attendance_source,
            e.title AS event_title,
            e.starts_at AS event_starts_at,
            e.status AS event_status,
            e.type AS event_type,
            e.scope AS event_scope,
            2 AS source_priority
           FROM (public.global_event_participation gep
             JOIN public.events e ON ((e.id = gep.event_id)))
          WHERE ((gep.status = 'attended'::public.global_event_participation_status) AND (gep.removed_at IS NULL))
        ), ranked_attendance AS (
         SELECT ae.event_id,
            ae.person_id,
            ae.attended_at,
            ae.attendance_source,
            ae.event_title,
            ae.event_starts_at,
            ae.event_status,
            ae.event_type,
            ae.event_scope,
            ae.source_priority,
            row_number() OVER (PARTITION BY ae.event_id, ae.person_id ORDER BY ae.source_priority, ae.attended_at, ae.attendance_source) AS evidence_rank
           FROM attendance_evidence ae
        )
 SELECT event_id,
    person_id,
    attended_at,
    attendance_source,
    event_title,
    event_starts_at,
    event_status,
    event_type,
    event_scope
   FROM ranked_attendance
  WHERE (evidence_rank = 1);


--
-- Name: member_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_photos (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    person_id uuid NOT NULL,
    url text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    caption text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: member_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_person_id uuid NOT NULL,
    related_person_id uuid NOT NULL,
    relationship_type public.member_relationship_type NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT member_relationships_check CHECK ((member_person_id <> related_person_id))
);


--
-- Name: member_renewals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_renewals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_id uuid NOT NULL,
    cycle text NOT NULL,
    status public.renewal_status DEFAULT 'pending'::public.renewal_status NOT NULL,
    completed_at timestamp with time zone,
    consent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: member_requalifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_requalifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_id uuid NOT NULL,
    fiscal_year_start integer NOT NULL,
    confirmed_name text,
    confirmed_email text,
    confirmed_phone text,
    confirmed_company text,
    revenue_2025 numeric,
    employee_count integer,
    biggest_challenge text,
    exited_over_8m boolean,
    exit_details text,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    ownership_pct numeric
);


--
-- Name: member_signal_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_signal_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_id uuid NOT NULL,
    signal text NOT NULL,
    note text NOT NULL,
    set_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT member_signal_overrides_signal_check CHECK ((signal = ANY (ARRAY['healthy'::text, 'value_risk'::text, 'drifting'::text, 'at_risk'::text, 'quiet'::text])))
);


--
-- Name: my_eo_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.my_eo_groups (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    host_member_id uuid,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: newsletters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletters (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    summary text,
    sent_at timestamp with time zone NOT NULL,
    brevo_url text,
    audience text DEFAULT 'members'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    slug text NOT NULL,
    subtitle text,
    status text DEFAULT 'published'::text NOT NULL,
    hero_image_url text,
    blocks jsonb,
    CONSTRAINT newsletters_audience_check CHECK ((audience = ANY (ARRAY['public'::text, 'members'::text]))),
    CONSTRAINT newsletters_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))
);


--
-- Name: notification_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind text NOT NULL,
    channel text NOT NULL,
    recipient text NOT NULL,
    person_id uuid,
    subject text NOT NULL,
    message jsonb NOT NULL,
    urgency text DEFAULT 'normal'::text NOT NULL,
    reason text NOT NULL,
    dedupe_key text NOT NULL,
    deliver_after timestamp with time zone NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    sent_at timestamp with time zone,
    carried_by text,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_queue_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT notification_queue_channel_check CHECK ((channel = ANY (ARRAY['lark_dm'::text, 'lark_chat'::text, 'email'::text]))),
    CONSTRAINT notification_queue_dedupe_key_check CHECK ((btrim(dedupe_key) <> ''::text)),
    CONSTRAINT notification_queue_kind_check CHECK ((btrim(kind) <> ''::text)),
    CONSTRAINT notification_queue_message_check CHECK ((jsonb_typeof(message) = 'object'::text)),
    CONSTRAINT notification_queue_reason_check CHECK ((reason = ANY (ARRAY['digest'::text, 'held'::text]))),
    CONSTRAINT notification_queue_recipient_check CHECK ((btrim(recipient) <> ''::text)),
    CONSTRAINT notification_queue_sent_says_when CHECK (((status = 'sent'::text) = (sent_at IS NOT NULL))),
    CONSTRAINT notification_queue_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'sent'::text, 'skipped'::text, 'failed'::text]))),
    CONSTRAINT notification_queue_subject_check CHECK ((btrim(subject) <> ''::text)),
    CONSTRAINT notification_queue_urgency_check CHECK ((urgency = ANY (ARRAY['normal'::text, 'urgent'::text])))
);


--
-- Name: TABLE notification_queue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_queue IS 'Notices held through quiet hours or waiting for a morning digest. edge8 kernel table.';


--
-- Name: objectives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objectives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    year integer NOT NULL,
    quarter text,
    level text DEFAULT 'company'::text NOT NULL,
    office text,
    brand text,
    strategy_id uuid,
    parent_kr_id uuid,
    title text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    owner_person_id uuid,
    owner_agent text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT objectives_level_check CHECK ((level = ANY (ARRAY['company'::text, 'office'::text, 'executor'::text]))),
    CONSTRAINT objectives_office_check CHECK ((office = ANY (ARRAY['leadership'::text, 'operational_excellence'::text, 'member_value'::text, 'growth'::text]))),
    CONSTRAINT objectives_status_check CHECK ((status = ANY (ARRAY['active'::text, 'done'::text, 'dropped'::text])))
);


--
-- Name: people; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.people (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    name text,
    phone text,
    city text,
    source_site text DEFAULT 'website'::text NOT NULL,
    hubspot_contact_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    membership_status public.membership_status,
    membership_type public.membership_type,
    company_id uuid,
    member_since date,
    first_name text,
    last_name text,
    bio text,
    crm_id text,
    country text,
    country_code text,
    channel_source public.channel_source,
    lifecycle_stage public.lifecycle_stage,
    primary_interest public.chapter_membership_type,
    secondary_interest public.chapter_membership_type,
    member_health_status public.member_health_status,
    personal_interest public.personal_interest,
    is_slp boolean DEFAULT false NOT NULL,
    slp_partner_id uuid,
    is_eo_staff boolean DEFAULT false NOT NULL,
    relationship_manager_id uuid,
    last_activity_at timestamp with time zone,
    forum_id uuid,
    forum_status public.forum_placement_status,
    whatsapp_phone text,
    lead_status text,
    hs_primary_interest text,
    headline text,
    preferred_name text,
    gender text,
    date_of_birth date,
    marketing_consent text DEFAULT 'never_asked'::text NOT NULL,
    marketing_consent_at timestamp with time zone,
    marketing_consent_source text,
    do_not_contact boolean DEFAULT false NOT NULL,
    lark_dm_opt_out boolean DEFAULT false NOT NULL,
    persona text,
    timezone text DEFAULT '{{TIME_ZONE}}'::text NOT NULL,
    archived_at timestamp with time zone,
    archived_by text,
    full_name text GENERATED ALWAYS AS (NULLIF(btrim(name), ''::text)) STORED,
    display_name text GENERATED ALWAYS AS (COALESCE(NULLIF(btrim(preferred_name), ''::text), NULLIF(btrim(first_name), ''::text), NULLIF(btrim(name), ''::text))) STORED,
    is_team_member boolean GENERATED ALWAYS AS (COALESCE(is_eo_staff, false)) STORED,
    source text,
    forum_placed_on date,
    forum_clock_start_on date,
    CONSTRAINT people_email_normalized_check CHECK (((email = lower(email)) AND (email <> ''::text) AND (email !~ '^[[:space:]]|[[:space:]]$'::text))),
    CONSTRAINT people_marketing_consent_check CHECK ((marketing_consent = ANY (ARRAY['subscribed'::text, 'unsubscribed'::text, 'never_asked'::text])))
);


--
-- Name: COLUMN people.membership_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.people.membership_status IS 'Derived from chapter_memberships by trigger (migration 117). Do not write directly; change chapter_memberships instead.';


--
-- Name: COLUMN people.lead_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.people.lead_status IS 'HubSpot Lead Status (verbatim).';


--
-- Name: COLUMN people.hs_primary_interest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.people.hs_primary_interest IS 'HubSpot Primary Interest verbatim (e.g. Membership / Key Exec). The primary_interest enum mirrors this where it maps to Primary/Secondary Membership.';


--
-- Name: COLUMN people.gender; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.people.gender IS 'Self-identified gender. Free text (e.g. male / female / non-binary). Nullable.';


--
-- Name: COLUMN people.marketing_consent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.people.marketing_consent IS 'Valid values: [subscribed, unsubscribed, never_asked]. Whether this person may receive marketing broadcasts. Written by the unsubscribe link and the Brevo import.';


--
-- Name: COLUMN people.do_not_contact; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.people.do_not_contact IS 'Never send this person any broadcast, whatever their consent.';


--
-- Name: COLUMN people.lark_dm_opt_out; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.people.lark_dm_opt_out IS 'The person asked not to receive Lark direct messages from the platform.';


--
-- Name: COLUMN people.timezone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.people.timezone IS 'IANA time zone for send windows. Defaults to the chapter time zone.';


--
-- Name: COLUMN people.full_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.people.full_name IS 'edge8 name for people.name (generated).';


--
-- Name: COLUMN people.display_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.people.display_name IS 'edge8 display name: preferred_name, else first_name, else name (generated).';


--
-- Name: COLUMN people.is_team_member; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.people.is_team_member IS 'edge8 name for people.is_eo_staff (generated).';


--
-- Name: COLUMN people.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.people.source IS 'edge8 name for how the person reached the chapter: channel_source, else source_site. Filled by people_fill_source().';


--
-- Name: COLUMN people.forum_placed_on; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.people.forum_placed_on IS 'Day the member started in their forum. Feeds the Forum goal (days from joining to placement).';


--
-- Name: COLUMN people.forum_clock_start_on; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.people.forum_clock_start_on IS 'Start of the forum placement clock when it is not the membership start, e.g. a member returning from leave.';


--
-- Name: person_companies; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.person_companies WITH (security_invoker='true') AS
 SELECT id,
    person_id,
    company_id,
    (role)::text AS role,
    title,
    true AS is_primary,
    ownership_pct,
    NULL::date AS start_date,
    NULL::date AS end_date,
    created_at,
    updated_at
   FROM public.member_companies mc;


--
-- Name: VIEW person_companies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.person_companies IS 'edge8 name and shape for EO''s member_companies (who owns or runs which company), read by marketing audiences.';


--
-- Name: person_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_id uuid NOT NULL,
    email text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    label text,
    source text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT person_emails_email_normalized_check CHECK (((email = lower(email)) AND (email <> ''::text) AND (email !~ '^[[:space:]]|[[:space:]]$'::text)))
);

ALTER TABLE ONLY public.person_emails FORCE ROW LEVEL SECURITY;


--
-- Name: revenue_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revenue_verifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    person_id uuid,
    email text NOT NULL,
    verification_type text,
    gross_revenue text,
    fiscal_year_end text,
    entity_type text,
    ownership_pct text,
    signature text,
    printed_name text,
    association text,
    form_date text,
    phone text,
    address text,
    city text,
    state_region text,
    zip_code text,
    file_names text[] DEFAULT '{}'::text[] NOT NULL,
    lark_folder_token text,
    lark_folder_url text,
    lark_status public.lark_upload_status DEFAULT 'pending'::public.lark_upload_status NOT NULL,
    lark_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    file_paths text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: routine_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routine_config (
    routine_id text NOT NULL,
    mode text DEFAULT 'live'::text NOT NULL,
    paused_reason text,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT routine_config_mode_check CHECK ((mode = ANY (ARRAY['live'::text, 'paused'::text, 'shadow'::text]))),
    CONSTRAINT routine_config_paused_says_why CHECK (((mode <> 'paused'::text) OR (length(btrim(COALESCE(paused_reason, ''::text))) > 0)))
);


--
-- Name: TABLE routine_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.routine_config IS 'Per-routine run mode (live, paused, shadow). edge8 kernel table.';


--
-- Name: routine_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routine_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    routine_id text NOT NULL,
    host text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    duration_ms integer,
    summary text,
    result jsonb,
    error text,
    log text,
    ai_calls integer DEFAULT 0 NOT NULL,
    ai_input_tokens bigint DEFAULT 0 NOT NULL,
    ai_output_tokens bigint DEFAULT 0 NOT NULL,
    ai_cache_read_tokens bigint DEFAULT 0 NOT NULL,
    ai_cache_write_tokens bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tick_key text,
    mode text DEFAULT 'live'::text NOT NULL,
    attempt integer DEFAULT 1 NOT NULL,
    workflow_run_id text,
    step_deadline_at timestamp with time zone,
    CONSTRAINT routine_runs_host_check CHECK ((host = ANY (ARRAY['vercel'::text, 'mac-mini'::text]))),
    CONSTRAINT routine_runs_mode_check CHECK ((mode = ANY (ARRAY['shadow'::text, 'live'::text]))),
    CONSTRAINT routine_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'waiting'::text, 'ok'::text, 'skipped'::text, 'error'::text, 'died'::text])))
);


--
-- Name: TABLE routine_runs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.routine_runs IS 'One row per scheduled routine (cron) execution, with its outcome and AI usage. edge8 kernel table.';


--
-- Name: sap_deal_stage_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_deal_stage_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    from_status public.sap_deal_status,
    to_status public.sap_deal_status NOT NULL,
    from_stage public.sap_pipeline_stage,
    to_stage public.sap_pipeline_stage,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_deals (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    status public.sap_deal_status DEFAULT 'lead'::public.sap_deal_status NOT NULL,
    deal_type public.sap_deal_type,
    amount_usd integer DEFAULT 0 NOT NULL,
    discount_note text,
    deal_owner text,
    introduced_by text,
    motivation text,
    notes text,
    last_contact_at date,
    next_followup_at date,
    hubspot_deal_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    referred_by_person_id uuid,
    closed_won_at date,
    pipeline_stage public.sap_pipeline_stage,
    cash_usd integer,
    in_kind_usd integer,
    stage_changed_at timestamp with time zone,
    next_step text,
    CONSTRAINT sap_deals_amount_nonneg CHECK ((amount_usd >= 0)),
    CONSTRAINT sap_deals_cash_nonneg CHECK ((((cash_usd IS NULL) OR (cash_usd >= 0)) AND ((in_kind_usd IS NULL) OR (in_kind_usd >= 0))))
);


--
-- Name: short_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.short_links (
    code text NOT NULL,
    target_path text NOT NULL,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    active boolean DEFAULT true NOT NULL,
    clicks integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT short_links_code_check CHECK ((code ~ '^[a-z0-9][a-z0-9-]{1,39}$'::text)),
    CONSTRAINT short_links_target_path_check CHECK ((target_path ~ '^/($|[^/])'::text))
);


--
-- Name: sprints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sprints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    board_id uuid NOT NULL,
    name text NOT NULL,
    goal text,
    starts_on date,
    ends_on date,
    status text DEFAULT 'active'::text NOT NULL,
    closed_at timestamp with time zone,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    meeting_id uuid,
    focus_improvement text,
    going_well text,
    meeting_summary text,
    week text,
    locked_at timestamp with time zone
);


--
-- Name: strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strategies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    year integer NOT NULL,
    title text NOT NULL,
    body_md text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: survey_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_answers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    response_id uuid NOT NULL,
    field_id uuid NOT NULL,
    value text,
    value_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: survey_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_fields (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    survey_id uuid NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    type public.survey_field_type NOT NULL,
    label text NOT NULL,
    help_text text,
    required boolean DEFAULT false NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    legacy_map text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: survey_response_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_response_topics (
    response_id uuid NOT NULL,
    topic text NOT NULL
);


--
-- Name: survey_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_responses (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    survey_id uuid NOT NULL,
    person_id uuid,
    external_id text,
    rating smallint,
    comment text,
    will_renew boolean,
    network_id text,
    payload jsonb,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    imported_from text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    respondent_name text,
    respondent_email text,
    CONSTRAINT survey_responses_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: surveys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.surveys (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    kind public.survey_kind NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status public.survey_status DEFAULT 'draft'::public.survey_status NOT NULL,
    intro_text text,
    thank_you_text text,
    audience public.content_audience
);


--
-- Name: taggables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.taggables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tag_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    label text NOT NULL,
    color text,
    kind text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: task_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    kind text NOT NULL,
    storage_path text,
    filename text,
    mime_type text,
    size_bytes bigint,
    width integer,
    height integer,
    url text,
    title text,
    uploaded_by uuid,
    confirmed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    archived_by uuid,
    CONSTRAINT task_attachments_height_check CHECK (((height IS NULL) OR (height > 0))),
    CONSTRAINT task_attachments_kind_check CHECK ((kind = ANY (ARRAY['file'::text, 'link'::text]))),
    CONSTRAINT task_attachments_kind_shape CHECK ((((kind = 'file'::text) AND (storage_path IS NOT NULL) AND (filename IS NOT NULL) AND (url IS NULL)) OR ((kind = 'link'::text) AND (url IS NOT NULL) AND (storage_path IS NULL) AND (filename IS NULL) AND (confirmed_at IS NOT NULL)))),
    CONSTRAINT task_attachments_size_bytes_check CHECK (((size_bytes IS NULL) OR (size_bytes >= 0))),
    CONSTRAINT task_attachments_url_check CHECK (((url IS NULL) OR (url ~* '^https?://'::text))),
    CONSTRAINT task_attachments_width_check CHECK (((width IS NULL) OR (width > 0)))
);


--
-- Name: task_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    author_person_id uuid,
    author_label text NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_comment_id uuid,
    resolved_at timestamp with time zone,
    resolved_by_person_id uuid,
    resolved_by_label text,
    mentions uuid[] DEFAULT '{}'::uuid[] NOT NULL
);


--
-- Name: task_stage_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_stage_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    from_column_id uuid,
    to_column_id uuid,
    from_sprint_id uuid,
    to_sprint_id uuid,
    kind text DEFAULT 'move'::text NOT NULL,
    moved_by uuid,
    note text,
    moved_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'open'::text NOT NULL,
    due_date date,
    completed_at timestamp with time zone,
    assignee_id uuid,
    created_by uuid,
    person_id uuid,
    company_id uuid,
    deal_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    board_id uuid,
    board_column_id uuid,
    sprint_id uuid,
    "position" double precision DEFAULT 0 NOT NULL,
    priority text DEFAULT 'p3'::text NOT NULL,
    internal boolean DEFAULT false NOT NULL,
    subject_type text,
    subject_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    archived_at timestamp with time zone,
    archived_by text,
    parent_task_id uuid,
    human_tokens numeric(6,2),
    epic_id uuid
);


--
-- Name: TABLE tasks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tasks IS 'A Workboard card or subtask (edge8 port). EO''s original task columns (person_id, company_id, deal_id) remain and are optional.';


--
-- Name: COLUMN tasks.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tasks.status IS 'Valid values: [open, done, not_doing]. Follows the card''s column: a done column makes it done, a Not Doing column not_doing.';


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_id uuid NOT NULL,
    department_id uuid,
    position_id uuid,
    manager_id uuid,
    employee_number text,
    employment_type text DEFAULT 'full_time'::text,
    work_location text,
    status text DEFAULT 'active'::text NOT NULL,
    start_date date,
    end_date date,
    termination_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    leave_policy_id uuid,
    employment_stage text,
    probation_ends_on date,
    contract_start_date date,
    career_track text,
    career_level text,
    work_schedule text,
    permissions text[],
    CONSTRAINT team_members_status_check CHECK ((status = ANY (ARRAY['active'::text, 'on_leave'::text, 'notice'::text, 'pre_start'::text, 'ended'::text])))
);


--
-- Name: TABLE team_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.team_members IS 'Chapter staff for the Workboards: everyone at board tier or above (board, super admin, current Chair or Co-Chair). Kept in step by refresh_team_members(); do not edit by hand.';


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    role public.user_role DEFAULT 'guest'::public.user_role NOT NULL,
    active boolean DEFAULT true NOT NULL,
    person_id uuid,
    invited_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: access_grants access_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_grants
    ADD CONSTRAINT access_grants_pkey PRIMARY KEY (id);


--
-- Name: ad_accounts ad_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_accounts
    ADD CONSTRAINT ad_accounts_pkey PRIMARY KEY (id);


--
-- Name: ad_accounts ad_accounts_platform_external_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_accounts
    ADD CONSTRAINT ad_accounts_platform_external_account_id_key UNIQUE (platform, external_account_id);


--
-- Name: ad_campaigns ad_campaigns_account_id_external_campaign_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_campaigns
    ADD CONSTRAINT ad_campaigns_account_id_external_campaign_id_key UNIQUE (account_id, external_campaign_id);


--
-- Name: ad_campaigns ad_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_campaigns
    ADD CONSTRAINT ad_campaigns_pkey PRIMARY KEY (id);


--
-- Name: ad_insights ad_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_insights
    ADD CONSTRAINT ad_insights_pkey PRIMARY KEY (id);


--
-- Name: ai_calls ai_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_calls
    ADD CONSTRAINT ai_calls_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: automation_effects automation_effects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_effects
    ADD CONSTRAINT automation_effects_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: board_appointments board_appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_appointments
    ADD CONSTRAINT board_appointments_pkey PRIMARY KEY (id);


--
-- Name: board_columns board_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_columns
    ADD CONSTRAINT board_columns_pkey PRIMARY KEY (id);


--
-- Name: board_meetings board_meetings_meeting_on_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_meetings
    ADD CONSTRAINT board_meetings_meeting_on_key UNIQUE (meeting_on);


--
-- Name: board_meetings board_meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_meetings
    ADD CONSTRAINT board_meetings_pkey PRIMARY KEY (id);


--
-- Name: board_members board_members_board_id_person_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_members
    ADD CONSTRAINT board_members_board_id_person_id_key UNIQUE (board_id, person_id);


--
-- Name: board_members board_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_members
    ADD CONSTRAINT board_members_pkey PRIMARY KEY (id);


--
-- Name: board_prework_responses board_prework_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_prework_responses
    ADD CONSTRAINT board_prework_responses_pkey PRIMARY KEY (cycle, user_id);


--
-- Name: board_priorities board_priorities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_priorities
    ADD CONSTRAINT board_priorities_pkey PRIMARY KEY (id);


--
-- Name: board_roles board_roles_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_roles
    ADD CONSTRAINT board_roles_key_key UNIQUE (key);


--
-- Name: board_roles board_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_roles
    ADD CONSTRAINT board_roles_pkey PRIMARY KEY (id);


--
-- Name: boards boards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_pkey PRIMARY KEY (id);


--
-- Name: boards boards_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_slug_key UNIQUE (slug);


--
-- Name: book_chapters book_chapters_book_id_sort_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_chapters
    ADD CONSTRAINT book_chapters_book_id_sort_order_key UNIQUE (book_id, sort_order);


--
-- Name: book_chapters book_chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_chapters
    ADD CONSTRAINT book_chapters_pkey PRIMARY KEY (id);


--
-- Name: books books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_pkey PRIMARY KEY (id);


--
-- Name: books books_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_slug_key UNIQUE (slug);


--
-- Name: brand_contacts brand_contacts_brand_id_person_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_contacts
    ADD CONSTRAINT brand_contacts_brand_id_person_id_key UNIQUE (brand_id, person_id);


--
-- Name: brand_contacts brand_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_contacts
    ADD CONSTRAINT brand_contacts_pkey PRIMARY KEY (id);


--
-- Name: brand_profiles brand_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_profiles
    ADD CONSTRAINT brand_profiles_pkey PRIMARY KEY (brand_id);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: brands brands_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_slug_key UNIQUE (slug);


--
-- Name: chapter_goals chapter_goals_fiscal_year_start_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_goals
    ADD CONSTRAINT chapter_goals_fiscal_year_start_key UNIQUE (fiscal_year_start);


--
-- Name: chapter_goals chapter_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_goals
    ADD CONSTRAINT chapter_goals_pkey PRIMARY KEY (id);


--
-- Name: chapter_memberships chapter_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_memberships
    ADD CONSTRAINT chapter_memberships_pkey PRIMARY KEY (id);


--
-- Name: chapter_metrics chapter_metrics_fiscal_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_metrics
    ADD CONSTRAINT chapter_metrics_fiscal_year_key UNIQUE (fiscal_year);


--
-- Name: chapter_metrics chapter_metrics_fiscal_year_start_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_metrics
    ADD CONSTRAINT chapter_metrics_fiscal_year_start_key UNIQUE (fiscal_year_start);


--
-- Name: chapter_metrics chapter_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_metrics
    ADD CONSTRAINT chapter_metrics_pkey PRIMARY KEY (id);


--
-- Name: chapter_photos chapter_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_photos
    ADD CONSTRAINT chapter_photos_pkey PRIMARY KEY (id);


--
-- Name: chapter_photos chapter_photos_storage_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_photos
    ADD CONSTRAINT chapter_photos_storage_path_key UNIQUE (storage_path);


--
-- Name: chapter_photos chapter_photos_thumb_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_photos
    ADD CONSTRAINT chapter_photos_thumb_path_key UNIQUE (thumb_path);


--
-- Name: chapter_priorities chapter_priorities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_priorities
    ADD CONSTRAINT chapter_priorities_pkey PRIMARY KEY (id);


--
-- Name: chapters chapters_chapter_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_chapter_name_key UNIQUE (chapter_name);


--
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (id);


--
-- Name: chatbot_actions chatbot_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatbot_actions
    ADD CONSTRAINT chatbot_actions_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: companies companies_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_slug_key UNIQUE (slug);


--
-- Name: company_revenue_history company_revenue_history_company_id_fiscal_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_revenue_history
    ADD CONSTRAINT company_revenue_history_company_id_fiscal_year_key UNIQUE (company_id, fiscal_year);


--
-- Name: company_revenue_history company_revenue_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_revenue_history
    ADD CONSTRAINT company_revenue_history_pkey PRIMARY KEY (id);


--
-- Name: deal_notes deal_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_notes
    ADD CONSTRAINT deal_notes_pkey PRIMARY KEY (id);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: email_agent_skills email_agent_skills_agent_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_agent_skills
    ADD CONSTRAINT email_agent_skills_agent_id_version_key UNIQUE (agent_id, version);


--
-- Name: email_agent_skills email_agent_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_agent_skills
    ADD CONSTRAINT email_agent_skills_pkey PRIMARY KEY (id);


--
-- Name: email_agents email_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_agents
    ADD CONSTRAINT email_agents_pkey PRIMARY KEY (id);


--
-- Name: email_audiences email_audiences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_audiences
    ADD CONSTRAINT email_audiences_pkey PRIMARY KEY (id);


--
-- Name: email_campaign_recipients email_campaign_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_campaign_recipients
    ADD CONSTRAINT email_campaign_recipients_pkey PRIMARY KEY (id);


--
-- Name: email_campaign_recipients email_campaign_recipients_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_campaign_recipients
    ADD CONSTRAINT email_campaign_recipients_unique UNIQUE (campaign_id, person_id);


--
-- Name: email_campaigns email_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_campaigns
    ADD CONSTRAINT email_campaigns_pkey PRIMARY KEY (id);


--
-- Name: email_events email_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT email_events_pkey PRIMARY KEY (id);


--
-- Name: email_messages email_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_pkey PRIMARY KEY (id);


--
-- Name: email_series email_series_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_series
    ADD CONSTRAINT email_series_pkey PRIMARY KEY (id);


--
-- Name: epics epics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epics
    ADD CONSTRAINT epics_pkey PRIMARY KEY (id);


--
-- Name: event_deliveries event_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_deliveries
    ADD CONSTRAINT event_deliveries_pkey PRIMARY KEY (id);


--
-- Name: event_feedback event_feedback_event_id_person_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_feedback
    ADD CONSTRAINT event_feedback_event_id_person_id_key UNIQUE (event_id, person_id);


--
-- Name: event_feedback event_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_feedback
    ADD CONSTRAINT event_feedback_pkey PRIMARY KEY (id);


--
-- Name: event_materials event_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_materials
    ADD CONSTRAINT event_materials_pkey PRIMARY KEY (id);


--
-- Name: event_outbox event_outbox_event_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_outbox
    ADD CONSTRAINT event_outbox_event_key UNIQUE (event_name, dedupe_key);


--
-- Name: event_outbox event_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_outbox
    ADD CONSTRAINT event_outbox_pkey PRIMARY KEY (id);


--
-- Name: event_payment_currency_reconciliation_evidence event_payment_currency_reconciliat_batch_id_registration_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment_currency_reconciliation_evidence
    ADD CONSTRAINT event_payment_currency_reconciliat_batch_id_registration_id_key UNIQUE (batch_id, registration_id);


--
-- Name: event_payment_currency_reconciliation_approvals event_payment_currency_reconciliation_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment_currency_reconciliation_approvals
    ADD CONSTRAINT event_payment_currency_reconciliation_approvals_pkey PRIMARY KEY (batch_id, approval_role);


--
-- Name: event_payment_currency_reconciliation_batches event_payment_currency_reconciliation_batches_cohort_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment_currency_reconciliation_batches
    ADD CONSTRAINT event_payment_currency_reconciliation_batches_cohort_label_key UNIQUE (cohort_label);


--
-- Name: event_payment_currency_reconciliation_batches event_payment_currency_reconciliation_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment_currency_reconciliation_batches
    ADD CONSTRAINT event_payment_currency_reconciliation_batches_pkey PRIMARY KEY (id);


--
-- Name: event_payment_currency_reconciliation_evidence event_payment_currency_reconciliation_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment_currency_reconciliation_evidence
    ADD CONSTRAINT event_payment_currency_reconciliation_evidence_pkey PRIMARY KEY (id);


--
-- Name: event_payment_currency_repair_audit event_payment_currency_repair_audit_evidence_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment_currency_repair_audit
    ADD CONSTRAINT event_payment_currency_repair_audit_evidence_id_key UNIQUE (evidence_id);


--
-- Name: event_payment_currency_repair_audit event_payment_currency_repair_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment_currency_repair_audit
    ADD CONSTRAINT event_payment_currency_repair_audit_pkey PRIMARY KEY (batch_id, registration_id);


--
-- Name: event_payment_currency_repair_audit event_payment_currency_repair_audit_registration_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment_currency_repair_audit
    ADD CONSTRAINT event_payment_currency_repair_audit_registration_id_key UNIQUE (registration_id);


--
-- Name: event_registration_attendees event_registration_attendees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registration_attendees
    ADD CONSTRAINT event_registration_attendees_pkey PRIMARY KEY (id);


--
-- Name: event_registrations event_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_pkey PRIMARY KEY (id);


--
-- Name: event_registrations event_registrations_ticket_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_ticket_id_key UNIQUE (ticket_id);


--
-- Name: event_reminders_sent event_reminders_sent_event_id_person_id_kind_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_reminders_sent
    ADD CONSTRAINT event_reminders_sent_event_id_person_id_kind_key UNIQUE (event_id, person_id, kind);


--
-- Name: event_reminders_sent event_reminders_sent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_reminders_sent
    ADD CONSTRAINT event_reminders_sent_pkey PRIMARY KEY (id);


--
-- Name: event_ticket_types event_ticket_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_ticket_types
    ADD CONSTRAINT event_ticket_types_pkey PRIMARY KEY (id);


--
-- Name: event_voucher_redemptions event_voucher_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_voucher_redemptions
    ADD CONSTRAINT event_voucher_redemptions_pkey PRIMARY KEY (id);


--
-- Name: event_voucher_redemptions event_voucher_redemptions_registration_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_voucher_redemptions
    ADD CONSTRAINT event_voucher_redemptions_registration_unique UNIQUE (registration_id);


--
-- Name: event_voucher_ticket_types event_voucher_ticket_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_voucher_ticket_types
    ADD CONSTRAINT event_voucher_ticket_types_pkey PRIMARY KEY (voucher_id, ticket_type_id);


--
-- Name: event_vouchers event_vouchers_event_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_vouchers
    ADD CONSTRAINT event_vouchers_event_id_code_key UNIQUE (event_id, code);


--
-- Name: event_vouchers event_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_vouchers
    ADD CONSTRAINT event_vouchers_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: forum_constitutions forum_constitutions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitutions
    ADD CONSTRAINT forum_constitutions_pkey PRIMARY KEY (forum_id);


--
-- Name: forum_constitutions forum_constitutions_storage_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitutions
    ADD CONSTRAINT forum_constitutions_storage_path_key UNIQUE (storage_path);


--
-- Name: forums forums_chapter_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forums
    ADD CONSTRAINT forums_chapter_id_name_key UNIQUE (chapter_id, name);


--
-- Name: forums forums_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forums
    ADD CONSTRAINT forums_pkey PRIMARY KEY (id);


--
-- Name: global_event_participation global_event_participation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_event_participation
    ADD CONSTRAINT global_event_participation_pkey PRIMARY KEY (id);


--
-- Name: inquiries inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_pkey PRIMARY KEY (id);


--
-- Name: interactions interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_pkey PRIMARY KEY (id);


--
-- Name: issues issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_pkey PRIMARY KEY (id);


--
-- Name: key_results key_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_results
    ADD CONSTRAINT key_results_pkey PRIMARY KEY (id);


--
-- Name: kr_logs kr_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kr_logs
    ADD CONSTRAINT kr_logs_pkey PRIMARY KEY (id);


--
-- Name: long_term_plan_metrics long_term_plan_metrics_metric_key_fiscal_year_start_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.long_term_plan_metrics
    ADD CONSTRAINT long_term_plan_metrics_metric_key_fiscal_year_start_key UNIQUE (metric_key, fiscal_year_start);


--
-- Name: long_term_plan_metrics long_term_plan_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.long_term_plan_metrics
    ADD CONSTRAINT long_term_plan_metrics_pkey PRIMARY KEY (id);


--
-- Name: long_term_plan_statements long_term_plan_statements_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.long_term_plan_statements
    ADD CONSTRAINT long_term_plan_statements_key_key UNIQUE (key);


--
-- Name: long_term_plan_statements long_term_plan_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.long_term_plan_statements
    ADD CONSTRAINT long_term_plan_statements_pkey PRIMARY KEY (id);


--
-- Name: marketing_asset_images marketing_asset_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_asset_images
    ADD CONSTRAINT marketing_asset_images_pkey PRIMARY KEY (id);


--
-- Name: marketing_campaigns marketing_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (id);


--
-- Name: marketing_campaigns marketing_campaigns_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_slug_key UNIQUE (slug);


--
-- Name: marketing_channel_metrics marketing_channel_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_channel_metrics
    ADD CONSTRAINT marketing_channel_metrics_pkey PRIMARY KEY (id);


--
-- Name: marketing_channel_metrics marketing_channel_metrics_platform_metric_period_start_peri_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_channel_metrics
    ADD CONSTRAINT marketing_channel_metrics_platform_metric_period_start_peri_key UNIQUE (platform, metric, period_start, period_end);


--
-- Name: marketing_content marketing_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_content
    ADD CONSTRAINT marketing_content_pkey PRIMARY KEY (id);


--
-- Name: marketing_pillars marketing_pillars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_pillars
    ADD CONSTRAINT marketing_pillars_pkey PRIMARY KEY (id);


--
-- Name: marketing_recaps marketing_recaps_period_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_recaps
    ADD CONSTRAINT marketing_recaps_period_month_key UNIQUE (period_month);


--
-- Name: marketing_recaps marketing_recaps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_recaps
    ADD CONSTRAINT marketing_recaps_pkey PRIMARY KEY (id);


--
-- Name: mcp_tool_calls mcp_tool_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_tool_calls
    ADD CONSTRAINT mcp_tool_calls_pkey PRIMARY KEY (id);


--
-- Name: meeting_agenda_items meeting_agenda_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_agenda_items
    ADD CONSTRAINT meeting_agenda_items_pkey PRIMARY KEY (id);


--
-- Name: meeting_ratings meeting_ratings_meeting_id_person_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_ratings
    ADD CONSTRAINT meeting_ratings_meeting_id_person_id_key UNIQUE (meeting_id, person_id);


--
-- Name: meeting_ratings meeting_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_ratings
    ADD CONSTRAINT meeting_ratings_pkey PRIMARY KEY (id);


--
-- Name: meeting_update_comments meeting_update_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_update_comments
    ADD CONSTRAINT meeting_update_comments_pkey PRIMARY KEY (id);


--
-- Name: meeting_updates meeting_updates_meeting_id_board_role_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_updates
    ADD CONSTRAINT meeting_updates_meeting_id_board_role_id_key UNIQUE (meeting_id, board_role_id);


--
-- Name: meeting_updates meeting_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_updates
    ADD CONSTRAINT meeting_updates_pkey PRIMARY KEY (id);


--
-- Name: member_companies member_companies_person_id_company_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_companies
    ADD CONSTRAINT member_companies_person_id_company_id_key UNIQUE (person_id, company_id);


--
-- Name: member_companies member_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_companies
    ADD CONSTRAINT member_companies_pkey PRIMARY KEY (id);


--
-- Name: member_photos member_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_photos
    ADD CONSTRAINT member_photos_pkey PRIMARY KEY (id);


--
-- Name: member_relationships member_relationships_member_person_id_related_person_id_rel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_relationships
    ADD CONSTRAINT member_relationships_member_person_id_related_person_id_rel_key UNIQUE (member_person_id, related_person_id, relationship_type);


--
-- Name: member_relationships member_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_relationships
    ADD CONSTRAINT member_relationships_pkey PRIMARY KEY (id);


--
-- Name: member_renewals member_renewals_person_id_cycle_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_renewals
    ADD CONSTRAINT member_renewals_person_id_cycle_key UNIQUE (person_id, cycle);


--
-- Name: member_renewals member_renewals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_renewals
    ADD CONSTRAINT member_renewals_pkey PRIMARY KEY (id);


--
-- Name: member_requalifications member_requalifications_person_id_fiscal_year_start_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_requalifications
    ADD CONSTRAINT member_requalifications_person_id_fiscal_year_start_key UNIQUE (person_id, fiscal_year_start);


--
-- Name: member_requalifications member_requalifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_requalifications
    ADD CONSTRAINT member_requalifications_pkey PRIMARY KEY (id);


--
-- Name: member_signal_overrides member_signal_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_signal_overrides
    ADD CONSTRAINT member_signal_overrides_pkey PRIMARY KEY (id);


--
-- Name: my_eo_groups my_eo_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.my_eo_groups
    ADD CONSTRAINT my_eo_groups_pkey PRIMARY KEY (id);


--
-- Name: newsletters newsletters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletters
    ADD CONSTRAINT newsletters_pkey PRIMARY KEY (id);


--
-- Name: notification_queue notification_queue_dedupe_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_queue
    ADD CONSTRAINT notification_queue_dedupe_key UNIQUE (dedupe_key);


--
-- Name: notification_queue notification_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_queue
    ADD CONSTRAINT notification_queue_pkey PRIMARY KEY (id);


--
-- Name: objectives objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_pkey PRIMARY KEY (id);


--
-- Name: people people_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_email_key UNIQUE (email);


--
-- Name: people people_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_pkey PRIMARY KEY (id);


--
-- Name: person_emails person_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_emails
    ADD CONSTRAINT person_emails_pkey PRIMARY KEY (id);


--
-- Name: revenue_verifications revenue_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_verifications
    ADD CONSTRAINT revenue_verifications_pkey PRIMARY KEY (id);


--
-- Name: routine_config routine_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routine_config
    ADD CONSTRAINT routine_config_pkey PRIMARY KEY (routine_id);


--
-- Name: routine_runs routine_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routine_runs
    ADD CONSTRAINT routine_runs_pkey PRIMARY KEY (id);


--
-- Name: sap_deal_stage_events sap_deal_stage_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_deal_stage_events
    ADD CONSTRAINT sap_deal_stage_events_pkey PRIMARY KEY (id);


--
-- Name: sap_deals sap_deals_company_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_deals
    ADD CONSTRAINT sap_deals_company_id_key UNIQUE (company_id);


--
-- Name: sap_deals sap_deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_deals
    ADD CONSTRAINT sap_deals_pkey PRIMARY KEY (id);


--
-- Name: short_links short_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.short_links
    ADD CONSTRAINT short_links_pkey PRIMARY KEY (code);


--
-- Name: social_posts social_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_pkey PRIMARY KEY (id);


--
-- Name: social_posts social_posts_platform_external_post_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_platform_external_post_id_key UNIQUE (platform, external_post_id);


--
-- Name: sprints sprints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprints
    ADD CONSTRAINT sprints_pkey PRIMARY KEY (id);


--
-- Name: strategies strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategies
    ADD CONSTRAINT strategies_pkey PRIMARY KEY (id);


--
-- Name: strategies strategies_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategies
    ADD CONSTRAINT strategies_year_key UNIQUE (year);


--
-- Name: survey_answers survey_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_answers
    ADD CONSTRAINT survey_answers_pkey PRIMARY KEY (id);


--
-- Name: survey_fields survey_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_fields
    ADD CONSTRAINT survey_fields_pkey PRIMARY KEY (id);


--
-- Name: survey_response_topics survey_response_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_response_topics
    ADD CONSTRAINT survey_response_topics_pkey PRIMARY KEY (response_id, topic);


--
-- Name: survey_responses survey_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_pkey PRIMARY KEY (id);


--
-- Name: survey_responses survey_responses_survey_id_external_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_survey_id_external_id_key UNIQUE (survey_id, external_id);


--
-- Name: surveys surveys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surveys
    ADD CONSTRAINT surveys_pkey PRIMARY KEY (id);


--
-- Name: surveys surveys_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surveys
    ADD CONSTRAINT surveys_slug_key UNIQUE (slug);


--
-- Name: taggables taggables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taggables
    ADD CONSTRAINT taggables_pkey PRIMARY KEY (id);


--
-- Name: taggables taggables_tag_id_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taggables
    ADD CONSTRAINT taggables_tag_id_entity_type_entity_id_key UNIQUE (tag_id, entity_type, entity_id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: tags tags_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_slug_key UNIQUE (slug);


--
-- Name: task_attachments task_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_pkey PRIMARY KEY (id);


--
-- Name: task_attachments task_attachments_storage_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_storage_path_key UNIQUE (storage_path);


--
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);


--
-- Name: task_stage_log task_stage_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_stage_log
    ADD CONSTRAINT task_stage_log_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_person_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_person_id_key UNIQUE (person_id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: web_traffic web_traffic_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.web_traffic
    ADD CONSTRAINT web_traffic_pkey PRIMARY KEY (id);


--
-- Name: access_grants_live_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX access_grants_live_uniq ON public.access_grants USING btree (user_profile_id, area) WHERE (revoked_at IS NULL);


--
-- Name: access_grants_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX access_grants_profile_idx ON public.access_grants USING btree (user_profile_id);


--
-- Name: ad_campaigns_account_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ad_campaigns_account_idx ON public.ad_campaigns USING btree (account_id);


--
-- Name: ad_campaigns_channel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ad_campaigns_channel_idx ON public.ad_campaigns USING btree (channel_source);


--
-- Name: ad_campaigns_marketing_campaign_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ad_campaigns_marketing_campaign_idx ON public.ad_campaigns USING btree (marketing_campaign_id);


--
-- Name: ad_campaigns_utm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ad_campaigns_utm_idx ON public.ad_campaigns USING btree (utm_campaign);


--
-- Name: ad_insights_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ad_insights_date_idx ON public.ad_insights USING btree (date DESC);


--
-- Name: ad_insights_grain_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ad_insights_grain_uidx ON public.ad_insights USING btree (campaign_id, date, COALESCE(ad_set, ''::text), COALESCE(ad_name, ''::text));


--
-- Name: ai_calls_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_calls_created_idx ON public.ai_calls USING btree (created_at);


--
-- Name: ai_calls_site_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_calls_site_created_idx ON public.ai_calls USING btree (site, created_at);


--
-- Name: applications_channel_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_channel_source_idx ON public.applications USING btree (channel_source);


--
-- Name: applications_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_created_at_idx ON public.applications USING btree (created_at DESC);


--
-- Name: applications_hubspot_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_hubspot_idx ON public.applications USING btree (hubspot_deal_id) WHERE (hubspot_deal_id IS NOT NULL);


--
-- Name: applications_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_person_idx ON public.applications USING btree (person_id);


--
-- Name: applications_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_status_idx ON public.applications USING btree (status);


--
-- Name: approvals_one_pending_per_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX approvals_one_pending_per_subject ON public.approvals USING btree (subject_type, subject_id) WHERE (state = 'pending'::text);


--
-- Name: approvals_pending_by_approver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX approvals_pending_by_approver ON public.approvals USING btree (approver_person_id) WHERE (state = 'pending'::text);


--
-- Name: audit_log_table_record_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_table_record_idx ON public.audit_log USING btree (table_name, record_id, changed_at DESC);


--
-- Name: automation_effects_claimed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX automation_effects_claimed_idx ON public.automation_effects USING btree (claimed_at) WHERE (status = 'claimed'::text);


--
-- Name: automation_effects_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX automation_effects_key ON public.automation_effects USING btree (key);


--
-- Name: automation_effects_run_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX automation_effects_run_idx ON public.automation_effects USING btree (run_id);


--
-- Name: blog_posts_audience_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blog_posts_audience_idx ON public.blog_posts USING btree (audience);


--
-- Name: blog_posts_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blog_posts_category_idx ON public.blog_posts USING btree (category);


--
-- Name: blog_posts_event_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX blog_posts_event_id_key ON public.blog_posts USING btree (event_id) WHERE (event_id IS NOT NULL);


--
-- Name: blog_posts_featured_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blog_posts_featured_idx ON public.blog_posts USING btree (featured) WHERE (featured = true);


--
-- Name: blog_posts_marketing_content_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX blog_posts_marketing_content_key ON public.blog_posts USING btree (marketing_content_id) WHERE (marketing_content_id IS NOT NULL);


--
-- Name: blog_posts_primary_keyword_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blog_posts_primary_keyword_idx ON public.blog_posts USING btree (primary_keyword) WHERE (primary_keyword IS NOT NULL);


--
-- Name: blog_posts_status_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blog_posts_status_published_idx ON public.blog_posts USING btree (status, published_at DESC);


--
-- Name: board_appointments_fy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX board_appointments_fy_idx ON public.board_appointments USING btree (fiscal_year_start);


--
-- Name: board_appointments_one_chair; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX board_appointments_one_chair ON public.board_appointments USING btree (board_role_id, scope, fiscal_year_start) WHERE ("position" = 'Chair'::public.board_position);


--
-- Name: board_appointments_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX board_appointments_person_idx ON public.board_appointments USING btree (person_id);


--
-- Name: board_appointments_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX board_appointments_unique ON public.board_appointments USING btree (person_id, board_role_id, "position", scope, fiscal_year_start);


--
-- Name: board_columns_board_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX board_columns_board_idx ON public.board_columns USING btree (board_id);


--
-- Name: board_members_board_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX board_members_board_idx ON public.board_members USING btree (board_id);


--
-- Name: board_members_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX board_members_person_idx ON public.board_members USING btree (person_id);


--
-- Name: board_priorities_appt_pos_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX board_priorities_appt_pos_idx ON public.board_priorities USING btree (board_appointment_id, "position");


--
-- Name: board_priorities_kr_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX board_priorities_kr_idx ON public.board_priorities USING btree (key_result_id);


--
-- Name: board_priorities_objective_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX board_priorities_objective_idx ON public.board_priorities USING btree (objective_id);


--
-- Name: board_priorities_pillar_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX board_priorities_pillar_idx ON public.board_priorities USING btree (chapter_priority_id);


--
-- Name: boards_client_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX boards_client_idx ON public.boards USING btree (client_company_id);


--
-- Name: chapter_memberships_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chapter_memberships_active_idx ON public.chapter_memberships USING btree (person_id) WHERE (status = ANY (ARRAY['active'::public.chapter_membership_status, 'on_leave'::public.chapter_membership_status]));


--
-- Name: chapter_memberships_chapter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chapter_memberships_chapter_idx ON public.chapter_memberships USING btree (chapter_id);


--
-- Name: chapter_memberships_one_active_per_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX chapter_memberships_one_active_per_chapter ON public.chapter_memberships USING btree (person_id, chapter_id) WHERE (status = ANY (ARRAY['active'::public.chapter_membership_status, 'on_leave'::public.chapter_membership_status]));


--
-- Name: chapter_memberships_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chapter_memberships_person_idx ON public.chapter_memberships USING btree (person_id);


--
-- Name: chapter_memberships_relationship_manager_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chapter_memberships_relationship_manager_idx ON public.chapter_memberships USING btree (relationship_manager_id) WHERE (relationship_manager_id IS NOT NULL);


--
-- Name: chapter_memberships_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chapter_memberships_status_idx ON public.chapter_memberships USING btree (status);


--
-- Name: chapter_metrics_year_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chapter_metrics_year_start_idx ON public.chapter_metrics USING btree (fiscal_year_start DESC);


--
-- Name: chapter_photos_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chapter_photos_created_at_idx ON public.chapter_photos USING btree (created_at DESC);


--
-- Name: chapter_photos_email_recent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chapter_photos_email_recent_idx ON public.chapter_photos USING btree (uploader_email, created_at DESC);


--
-- Name: chapter_photos_ip_recent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chapter_photos_ip_recent_idx ON public.chapter_photos USING btree (uploader_ip_hash, created_at DESC);


--
-- Name: chapter_priorities_fy_pos_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX chapter_priorities_fy_pos_idx ON public.chapter_priorities USING btree (fiscal_year_start, "position");


--
-- Name: chapters_region_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chapters_region_idx ON public.chapters USING btree (region);


--
-- Name: chatbot_actions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chatbot_actions_user_idx ON public.chatbot_actions USING btree (proposed_by, created_at DESC);


--
-- Name: companies_domain_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX companies_domain_idx ON public.companies USING btree (lower(domain)) WHERE (domain IS NOT NULL);


--
-- Name: companies_hubspot_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX companies_hubspot_idx ON public.companies USING btree (hubspot_company_id) WHERE (hubspot_company_id IS NOT NULL);


--
-- Name: companies_industry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX companies_industry_idx ON public.companies USING btree (industry);


--
-- Name: companies_lower_name_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX companies_lower_name_uniq ON public.companies USING btree (lower(name));


--
-- Name: companies_name_lower_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX companies_name_lower_idx ON public.companies USING btree (lower(name));


--
-- Name: companies_relationship_manager_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX companies_relationship_manager_idx ON public.companies USING btree (relationship_manager_id) WHERE (relationship_manager_id IS NOT NULL);


--
-- Name: companies_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX companies_status_idx ON public.companies USING btree (status);


--
-- Name: company_revenue_history_company_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_revenue_history_company_idx ON public.company_revenue_history USING btree (company_id);


--
-- Name: deal_notes_by_deal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_notes_by_deal ON public.deal_notes USING btree (deal_kind, deal_id, met_on DESC, created_at DESC);


--
-- Name: deals_company_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_company_idx ON public.deals USING btree (company_id) WHERE (company_id IS NOT NULL);


--
-- Name: deals_deal_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_deal_status_idx ON public.deals USING btree (deal_status);


--
-- Name: deals_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_open_idx ON public.deals USING btree (pipeline, last_activity_at DESC) WHERE (deal_status = 'open'::public.deal_status);


--
-- Name: deals_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_person_idx ON public.deals USING btree (person_id) WHERE (person_id IS NOT NULL);


--
-- Name: deals_pipeline_stage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_pipeline_stage_idx ON public.deals USING btree (pipeline, stage);


--
-- Name: deals_relationship_manager_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_relationship_manager_idx ON public.deals USING btree (relationship_manager_id) WHERE (relationship_manager_id IS NOT NULL);


--
-- Name: email_campaign_recipients_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_campaign_recipients_due_idx ON public.email_campaign_recipients USING btree (campaign_id, status, send_after);


--
-- Name: email_campaign_recipients_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_campaign_recipients_person_idx ON public.email_campaign_recipients USING btree (person_id);


--
-- Name: email_campaign_recipients_queue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_campaign_recipients_queue_idx ON public.email_campaign_recipients USING btree (campaign_id, status) WHERE (status = 'pending'::text);


--
-- Name: email_campaigns_brand_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_campaigns_brand_idx ON public.email_campaigns USING btree (brand_id);


--
-- Name: email_campaigns_campaign_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_campaigns_campaign_idx ON public.email_campaigns USING btree (marketing_campaign_id);


--
-- Name: email_campaigns_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_campaigns_created_idx ON public.email_campaigns USING btree (created_at DESC);


--
-- Name: email_campaigns_sent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_campaigns_sent_idx ON public.email_campaigns USING btree (sent_at DESC);


--
-- Name: email_campaigns_series_send_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX email_campaigns_series_send_key ON public.email_campaigns USING btree (series_id, scheduled_at) WHERE (series_id IS NOT NULL);


--
-- Name: email_campaigns_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_campaigns_status_idx ON public.email_campaigns USING btree (status);


--
-- Name: email_events_campaign_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_events_campaign_idx ON public.email_events USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: email_events_dedupe_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX email_events_dedupe_idx ON public.email_events USING btree (resend_email_id, event_type, occurred_at);


--
-- Name: email_events_message_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_events_message_idx ON public.email_events USING btree (message_id) WHERE (message_id IS NOT NULL);


--
-- Name: email_events_occurred_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_events_occurred_idx ON public.email_events USING btree (occurred_at DESC);


--
-- Name: email_events_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_events_person_idx ON public.email_events USING btree (person_id);


--
-- Name: email_events_recipient_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_events_recipient_idx ON public.email_events USING btree (recipient);


--
-- Name: email_events_svix_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX email_events_svix_idx ON public.email_events USING btree (svix_id) WHERE (svix_id IS NOT NULL);


--
-- Name: email_messages_agent_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_messages_agent_status_idx ON public.email_messages USING btree (agent_id, status);


--
-- Name: email_messages_person_agent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_messages_person_agent_idx ON public.email_messages USING btree (person_id, agent_id, sent_at DESC);


--
-- Name: email_messages_resend_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_messages_resend_idx ON public.email_messages USING btree (resend_email_id) WHERE (resend_email_id IS NOT NULL);


--
-- Name: email_messages_send_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_messages_send_idx ON public.email_messages USING btree (status, send_after) WHERE (status = 'approved'::text);


--
-- Name: epics_board_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX epics_board_idx ON public.epics USING btree (board_id);


--
-- Name: event_deliveries_delivered_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_deliveries_delivered_idx ON public.event_deliveries USING btree (delivered_at);


--
-- Name: event_deliveries_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_deliveries_event_idx ON public.event_deliveries USING btree (event_id);


--
-- Name: event_feedback_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_feedback_event_idx ON public.event_feedback USING btree (event_id);


--
-- Name: event_materials_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_materials_event_idx ON public.event_materials USING btree (event_id);


--
-- Name: event_outbox_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_outbox_pending_idx ON public.event_outbox USING btree (created_at) WHERE (published_at IS NULL);


--
-- Name: event_payment_currency_approval_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX event_payment_currency_approval_owner_idx ON public.event_payment_currency_reconciliation_approvals USING btree (batch_id, lower(btrim(approved_by)));


--
-- Name: event_payment_currency_evidence_intent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX event_payment_currency_evidence_intent_idx ON public.event_payment_currency_reconciliation_evidence USING btree (batch_id, stripe_payment_intent_id) WHERE (stripe_payment_intent_id IS NOT NULL);


--
-- Name: event_payment_currency_evidence_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX event_payment_currency_evidence_session_idx ON public.event_payment_currency_reconciliation_evidence USING btree (batch_id, stripe_session_id) WHERE (stripe_session_id IS NOT NULL);


--
-- Name: event_registration_attendees_registration_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_registration_attendees_registration_idx ON public.event_registration_attendees USING btree (registration_id);


--
-- Name: event_registrations_channel_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_registrations_channel_source_idx ON public.event_registrations USING btree (channel_source);


--
-- Name: event_registrations_checked_in_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_registrations_checked_in_idx ON public.event_registrations USING btree (checked_in_at) WHERE (checked_in_at IS NOT NULL);


--
-- Name: event_registrations_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_registrations_event_idx ON public.event_registrations USING btree (event_id);


--
-- Name: event_registrations_event_person_operational_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX event_registrations_event_person_operational_key ON public.event_registrations USING btree (event_id, person_id) WHERE (review_classification <> 'spam'::text);


--
-- Name: event_registrations_event_prospect_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_registrations_event_prospect_idx ON public.event_registrations USING btree (event_id, is_prospect) WHERE (is_prospect = true);


--
-- Name: event_registrations_event_review_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_registrations_event_review_idx ON public.event_registrations USING btree (event_id, review_classification);


--
-- Name: event_registrations_inviter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_registrations_inviter_idx ON public.event_registrations USING btree (invited_by_registration_id) WHERE (invited_by_registration_id IS NOT NULL);


--
-- Name: event_registrations_inviter_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_registrations_inviter_person_idx ON public.event_registrations USING btree (invited_by_person_id) WHERE (invited_by_person_id IS NOT NULL);


--
-- Name: event_registrations_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_registrations_person_idx ON public.event_registrations USING btree (person_id);


--
-- Name: event_registrations_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_registrations_status_idx ON public.event_registrations USING btree (status);


--
-- Name: event_registrations_stripe_pi_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_registrations_stripe_pi_idx ON public.event_registrations USING btree (stripe_payment_intent_id);


--
-- Name: event_registrations_stripe_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_registrations_stripe_session_idx ON public.event_registrations USING btree (stripe_session_id);


--
-- Name: event_registrations_ticket_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX event_registrations_ticket_code_key ON public.event_registrations USING btree (ticket_code) WHERE (ticket_code IS NOT NULL);


--
-- Name: event_registrations_ticket_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_registrations_ticket_type_idx ON public.event_registrations USING btree (ticket_type_id);


--
-- Name: event_registrations_voucher_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_registrations_voucher_idx ON public.event_registrations USING btree (voucher_id) WHERE (voucher_id IS NOT NULL);


--
-- Name: event_reminders_sent_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_reminders_sent_event_idx ON public.event_reminders_sent USING btree (event_id);


--
-- Name: event_ticket_types_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_ticket_types_event_idx ON public.event_ticket_types USING btree (event_id, sort_order);


--
-- Name: event_voucher_redemptions_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_voucher_redemptions_email_idx ON public.event_voucher_redemptions USING btree (voucher_id, primary_email, state, reserved_until);


--
-- Name: event_voucher_redemptions_stripe_session_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX event_voucher_redemptions_stripe_session_key ON public.event_voucher_redemptions USING btree (stripe_session_id) WHERE (stripe_session_id IS NOT NULL);


--
-- Name: event_voucher_redemptions_usage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_voucher_redemptions_usage_idx ON public.event_voucher_redemptions USING btree (voucher_id, state, reserved_until);


--
-- Name: event_voucher_ticket_types_ticket_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_voucher_ticket_types_ticket_idx ON public.event_voucher_ticket_types USING btree (ticket_type_id);


--
-- Name: event_vouchers_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_vouchers_event_idx ON public.event_vouchers USING btree (event_id, active);


--
-- Name: event_vouchers_one_team_invite_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX event_vouchers_one_team_invite_idx ON public.event_vouchers USING btree (event_id) WHERE (team_invite_enabled AND active);


--
-- Name: events_featured_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_featured_idx ON public.events USING btree (featured) WHERE (featured = true);


--
-- Name: events_primary_keyword_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_primary_keyword_idx ON public.events USING btree (primary_keyword) WHERE (primary_keyword IS NOT NULL);


--
-- Name: events_recap_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_recap_published_idx ON public.events USING btree (recap_published) WHERE (recap_published = true);


--
-- Name: events_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX events_slug_key ON public.events USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: events_status_starts_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_status_starts_at_idx ON public.events USING btree (status, starts_at);


--
-- Name: events_type_starts_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_type_starts_at_idx ON public.events USING btree (type, starts_at);


--
-- Name: events_visibility_starts_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_visibility_starts_at_idx ON public.events USING btree (visibility, starts_at);


--
-- Name: forums_chapter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX forums_chapter_idx ON public.forums USING btree (chapter_id);


--
-- Name: global_event_participation_active_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX global_event_participation_active_key ON public.global_event_participation USING btree (event_id, person_id) WHERE (removed_at IS NULL);


--
-- Name: global_event_participation_event_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX global_event_participation_event_status_idx ON public.global_event_participation USING btree (event_id, status) WHERE (removed_at IS NULL);


--
-- Name: global_event_participation_person_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX global_event_participation_person_status_idx ON public.global_event_participation USING btree (person_id, status) WHERE (removed_at IS NULL);


--
-- Name: global_event_participation_removed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX global_event_participation_removed_at_idx ON public.global_event_participation USING btree (removed_at) WHERE (removed_at IS NOT NULL);


--
-- Name: idx_taggables_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_taggables_entity ON public.taggables USING btree (entity_type, entity_id);


--
-- Name: inquiries_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inquiries_created_at_idx ON public.inquiries USING btree (created_at DESC);


--
-- Name: inquiries_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inquiries_kind_idx ON public.inquiries USING btree (kind);


--
-- Name: inquiries_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inquiries_person_idx ON public.inquiries USING btree (person_id);


--
-- Name: inquiries_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inquiries_status_idx ON public.inquiries USING btree (status);


--
-- Name: interactions_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX interactions_person_idx ON public.interactions USING btree (person_id, occurred_at DESC);


--
-- Name: issues_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX issues_status_idx ON public.issues USING btree (status, created_at DESC);


--
-- Name: key_results_objective_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX key_results_objective_idx ON public.key_results USING btree (objective_id, sort_order);


--
-- Name: kr_logs_kr_week_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kr_logs_kr_week_idx ON public.kr_logs USING btree (key_result_id, week_start);


--
-- Name: marketing_asset_images_entry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_asset_images_entry_idx ON public.marketing_asset_images USING btree (entry_id, created_at DESC);


--
-- Name: marketing_asset_images_one_selected; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX marketing_asset_images_one_selected ON public.marketing_asset_images USING btree (entry_id) WHERE is_selected;


--
-- Name: marketing_campaigns_brand_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_campaigns_brand_idx ON public.marketing_campaigns USING btree (brand_id);


--
-- Name: marketing_campaigns_pillar_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_campaigns_pillar_idx ON public.marketing_campaigns USING btree (pillar_id);


--
-- Name: marketing_campaigns_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_campaigns_status_idx ON public.marketing_campaigns USING btree (status);


--
-- Name: marketing_campaigns_utm_campaign_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX marketing_campaigns_utm_campaign_key ON public.marketing_campaigns USING btree (utm_campaign) WHERE (utm_campaign IS NOT NULL);


--
-- Name: marketing_campaigns_utm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_campaigns_utm_idx ON public.marketing_campaigns USING btree (utm_campaign);


--
-- Name: marketing_channel_metrics_channel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_channel_metrics_channel_idx ON public.marketing_channel_metrics USING btree (channel_source);


--
-- Name: marketing_channel_metrics_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_channel_metrics_period_idx ON public.marketing_channel_metrics USING btree (period_start DESC);


--
-- Name: marketing_content_blog_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX marketing_content_blog_slug_key ON public.marketing_content USING btree (brand_id, slug) WHERE ((channel = 'blog'::text) AND (slug IS NOT NULL));


--
-- Name: marketing_content_brand_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_content_brand_idx ON public.marketing_content USING btree (brand_id);


--
-- Name: marketing_content_broadcast_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_content_broadcast_idx ON public.marketing_content USING btree (broadcast_id) WHERE (broadcast_id IS NOT NULL);


--
-- Name: marketing_content_campaign_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_content_campaign_idx ON public.marketing_content USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: marketing_content_pillar_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_content_pillar_idx ON public.marketing_content USING btree (pillar_id);


--
-- Name: marketing_content_publish_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_content_publish_idx ON public.marketing_content USING btree (publish_date);


--
-- Name: marketing_content_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_content_status_idx ON public.marketing_content USING btree (status);


--
-- Name: marketing_pillars_brand_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX marketing_pillars_brand_name_idx ON public.marketing_pillars USING btree (brand_id, lower(name));


--
-- Name: marketing_recaps_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_recaps_period_idx ON public.marketing_recaps USING btree (period_month DESC);


--
-- Name: mcp_tool_calls_by_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mcp_tool_calls_by_client ON public.mcp_tool_calls USING btree (client_id, created_at DESC);


--
-- Name: mcp_tool_calls_by_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mcp_tool_calls_by_person ON public.mcp_tool_calls USING btree (user_profile_id, created_at DESC);


--
-- Name: mcp_tool_calls_by_tool; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mcp_tool_calls_by_tool ON public.mcp_tool_calls USING btree (tool, created_at DESC);


--
-- Name: meeting_agenda_items_issue_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX meeting_agenda_items_issue_key ON public.meeting_agenda_items USING btree (meeting_id, issue_id) WHERE (issue_id IS NOT NULL);


--
-- Name: meeting_agenda_items_meeting_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX meeting_agenda_items_meeting_idx ON public.meeting_agenda_items USING btree (meeting_id, sort_order);


--
-- Name: meeting_update_comments_update_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX meeting_update_comments_update_idx ON public.meeting_update_comments USING btree (update_id, created_at);


--
-- Name: member_companies_one_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX member_companies_one_primary ON public.member_companies USING btree (person_id) WHERE (role = 'primary'::public.member_company_role);


--
-- Name: member_companies_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_companies_person_idx ON public.member_companies USING btree (person_id);


--
-- Name: member_photos_one_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX member_photos_one_primary ON public.member_photos USING btree (person_id) WHERE is_primary;


--
-- Name: member_photos_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_photos_person_idx ON public.member_photos USING btree (person_id);


--
-- Name: member_relationships_member_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_relationships_member_idx ON public.member_relationships USING btree (member_person_id);


--
-- Name: member_renewals_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_renewals_cycle_idx ON public.member_renewals USING btree (cycle, status);


--
-- Name: member_requalifications_fy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_requalifications_fy_idx ON public.member_requalifications USING btree (fiscal_year_start);


--
-- Name: member_signal_overrides_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_signal_overrides_person_idx ON public.member_signal_overrides USING btree (person_id, created_at DESC);


--
-- Name: my_eo_groups_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX my_eo_groups_active_idx ON public.my_eo_groups USING btree (active);


--
-- Name: newsletters_audience_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX newsletters_audience_idx ON public.newsletters USING btree (audience);


--
-- Name: newsletters_sent_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX newsletters_sent_at_idx ON public.newsletters USING btree (sent_at DESC);


--
-- Name: newsletters_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX newsletters_slug_key ON public.newsletters USING btree (slug);


--
-- Name: notification_queue_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_queue_due_idx ON public.notification_queue USING btree (deliver_after) WHERE (status = 'queued'::text);


--
-- Name: objectives_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX objectives_year_idx ON public.objectives USING btree (year, sort_order);


--
-- Name: people_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX people_company_id_idx ON public.people USING btree (company_id) WHERE (company_id IS NOT NULL);


--
-- Name: people_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX people_created_at_idx ON public.people USING btree (created_at DESC);


--
-- Name: people_email_lower_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX people_email_lower_idx ON public.people USING btree (lower(email));


--
-- Name: people_forum_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX people_forum_idx ON public.people USING btree (forum_id) WHERE (forum_id IS NOT NULL);


--
-- Name: people_hubspot_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX people_hubspot_idx ON public.people USING btree (hubspot_contact_id) WHERE (hubspot_contact_id IS NOT NULL);


--
-- Name: people_is_eo_staff_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX people_is_eo_staff_idx ON public.people USING btree (is_eo_staff) WHERE (is_eo_staff = true);


--
-- Name: people_is_slp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX people_is_slp_idx ON public.people USING btree (is_slp) WHERE (is_slp = true);


--
-- Name: people_lifecycle_stage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX people_lifecycle_stage_idx ON public.people USING btree (lifecycle_stage) WHERE (lifecycle_stage IS NOT NULL);


--
-- Name: people_member_since_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX people_member_since_idx ON public.people USING btree (member_since) WHERE (member_since IS NOT NULL);


--
-- Name: people_membership_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX people_membership_status_idx ON public.people USING btree (membership_status);


--
-- Name: people_membership_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX people_membership_type_idx ON public.people USING btree (membership_type);


--
-- Name: people_relationship_manager_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX people_relationship_manager_idx ON public.people USING btree (relationship_manager_id) WHERE (relationship_manager_id IS NOT NULL);


--
-- Name: person_emails_email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX person_emails_email_unique ON public.person_emails USING btree (lower(email));


--
-- Name: person_emails_one_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX person_emails_one_primary ON public.person_emails USING btree (person_id) WHERE is_primary;


--
-- Name: person_emails_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX person_emails_person_idx ON public.person_emails USING btree (person_id);


--
-- Name: revenue_verifications_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX revenue_verifications_created_at_idx ON public.revenue_verifications USING btree (created_at DESC);


--
-- Name: revenue_verifications_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX revenue_verifications_email_idx ON public.revenue_verifications USING btree (lower(email));


--
-- Name: revenue_verifications_lark_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX revenue_verifications_lark_status_idx ON public.revenue_verifications USING btree (lark_status) WHERE (lark_status <> 'uploaded'::public.lark_upload_status);


--
-- Name: revenue_verifications_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX revenue_verifications_person_idx ON public.revenue_verifications USING btree (person_id);


--
-- Name: routine_runs_one_tick; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX routine_runs_one_tick ON public.routine_runs USING btree (routine_id, tick_key, mode) WHERE ((tick_key IS NOT NULL) AND (status = ANY (ARRAY['running'::text, 'waiting'::text, 'ok'::text, 'skipped'::text])));


--
-- Name: routine_runs_reap_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX routine_runs_reap_idx ON public.routine_runs USING btree (step_deadline_at) WHERE (status = 'running'::text);


--
-- Name: routine_runs_routine_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX routine_runs_routine_started_idx ON public.routine_runs USING btree (routine_id, started_at DESC);


--
-- Name: routine_runs_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX routine_runs_started_idx ON public.routine_runs USING btree (started_at DESC);


--
-- Name: sap_deal_stage_events_deal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_deal_stage_events_deal_idx ON public.sap_deal_stage_events USING btree (deal_id, changed_at);


--
-- Name: sap_deals_deal_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_deals_deal_type_idx ON public.sap_deals USING btree (deal_type) WHERE (deal_type IS NOT NULL);


--
-- Name: sap_deals_hubspot_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_deals_hubspot_idx ON public.sap_deals USING btree (hubspot_deal_id) WHERE (hubspot_deal_id IS NOT NULL);


--
-- Name: sap_deals_next_followup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_deals_next_followup_idx ON public.sap_deals USING btree (next_followup_at) WHERE (next_followup_at IS NOT NULL);


--
-- Name: sap_deals_referred_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_deals_referred_by_idx ON public.sap_deals USING btree (referred_by_person_id) WHERE (referred_by_person_id IS NOT NULL);


--
-- Name: sap_deals_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_deals_status_idx ON public.sap_deals USING btree (status);


--
-- Name: social_posts_campaign_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX social_posts_campaign_idx ON public.social_posts USING btree (marketing_campaign_id);


--
-- Name: social_posts_posted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX social_posts_posted_idx ON public.social_posts USING btree (posted_at DESC);


--
-- Name: sprints_board_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sprints_board_idx ON public.sprints USING btree (board_id);


--
-- Name: sprints_board_week_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sprints_board_week_key ON public.sprints USING btree (board_id, week) WHERE (week IS NOT NULL);


--
-- Name: survey_answers_field_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX survey_answers_field_idx ON public.survey_answers USING btree (field_id);


--
-- Name: survey_answers_response_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX survey_answers_response_idx ON public.survey_answers USING btree (response_id);


--
-- Name: survey_fields_survey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX survey_fields_survey_idx ON public.survey_fields USING btree (survey_id, "position");


--
-- Name: survey_response_topics_topic_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX survey_response_topics_topic_idx ON public.survey_response_topics USING btree (topic);


--
-- Name: survey_responses_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX survey_responses_email_idx ON public.survey_responses USING btree (respondent_email) WHERE (respondent_email IS NOT NULL);


--
-- Name: survey_responses_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX survey_responses_person_idx ON public.survey_responses USING btree (person_id) WHERE (person_id IS NOT NULL);


--
-- Name: survey_responses_submitted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX survey_responses_submitted_idx ON public.survey_responses USING btree (submitted_at DESC);


--
-- Name: survey_responses_survey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX survey_responses_survey_idx ON public.survey_responses USING btree (survey_id);


--
-- Name: surveys_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX surveys_kind_idx ON public.surveys USING btree (kind);


--
-- Name: task_attachments_archived_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_attachments_archived_idx ON public.task_attachments USING btree (archived_at) WHERE (archived_at IS NOT NULL);


--
-- Name: task_attachments_live_by_task_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_attachments_live_by_task_idx ON public.task_attachments USING btree (task_id, created_at) WHERE ((archived_at IS NULL) AND (confirmed_at IS NOT NULL));


--
-- Name: task_attachments_unconfirmed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_attachments_unconfirmed_idx ON public.task_attachments USING btree (created_at) WHERE (confirmed_at IS NULL);


--
-- Name: task_comments_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_comments_parent_idx ON public.task_comments USING btree (parent_comment_id);


--
-- Name: task_comments_task_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_comments_task_idx ON public.task_comments USING btree (task_id);


--
-- Name: task_stage_log_task_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_stage_log_task_idx ON public.task_stage_log USING btree (task_id);


--
-- Name: tasks_assignee_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_assignee_idx ON public.tasks USING btree (assignee_id);


--
-- Name: tasks_board_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_board_idx ON public.tasks USING btree (board_id);


--
-- Name: tasks_column_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_column_idx ON public.tasks USING btree (board_column_id);


--
-- Name: tasks_company_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_company_idx ON public.tasks USING btree (company_id) WHERE (company_id IS NOT NULL);


--
-- Name: tasks_content_asset_once; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tasks_content_asset_once ON public.tasks USING btree (board_id, subject_id) WHERE (subject_type = 'marketing_content'::text);


--
-- Name: tasks_content_day_once; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tasks_content_day_once ON public.tasks USING btree (board_id, ((metadata ->> 'content_day'::text))) WHERE ((subject_type = 'marketing_day'::text) AND (parent_task_id IS NULL));


--
-- Name: tasks_deal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_deal_idx ON public.tasks USING btree (deal_id) WHERE (deal_id IS NOT NULL);


--
-- Name: tasks_epic_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_epic_idx ON public.tasks USING btree (epic_id);


--
-- Name: tasks_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_open_idx ON public.tasks USING btree (assignee_id, due_date) WHERE (status = 'open'::text);


--
-- Name: tasks_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_parent_idx ON public.tasks USING btree (parent_task_id);


--
-- Name: tasks_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_person_idx ON public.tasks USING btree (person_id) WHERE (person_id IS NOT NULL);


--
-- Name: tasks_sprint_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_sprint_idx ON public.tasks USING btree (sprint_id);


--
-- Name: tasks_subject_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_subject_idx ON public.tasks USING btree (subject_type, subject_id);


--
-- Name: tasks_writer_campaign_once; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tasks_writer_campaign_once ON public.tasks USING btree (board_id, subject_id) WHERE (subject_type = 'marketing_campaign'::text);


--
-- Name: web_traffic_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX web_traffic_date_idx ON public.web_traffic USING btree (date DESC);


--
-- Name: web_traffic_grain_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX web_traffic_grain_uidx ON public.web_traffic USING btree (date, channel_source, landing_path, utm_campaign) NULLS NOT DISTINCT;


--
-- Name: ad_accounts ad_accounts_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ad_accounts_set_updated_at BEFORE UPDATE ON public.ad_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ad_campaigns ad_campaigns_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ad_campaigns_set_updated_at BEFORE UPDATE ON public.ad_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ad_insights ad_insights_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ad_insights_set_updated_at BEFORE UPDATE ON public.ad_insights FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: applications applications_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER applications_set_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: marketing_content blog_posts_follow_marketing_unpublish; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER blog_posts_follow_marketing_unpublish AFTER UPDATE OF status ON public.marketing_content FOR EACH ROW WHEN (((old.status = 'published'::text) AND (new.status IS DISTINCT FROM 'published'::text))) EXECUTE FUNCTION public.blog_posts_follow_marketing_unpublish();


--
-- Name: blog_posts blog_posts_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER blog_posts_set_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: board_appointments board_appointments_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER board_appointments_set_updated_at BEFORE UPDATE ON public.board_appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: board_roles board_roles_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER board_roles_set_updated_at BEFORE UPDATE ON public.board_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: chapter_memberships chapter_memberships_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER chapter_memberships_set_updated_at BEFORE UPDATE ON public.chapter_memberships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: chapter_memberships chapter_memberships_sync_person_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER chapter_memberships_sync_person_status AFTER INSERT OR DELETE OR UPDATE OF status, person_id ON public.chapter_memberships FOR EACH ROW EXECUTE FUNCTION public.chapter_memberships_sync_person_status();


--
-- Name: chapter_metrics chapter_metrics_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER chapter_metrics_set_updated_at BEFORE UPDATE ON public.chapter_metrics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: chapters chapters_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER chapters_set_updated_at BEFORE UPDATE ON public.chapters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: companies companies_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER companies_set_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: deals deals_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER deals_set_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: email_campaigns email_campaigns_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER email_campaigns_set_updated_at BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: event_payment_currency_reconciliation_approvals event_payment_currency_approval_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_payment_currency_approval_immutable BEFORE DELETE OR UPDATE ON public.event_payment_currency_reconciliation_approvals FOR EACH ROW EXECUTE FUNCTION public.prevent_event_payment_currency_approval_mutation();


--
-- Name: event_payment_currency_reconciliation_approvals event_payment_currency_approval_validate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_payment_currency_approval_validate BEFORE INSERT ON public.event_payment_currency_reconciliation_approvals FOR EACH ROW EXECUTE FUNCTION public.validate_event_payment_currency_approval();


--
-- Name: event_payment_currency_repair_audit event_payment_currency_audit_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_payment_currency_audit_immutable BEFORE DELETE OR UPDATE ON public.event_payment_currency_repair_audit FOR EACH ROW EXECUTE FUNCTION public.prevent_event_payment_currency_audit_mutation();


--
-- Name: event_payment_currency_reconciliation_batches event_payment_currency_batch_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_payment_currency_batch_immutable BEFORE DELETE OR UPDATE ON public.event_payment_currency_reconciliation_batches FOR EACH ROW EXECUTE FUNCTION public.protect_event_payment_currency_batch();


--
-- Name: event_payment_currency_reconciliation_evidence event_payment_currency_evidence_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_payment_currency_evidence_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.event_payment_currency_reconciliation_evidence FOR EACH ROW EXECUTE FUNCTION public.protect_event_payment_currency_evidence();


--
-- Name: event_registrations event_registrations_protect_standard_checkout_session; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_registrations_protect_standard_checkout_session BEFORE UPDATE ON public.event_registrations FOR EACH ROW EXECUTE FUNCTION public.protect_standard_checkout_session();


--
-- Name: event_registrations event_registrations_protect_voucher_price_snapshots; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_registrations_protect_voucher_price_snapshots BEFORE UPDATE ON public.event_registrations FOR EACH ROW EXECUTE FUNCTION public.protect_voucher_price_snapshots();


--
-- Name: event_registrations event_registrations_reject_global_event; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_registrations_reject_global_event BEFORE INSERT OR UPDATE OF event_id ON public.event_registrations FOR EACH ROW EXECUTE FUNCTION public.reject_global_event_registration();


--
-- Name: event_registrations event_registrations_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_registrations_set_updated_at BEFORE UPDATE ON public.event_registrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: event_registrations event_registrations_sync_inviter_person; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_registrations_sync_inviter_person BEFORE INSERT OR UPDATE OF invited_by_registration_id ON public.event_registrations FOR EACH ROW EXECUTE FUNCTION public.sync_event_registration_inviter_person();


--
-- Name: event_ticket_types event_ticket_types_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_ticket_types_set_updated_at BEFORE UPDATE ON public.event_ticket_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: event_voucher_redemptions event_voucher_redemptions_protect_snapshots; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_voucher_redemptions_protect_snapshots BEFORE UPDATE ON public.event_voucher_redemptions FOR EACH ROW EXECUTE FUNCTION public.protect_voucher_redemption_snapshots();


--
-- Name: event_voucher_redemptions event_voucher_redemptions_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_voucher_redemptions_set_updated_at BEFORE UPDATE ON public.event_voucher_redemptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: event_voucher_ticket_types event_voucher_ticket_types_same_event; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_voucher_ticket_types_same_event BEFORE INSERT OR UPDATE ON public.event_voucher_ticket_types FOR EACH ROW EXECUTE FUNCTION public.validate_event_voucher_ticket_type();


--
-- Name: event_vouchers event_vouchers_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_vouchers_set_updated_at BEFORE UPDATE ON public.event_vouchers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: events events_protect_global_participation_scope; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER events_protect_global_participation_scope BEFORE UPDATE OF scope, starts_at ON public.events FOR EACH ROW WHEN (((old.scope IS DISTINCT FROM new.scope) OR (old.starts_at IS DISTINCT FROM new.starts_at))) EXECUTE FUNCTION public.protect_global_event_scope_with_participation();


--
-- Name: events events_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: forums forums_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER forums_set_updated_at BEFORE UPDATE ON public.forums FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: global_event_participation global_event_participation_enforce; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER global_event_participation_enforce BEFORE INSERT OR UPDATE ON public.global_event_participation FOR EACH ROW EXECUTE FUNCTION public.enforce_global_event_participation();


--
-- Name: marketing_campaigns marketing_campaigns_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER marketing_campaigns_set_updated_at BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: marketing_channel_metrics marketing_channel_metrics_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER marketing_channel_metrics_set_updated_at BEFORE UPDATE ON public.marketing_channel_metrics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: member_photos member_photos_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER member_photos_set_updated_at BEFORE UPDATE ON public.member_photos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: my_eo_groups my_eo_groups_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER my_eo_groups_set_updated_at BEFORE UPDATE ON public.my_eo_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: people people_derive_membership_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER people_derive_membership_status BEFORE INSERT OR UPDATE OF membership_status ON public.people FOR EACH ROW EXECUTE FUNCTION public.people_derive_membership_status();


--
-- Name: people people_fill_source; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER people_fill_source BEFORE INSERT OR UPDATE OF channel_source, source_site, source ON public.people FOR EACH ROW EXECUTE FUNCTION public.people_fill_source();


--
-- Name: people people_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER people_set_updated_at BEFORE UPDATE ON public.people FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: board_appointments refresh_team_members; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_team_members AFTER INSERT OR DELETE OR UPDATE ON public.board_appointments FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_team_members_trigger();


--
-- Name: user_profiles refresh_team_members; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_team_members AFTER INSERT OR DELETE OR UPDATE ON public.user_profiles FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_team_members_trigger();


--
-- Name: revenue_verifications revenue_verifications_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER revenue_verifications_set_updated_at BEFORE UPDATE ON public.revenue_verifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sap_deals sap_deals_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sap_deals_set_updated_at BEFORE UPDATE ON public.sap_deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: approvals set_approvals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_approvals_updated_at BEFORE UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: board_columns set_board_columns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_board_columns_updated_at BEFORE UPDATE ON public.board_columns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: boards set_boards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_boards_updated_at BEFORE UPDATE ON public.boards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: book_chapters set_book_chapters_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_book_chapters_updated_at BEFORE UPDATE ON public.book_chapters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: books set_books_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_books_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: brand_profiles set_brand_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_brand_profiles_updated_at BEFORE UPDATE ON public.brand_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: brands set_brands_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: email_campaigns set_email_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_email_campaigns_updated_at BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: epics set_epics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_epics_updated_at BEFORE UPDATE ON public.epics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: marketing_content set_marketing_calendar_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_marketing_calendar_updated_at BEFORE UPDATE ON public.marketing_content FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: marketing_campaigns set_marketing_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: marketing_pillars set_marketing_pillars_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_marketing_pillars_updated_at BEFORE UPDATE ON public.marketing_pillars FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sprints set_sprints_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_sprints_updated_at BEFORE UPDATE ON public.sprints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: team_members set_team_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: social_posts social_posts_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER social_posts_set_updated_at BEFORE UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sprints sprints_set_week; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sprints_set_week BEFORE INSERT OR UPDATE ON public.sprints FOR EACH ROW EXECUTE FUNCTION public.sprints_set_week();


--
-- Name: survey_fields survey_fields_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER survey_fields_set_updated_at BEFORE UPDATE ON public.survey_fields FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: surveys surveys_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER surveys_set_updated_at BEFORE UPDATE ON public.surveys FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tasks tasks_children_follow_card; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tasks_children_follow_card AFTER UPDATE OF status ON public.tasks FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status)) EXECUTE FUNCTION public.tasks_children_follow_card();


--
-- Name: tasks tasks_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: chapter_memberships trg_sync_people_membership; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_people_membership AFTER INSERT OR DELETE OR UPDATE ON public.chapter_memberships FOR EACH ROW EXECUTE FUNCTION public.sync_people_membership();


--
-- Name: people trg_sync_person_primary_email; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_person_primary_email AFTER INSERT OR UPDATE OF email ON public.people FOR EACH ROW EXECUTE FUNCTION public.sync_person_primary_email();


--
-- Name: web_traffic web_traffic_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER web_traffic_set_updated_at BEFORE UPDATE ON public.web_traffic FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: access_grants access_grants_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_grants
    ADD CONSTRAINT access_grants_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: access_grants access_grants_sponsor_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_grants
    ADD CONSTRAINT access_grants_sponsor_person_id_fkey FOREIGN KEY (sponsor_person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: access_grants access_grants_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_grants
    ADD CONSTRAINT access_grants_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: ad_campaigns ad_campaigns_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_campaigns
    ADD CONSTRAINT ad_campaigns_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.ad_accounts(id) ON DELETE CASCADE;


--
-- Name: ad_campaigns ad_campaigns_marketing_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_campaigns
    ADD CONSTRAINT ad_campaigns_marketing_campaign_id_fkey FOREIGN KEY (marketing_campaign_id) REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL;


--
-- Name: ad_insights ad_insights_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_insights
    ADD CONSTRAINT ad_insights_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.ad_campaigns(id) ON DELETE CASCADE;


--
-- Name: applications applications_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: approvals approvals_approver_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_approver_person_id_fkey FOREIGN KEY (approver_person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: approvals approvals_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: approvals approvals_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: automation_effects automation_effects_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_effects
    ADD CONSTRAINT automation_effects_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.routine_runs(id) ON DELETE SET NULL;


--
-- Name: blog_posts blog_posts_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: blog_posts blog_posts_marketing_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_marketing_content_id_fkey FOREIGN KEY (marketing_content_id) REFERENCES public.marketing_content(id) ON DELETE SET NULL;


--
-- Name: board_appointments board_appointments_board_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_appointments
    ADD CONSTRAINT board_appointments_board_role_id_fkey FOREIGN KEY (board_role_id) REFERENCES public.board_roles(id) ON DELETE RESTRICT;


--
-- Name: board_appointments board_appointments_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_appointments
    ADD CONSTRAINT board_appointments_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: board_columns board_columns_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_columns
    ADD CONSTRAINT board_columns_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;


--
-- Name: board_members board_members_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_members
    ADD CONSTRAINT board_members_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;


--
-- Name: board_members board_members_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_members
    ADD CONSTRAINT board_members_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: board_prework_responses board_prework_responses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_prework_responses
    ADD CONSTRAINT board_prework_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: board_priorities board_priorities_board_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_priorities
    ADD CONSTRAINT board_priorities_board_appointment_id_fkey FOREIGN KEY (board_appointment_id) REFERENCES public.board_appointments(id) ON DELETE CASCADE;


--
-- Name: board_priorities board_priorities_chapter_priority_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_priorities
    ADD CONSTRAINT board_priorities_chapter_priority_id_fkey FOREIGN KEY (chapter_priority_id) REFERENCES public.chapter_priorities(id) ON DELETE SET NULL;


--
-- Name: board_priorities board_priorities_key_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_priorities
    ADD CONSTRAINT board_priorities_key_result_id_fkey FOREIGN KEY (key_result_id) REFERENCES public.key_results(id) ON DELETE SET NULL;


--
-- Name: board_priorities board_priorities_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_priorities
    ADD CONSTRAINT board_priorities_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE SET NULL;


--
-- Name: boards boards_client_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_client_company_id_fkey FOREIGN KEY (client_company_id) REFERENCES public.companies(id);


--
-- Name: boards boards_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.people(id);


--
-- Name: book_chapters book_chapters_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_chapters
    ADD CONSTRAINT book_chapters_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: books books_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: brand_contacts brand_contacts_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_contacts
    ADD CONSTRAINT brand_contacts_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;


--
-- Name: brand_contacts brand_contacts_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_contacts
    ADD CONSTRAINT brand_contacts_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: brand_profiles brand_profiles_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_profiles
    ADD CONSTRAINT brand_profiles_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;


--
-- Name: chapter_memberships chapter_memberships_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_memberships
    ADD CONSTRAINT chapter_memberships_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE RESTRICT;


--
-- Name: chapter_memberships chapter_memberships_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_memberships
    ADD CONSTRAINT chapter_memberships_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: chapter_memberships chapter_memberships_relationship_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_memberships
    ADD CONSTRAINT chapter_memberships_relationship_manager_id_fkey FOREIGN KEY (relationship_manager_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: chapter_photos chapter_photos_uploaded_by_profile_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_photos
    ADD CONSTRAINT chapter_photos_uploaded_by_profile_fkey FOREIGN KEY (uploaded_by_profile) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: chapter_photos chapter_photos_uploader_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_photos
    ADD CONSTRAINT chapter_photos_uploader_person_id_fkey FOREIGN KEY (uploader_person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: companies companies_relationship_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_relationship_manager_id_fkey FOREIGN KEY (relationship_manager_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: company_revenue_history company_revenue_history_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_revenue_history
    ADD CONSTRAINT company_revenue_history_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: deal_notes deal_notes_author_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_notes
    ADD CONSTRAINT deal_notes_author_profile_id_fkey FOREIGN KEY (author_profile_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: deals deals_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: deals deals_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: deals deals_relationship_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_relationship_manager_id_fkey FOREIGN KEY (relationship_manager_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: email_agent_skills email_agent_skills_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_agent_skills
    ADD CONSTRAINT email_agent_skills_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.email_agents(id);


--
-- Name: email_agents email_agents_audience_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_agents
    ADD CONSTRAINT email_agents_audience_id_fkey FOREIGN KEY (audience_id) REFERENCES public.email_audiences(id);


--
-- Name: email_agents email_agents_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_agents
    ADD CONSTRAINT email_agents_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: email_campaign_recipients email_campaign_recipients_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_campaign_recipients
    ADD CONSTRAINT email_campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id) ON DELETE CASCADE;


--
-- Name: email_campaign_recipients email_campaign_recipients_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_campaign_recipients
    ADD CONSTRAINT email_campaign_recipients_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id);


--
-- Name: email_campaigns email_campaigns_audience_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_campaigns
    ADD CONSTRAINT email_campaigns_audience_id_fkey FOREIGN KEY (audience_id) REFERENCES public.email_audiences(id);


--
-- Name: email_campaigns email_campaigns_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_campaigns
    ADD CONSTRAINT email_campaigns_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;


--
-- Name: email_campaigns email_campaigns_marketing_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_campaigns
    ADD CONSTRAINT email_campaigns_marketing_campaign_id_fkey FOREIGN KEY (marketing_campaign_id) REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL;


--
-- Name: email_campaigns email_campaigns_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_campaigns
    ADD CONSTRAINT email_campaigns_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.email_series(id);


--
-- Name: email_events email_events_campaign_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT email_events_campaign_fk FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id) ON DELETE SET NULL;


--
-- Name: email_events email_events_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT email_events_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.email_messages(id) ON DELETE SET NULL;


--
-- Name: email_events email_events_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT email_events_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id);


--
-- Name: email_messages email_messages_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.email_agents(id);


--
-- Name: email_messages email_messages_interaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_interaction_id_fkey FOREIGN KEY (interaction_id) REFERENCES public.interactions(id);


--
-- Name: email_messages email_messages_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id);


--
-- Name: email_messages email_messages_routine_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_routine_run_id_fkey FOREIGN KEY (routine_run_id) REFERENCES public.routine_runs(id);


--
-- Name: email_messages email_messages_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.email_agent_skills(id);


--
-- Name: email_series email_series_audience_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_series
    ADD CONSTRAINT email_series_audience_id_fkey FOREIGN KEY (audience_id) REFERENCES public.email_audiences(id);


--
-- Name: email_series email_series_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_series
    ADD CONSTRAINT email_series_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: epics epics_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epics
    ADD CONSTRAINT epics_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;


--
-- Name: event_feedback event_feedback_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_feedback
    ADD CONSTRAINT event_feedback_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_feedback event_feedback_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_feedback
    ADD CONSTRAINT event_feedback_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: event_materials event_materials_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_materials
    ADD CONSTRAINT event_materials_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_materials event_materials_uploaded_by_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_materials
    ADD CONSTRAINT event_materials_uploaded_by_person_id_fkey FOREIGN KEY (uploaded_by_person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: event_payment_currency_reconciliation_approvals event_payment_currency_reconciliation_approvals_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment_currency_reconciliation_approvals
    ADD CONSTRAINT event_payment_currency_reconciliation_approvals_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.event_payment_currency_reconciliation_batches(id) ON DELETE RESTRICT;


--
-- Name: event_payment_currency_reconciliation_evidence event_payment_currency_reconciliation_evid_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment_currency_reconciliation_evidence
    ADD CONSTRAINT event_payment_currency_reconciliation_evid_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.event_registrations(id) ON DELETE RESTRICT;


--
-- Name: event_payment_currency_reconciliation_evidence event_payment_currency_reconciliation_evidence_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment_currency_reconciliation_evidence
    ADD CONSTRAINT event_payment_currency_reconciliation_evidence_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.event_payment_currency_reconciliation_batches(id) ON DELETE RESTRICT;


--
-- Name: event_payment_currency_repair_audit event_payment_currency_repair_audit_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment_currency_repair_audit
    ADD CONSTRAINT event_payment_currency_repair_audit_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.event_payment_currency_reconciliation_batches(id) ON DELETE RESTRICT;


--
-- Name: event_payment_currency_repair_audit event_payment_currency_repair_audit_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment_currency_repair_audit
    ADD CONSTRAINT event_payment_currency_repair_audit_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES public.event_payment_currency_reconciliation_evidence(id) ON DELETE RESTRICT;


--
-- Name: event_payment_currency_repair_audit event_payment_currency_repair_audit_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment_currency_repair_audit
    ADD CONSTRAINT event_payment_currency_repair_audit_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.event_registrations(id) ON DELETE RESTRICT;


--
-- Name: event_registration_attendees event_registration_attendees_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registration_attendees
    ADD CONSTRAINT event_registration_attendees_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.event_registrations(id) ON DELETE CASCADE;


--
-- Name: event_registrations event_registrations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_registrations event_registrations_invited_by_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_invited_by_person_id_fkey FOREIGN KEY (invited_by_person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: event_registrations event_registrations_invited_by_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_invited_by_registration_id_fkey FOREIGN KEY (invited_by_registration_id) REFERENCES public.event_registrations(id) ON DELETE SET NULL;


--
-- Name: event_registrations event_registrations_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: event_registrations event_registrations_ticket_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES public.event_ticket_types(id) ON DELETE SET NULL;


--
-- Name: event_registrations event_registrations_voucher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.event_vouchers(id) ON DELETE RESTRICT;


--
-- Name: event_reminders_sent event_reminders_sent_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_reminders_sent
    ADD CONSTRAINT event_reminders_sent_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_reminders_sent event_reminders_sent_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_reminders_sent
    ADD CONSTRAINT event_reminders_sent_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: event_ticket_types event_ticket_types_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_ticket_types
    ADD CONSTRAINT event_ticket_types_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_voucher_redemptions event_voucher_redemptions_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_voucher_redemptions
    ADD CONSTRAINT event_voucher_redemptions_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.event_registrations(id) ON DELETE RESTRICT;


--
-- Name: event_voucher_redemptions event_voucher_redemptions_voucher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_voucher_redemptions
    ADD CONSTRAINT event_voucher_redemptions_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.event_vouchers(id) ON DELETE RESTRICT;


--
-- Name: event_voucher_ticket_types event_voucher_ticket_types_ticket_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_voucher_ticket_types
    ADD CONSTRAINT event_voucher_ticket_types_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES public.event_ticket_types(id) ON DELETE RESTRICT;


--
-- Name: event_voucher_ticket_types event_voucher_ticket_types_voucher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_voucher_ticket_types
    ADD CONSTRAINT event_voucher_ticket_types_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.event_vouchers(id) ON DELETE CASCADE;


--
-- Name: event_vouchers event_vouchers_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_vouchers
    ADD CONSTRAINT event_vouchers_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: events events_approved_by_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_approved_by_person_id_fkey FOREIGN KEY (approved_by_person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: events events_my_eo_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_my_eo_group_id_fkey FOREIGN KEY (my_eo_group_id) REFERENCES public.my_eo_groups(id) ON DELETE SET NULL;


--
-- Name: events events_recap_source_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_recap_source_post_id_fkey FOREIGN KEY (recap_source_post_id) REFERENCES public.blog_posts(id) ON DELETE SET NULL;


--
-- Name: events events_submitted_by_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_submitted_by_person_id_fkey FOREIGN KEY (submitted_by_person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: forum_constitutions forum_constitutions_forum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitutions
    ADD CONSTRAINT forum_constitutions_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id) ON DELETE CASCADE;


--
-- Name: forum_constitutions forum_constitutions_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitutions
    ADD CONSTRAINT forum_constitutions_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: forums forums_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forums
    ADD CONSTRAINT forums_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: global_event_participation global_event_participation_created_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_event_participation
    ADD CONSTRAINT global_event_participation_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: global_event_participation global_event_participation_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_event_participation
    ADD CONSTRAINT global_event_participation_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: global_event_participation global_event_participation_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_event_participation
    ADD CONSTRAINT global_event_participation_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: global_event_participation global_event_participation_removed_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_event_participation
    ADD CONSTRAINT global_event_participation_removed_by_profile_id_fkey FOREIGN KEY (removed_by_profile_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: global_event_participation global_event_participation_updated_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_event_participation
    ADD CONSTRAINT global_event_participation_updated_by_profile_id_fkey FOREIGN KEY (updated_by_profile_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: inquiries inquiries_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: interactions interactions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: interactions interactions_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: issues issues_assignee_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_assignee_person_id_fkey FOREIGN KEY (assignee_person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: issues issues_key_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_key_result_id_fkey FOREIGN KEY (key_result_id) REFERENCES public.key_results(id) ON DELETE SET NULL;


--
-- Name: key_results key_results_accountable_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_results
    ADD CONSTRAINT key_results_accountable_person_id_fkey FOREIGN KEY (accountable_person_id) REFERENCES public.people(id) ON DELETE RESTRICT;


--
-- Name: key_results key_results_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_results
    ADD CONSTRAINT key_results_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: kr_logs kr_logs_author_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kr_logs
    ADD CONSTRAINT kr_logs_author_person_id_fkey FOREIGN KEY (author_person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: kr_logs kr_logs_key_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kr_logs
    ADD CONSTRAINT kr_logs_key_result_id_fkey FOREIGN KEY (key_result_id) REFERENCES public.key_results(id) ON DELETE CASCADE;


--
-- Name: marketing_asset_images marketing_asset_images_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_asset_images
    ADD CONSTRAINT marketing_asset_images_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.marketing_content(id) ON DELETE CASCADE;


--
-- Name: marketing_content marketing_calendar_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_content
    ADD CONSTRAINT marketing_calendar_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;


--
-- Name: marketing_content marketing_calendar_broadcast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_content
    ADD CONSTRAINT marketing_calendar_broadcast_id_fkey FOREIGN KEY (broadcast_id) REFERENCES public.email_campaigns(id) ON DELETE SET NULL;


--
-- Name: marketing_content marketing_calendar_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_content
    ADD CONSTRAINT marketing_calendar_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL;


--
-- Name: marketing_content marketing_calendar_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_content
    ADD CONSTRAINT marketing_calendar_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.marketing_content(id) ON DELETE SET NULL;


--
-- Name: marketing_content marketing_calendar_pillar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_content
    ADD CONSTRAINT marketing_calendar_pillar_id_fkey FOREIGN KEY (pillar_id) REFERENCES public.marketing_pillars(id) ON DELETE SET NULL;


--
-- Name: marketing_campaigns marketing_campaigns_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;


--
-- Name: marketing_campaigns marketing_campaigns_pillar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_pillar_id_fkey FOREIGN KEY (pillar_id) REFERENCES public.marketing_pillars(id) ON DELETE SET NULL;


--
-- Name: marketing_pillars marketing_pillars_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_pillars
    ADD CONSTRAINT marketing_pillars_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;


--
-- Name: mcp_tool_calls mcp_tool_calls_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_tool_calls
    ADD CONSTRAINT mcp_tool_calls_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id);


--
-- Name: meeting_agenda_items meeting_agenda_items_added_by_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_agenda_items
    ADD CONSTRAINT meeting_agenda_items_added_by_person_id_fkey FOREIGN KEY (added_by_person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: meeting_agenda_items meeting_agenda_items_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_agenda_items
    ADD CONSTRAINT meeting_agenda_items_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE SET NULL;


--
-- Name: meeting_agenda_items meeting_agenda_items_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_agenda_items
    ADD CONSTRAINT meeting_agenda_items_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.board_meetings(id) ON DELETE CASCADE;


--
-- Name: meeting_ratings meeting_ratings_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_ratings
    ADD CONSTRAINT meeting_ratings_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.board_meetings(id) ON DELETE CASCADE;


--
-- Name: meeting_ratings meeting_ratings_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_ratings
    ADD CONSTRAINT meeting_ratings_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: meeting_update_comments meeting_update_comments_author_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_update_comments
    ADD CONSTRAINT meeting_update_comments_author_person_id_fkey FOREIGN KEY (author_person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: meeting_update_comments meeting_update_comments_update_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_update_comments
    ADD CONSTRAINT meeting_update_comments_update_id_fkey FOREIGN KEY (update_id) REFERENCES public.meeting_updates(id) ON DELETE CASCADE;


--
-- Name: meeting_updates meeting_updates_board_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_updates
    ADD CONSTRAINT meeting_updates_board_role_id_fkey FOREIGN KEY (board_role_id) REFERENCES public.board_roles(id) ON DELETE RESTRICT;


--
-- Name: meeting_updates meeting_updates_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_updates
    ADD CONSTRAINT meeting_updates_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.board_meetings(id) ON DELETE CASCADE;


--
-- Name: meeting_updates meeting_updates_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_updates
    ADD CONSTRAINT meeting_updates_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: member_companies member_companies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_companies
    ADD CONSTRAINT member_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: member_companies member_companies_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_companies
    ADD CONSTRAINT member_companies_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: member_photos member_photos_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_photos
    ADD CONSTRAINT member_photos_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: member_relationships member_relationships_member_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_relationships
    ADD CONSTRAINT member_relationships_member_person_id_fkey FOREIGN KEY (member_person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: member_relationships member_relationships_related_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_relationships
    ADD CONSTRAINT member_relationships_related_person_id_fkey FOREIGN KEY (related_person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: member_renewals member_renewals_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_renewals
    ADD CONSTRAINT member_renewals_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: member_requalifications member_requalifications_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_requalifications
    ADD CONSTRAINT member_requalifications_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: member_signal_overrides member_signal_overrides_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_signal_overrides
    ADD CONSTRAINT member_signal_overrides_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: notification_queue notification_queue_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_queue
    ADD CONSTRAINT notification_queue_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: objectives objectives_owner_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_owner_person_id_fkey FOREIGN KEY (owner_person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: objectives objectives_parent_kr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_parent_kr_id_fkey FOREIGN KEY (parent_kr_id) REFERENCES public.key_results(id) ON DELETE SET NULL;


--
-- Name: objectives objectives_strategy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_strategy_id_fkey FOREIGN KEY (strategy_id) REFERENCES public.strategies(id) ON DELETE SET NULL;


--
-- Name: people people_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: people people_forum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id) ON DELETE SET NULL;


--
-- Name: people people_relationship_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_relationship_manager_id_fkey FOREIGN KEY (relationship_manager_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: people people_slp_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_slp_partner_id_fkey FOREIGN KEY (slp_partner_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: person_emails person_emails_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_emails
    ADD CONSTRAINT person_emails_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: revenue_verifications revenue_verifications_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_verifications
    ADD CONSTRAINT revenue_verifications_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: routine_config routine_config_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routine_config
    ADD CONSTRAINT routine_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: sap_deal_stage_events sap_deal_stage_events_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_deal_stage_events
    ADD CONSTRAINT sap_deal_stage_events_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: sap_deal_stage_events sap_deal_stage_events_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_deal_stage_events
    ADD CONSTRAINT sap_deal_stage_events_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.sap_deals(id) ON DELETE CASCADE;


--
-- Name: sap_deals sap_deals_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_deals
    ADD CONSTRAINT sap_deals_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: sap_deals sap_deals_referred_by_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_deals
    ADD CONSTRAINT sap_deals_referred_by_person_id_fkey FOREIGN KEY (referred_by_person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: social_posts social_posts_marketing_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_marketing_campaign_id_fkey FOREIGN KEY (marketing_campaign_id) REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL;


--
-- Name: sprints sprints_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprints
    ADD CONSTRAINT sprints_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;


--
-- Name: survey_answers survey_answers_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_answers
    ADD CONSTRAINT survey_answers_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.survey_fields(id) ON DELETE CASCADE;


--
-- Name: survey_answers survey_answers_response_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_answers
    ADD CONSTRAINT survey_answers_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.survey_responses(id) ON DELETE CASCADE;


--
-- Name: survey_fields survey_fields_survey_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_fields
    ADD CONSTRAINT survey_fields_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE;


--
-- Name: survey_response_topics survey_response_topics_response_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_response_topics
    ADD CONSTRAINT survey_response_topics_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.survey_responses(id) ON DELETE CASCADE;


--
-- Name: survey_responses survey_responses_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: survey_responses survey_responses_survey_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE;


--
-- Name: taggables taggables_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taggables
    ADD CONSTRAINT taggables_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: task_attachments task_attachments_archived_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: task_attachments task_attachments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_attachments task_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: task_comments task_comments_author_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_author_person_id_fkey FOREIGN KEY (author_person_id) REFERENCES public.people(id);


--
-- Name: task_comments task_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.task_comments(id) ON DELETE CASCADE;


--
-- Name: task_comments task_comments_resolved_by_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_resolved_by_person_id_fkey FOREIGN KEY (resolved_by_person_id) REFERENCES public.people(id);


--
-- Name: task_comments task_comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_stage_log task_stage_log_from_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_stage_log
    ADD CONSTRAINT task_stage_log_from_column_id_fkey FOREIGN KEY (from_column_id) REFERENCES public.board_columns(id);


--
-- Name: task_stage_log task_stage_log_from_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_stage_log
    ADD CONSTRAINT task_stage_log_from_sprint_id_fkey FOREIGN KEY (from_sprint_id) REFERENCES public.sprints(id);


--
-- Name: task_stage_log task_stage_log_moved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_stage_log
    ADD CONSTRAINT task_stage_log_moved_by_fkey FOREIGN KEY (moved_by) REFERENCES public.people(id);


--
-- Name: task_stage_log task_stage_log_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_stage_log
    ADD CONSTRAINT task_stage_log_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_stage_log task_stage_log_to_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_stage_log
    ADD CONSTRAINT task_stage_log_to_column_id_fkey FOREIGN KEY (to_column_id) REFERENCES public.board_columns(id);


--
-- Name: task_stage_log task_stage_log_to_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_stage_log
    ADD CONSTRAINT task_stage_log_to_sprint_id_fkey FOREIGN KEY (to_sprint_id) REFERENCES public.sprints(id);


--
-- Name: tasks tasks_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.people(id) ON DELETE RESTRICT;


--
-- Name: tasks tasks_board_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_board_column_id_fkey FOREIGN KEY (board_column_id) REFERENCES public.board_columns(id);


--
-- Name: tasks tasks_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_id_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_parent_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES public.sprints(id);


--
-- Name: team_members team_members_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.team_members(id) ON DELETE SET NULL;


--
-- Name: team_members team_members_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.user_profiles(id);


--
-- Name: user_profiles user_profiles_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id);


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: access_grants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_insights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_insights ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_calls; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_calls ENABLE ROW LEVEL SECURITY;

--
-- Name: applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

--
-- Name: approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: automation_effects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.automation_effects ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: board_appointments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.board_appointments ENABLE ROW LEVEL SECURITY;

--
-- Name: board_columns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;

--
-- Name: board_meetings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.board_meetings ENABLE ROW LEVEL SECURITY;

--
-- Name: board_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

--
-- Name: board_prework_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.board_prework_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: board_priorities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.board_priorities ENABLE ROW LEVEL SECURITY;

--
-- Name: board_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.board_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: boards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

--
-- Name: book_chapters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.book_chapters ENABLE ROW LEVEL SECURITY;

--
-- Name: books; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: brands; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

--
-- Name: chapter_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chapter_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: chapter_memberships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chapter_memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: chapter_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chapter_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: chapter_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chapter_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: chapter_priorities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chapter_priorities ENABLE ROW LEVEL SECURITY;

--
-- Name: chapters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

--
-- Name: chapters chapters_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chapters_public_read ON public.chapters FOR SELECT TO authenticated, anon USING (true);


--
-- Name: chatbot_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chatbot_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_accounts chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.ad_accounts FOR SELECT TO chatbot_reader USING (true);


--
-- Name: ad_campaigns chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.ad_campaigns FOR SELECT TO chatbot_reader USING (true);


--
-- Name: ad_insights chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.ad_insights FOR SELECT TO chatbot_reader USING (true);


--
-- Name: applications chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.applications FOR SELECT TO chatbot_reader USING (true);


--
-- Name: blog_posts chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.blog_posts FOR SELECT TO chatbot_reader USING (true);


--
-- Name: board_appointments chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.board_appointments FOR SELECT TO chatbot_reader USING (true);


--
-- Name: board_columns chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.board_columns FOR SELECT TO chatbot_reader USING (true);


--
-- Name: board_meetings chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.board_meetings FOR SELECT TO chatbot_reader USING (true);


--
-- Name: board_members chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.board_members FOR SELECT TO chatbot_reader USING (true);


--
-- Name: board_priorities chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.board_priorities FOR SELECT TO chatbot_reader USING (true);


--
-- Name: board_roles chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.board_roles FOR SELECT TO chatbot_reader USING (true);


--
-- Name: boards chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.boards FOR SELECT TO chatbot_reader USING (true);


--
-- Name: book_chapters chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.book_chapters FOR SELECT TO chatbot_reader USING (true);


--
-- Name: books chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.books FOR SELECT TO chatbot_reader USING (true);


--
-- Name: brand_contacts chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.brand_contacts FOR SELECT TO chatbot_reader USING (true);


--
-- Name: brand_profiles chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.brand_profiles FOR SELECT TO chatbot_reader USING (true);


--
-- Name: brands chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.brands FOR SELECT TO chatbot_reader USING (true);


--
-- Name: chapter_goals chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.chapter_goals FOR SELECT TO chatbot_reader USING (true);


--
-- Name: chapter_memberships chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.chapter_memberships FOR SELECT TO chatbot_reader USING (true);


--
-- Name: chapter_metrics chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.chapter_metrics FOR SELECT TO chatbot_reader USING (true);


--
-- Name: chapter_priorities chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.chapter_priorities FOR SELECT TO chatbot_reader USING (true);


--
-- Name: chapters chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.chapters FOR SELECT TO chatbot_reader USING (true);


--
-- Name: companies chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.companies FOR SELECT TO chatbot_reader USING (true);


--
-- Name: deal_notes chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.deal_notes FOR SELECT TO chatbot_reader USING (true);


--
-- Name: deals chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.deals FOR SELECT TO chatbot_reader USING (true);


--
-- Name: email_audiences chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.email_audiences FOR SELECT TO chatbot_reader USING (true);


--
-- Name: email_campaign_recipients chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.email_campaign_recipients FOR SELECT TO chatbot_reader USING (true);


--
-- Name: email_campaigns chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.email_campaigns FOR SELECT TO chatbot_reader USING (true);


--
-- Name: email_events chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.email_events FOR SELECT TO chatbot_reader USING (true);


--
-- Name: email_messages chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.email_messages FOR SELECT TO chatbot_reader USING (true);


--
-- Name: email_series chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.email_series FOR SELECT TO chatbot_reader USING (true);


--
-- Name: epics chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.epics FOR SELECT TO chatbot_reader USING (true);


--
-- Name: event_feedback chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.event_feedback FOR SELECT TO chatbot_reader USING (true);


--
-- Name: event_materials chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.event_materials FOR SELECT TO chatbot_reader USING (true);


--
-- Name: event_registration_attendees chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.event_registration_attendees FOR SELECT TO chatbot_reader USING (true);


--
-- Name: event_registrations chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.event_registrations FOR SELECT TO chatbot_reader USING (true);


--
-- Name: event_reminders_sent chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.event_reminders_sent FOR SELECT TO chatbot_reader USING (true);


--
-- Name: event_ticket_types chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.event_ticket_types FOR SELECT TO chatbot_reader USING (true);


--
-- Name: event_voucher_redemptions chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.event_voucher_redemptions FOR SELECT TO chatbot_reader USING (true);


--
-- Name: event_voucher_ticket_types chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.event_voucher_ticket_types FOR SELECT TO chatbot_reader USING (true);


--
-- Name: event_vouchers chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.event_vouchers FOR SELECT TO chatbot_reader USING (true);


--
-- Name: events chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.events FOR SELECT TO chatbot_reader USING (true);


--
-- Name: forums chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.forums FOR SELECT TO chatbot_reader USING (true);


--
-- Name: global_event_participation chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.global_event_participation FOR SELECT TO chatbot_reader USING (true);


--
-- Name: inquiries chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.inquiries FOR SELECT TO chatbot_reader USING (true);


--
-- Name: interactions chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.interactions FOR SELECT TO chatbot_reader USING (true);


--
-- Name: issues chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.issues FOR SELECT TO chatbot_reader USING (true);


--
-- Name: key_results chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.key_results FOR SELECT TO chatbot_reader USING (true);


--
-- Name: kr_logs chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.kr_logs FOR SELECT TO chatbot_reader USING (true);


--
-- Name: long_term_plan_metrics chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.long_term_plan_metrics FOR SELECT TO chatbot_reader USING (true);


--
-- Name: long_term_plan_statements chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.long_term_plan_statements FOR SELECT TO chatbot_reader USING (true);


--
-- Name: marketing_asset_images chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.marketing_asset_images FOR SELECT TO chatbot_reader USING (true);


--
-- Name: marketing_campaigns chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.marketing_campaigns FOR SELECT TO chatbot_reader USING (true);


--
-- Name: marketing_channel_metrics chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.marketing_channel_metrics FOR SELECT TO chatbot_reader USING (true);


--
-- Name: marketing_content chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.marketing_content FOR SELECT TO chatbot_reader USING (true);


--
-- Name: marketing_pillars chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.marketing_pillars FOR SELECT TO chatbot_reader USING (true);


--
-- Name: marketing_recaps chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.marketing_recaps FOR SELECT TO chatbot_reader USING (true);


--
-- Name: meeting_agenda_items chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.meeting_agenda_items FOR SELECT TO chatbot_reader USING (true);


--
-- Name: meeting_ratings chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.meeting_ratings FOR SELECT TO chatbot_reader USING (true);


--
-- Name: meeting_update_comments chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.meeting_update_comments FOR SELECT TO chatbot_reader USING (true);


--
-- Name: meeting_updates chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.meeting_updates FOR SELECT TO chatbot_reader USING (true);


--
-- Name: member_companies chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.member_companies FOR SELECT TO chatbot_reader USING (true);


--
-- Name: member_photos chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.member_photos FOR SELECT TO chatbot_reader USING (true);


--
-- Name: member_relationships chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.member_relationships FOR SELECT TO chatbot_reader USING (true);


--
-- Name: member_renewals chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.member_renewals FOR SELECT TO chatbot_reader USING (true);


--
-- Name: member_requalifications chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.member_requalifications FOR SELECT TO chatbot_reader USING (true);


--
-- Name: member_signal_overrides chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.member_signal_overrides FOR SELECT TO chatbot_reader USING (true);


--
-- Name: my_eo_groups chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.my_eo_groups FOR SELECT TO chatbot_reader USING (true);


--
-- Name: newsletters chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.newsletters FOR SELECT TO chatbot_reader USING (true);


--
-- Name: objectives chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.objectives FOR SELECT TO chatbot_reader USING (true);


--
-- Name: people chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.people FOR SELECT TO chatbot_reader USING (true);


--
-- Name: sap_deal_stage_events chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.sap_deal_stage_events FOR SELECT TO chatbot_reader USING (true);


--
-- Name: sap_deals chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.sap_deals FOR SELECT TO chatbot_reader USING (true);


--
-- Name: short_links chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.short_links FOR SELECT TO chatbot_reader USING (true);


--
-- Name: social_posts chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.social_posts FOR SELECT TO chatbot_reader USING (true);


--
-- Name: sprints chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.sprints FOR SELECT TO chatbot_reader USING (true);


--
-- Name: strategies chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.strategies FOR SELECT TO chatbot_reader USING (true);


--
-- Name: survey_answers chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.survey_answers FOR SELECT TO chatbot_reader USING (true);


--
-- Name: survey_fields chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.survey_fields FOR SELECT TO chatbot_reader USING (true);


--
-- Name: survey_response_topics chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.survey_response_topics FOR SELECT TO chatbot_reader USING (true);


--
-- Name: survey_responses chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.survey_responses FOR SELECT TO chatbot_reader USING (true);


--
-- Name: surveys chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.surveys FOR SELECT TO chatbot_reader USING (true);


--
-- Name: taggables chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.taggables FOR SELECT TO chatbot_reader USING (true);


--
-- Name: tags chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.tags FOR SELECT TO chatbot_reader USING (true);


--
-- Name: task_attachments chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.task_attachments FOR SELECT TO chatbot_reader USING (true);


--
-- Name: task_comments chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.task_comments FOR SELECT TO chatbot_reader USING (true);


--
-- Name: task_stage_log chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.task_stage_log FOR SELECT TO chatbot_reader USING (true);


--
-- Name: tasks chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.tasks FOR SELECT TO chatbot_reader USING (true);


--
-- Name: team_members chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.team_members FOR SELECT TO chatbot_reader USING (true);


--
-- Name: web_traffic chatbot_reader_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chatbot_reader_select ON public.web_traffic FOR SELECT TO chatbot_reader USING (true);


--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: company_revenue_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_revenue_history ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: deals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

--
-- Name: email_agent_skills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_agent_skills ENABLE ROW LEVEL SECURITY;

--
-- Name: email_agents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_agents ENABLE ROW LEVEL SECURITY;

--
-- Name: email_audiences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_audiences ENABLE ROW LEVEL SECURITY;

--
-- Name: email_campaign_recipients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

--
-- Name: email_campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: email_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

--
-- Name: email_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: email_series; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_series ENABLE ROW LEVEL SECURITY;

--
-- Name: epics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;

--
-- Name: event_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: event_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: event_materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_materials ENABLE ROW LEVEL SECURITY;

--
-- Name: event_outbox; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_outbox ENABLE ROW LEVEL SECURITY;

--
-- Name: event_payment_currency_reconciliation_approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_payment_currency_reconciliation_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: event_payment_currency_reconciliation_batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_payment_currency_reconciliation_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: event_payment_currency_reconciliation_evidence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_payment_currency_reconciliation_evidence ENABLE ROW LEVEL SECURITY;

--
-- Name: event_payment_currency_repair_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_payment_currency_repair_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: event_registration_attendees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_registration_attendees ENABLE ROW LEVEL SECURITY;

--
-- Name: event_registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: event_reminders_sent; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_reminders_sent ENABLE ROW LEVEL SECURITY;

--
-- Name: event_ticket_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_ticket_types ENABLE ROW LEVEL SECURITY;

--
-- Name: event_voucher_redemptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_voucher_redemptions ENABLE ROW LEVEL SECURITY;

--
-- Name: event_voucher_ticket_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_voucher_ticket_types ENABLE ROW LEVEL SECURITY;

--
-- Name: event_vouchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_vouchers ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_constitutions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_constitutions ENABLE ROW LEVEL SECURITY;

--
-- Name: forums; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;

--
-- Name: global_event_participation; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_event_participation ENABLE ROW LEVEL SECURITY;

--
-- Name: inquiries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

--
-- Name: interactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

--
-- Name: issues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

--
-- Name: key_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;

--
-- Name: kr_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kr_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: long_term_plan_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.long_term_plan_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: long_term_plan_statements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.long_term_plan_statements ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_asset_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketing_asset_images ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_channel_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketing_channel_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketing_content ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_pillars; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketing_pillars ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_recaps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketing_recaps ENABLE ROW LEVEL SECURITY;

--
-- Name: mcp_tool_calls; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mcp_tool_calls ENABLE ROW LEVEL SECURITY;

--
-- Name: meeting_agenda_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;

--
-- Name: meeting_ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meeting_ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: meeting_update_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meeting_update_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: meeting_updates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meeting_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: member_companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_companies ENABLE ROW LEVEL SECURITY;

--
-- Name: member_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: member_relationships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_relationships ENABLE ROW LEVEL SECURITY;

--
-- Name: member_renewals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_renewals ENABLE ROW LEVEL SECURITY;

--
-- Name: member_requalifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_requalifications ENABLE ROW LEVEL SECURITY;

--
-- Name: member_signal_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_signal_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: my_eo_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.my_eo_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: newsletters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: objectives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;

--
-- Name: people; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

--
-- Name: person_emails; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.person_emails ENABLE ROW LEVEL SECURITY;

--
-- Name: board_appointments public read board_appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read board_appointments" ON public.board_appointments FOR SELECT USING (true);


--
-- Name: board_roles public read board_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read board_roles" ON public.board_roles FOR SELECT USING (true);


--
-- Name: member_photos public read member_photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read member_photos" ON public.member_photos FOR SELECT USING (true);


--
-- Name: revenue_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.revenue_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: routine_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.routine_config ENABLE ROW LEVEL SECURITY;

--
-- Name: routine_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.routine_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: sap_deal_stage_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sap_deal_stage_events ENABLE ROW LEVEL SECURITY;

--
-- Name: sap_deals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sap_deals ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY self_read ON public.user_profiles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: short_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

--
-- Name: social_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: sprints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

--
-- Name: strategies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_fields; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_fields ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_response_topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_response_topics ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: surveys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

--
-- Name: taggables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.taggables ENABLE ROW LEVEL SECURITY;

--
-- Name: tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

--
-- Name: task_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: task_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: task_stage_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_stage_log ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: web_traffic; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.web_traffic ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO chatbot_reader;


--
-- Name: FUNCTION append_task_position(p_board_id uuid, p_column_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.append_task_position(p_board_id uuid, p_column_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.append_task_position(p_board_id uuid, p_column_id uuid) TO service_role;


--
-- Name: FUNCTION attach_standard_checkout_session(p_registration_id uuid, p_stripe_session_id text, p_expected_amount integer, p_expected_currency text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.attach_standard_checkout_session(p_registration_id uuid, p_stripe_session_id text, p_expected_amount integer, p_expected_currency text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attach_standard_checkout_session(p_registration_id uuid, p_stripe_session_id text, p_expected_amount integer, p_expected_currency text) TO service_role;


--
-- Name: FUNCTION attach_voucher_checkout_session(p_registration_id uuid, p_stripe_session_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.attach_voucher_checkout_session(p_registration_id uuid, p_stripe_session_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attach_voucher_checkout_session(p_registration_id uuid, p_stripe_session_id text) TO service_role;


--
-- Name: FUNCTION blog_posts_follow_marketing_unpublish(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.blog_posts_follow_marketing_unpublish() FROM PUBLIC;
GRANT ALL ON FUNCTION public.blog_posts_follow_marketing_unpublish() TO service_role;


--
-- Name: FUNCTION bump_short_link_clicks(p_code text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.bump_short_link_clicks(p_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.bump_short_link_clicks(p_code text) TO service_role;


--
-- Name: FUNCTION campaign_recipient_stats(p_campaign_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.campaign_recipient_stats(p_campaign_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.campaign_recipient_stats(p_campaign_id uuid) TO service_role;


--
-- Name: FUNCTION chapter_memberships_sync_person_status(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.chapter_memberships_sync_person_status() FROM PUBLIC;
GRANT ALL ON FUNCTION public.chapter_memberships_sync_person_status() TO service_role;


--
-- Name: FUNCTION claim_campaign_batch(p_campaign_id uuid, p_limit integer, p_reclaim_after interval); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.claim_campaign_batch(p_campaign_id uuid, p_limit integer, p_reclaim_after interval) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_campaign_batch(p_campaign_id uuid, p_limit integer, p_reclaim_after interval) TO service_role;


--
-- Name: FUNCTION claim_effect(p_key text, p_routine text, p_run uuid, p_kind text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.claim_effect(p_key text, p_routine text, p_run uuid, p_kind text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_effect(p_key text, p_routine text, p_run uuid, p_kind text) TO service_role;


--
-- Name: FUNCTION claim_tick(p_routine text, p_tick text, p_mode text, p_host text, p_step_s integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.claim_tick(p_routine text, p_tick text, p_mode text, p_host text, p_step_s integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_tick(p_routine text, p_tick text, p_mode text, p_host text, p_step_s integer) TO service_role;


--
-- Name: FUNCTION close_won_handoff(source_deal_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.close_won_handoff(source_deal_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.close_won_handoff(source_deal_id uuid) TO service_role;


--
-- Name: FUNCTION current_user_role(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.current_user_role() TO anon;
GRANT ALL ON FUNCTION public.current_user_role() TO authenticated;
GRANT ALL ON FUNCTION public.current_user_role() TO service_role;


--
-- Name: FUNCTION derive_membership_status(p_person_id uuid, p_current public.membership_status); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.derive_membership_status(p_person_id uuid, p_current public.membership_status) FROM PUBLIC;
GRANT ALL ON FUNCTION public.derive_membership_status(p_person_id uuid, p_current public.membership_status) TO service_role;


--
-- Name: FUNCTION email_delivery_stats(p_since timestamp with time zone, p_campaign_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.email_delivery_stats(p_since timestamp with time zone, p_campaign_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.email_delivery_stats(p_since timestamp with time zone, p_campaign_id uuid) TO service_role;


--
-- Name: FUNCTION enforce_global_event_participation(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enforce_global_event_participation() FROM PUBLIC;


--
-- Name: FUNCTION event_payment_currency_manifest_fingerprint(p_batch_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.event_payment_currency_manifest_fingerprint(p_batch_id uuid) FROM PUBLIC;


--
-- Name: FUNCTION finalize_event_payment_currency_reconciliation(p_batch_id uuid, p_executed_by text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.finalize_event_payment_currency_reconciliation(p_batch_id uuid, p_executed_by text) FROM PUBLIC;


--
-- Name: FUNCTION finalize_standard_event_registration(p_registration_id uuid, p_stripe_session_id text, p_stripe_payment_intent_id text, p_amount_paid integer, p_currency text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.finalize_standard_event_registration(p_registration_id uuid, p_stripe_session_id text, p_stripe_payment_intent_id text, p_amount_paid integer, p_currency text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.finalize_standard_event_registration(p_registration_id uuid, p_stripe_session_id text, p_stripe_payment_intent_id text, p_amount_paid integer, p_currency text) TO service_role;


--
-- Name: FUNCTION finalize_voucher_registration(p_registration_id uuid, p_stripe_session_id text, p_stripe_payment_intent_id text, p_amount_paid integer, p_currency text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.finalize_voucher_registration(p_registration_id uuid, p_stripe_session_id text, p_stripe_payment_intent_id text, p_amount_paid integer, p_currency text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.finalize_voucher_registration(p_registration_id uuid, p_stripe_session_id text, p_stripe_payment_intent_id text, p_amount_paid integer, p_currency text) TO service_role;


--
-- Name: FUNCTION generate_ticket_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generate_ticket_id() TO anon;
GRANT ALL ON FUNCTION public.generate_ticket_id() TO authenticated;
GRANT ALL ON FUNCTION public.generate_ticket_id() TO service_role;


--
-- Name: FUNCTION increment_blog_view(post_slug text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.increment_blog_view(post_slug text) TO anon;
GRANT ALL ON FUNCTION public.increment_blog_view(post_slug text) TO authenticated;
GRANT ALL ON FUNCTION public.increment_blog_view(post_slug text) TO service_role;


--
-- Name: FUNCTION is_board_or_above(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_board_or_above() TO anon;
GRANT ALL ON FUNCTION public.is_board_or_above() TO authenticated;
GRANT ALL ON FUNCTION public.is_board_or_above() TO service_role;


--
-- Name: FUNCTION is_super_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_super_admin() TO anon;
GRANT ALL ON FUNCTION public.is_super_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_super_admin() TO service_role;


--
-- Name: FUNCTION merge_people(p_keep uuid, p_loser uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.merge_people(p_keep uuid, p_loser uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.merge_people(p_keep uuid, p_loser uuid) TO service_role;


--
-- Name: FUNCTION people_derive_membership_status(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.people_derive_membership_status() FROM PUBLIC;
GRANT ALL ON FUNCTION public.people_derive_membership_status() TO service_role;


--
-- Name: FUNCTION people_fill_source(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.people_fill_source() TO anon;
GRANT ALL ON FUNCTION public.people_fill_source() TO authenticated;
GRANT ALL ON FUNCTION public.people_fill_source() TO service_role;


--
-- Name: FUNCTION prevent_event_payment_currency_approval_mutation(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.prevent_event_payment_currency_approval_mutation() FROM PUBLIC;


--
-- Name: FUNCTION prevent_event_payment_currency_audit_mutation(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.prevent_event_payment_currency_audit_mutation() FROM PUBLIC;


--
-- Name: FUNCTION protect_event_payment_currency_batch(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.protect_event_payment_currency_batch() FROM PUBLIC;


--
-- Name: FUNCTION protect_event_payment_currency_evidence(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.protect_event_payment_currency_evidence() FROM PUBLIC;


--
-- Name: FUNCTION protect_global_event_scope_with_participation(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.protect_global_event_scope_with_participation() FROM PUBLIC;


--
-- Name: FUNCTION protect_standard_checkout_session(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.protect_standard_checkout_session() FROM PUBLIC;


--
-- Name: FUNCTION protect_voucher_price_snapshots(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.protect_voucher_price_snapshots() FROM PUBLIC;


--
-- Name: FUNCTION protect_voucher_redemption_snapshots(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.protect_voucher_redemption_snapshots() FROM PUBLIC;
GRANT ALL ON FUNCTION public.protect_voucher_redemption_snapshots() TO service_role;


--
-- Name: FUNCTION refresh_team_members(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.refresh_team_members() FROM PUBLIC;
GRANT ALL ON FUNCTION public.refresh_team_members() TO service_role;


--
-- Name: FUNCTION refresh_team_members_trigger(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.refresh_team_members_trigger() FROM PUBLIC;
GRANT ALL ON FUNCTION public.refresh_team_members_trigger() TO service_role;


--
-- Name: FUNCTION register_for_event(p_event_id uuid, p_person_id uuid, p_seat_status text, p_guest_count integer, p_ticket_type_id uuid, p_ticket_code text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.register_for_event(p_event_id uuid, p_person_id uuid, p_seat_status text, p_guest_count integer, p_ticket_type_id uuid, p_ticket_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.register_for_event(p_event_id uuid, p_person_id uuid, p_seat_status text, p_guest_count integer, p_ticket_type_id uuid, p_ticket_code text) TO service_role;


--
-- Name: FUNCTION register_myeo_family_day(p_event_id uuid, p_person_id uuid, p_wants_tasting boolean, p_wants_masterclass boolean, p_attendee_count integer, p_ticket_code text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.register_myeo_family_day(p_event_id uuid, p_person_id uuid, p_wants_tasting boolean, p_wants_masterclass boolean, p_attendee_count integer, p_ticket_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.register_myeo_family_day(p_event_id uuid, p_person_id uuid, p_wants_tasting boolean, p_wants_masterclass boolean, p_attendee_count integer, p_ticket_code text) TO service_role;


--
-- Name: FUNCTION register_myeo_family_day_party(p_registration_id uuid, p_event_id uuid, p_person_id uuid, p_wants_tasting boolean, p_wants_masterclass boolean, p_waiver_accepted boolean, p_ticket_code text, p_registration_email text, p_attendees jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.register_myeo_family_day_party(p_registration_id uuid, p_event_id uuid, p_person_id uuid, p_wants_tasting boolean, p_wants_masterclass boolean, p_waiver_accepted boolean, p_ticket_code text, p_registration_email text, p_attendees jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.register_myeo_family_day_party(p_registration_id uuid, p_event_id uuid, p_person_id uuid, p_wants_tasting boolean, p_wants_masterclass boolean, p_waiver_accepted boolean, p_ticket_code text, p_registration_email text, p_attendees jsonb) TO service_role;


--
-- Name: FUNCTION reject_global_event_registration(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.reject_global_event_registration() FROM PUBLIC;


--
-- Name: FUNCTION release_voucher_registration(p_registration_id uuid, p_stripe_session_id text, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.release_voucher_registration(p_registration_id uuid, p_stripe_session_id text, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.release_voucher_registration(p_registration_id uuid, p_stripe_session_id text, p_reason text) TO service_role;


--
-- Name: FUNCTION renew_voucher_checkout_attempt(p_registration_id uuid, p_stripe_session_id text, p_hold_minutes integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.renew_voucher_checkout_attempt(p_registration_id uuid, p_stripe_session_id text, p_hold_minutes integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.renew_voucher_checkout_attempt(p_registration_id uuid, p_stripe_session_id text, p_hold_minutes integer) TO service_role;


--
-- Name: FUNCTION reserve_event_registration_with_voucher(p_event_id uuid, p_person_id uuid, p_primary_email text, p_ticket_type_id uuid, p_voucher_code text, p_guest_count integer, p_ticket_code text, p_hold_minutes integer, p_inviter_ticket_code text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.reserve_event_registration_with_voucher(p_event_id uuid, p_person_id uuid, p_primary_email text, p_ticket_type_id uuid, p_voucher_code text, p_guest_count integer, p_ticket_code text, p_hold_minutes integer, p_inviter_ticket_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reserve_event_registration_with_voucher(p_event_id uuid, p_person_id uuid, p_primary_email text, p_ticket_type_id uuid, p_voucher_code text, p_guest_count integer, p_ticket_code text, p_hold_minutes integer, p_inviter_ticket_code text) TO service_role;


--
-- Name: FUNCTION set_event_registration_inviter(p_registration_id uuid, p_event_id uuid, p_inviter_registration_id uuid, p_expected_inviter_registration_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_event_registration_inviter(p_registration_id uuid, p_event_id uuid, p_inviter_registration_id uuid, p_expected_inviter_registration_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_event_registration_inviter(p_registration_id uuid, p_event_id uuid, p_inviter_registration_id uuid, p_expected_inviter_registration_id uuid) TO service_role;


--
-- Name: FUNCTION set_event_registration_inviter_person(p_registration_id uuid, p_event_id uuid, p_inviter_person_id uuid, p_expected_inviter_person_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_event_registration_inviter_person(p_registration_id uuid, p_event_id uuid, p_inviter_person_id uuid, p_expected_inviter_person_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_event_registration_inviter_person(p_registration_id uuid, p_event_id uuid, p_inviter_person_id uuid, p_expected_inviter_person_id uuid) TO service_role;


--
-- Name: FUNCTION set_event_registration_review(p_registration_id uuid, p_event_id uuid, p_classification text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_event_registration_review(p_registration_id uuid, p_event_id uuid, p_classification text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_event_registration_review(p_registration_id uuid, p_event_id uuid, p_classification text) TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION snapshot_standard_registration_price(p_registration_id uuid, p_amount integer, p_currency text, p_stripe_session_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.snapshot_standard_registration_price(p_registration_id uuid, p_amount integer, p_currency text, p_stripe_session_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.snapshot_standard_registration_price(p_registration_id uuid, p_amount integer, p_currency text, p_stripe_session_id text) TO service_role;


--
-- Name: FUNCTION sprints_set_week(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sprints_set_week() TO anon;
GRANT ALL ON FUNCTION public.sprints_set_week() TO authenticated;
GRANT ALL ON FUNCTION public.sprints_set_week() TO service_role;


--
-- Name: FUNCTION sync_event_registration_inviter_person(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sync_event_registration_inviter_person() FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_event_registration_inviter_person() TO service_role;


--
-- Name: FUNCTION sync_people_membership(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sync_people_membership() TO anon;
GRANT ALL ON FUNCTION public.sync_people_membership() TO authenticated;
GRANT ALL ON FUNCTION public.sync_people_membership() TO service_role;


--
-- Name: FUNCTION sync_person_primary_email(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sync_person_primary_email() FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_person_primary_email() TO service_role;


--
-- Name: FUNCTION tasks_children_follow_card(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tasks_children_follow_card() TO anon;
GRANT ALL ON FUNCTION public.tasks_children_follow_card() TO authenticated;
GRANT ALL ON FUNCTION public.tasks_children_follow_card() TO service_role;


--
-- Name: FUNCTION update_event_voucher_configuration(p_event_id uuid, p_voucher_id uuid, p_code text, p_campaign_label text, p_discount_percent integer, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_discounted_seat_limit integer, p_per_email_seat_limit integer, p_active boolean, p_internal_notes text, p_eligible_ticket_ids uuid[], p_team_invite_enabled boolean, p_allow_rule_changes boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.update_event_voucher_configuration(p_event_id uuid, p_voucher_id uuid, p_code text, p_campaign_label text, p_discount_percent integer, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_discounted_seat_limit integer, p_per_email_seat_limit integer, p_active boolean, p_internal_notes text, p_eligible_ticket_ids uuid[], p_team_invite_enabled boolean, p_allow_rule_changes boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_event_voucher_configuration(p_event_id uuid, p_voucher_id uuid, p_code text, p_campaign_label text, p_discount_percent integer, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_discounted_seat_limit integer, p_per_email_seat_limit integer, p_active boolean, p_internal_notes text, p_eligible_ticket_ids uuid[], p_team_invite_enabled boolean, p_allow_rule_changes boolean) TO service_role;


--
-- Name: FUNCTION validate_event_payment_currency_approval(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.validate_event_payment_currency_approval() FROM PUBLIC;


--
-- Name: FUNCTION validate_event_voucher_ticket_type(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.validate_event_voucher_ticket_type() FROM PUBLIC;
GRANT ALL ON FUNCTION public.validate_event_voucher_ticket_type() TO service_role;


--
-- Name: TABLE access_grants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.access_grants TO service_role;


--
-- Name: TABLE ad_accounts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ad_accounts TO anon;
GRANT ALL ON TABLE public.ad_accounts TO authenticated;
GRANT ALL ON TABLE public.ad_accounts TO service_role;
GRANT SELECT ON TABLE public.ad_accounts TO chatbot_reader;


--
-- Name: TABLE ad_campaigns; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ad_campaigns TO anon;
GRANT ALL ON TABLE public.ad_campaigns TO authenticated;
GRANT ALL ON TABLE public.ad_campaigns TO service_role;
GRANT SELECT ON TABLE public.ad_campaigns TO chatbot_reader;


--
-- Name: TABLE ad_insights; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ad_insights TO anon;
GRANT ALL ON TABLE public.ad_insights TO authenticated;
GRANT ALL ON TABLE public.ad_insights TO service_role;
GRANT SELECT ON TABLE public.ad_insights TO chatbot_reader;


--
-- Name: TABLE applications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.applications TO anon;
GRANT ALL ON TABLE public.applications TO authenticated;
GRANT ALL ON TABLE public.applications TO service_role;
GRANT SELECT ON TABLE public.applications TO chatbot_reader;


--
-- Name: TABLE ad_campaign_roi; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ad_campaign_roi TO service_role;
GRANT SELECT ON TABLE public.ad_campaign_roi TO chatbot_reader;


--
-- Name: TABLE ad_performance_daily; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ad_performance_daily TO service_role;
GRANT SELECT ON TABLE public.ad_performance_daily TO chatbot_reader;


--
-- Name: TABLE ai_calls; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_calls TO service_role;


--
-- Name: TABLE approvals; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.approvals TO service_role;


--
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log TO service_role;


--
-- Name: TABLE automation_effects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.automation_effects TO service_role;


--
-- Name: TABLE blog_posts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.blog_posts TO anon;
GRANT ALL ON TABLE public.blog_posts TO authenticated;
GRANT ALL ON TABLE public.blog_posts TO service_role;
GRANT SELECT ON TABLE public.blog_posts TO chatbot_reader;


--
-- Name: TABLE board_appointments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.board_appointments TO anon;
GRANT ALL ON TABLE public.board_appointments TO authenticated;
GRANT ALL ON TABLE public.board_appointments TO service_role;
GRANT SELECT ON TABLE public.board_appointments TO chatbot_reader;


--
-- Name: TABLE board_columns; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.board_columns TO service_role;
GRANT SELECT ON TABLE public.board_columns TO chatbot_reader;


--
-- Name: TABLE board_meetings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.board_meetings TO anon;
GRANT ALL ON TABLE public.board_meetings TO authenticated;
GRANT ALL ON TABLE public.board_meetings TO service_role;
GRANT SELECT ON TABLE public.board_meetings TO chatbot_reader;


--
-- Name: TABLE board_members; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.board_members TO service_role;
GRANT SELECT ON TABLE public.board_members TO chatbot_reader;


--
-- Name: TABLE board_prework_responses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.board_prework_responses TO service_role;


--
-- Name: TABLE board_priorities; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.board_priorities TO anon;
GRANT ALL ON TABLE public.board_priorities TO authenticated;
GRANT ALL ON TABLE public.board_priorities TO service_role;
GRANT SELECT ON TABLE public.board_priorities TO chatbot_reader;


--
-- Name: TABLE board_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.board_roles TO anon;
GRANT ALL ON TABLE public.board_roles TO authenticated;
GRANT ALL ON TABLE public.board_roles TO service_role;
GRANT SELECT ON TABLE public.board_roles TO chatbot_reader;


--
-- Name: TABLE boards; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.boards TO service_role;
GRANT SELECT ON TABLE public.boards TO chatbot_reader;


--
-- Name: TABLE book_chapters; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.book_chapters TO service_role;
GRANT SELECT ON TABLE public.book_chapters TO chatbot_reader;


--
-- Name: TABLE books; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.books TO service_role;
GRANT SELECT ON TABLE public.books TO chatbot_reader;


--
-- Name: TABLE brand_contacts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.brand_contacts TO service_role;
GRANT SELECT ON TABLE public.brand_contacts TO chatbot_reader;


--
-- Name: TABLE brand_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.brand_profiles TO service_role;
GRANT SELECT ON TABLE public.brand_profiles TO chatbot_reader;


--
-- Name: TABLE brands; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.brands TO service_role;
GRANT SELECT ON TABLE public.brands TO chatbot_reader;


--
-- Name: TABLE chapter_goals; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.chapter_goals TO anon;
GRANT ALL ON TABLE public.chapter_goals TO authenticated;
GRANT ALL ON TABLE public.chapter_goals TO service_role;
GRANT SELECT ON TABLE public.chapter_goals TO chatbot_reader;


--
-- Name: TABLE chapter_memberships; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.chapter_memberships TO anon;
GRANT ALL ON TABLE public.chapter_memberships TO authenticated;
GRANT ALL ON TABLE public.chapter_memberships TO service_role;
GRANT SELECT ON TABLE public.chapter_memberships TO chatbot_reader;


--
-- Name: TABLE chapter_metrics; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.chapter_metrics TO anon;
GRANT ALL ON TABLE public.chapter_metrics TO authenticated;
GRANT ALL ON TABLE public.chapter_metrics TO service_role;
GRANT SELECT ON TABLE public.chapter_metrics TO chatbot_reader;


--
-- Name: TABLE chapter_photos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.chapter_photos TO service_role;


--
-- Name: TABLE chapter_priorities; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.chapter_priorities TO anon;
GRANT ALL ON TABLE public.chapter_priorities TO authenticated;
GRANT ALL ON TABLE public.chapter_priorities TO service_role;
GRANT SELECT ON TABLE public.chapter_priorities TO chatbot_reader;


--
-- Name: TABLE chapters; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.chapters TO anon;
GRANT ALL ON TABLE public.chapters TO authenticated;
GRANT ALL ON TABLE public.chapters TO service_role;
GRANT SELECT ON TABLE public.chapters TO chatbot_reader;


--
-- Name: TABLE chatbot_actions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.chatbot_actions TO anon;
GRANT ALL ON TABLE public.chatbot_actions TO authenticated;
GRANT ALL ON TABLE public.chatbot_actions TO service_role;


--
-- Name: TABLE companies; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.companies TO anon;
GRANT ALL ON TABLE public.companies TO authenticated;
GRANT ALL ON TABLE public.companies TO service_role;


--
-- Name: COLUMN companies.id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(id) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.name; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(name) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.slug; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(slug) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.industry; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(industry) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.website; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(website) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.hubspot_company_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(hubspot_company_id) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.notes; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(notes) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.created_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(created_at) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.updated_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(updated_at) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.employees; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(employees) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.domain; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(domain) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.phone; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(phone) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.address; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(address) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.address2; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(address2) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.city; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(city) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.country; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(country) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.country_code; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(country_code) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.sector; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(sector) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.description; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(description) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.about_us; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(about_us) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.status; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(status) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.founded; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(founded) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.fiscal_year; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(fiscal_year) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.relationship_manager_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(relationship_manager_id) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.last_activity_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(last_activity_at) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.operating_countries; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(operating_countries) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.client_start_date; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(client_start_date) ON TABLE public.companies TO chatbot_reader;


--
-- Name: COLUMN companies.client_end_date; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(client_end_date) ON TABLE public.companies TO chatbot_reader;


--
-- Name: TABLE company_revenue_history; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.company_revenue_history TO anon;
GRANT ALL ON TABLE public.company_revenue_history TO authenticated;
GRANT ALL ON TABLE public.company_revenue_history TO service_role;


--
-- Name: TABLE deal_notes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_notes TO service_role;
GRANT SELECT ON TABLE public.deal_notes TO chatbot_reader;


--
-- Name: TABLE deals; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deals TO anon;
GRANT ALL ON TABLE public.deals TO authenticated;
GRANT ALL ON TABLE public.deals TO service_role;


--
-- Name: COLUMN deals.id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(id) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.person_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(person_id) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.company_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(company_id) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.name; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(name) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.pipeline; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(pipeline) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.stage; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(stage) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.deal_status; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(deal_status) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.amount; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(amount) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.currency; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(currency) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.close_date; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(close_date) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.relationship_manager_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(relationship_manager_id) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.primary_interest; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(primary_interest) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.channel_source; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(channel_source) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.closed_lost_description; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(closed_lost_description) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.closed_lost_reason; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(closed_lost_reason) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.closed_won_reason; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(closed_won_reason) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.disqualification_reason; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(disqualification_reason) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.disqualified_by; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(disqualified_by) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.global_dues; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(global_dues) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.membership_start_date; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(membership_start_date) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.membership_end_date; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(membership_end_date) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.description; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(description) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.ql_financial_commitment; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(ql_financial_commitment) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.ql_founder_controlling_owner; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(ql_founder_controlling_owner) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.ql_revenue_verified; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(ql_revenue_verified) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.ql_time_commitment; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(ql_time_commitment) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.last_activity_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(last_activity_at) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.created_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(created_at) ON TABLE public.deals TO chatbot_reader;


--
-- Name: COLUMN deals.updated_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(updated_at) ON TABLE public.deals TO chatbot_reader;


--
-- Name: TABLE edge8_deals; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.edge8_deals TO service_role;


--
-- Name: TABLE email_agent_skills; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.email_agent_skills TO service_role;


--
-- Name: TABLE email_agents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.email_agents TO service_role;


--
-- Name: TABLE email_audiences; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.email_audiences TO service_role;
GRANT SELECT ON TABLE public.email_audiences TO chatbot_reader;


--
-- Name: TABLE email_campaign_recipients; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.email_campaign_recipients TO service_role;
GRANT SELECT ON TABLE public.email_campaign_recipients TO chatbot_reader;


--
-- Name: TABLE email_campaigns; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.email_campaigns TO anon;
GRANT ALL ON TABLE public.email_campaigns TO authenticated;
GRANT ALL ON TABLE public.email_campaigns TO service_role;
GRANT SELECT ON TABLE public.email_campaigns TO chatbot_reader;


--
-- Name: TABLE email_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.email_events TO service_role;
GRANT SELECT ON TABLE public.email_events TO chatbot_reader;


--
-- Name: TABLE email_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.email_messages TO service_role;
GRANT SELECT ON TABLE public.email_messages TO chatbot_reader;


--
-- Name: TABLE email_series; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.email_series TO service_role;
GRANT SELECT ON TABLE public.email_series TO chatbot_reader;


--
-- Name: TABLE epics; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.epics TO service_role;
GRANT SELECT ON TABLE public.epics TO chatbot_reader;


--
-- Name: TABLE event_deliveries; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.event_deliveries TO service_role;


--
-- Name: TABLE event_feedback; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.event_feedback TO anon;
GRANT ALL ON TABLE public.event_feedback TO authenticated;
GRANT ALL ON TABLE public.event_feedback TO service_role;
GRANT SELECT ON TABLE public.event_feedback TO chatbot_reader;


--
-- Name: TABLE event_materials; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.event_materials TO anon;
GRANT ALL ON TABLE public.event_materials TO authenticated;
GRANT ALL ON TABLE public.event_materials TO service_role;
GRANT SELECT ON TABLE public.event_materials TO chatbot_reader;


--
-- Name: TABLE event_outbox; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.event_outbox TO service_role;


--
-- Name: TABLE event_registration_attendees; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.event_registration_attendees TO anon;
GRANT ALL ON TABLE public.event_registration_attendees TO authenticated;
GRANT ALL ON TABLE public.event_registration_attendees TO service_role;


--
-- Name: COLUMN event_registration_attendees.id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(id) ON TABLE public.event_registration_attendees TO chatbot_reader;


--
-- Name: COLUMN event_registration_attendees.registration_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(registration_id) ON TABLE public.event_registration_attendees TO chatbot_reader;


--
-- Name: COLUMN event_registration_attendees.full_name; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(full_name) ON TABLE public.event_registration_attendees TO chatbot_reader;


--
-- Name: COLUMN event_registration_attendees.email; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(email) ON TABLE public.event_registration_attendees TO chatbot_reader;


--
-- Name: COLUMN event_registration_attendees.phone; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(phone) ON TABLE public.event_registration_attendees TO chatbot_reader;


--
-- Name: COLUMN event_registration_attendees.company; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(company) ON TABLE public.event_registration_attendees TO chatbot_reader;


--
-- Name: COLUMN event_registration_attendees.title; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(title) ON TABLE public.event_registration_attendees TO chatbot_reader;


--
-- Name: COLUMN event_registration_attendees.food_allergy; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(food_allergy) ON TABLE public.event_registration_attendees TO chatbot_reader;


--
-- Name: COLUMN event_registration_attendees.created_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(created_at) ON TABLE public.event_registration_attendees TO chatbot_reader;


--
-- Name: COLUMN event_registration_attendees.role_in_company; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(role_in_company) ON TABLE public.event_registration_attendees TO chatbot_reader;


--
-- Name: TABLE event_registrations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.event_registrations TO anon;
GRANT ALL ON TABLE public.event_registrations TO authenticated;
GRANT ALL ON TABLE public.event_registrations TO service_role;
GRANT SELECT ON TABLE public.event_registrations TO chatbot_reader;


--
-- Name: TABLE event_reminders_sent; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.event_reminders_sent TO anon;
GRANT ALL ON TABLE public.event_reminders_sent TO authenticated;
GRANT ALL ON TABLE public.event_reminders_sent TO service_role;
GRANT SELECT ON TABLE public.event_reminders_sent TO chatbot_reader;


--
-- Name: TABLE event_ticket_types; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.event_ticket_types TO anon;
GRANT ALL ON TABLE public.event_ticket_types TO authenticated;
GRANT ALL ON TABLE public.event_ticket_types TO service_role;
GRANT SELECT ON TABLE public.event_ticket_types TO chatbot_reader;


--
-- Name: TABLE event_voucher_redemptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.event_voucher_redemptions TO anon;
GRANT ALL ON TABLE public.event_voucher_redemptions TO authenticated;
GRANT ALL ON TABLE public.event_voucher_redemptions TO service_role;
GRANT SELECT ON TABLE public.event_voucher_redemptions TO chatbot_reader;


--
-- Name: TABLE event_voucher_ticket_types; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.event_voucher_ticket_types TO anon;
GRANT ALL ON TABLE public.event_voucher_ticket_types TO authenticated;
GRANT ALL ON TABLE public.event_voucher_ticket_types TO service_role;
GRANT SELECT ON TABLE public.event_voucher_ticket_types TO chatbot_reader;


--
-- Name: TABLE event_vouchers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.event_vouchers TO anon;
GRANT ALL ON TABLE public.event_vouchers TO authenticated;
GRANT ALL ON TABLE public.event_vouchers TO service_role;
GRANT SELECT ON TABLE public.event_vouchers TO chatbot_reader;


--
-- Name: TABLE events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;
GRANT SELECT ON TABLE public.events TO chatbot_reader;


--
-- Name: TABLE forum_constitutions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.forum_constitutions TO service_role;


--
-- Name: TABLE forums; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.forums TO anon;
GRANT ALL ON TABLE public.forums TO authenticated;
GRANT ALL ON TABLE public.forums TO service_role;
GRANT SELECT ON TABLE public.forums TO chatbot_reader;


--
-- Name: TABLE global_event_participation; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.global_event_participation TO service_role;
GRANT SELECT ON TABLE public.global_event_participation TO chatbot_reader;


--
-- Name: TABLE inquiries; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inquiries TO anon;
GRANT ALL ON TABLE public.inquiries TO authenticated;
GRANT ALL ON TABLE public.inquiries TO service_role;
GRANT SELECT ON TABLE public.inquiries TO chatbot_reader;


--
-- Name: TABLE interactions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.interactions TO service_role;
GRANT SELECT ON TABLE public.interactions TO chatbot_reader;


--
-- Name: TABLE issues; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.issues TO anon;
GRANT ALL ON TABLE public.issues TO authenticated;
GRANT ALL ON TABLE public.issues TO service_role;
GRANT SELECT ON TABLE public.issues TO chatbot_reader;


--
-- Name: TABLE key_results; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.key_results TO anon;
GRANT ALL ON TABLE public.key_results TO authenticated;
GRANT ALL ON TABLE public.key_results TO service_role;
GRANT SELECT ON TABLE public.key_results TO chatbot_reader;


--
-- Name: TABLE kr_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kr_logs TO anon;
GRANT ALL ON TABLE public.kr_logs TO authenticated;
GRANT ALL ON TABLE public.kr_logs TO service_role;
GRANT SELECT ON TABLE public.kr_logs TO chatbot_reader;


--
-- Name: TABLE long_term_plan_metrics; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.long_term_plan_metrics TO anon;
GRANT ALL ON TABLE public.long_term_plan_metrics TO authenticated;
GRANT ALL ON TABLE public.long_term_plan_metrics TO service_role;
GRANT SELECT ON TABLE public.long_term_plan_metrics TO chatbot_reader;


--
-- Name: TABLE long_term_plan_statements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.long_term_plan_statements TO anon;
GRANT ALL ON TABLE public.long_term_plan_statements TO authenticated;
GRANT ALL ON TABLE public.long_term_plan_statements TO service_role;
GRANT SELECT ON TABLE public.long_term_plan_statements TO chatbot_reader;


--
-- Name: TABLE marketing_asset_images; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.marketing_asset_images TO service_role;
GRANT SELECT ON TABLE public.marketing_asset_images TO chatbot_reader;


--
-- Name: TABLE marketing_campaigns; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.marketing_campaigns TO anon;
GRANT ALL ON TABLE public.marketing_campaigns TO authenticated;
GRANT ALL ON TABLE public.marketing_campaigns TO service_role;
GRANT SELECT ON TABLE public.marketing_campaigns TO chatbot_reader;


--
-- Name: TABLE social_posts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.social_posts TO anon;
GRANT ALL ON TABLE public.social_posts TO authenticated;
GRANT ALL ON TABLE public.social_posts TO service_role;
GRANT SELECT ON TABLE public.social_posts TO chatbot_reader;


--
-- Name: TABLE web_traffic; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.web_traffic TO anon;
GRANT ALL ON TABLE public.web_traffic TO authenticated;
GRANT ALL ON TABLE public.web_traffic TO service_role;
GRANT SELECT ON TABLE public.web_traffic TO chatbot_reader;


--
-- Name: TABLE marketing_campaign_summary; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.marketing_campaign_summary TO service_role;
GRANT SELECT ON TABLE public.marketing_campaign_summary TO chatbot_reader;


--
-- Name: TABLE marketing_channel_metrics; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.marketing_channel_metrics TO anon;
GRANT ALL ON TABLE public.marketing_channel_metrics TO authenticated;
GRANT ALL ON TABLE public.marketing_channel_metrics TO service_role;
GRANT SELECT ON TABLE public.marketing_channel_metrics TO chatbot_reader;


--
-- Name: TABLE marketing_content; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.marketing_content TO service_role;
GRANT SELECT ON TABLE public.marketing_content TO chatbot_reader;


--
-- Name: TABLE marketing_pillars; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.marketing_pillars TO service_role;
GRANT SELECT ON TABLE public.marketing_pillars TO chatbot_reader;


--
-- Name: TABLE marketing_recaps; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.marketing_recaps TO service_role;
GRANT SELECT ON TABLE public.marketing_recaps TO chatbot_reader;


--
-- Name: TABLE mcp_tool_calls; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,MAINTAIN ON TABLE public.mcp_tool_calls TO service_role;


--
-- Name: TABLE meeting_agenda_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.meeting_agenda_items TO anon;
GRANT ALL ON TABLE public.meeting_agenda_items TO authenticated;
GRANT ALL ON TABLE public.meeting_agenda_items TO service_role;
GRANT SELECT ON TABLE public.meeting_agenda_items TO chatbot_reader;


--
-- Name: TABLE meeting_ratings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.meeting_ratings TO anon;
GRANT ALL ON TABLE public.meeting_ratings TO authenticated;
GRANT ALL ON TABLE public.meeting_ratings TO service_role;
GRANT SELECT ON TABLE public.meeting_ratings TO chatbot_reader;


--
-- Name: TABLE meeting_update_comments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.meeting_update_comments TO anon;
GRANT ALL ON TABLE public.meeting_update_comments TO authenticated;
GRANT ALL ON TABLE public.meeting_update_comments TO service_role;
GRANT SELECT ON TABLE public.meeting_update_comments TO chatbot_reader;


--
-- Name: TABLE meeting_updates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.meeting_updates TO anon;
GRANT ALL ON TABLE public.meeting_updates TO authenticated;
GRANT ALL ON TABLE public.meeting_updates TO service_role;
GRANT SELECT ON TABLE public.meeting_updates TO chatbot_reader;


--
-- Name: TABLE member_companies; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.member_companies TO anon;
GRANT ALL ON TABLE public.member_companies TO authenticated;
GRANT ALL ON TABLE public.member_companies TO service_role;


--
-- Name: COLUMN member_companies.id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(id) ON TABLE public.member_companies TO chatbot_reader;


--
-- Name: COLUMN member_companies.person_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(person_id) ON TABLE public.member_companies TO chatbot_reader;


--
-- Name: COLUMN member_companies.company_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(company_id) ON TABLE public.member_companies TO chatbot_reader;


--
-- Name: COLUMN member_companies.role; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(role) ON TABLE public.member_companies TO chatbot_reader;


--
-- Name: COLUMN member_companies.title; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(title) ON TABLE public.member_companies TO chatbot_reader;


--
-- Name: COLUMN member_companies.ownership_pct; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(ownership_pct) ON TABLE public.member_companies TO chatbot_reader;


--
-- Name: COLUMN member_companies.created_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(created_at) ON TABLE public.member_companies TO chatbot_reader;


--
-- Name: COLUMN member_companies.updated_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(updated_at) ON TABLE public.member_companies TO chatbot_reader;


--
-- Name: TABLE member_event_attendance; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.member_event_attendance TO service_role;
GRANT SELECT ON TABLE public.member_event_attendance TO chatbot_reader;


--
-- Name: TABLE member_photos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.member_photos TO anon;
GRANT ALL ON TABLE public.member_photos TO authenticated;
GRANT ALL ON TABLE public.member_photos TO service_role;
GRANT SELECT ON TABLE public.member_photos TO chatbot_reader;


--
-- Name: TABLE member_relationships; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.member_relationships TO anon;
GRANT ALL ON TABLE public.member_relationships TO authenticated;
GRANT ALL ON TABLE public.member_relationships TO service_role;
GRANT SELECT ON TABLE public.member_relationships TO chatbot_reader;


--
-- Name: TABLE member_renewals; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.member_renewals TO anon;
GRANT ALL ON TABLE public.member_renewals TO authenticated;
GRANT ALL ON TABLE public.member_renewals TO service_role;
GRANT SELECT ON TABLE public.member_renewals TO chatbot_reader;


--
-- Name: TABLE member_requalifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.member_requalifications TO anon;
GRANT ALL ON TABLE public.member_requalifications TO authenticated;
GRANT ALL ON TABLE public.member_requalifications TO service_role;


--
-- Name: COLUMN member_requalifications.id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(id) ON TABLE public.member_requalifications TO chatbot_reader;


--
-- Name: COLUMN member_requalifications.person_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(person_id) ON TABLE public.member_requalifications TO chatbot_reader;


--
-- Name: COLUMN member_requalifications.fiscal_year_start; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(fiscal_year_start) ON TABLE public.member_requalifications TO chatbot_reader;


--
-- Name: COLUMN member_requalifications.confirmed_name; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(confirmed_name) ON TABLE public.member_requalifications TO chatbot_reader;


--
-- Name: COLUMN member_requalifications.confirmed_email; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(confirmed_email) ON TABLE public.member_requalifications TO chatbot_reader;


--
-- Name: COLUMN member_requalifications.confirmed_phone; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(confirmed_phone) ON TABLE public.member_requalifications TO chatbot_reader;


--
-- Name: COLUMN member_requalifications.confirmed_company; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(confirmed_company) ON TABLE public.member_requalifications TO chatbot_reader;


--
-- Name: COLUMN member_requalifications.employee_count; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(employee_count) ON TABLE public.member_requalifications TO chatbot_reader;


--
-- Name: COLUMN member_requalifications.biggest_challenge; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(biggest_challenge) ON TABLE public.member_requalifications TO chatbot_reader;


--
-- Name: COLUMN member_requalifications.submitted_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(submitted_at) ON TABLE public.member_requalifications TO chatbot_reader;


--
-- Name: COLUMN member_requalifications.ownership_pct; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(ownership_pct) ON TABLE public.member_requalifications TO chatbot_reader;


--
-- Name: TABLE member_signal_overrides; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.member_signal_overrides TO anon;
GRANT ALL ON TABLE public.member_signal_overrides TO authenticated;
GRANT ALL ON TABLE public.member_signal_overrides TO service_role;
GRANT SELECT ON TABLE public.member_signal_overrides TO chatbot_reader;


--
-- Name: TABLE my_eo_groups; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.my_eo_groups TO anon;
GRANT ALL ON TABLE public.my_eo_groups TO authenticated;
GRANT ALL ON TABLE public.my_eo_groups TO service_role;
GRANT SELECT ON TABLE public.my_eo_groups TO chatbot_reader;


--
-- Name: TABLE newsletters; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.newsletters TO anon;
GRANT ALL ON TABLE public.newsletters TO authenticated;
GRANT ALL ON TABLE public.newsletters TO service_role;
GRANT SELECT ON TABLE public.newsletters TO chatbot_reader;


--
-- Name: TABLE notification_queue; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notification_queue TO service_role;


--
-- Name: TABLE objectives; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.objectives TO anon;
GRANT ALL ON TABLE public.objectives TO authenticated;
GRANT ALL ON TABLE public.objectives TO service_role;
GRANT SELECT ON TABLE public.objectives TO chatbot_reader;


--
-- Name: TABLE people; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.people TO anon;
GRANT ALL ON TABLE public.people TO authenticated;
GRANT ALL ON TABLE public.people TO service_role;
GRANT SELECT ON TABLE public.people TO chatbot_reader;


--
-- Name: TABLE person_companies; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.person_companies TO service_role;
GRANT SELECT ON TABLE public.person_companies TO chatbot_reader;


--
-- Name: TABLE person_emails; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.person_emails TO service_role;


--
-- Name: TABLE revenue_verifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.revenue_verifications TO anon;
GRANT ALL ON TABLE public.revenue_verifications TO authenticated;
GRANT ALL ON TABLE public.revenue_verifications TO service_role;


--
-- Name: TABLE routine_config; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.routine_config TO service_role;


--
-- Name: TABLE routine_runs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.routine_runs TO service_role;


--
-- Name: TABLE sap_deal_stage_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sap_deal_stage_events TO service_role;
GRANT SELECT ON TABLE public.sap_deal_stage_events TO chatbot_reader;


--
-- Name: TABLE sap_deals; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sap_deals TO anon;
GRANT ALL ON TABLE public.sap_deals TO authenticated;
GRANT ALL ON TABLE public.sap_deals TO service_role;
GRANT SELECT ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(id) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.company_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(company_id) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.status; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(status) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.deal_type; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(deal_type) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.discount_note; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(discount_note) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.deal_owner; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(deal_owner) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.introduced_by; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(introduced_by) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.motivation; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(motivation) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.notes; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(notes) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.last_contact_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(last_contact_at) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.next_followup_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(next_followup_at) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.hubspot_deal_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(hubspot_deal_id) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.created_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(created_at) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.updated_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(updated_at) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.referred_by_person_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(referred_by_person_id) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: COLUMN sap_deals.closed_won_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(closed_won_at) ON TABLE public.sap_deals TO chatbot_reader;


--
-- Name: TABLE short_links; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.short_links TO anon;
GRANT ALL ON TABLE public.short_links TO authenticated;
GRANT ALL ON TABLE public.short_links TO service_role;
GRANT SELECT ON TABLE public.short_links TO chatbot_reader;


--
-- Name: TABLE sprints; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sprints TO service_role;
GRANT SELECT ON TABLE public.sprints TO chatbot_reader;


--
-- Name: TABLE strategies; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.strategies TO anon;
GRANT ALL ON TABLE public.strategies TO authenticated;
GRANT ALL ON TABLE public.strategies TO service_role;
GRANT SELECT ON TABLE public.strategies TO chatbot_reader;


--
-- Name: TABLE survey_answers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.survey_answers TO anon;
GRANT ALL ON TABLE public.survey_answers TO authenticated;
GRANT ALL ON TABLE public.survey_answers TO service_role;
GRANT SELECT ON TABLE public.survey_answers TO chatbot_reader;


--
-- Name: TABLE survey_fields; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.survey_fields TO anon;
GRANT ALL ON TABLE public.survey_fields TO authenticated;
GRANT ALL ON TABLE public.survey_fields TO service_role;
GRANT SELECT ON TABLE public.survey_fields TO chatbot_reader;


--
-- Name: TABLE survey_response_topics; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.survey_response_topics TO anon;
GRANT ALL ON TABLE public.survey_response_topics TO authenticated;
GRANT ALL ON TABLE public.survey_response_topics TO service_role;
GRANT SELECT ON TABLE public.survey_response_topics TO chatbot_reader;


--
-- Name: TABLE survey_responses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.survey_responses TO anon;
GRANT ALL ON TABLE public.survey_responses TO authenticated;
GRANT ALL ON TABLE public.survey_responses TO service_role;
GRANT SELECT ON TABLE public.survey_responses TO chatbot_reader;


--
-- Name: TABLE surveys; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.surveys TO anon;
GRANT ALL ON TABLE public.surveys TO authenticated;
GRANT ALL ON TABLE public.surveys TO service_role;
GRANT SELECT ON TABLE public.surveys TO chatbot_reader;


--
-- Name: TABLE taggables; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.taggables TO service_role;
GRANT SELECT ON TABLE public.taggables TO chatbot_reader;


--
-- Name: TABLE tags; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tags TO service_role;
GRANT SELECT ON TABLE public.tags TO chatbot_reader;


--
-- Name: TABLE task_attachments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.task_attachments TO service_role;
GRANT SELECT ON TABLE public.task_attachments TO chatbot_reader;


--
-- Name: TABLE task_comments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.task_comments TO service_role;
GRANT SELECT ON TABLE public.task_comments TO chatbot_reader;


--
-- Name: TABLE task_stage_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.task_stage_log TO service_role;
GRANT SELECT ON TABLE public.task_stage_log TO chatbot_reader;


--
-- Name: TABLE tasks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tasks TO anon;
GRANT ALL ON TABLE public.tasks TO authenticated;
GRANT ALL ON TABLE public.tasks TO service_role;
GRANT SELECT ON TABLE public.tasks TO chatbot_reader;


--
-- Name: TABLE team_members; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.team_members TO service_role;
GRANT SELECT ON TABLE public.team_members TO chatbot_reader;


--
-- Name: TABLE user_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_profiles TO anon;
GRANT ALL ON TABLE public.user_profiles TO authenticated;
GRANT ALL ON TABLE public.user_profiles TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--


