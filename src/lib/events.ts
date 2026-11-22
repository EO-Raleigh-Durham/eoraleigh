import { CHAPTER_TIME_ZONE } from "../kernel/config/chapter.ts";
import { supabase } from "./supabase";
import { tbcEventDate } from "./event-date-tbc";
import { fetchAllRows } from "./supabase-page";
import {
  canView,
  roleAtLeast,
  type ContentAudience,
  type UserRole,
} from "./access";
import type { Block } from "./blog";
import type { RegistrationReviewClassification } from "./event-registration-review";
import { summarizeVoucherRedemptions } from "./event-vouchers";

// Server-only helpers for the events feature (Epic 2 Wave 1).
// Read-only at this stage. Writes (create, RSVP, etc.) arrive
// in later waves once Epic 0's admin shell ships.

export type EventType = "learning" | "membership" | "social" | "my_eo" | "forum";
export type EventStatus =
  | "draft"
  | "published"
  | "open"
  | "closed"
  | "completed"
  | "cancelled";
export type EventVisibility =
  | "members_only"
  | "members_plus_spouses"
  | "public";

// Global vs Local (migration 060). Orthogonal to type/visibility: a "global"
// event is an EO global/regional event (APAC retreats, summits) shown only on
// /global-events; "local" is the chapter default shown on /events.
export type EventScope = "local" | "global";

// The audience an event is shown to (Plan 15). Same union as the access ladder's
// ContentAudience. Populated by migration 038; until then it is derived from the
// legacy `visibility` enum (see eventAudience below), so both fields are optional.
export type EventAudience = ContentAudience;

export type EventRow = {
  id: string;
  slug: string | null; // friendly URL segment (migration 052); falls back to id
  type: EventType;
  status: EventStatus;
  visibility: EventVisibility;
  // Optional like `audience`: null/absent until migration 060 runs, treated as
  // "local" by eventScope() so read paths are safe before the column exists.
  scope?: EventScope | null;
  audience?: EventAudience | null;
  allow_spouses?: boolean;
  title: string;
  blurb: string | null;
  speaker: string | null;
  champion: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  cover_image_url: string | null;
  featured: boolean;
  cta_label: string | null;
  cta_href: string | null;
  tag_label: string | null;
  price_amount: number;
  currency: string;
  // Display-only fee label (migration 073). When set, the public event page
  // shows this text in place of the computed price. It never affects
  // RSVP/checkout: online payment is driven solely by price_amount / ticket
  // types, so a price_note with price_amount = 0 shows a fee but keeps RSVP
  // free (fees collected offline, e.g. bank transfer). Optional/absent-safe.
  price_note?: string | null;
  survey_enabled: boolean;
  // Set by the hourly post-event survey email (migration 119). Absent-safe.
  survey_sent_at?: string | null;
  survey_sent_count?: number | null;
  // Members can bring guests (migration 072). allow_guests gates the
  // add-a-guest step on the public RSVP; max_guests_per_member caps how many
  // one member may add (null = no cap); guest_price_amount is the per-guest fee
  // in cents. Optional/absent-safe like the other post-launch columns below.
  allow_guests?: boolean;
  max_guests_per_member?: number | null;
  guest_price_amount?: number;
  // SEO + recap (migration 048). Past events are ranking content: a primary
  // keyword and a block-JSON recap (same shape as blog_posts.blocks). A
  // published recap renders publicly even for members_only events.
  primary_keyword: string | null;
  secondary_keywords: string[];
  recap_blocks: Block[] | null;
  recap_published: boolean;
  // Recap workflow (migration 084). recap_published stays the public
  // visibility flag; recap_status is the workflow position. Optional like the
  // other post-launch columns so reads predating the migration still type.
  recap_status?: "none" | "due" | "published" | "failed";
  recap_source_post_id?: string | null;
  recap_generated_at?: string | null;
  recap_stats_snapshot?: unknown;
  // Migration 069: turns on the multi-attendee RSVP form (per-attendee Full
  // Name/Email/Phone/Company/Title/Food Allergy + waiver acceptance) for this
  // event. Optional/absent-safe like the other post-launch columns above;
  // getEvent* reads treat a missing column as false via `?? false`.
  collect_attendee_details?: boolean;
  created_at: string;
  updated_at: string;
};

export type EventTicketType = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_amount: number;
  currency: string;
  capacity: number | null;
  // Max attendees one registration submission may include under this ticket
  // (e.g. a "Guests" ticket letting one signup cover several people). NULL
  // means no explicit cap. Only meaningful when the event's
  // collect_attendee_details flag is on; ignored otherwise.
  max_attendees: number | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type EventVoucherRedemptionState = "reserved" | "redeemed" | "released";

export type EventVoucherRedemption = {
  id: string;
  registration_id: string;
  state: EventVoucherRedemptionState;
  discounted_seat_quantity: number;
  base_total: number;
  discount_total: number;
  final_total: number;
  primary_email: string;
  created_at: string;
  registration: {
    id: string;
    status: RegistrationStatus;
    ticket_code: string | null;
    review_classification: RegistrationReviewClassification;
    person: { name: string | null; email: string } | null;
  } | null;
};

export type EventVoucher = {
  id: string;
  event_id: string;
  code: string;
  campaign_label: string;
  discount_percent: number;
  starts_at: string | null;
  ends_at: string | null;
  discounted_seat_limit: number | null;
  per_email_seat_limit: number | null;
  team_invite_enabled: boolean;
  active: boolean;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  eligible_ticket_ids: string[];
  redemptions: EventVoucherRedemption[];
  metrics: {
    reserved_seats: number;
    redeemed_seats: number;
    released_seats: number;
    base_total: number;
    discount_total: number;
    net_total: number;
    linked_registrations: number;
  };
};

export type EventQuery = {
  type?: EventType | EventType[];
  status?: EventStatus | EventStatus[];
  visibility?: EventVisibility | EventVisibility[];
  after?: Date;
  before?: Date;
  featured?: boolean;
  limit?: number;
  order?: "asc" | "desc";
  audienceFor?: UserRole | null;
};

export async function getEvents(q: EventQuery = {}): Promise<EventRow[]> {
  let query = supabase.from("events").select("*");

  if (q.type !== undefined) {
    query = Array.isArray(q.type)
      ? query.in("type", q.type)
      : query.eq("type", q.type);
  }
  if (q.status !== undefined) {
    query = Array.isArray(q.status)
      ? query.in("status", q.status)
      : query.eq("status", q.status);
  }
  if (q.visibility !== undefined) {
    query = Array.isArray(q.visibility)
      ? query.in("visibility", q.visibility)
      : query.eq("visibility", q.visibility);
  }
  if (q.after) query = query.gte("starts_at", q.after.toISOString());
  if (q.before) query = query.lt("starts_at", q.before.toISOString());
  if (q.featured !== undefined) query = query.eq("featured", q.featured);
  if ("audienceFor" in q && !roleAtLeast(q.audienceFor, "board")) {
    query = roleAtLeast(q.audienceFor, "member")
      ? query.or("audience.in.(community,member),audience.is.null")
      : query.or("audience.eq.community,and(audience.is.null,visibility.eq.public)");
  }

  query = query.order("starts_at", { ascending: q.order !== "desc" });

  if (q.limit) query = query.limit(q.limit);

  const { data, error } = await query;
  if (error) {
    // Lazy supabase client returns errors when env is unset (dev with no creds).
    // Fail soft so pages still render an empty state.
    console.warn("getEvents:", error.message);
    return [];
  }
  return (data ?? []) as EventRow[];
}

export async function getEventById(id: string): Promise<EventRow | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn("getEventById:", error.message);
    return null;
  }
  return (data as EventRow | null) ?? null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Renamed-event aliases: the request slug on the left resolves to the DB slug
// on the right while the DB row has not been flipped yet. next.config.ts 301s
// the old slug to the new one, so without this the new URL would 404 until the
// board editor updates the row. Remove an entry once its DB slug matches.
const EVENT_SLUG_ALIASES: Record<string, string> = {
  "eo-rise-4": "eo-rise-4-zero-to-200m",
};

// The canonical public slug for a DB slug that has been renamed but not yet
// flipped in the events table. Keeps canonicalization pointing at the NEW slug
// so it never fights the next.config.ts 301 (old -> new), which would loop.
export function canonicalEventSlug(slug: string | null): string | null {
  if (!slug) return slug;
  for (const [alias, dbSlug] of Object.entries(EVENT_SLUG_ALIASES)) {
    if (dbSlug === slug) return alias;
  }
  return slug;
}

// The public /events/[id] segment accepts a slug or a legacy UUID.
export async function getEventBySlugOrId(
  segment: string,
): Promise<EventRow | null> {
  if (UUID_RE.test(segment)) return getEventById(segment);
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", segment)
    .maybeSingle();
  if (error) {
    console.warn("getEventBySlugOrId:", error.message);
    return null;
  }
  if (data) return data as EventRow;
  const alias = EVENT_SLUG_ALIASES[segment];
  return alias ? getEventBySlugOrId(alias) : null;
}

export async function getViewableEventBySlugOrId(
  role: UserRole | null,
  segment: string,
): Promise<EventRow | null> {
  const event = await getEventBySlugOrId(segment);
  if (!event || !canView(role, eventAudience(event))) return null;
  return event;
}

// Canonical public path for an event: the slug when set, the UUID otherwise.
// A renamed-but-unflipped slug maps to its new public slug (see
// EVENT_SLUG_ALIASES) so links, metadata and canonicalization all emit the
// new URL during the cutover.
export function eventPath(e: Pick<EventRow, "id" | "slug">): string {
  return `/events/${canonicalEventSlug(e.slug) ?? e.id}`;
}

// The audience of an event: its explicit `audience` once migration 038 is
// applied, otherwise derived from the legacy `visibility` enum. This keeps the
// canView rule correct both before and after the migration runs.
export function eventAudience(
  row: Pick<EventRow, "audience" | "visibility">,
): ContentAudience {
  if (row.audience) return row.audience;
  return row.visibility === "public" ? "community" : "member";
}

// The scope of an event: its explicit `scope` once migration 060 is applied,
// otherwise "local". Centralizes the null/absent fallback so /events stays
// populated even in a deploy-before-migration window (the column is read via
// select("*"), which simply omits it when absent rather than erroring).
export function eventScope(row: Pick<EventRow, "scope">): EventScope {
  return row.scope ?? "local";
}

// Events the given role is allowed to see, filtered by the single canView rule
// (src/lib/access.ts). Logged-out and guest visitors see community content.
export async function getViewableEvents(
  role: UserRole | null,
  q: EventQuery = {},
): Promise<EventRow[]> {
  const all = await getEvents({ ...q, audienceFor: role });
  return all.filter((event) => canView(role, eventAudience(event)));
}

export type RegistrationStatus =
  | "pending_payment"
  | "registered"
  | "waitlisted"
  | "cancelled"
  | "attended"
  | "no_show";

export type EventRegistration = {
  id: string;
  event_id: string;
  person_id: string;
  status: RegistrationStatus;
  waitlist_position: number | null;
  guest_count: number;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  notes: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_paid: number | null;
  price_final_total: number | null;
  price_currency?: string | null;
  paid_at: string | null;
  ticket_code: string | null;
  checked_in_at: string | null;
  waiver_accepted_at: string | null;
  review_classification: RegistrationReviewClassification;
  is_prospect?: boolean;
  // First-touch attribution (migration 109). Optional so the roster still loads
  // where the migration has not been applied yet.
  channel_source?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  referral_source?: string | null;
  invited_by_registration_id: string | null;
  invited_by_person_id?: string | null;
  created_at: string;
  updated_at: string;
  person: {
    id: string;
    email: string;
    name: string | null;
    first_name?: string | null;
    preferred_name?: string | null;
  } | null;
  inviter?: {
    id: string;
    person: {
      id: string;
      email: string;
      name: string | null;
      first_name?: string | null;
      preferred_name?: string | null;
    } | null;
  } | null;
  attendees?: EventRegistrationAttendee[];
  ticket_type?: {
    id?: string;
    name: string;
    price_amount?: number;
    currency?: string;
    max_attendees?: number | null;
  } | null;
};

export type EventInviterCandidate = {
  personId: string;
  name: string;
  email: string;
  eligibility: "member" | "staff";
  membershipStatus: "active" | "on_leave" | null;
  roleLabel: string | null;
};

// One attendee under a registration (migration 069). A single-attendee
// registration still gets exactly one row here; a group "Guests" registration
// gets one row per person.
export type EventRegistrationAttendee = {
  id: string;
  registration_id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string | null;
  title: string | null;
  food_allergy: string | null;
  created_at: string;
  role_in_company?: string | null;
  revenue_scale?: string | null;
  // MyEO Family Day only (085/086): age is sent to the chatbot's excluded
  // column list on purpose. photo_path is a private-bucket object path, never
  // a URL; AttendeePhotosSection resolves it to a short-lived signed URL
  // server-side, behind requireBoardOrAbove().
  age?: number | null;
  photo_path?: string | null;
  photo_consent?: boolean;
};

export type MaterialKind =
  | "slides"
  | "recording"
  | "handout"
  | "cert"
  | "photos"
  | "recap";

export type EventMaterial = {
  id: string;
  event_id: string;
  kind: MaterialKind;
  title: string;
  url: string;
  visible_to: "registered" | "attended" | "all";
  created_at: string;
};

export type EventFeedbackRow = {
  id: string;
  event_id: string;
  person_id: string;
  event_value_rating: number | null;
  rating_overall: number | null;
  rating_speaker: number | null;
  would_recommend: boolean | null;
  comments: string | null;
  loved_text: string | null;
  improve_text: string | null;
  created_at: string;
  person: { name: string | null; email: string } | null;
};

// A member's own event registrations (for the /member "My Events" view), each
// joined to the minimum event fields needed to render a card + ticket link.
export type PersonRegistration = {
  id: string;
  status: RegistrationStatus;
  ticket_code: string | null;
  guest_count: number;
  created_at: string;
  event: {
    id: string;
    slug: string | null;
    title: string;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    status: EventStatus;
    cover_image_url: string | null;
  } | null;
};

export async function getRegistrationsForPerson(
  personId: string,
): Promise<PersonRegistration[]> {
  const { data, error } = await supabase
    .from("event_registrations")
    .select(
      "id, status, ticket_code, guest_count, created_at, event:events!event_registrations_event_id_fkey(id, slug, title, starts_at, ends_at, location, status, cover_image_url)",
    )
    .eq("person_id", personId)
    .neq("review_classification", "spam")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("getRegistrationsForPerson:", error.message);
    return [];
  }
  return (data ?? []) as unknown as PersonRegistration[];
}

export async function getRegistrationsForEvent(
  eventId: string,
): Promise<EventRegistration[]> {
  try {
    const data = await fetchAllRows((from, to) =>
      supabase
        .from("event_registrations")
        .select(
          "id, event_id, person_id, status, waitlist_position, guest_count, confirmed_at, cancelled_at, cancellation_reason, notes, stripe_session_id, stripe_payment_intent_id, amount_paid, price_final_total, paid_at, ticket_code, checked_in_at, waiver_accepted_at, review_classification, invited_by_registration_id, created_at, updated_at, person:people!event_registrations_person_id_fkey(id, email, name, first_name, preferred_name), attendees:event_registration_attendees(id, registration_id, full_name, email, phone, company, title, food_allergy, age, created_at), ticket_type:event_ticket_types!event_registrations_ticket_type_id_fkey(name)",
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .range(from, to),
    );
    const registrations = data as unknown as EventRegistration[];
    const inviterIds = Array.from(
      new Set(
        registrations
          .map((registration) => registration.invited_by_registration_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    if (inviterIds.length === 0) return registrations;

    // PostgREST does not expose this self-reference in every deployed schema
    // cache, so resolve inviter registrations separately instead of relying on
    // a nested self-join.
    const { data: inviterRows, error: inviterError } = await supabase
      .from("event_registrations")
      .select(
        "id, person:people!event_registrations_person_id_fkey(id, email, name, first_name, preferred_name)",
      )
      .in("id", inviterIds);
    if (inviterError) {
      console.warn("getRegistrationsForEvent inviters:", inviterError.message);
      return registrations;
    }
    const inviterById = new Map(
      (inviterRows ?? []).map((row) => [row.id, row]),
    );
    return registrations.map((registration) => ({
      ...registration,
      inviter: registration.invited_by_registration_id
        ? (inviterById.get(registration.invited_by_registration_id) as EventRegistration["inviter"] ?? null)
        : null,
    }));
  } catch (e) {
    console.warn("getRegistrationsForEvent:", (e as Error).message);
    return [];
  }
}

// Public event pages need only the occupied seat total. Keep the service-role
// read deliberately narrow so attendee identity, payment, and ticket fields do
// not enter an anonymous request.
export async function getOccupiedSeatsForEvent(eventId: string): Promise<number> {
  try {
    const rows = await fetchAllRows<{
      status: string;
      guest_count: number | null;
    }>((from, to) =>
      supabase
        .from("event_registrations")
        .select("status, guest_count")
        .eq("event_id", eventId)
        .in("status", ["registered", "attended", "pending_payment"])
        .neq("review_classification", "spam")
        .order("id", { ascending: true })
        .range(from, to),
    );
    return rows.reduce((sum, row) => sum + 1 + (row.guest_count ?? 0), 0);
  } catch (error) {
    console.warn("getOccupiedSeatsForEvent:", (error as Error).message);
    return 0;
  }
}

// Occupied seats for a single ticket type, rather than the whole event.
// Used by MyEO Family Day's Masterclass, a capped sub-session inside an
// otherwise-uncapped event: register_myeo_family_day() (086) counts the
// same way ("1 + guest_count" per confirmed registration), so this stays
// consistent with what the atomic capacity check actually enforces.
export async function getSeatsForTicketType(ticketTypeId: string): Promise<number> {
  try {
    const rows = await fetchAllRows<{ guest_count: number | null }>((from, to) =>
      supabase
        .from("event_registrations")
        .select("guest_count")
        .eq("ticket_type_id", ticketTypeId)
        .in("status", ["registered", "attended"])
        .neq("review_classification", "spam")
        .order("id", { ascending: true })
        .range(from, to),
    );
    return rows.reduce((sum, row) => sum + 1 + (row.guest_count ?? 0), 0);
  } catch (error) {
    console.warn("getSeatsForTicketType:", (error as Error).message);
    return 0;
  }
}

// A single registration resolved by its public ticket code, joined to the
// event and person needed to render the /t/<code> ticket page.
export type TicketRegistration = {
  id: string;
  event_id: string;
  status: RegistrationStatus;
  guest_count: number;
  ticket_code: string;
  checked_in_at: string | null;
  waiver_accepted_at: string | null;
  review_classification: RegistrationReviewClassification;
  created_at: string;
  event: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    type: EventType;
    status: EventStatus;
    cover_image_url: string | null;
    survey_enabled: boolean;
  } | null;
  ticket_type: { name: string } | null;
};

export async function getRegistrationByTicketCode(
  code: string,
): Promise<TicketRegistration | null> {
  const { data, error } = await supabase
    .from("event_registrations")
    .select(
      "id, event_id, status, guest_count, ticket_code, checked_in_at, waiver_accepted_at, review_classification, created_at, event:events!event_registrations_event_id_fkey(id, title, starts_at, ends_at, location, type, status, cover_image_url, survey_enabled), ticket_type:event_ticket_types!event_registrations_ticket_type_id_fkey(name)",
    )
    .eq("ticket_code", code)
    .neq("review_classification", "spam")
    .maybeSingle();
  if (error) {
    console.warn("getRegistrationByTicketCode:", error.message);
    return null;
  }
  return (data as unknown as TicketRegistration | null) ?? null;
}

// Resolve a paid checkout return only when the public event, registration, and
// opaque Stripe session all match the row created before redirecting to Stripe.
export async function getTicketCodeForCheckoutReturn(
  eventId: string,
  registrationId: string,
  sessionId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("ticket_code")
    .eq("id", registrationId)
    .eq("event_id", eventId)
    .eq("stripe_session_id", sessionId)
    .eq("status", "registered")
    .not("paid_at", "is", null)
    .neq("review_classification", "spam")
    .maybeSingle();
  if (error) {
    console.warn("getTicketCodeForCheckoutReturn:", error.message);
    return null;
  }
  return (data?.ticket_code as string | null) ?? null;
}

export async function getTicketTypesForEvent(
  eventId: string,
): Promise<EventTicketType[]> {
  const { data, error } = await supabase
    .from("event_ticket_types")
    .select(
      "id, event_id, name, description, price_amount, currency, capacity, max_attendees, sort_order, active, created_at, updated_at",
    )
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("getTicketTypesForEvent:", error.message);
    return [];
  }
  return (data ?? []) as EventTicketType[];
}

// Board-only callers render these rows. RLS remains enabled and the server-only
// service client is the only path that reads campaign configuration.
export async function getEventVouchersForEvent(eventId: string): Promise<EventVoucher[]> {
  const { data: vouchers, error } = await supabase
    .from("event_vouchers")
    .select("id, event_id, code, campaign_label, discount_percent, starts_at, ends_at, discounted_seat_limit, per_email_seat_limit, team_invite_enabled, active, internal_notes, created_at, updated_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) {
    // Keep the Settings page usable during the expand-first migration window.
    console.warn("getEventVouchersForEvent:", error.message);
    return [];
  }
  if (!vouchers?.length) return [];

  const ids = vouchers.map((voucher) => voucher.id);
  const [{ data: eligibility, error: eligibilityError }, { data: redemptionRows, error: redemptionError }] =
    await Promise.all([
      supabase
        .from("event_voucher_ticket_types")
        .select("voucher_id, ticket_type_id")
        .in("voucher_id", ids),
      supabase
        .from("event_voucher_redemptions")
        .select("id, voucher_id, registration_id, state, discounted_seat_quantity, base_total_snapshot, discount_total_snapshot, final_total_snapshot, primary_email, created_at, registration:event_registrations!event_voucher_redemptions_registration_id_fkey(id, status, ticket_code, review_classification, person:people!event_registrations_person_id_fkey(name, email))")
        .in("voucher_id", ids)
        .order("created_at", { ascending: false }),
    ]);
  if (eligibilityError || redemptionError) {
    console.warn(
      "getEventVouchersForEvent details:",
      eligibilityError?.message ?? redemptionError?.message,
    );
  }

  type RedemptionRow = {
    id: string;
    voucher_id: string;
    registration_id: string;
    state: EventVoucherRedemptionState;
    discounted_seat_quantity: number;
    base_total_snapshot: number;
    discount_total_snapshot: number;
    final_total_snapshot: number;
    primary_email: string;
    created_at: string;
    registration: EventVoucherRedemption["registration"];
  };
  const allRedemptions = (redemptionRows ?? []) as unknown as RedemptionRow[];

  return vouchers.map((voucher) => {
    const redemptions: EventVoucherRedemption[] = allRedemptions
      .filter((row) => row.voucher_id === voucher.id)
      .map((row) => ({
        id: row.id,
        registration_id: row.registration_id,
        state: row.state,
        discounted_seat_quantity: row.discounted_seat_quantity,
        base_total: row.base_total_snapshot,
        discount_total: row.discount_total_snapshot,
        final_total: row.final_total_snapshot,
        primary_email: row.primary_email,
        created_at: row.created_at,
        registration: row.registration,
      }));
    // Collected campaign value is based only on completed redemptions. Reserved
    // checkouts remain visible in their seat count but are not revenue yet.
    const summary = summarizeVoucherRedemptions(
      redemptions.map((row) => ({
        state: row.state,
        discountedSeatQuantity: row.discounted_seat_quantity,
        baseTotal: row.base_total,
        discountTotal: row.discount_total,
        finalTotal: row.final_total,
        reviewClassification: row.registration?.review_classification,
      })),
    );
    return {
      ...voucher,
      eligible_ticket_ids: (eligibility ?? [])
        .filter((row) => row.voucher_id === voucher.id)
        .map((row) => row.ticket_type_id),
      redemptions,
      metrics: {
        reserved_seats: summary.reservedSeats,
        redeemed_seats: summary.redeemedSeats,
        released_seats: summary.releasedSeats,
        base_total: summary.baseTotal,
        discount_total: summary.discountTotal,
        net_total: summary.netTotal,
        linked_registrations: new Set(redemptions.map((row) => row.registration_id)).size,
      },
    } as EventVoucher;
  });
}

export async function getMaterialsForEvent(
  eventId: string,
): Promise<EventMaterial[]> {
  const { data, error } = await supabase
    .from("event_materials")
    .select("id, event_id, kind, title, url, visible_to, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("getMaterialsForEvent:", error.message);
    return [];
  }
  return (data ?? []) as EventMaterial[];
}

export async function getFeedbackForEvent(
  eventId: string,
): Promise<EventFeedbackRow[]> {
  const { data, error } = await supabase
    .from("event_feedback")
    .select(
      "id, event_id, person_id, event_value_rating, rating_overall, rating_speaker, would_recommend, comments, loved_text, improve_text, created_at, person:people!event_feedback_person_id_fkey(name, email)",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("getFeedbackForEvent:", error.message);
    return [];
  }
  return (data ?? []) as unknown as EventFeedbackRow[];
}

export type EventRsvpCounts = Record<string, number>;

// Returns a map of event_id → confirmed attendee count, including guests.
export async function getRsvpCounts(eventIds: string[]): Promise<EventRsvpCounts> {
  if (eventIds.length === 0) return {};
  let data: Array<{ event_id: string; status: string; guest_count: number | null }>;
  try {
    data = await fetchAllRows<{
      event_id: string;
      status: string;
      guest_count: number | null;
    }>((from, to) =>
      supabase
        .from("event_registrations")
        .select("event_id, status, guest_count")
        .in("event_id", eventIds)
        .neq("review_classification", "spam")
        .order("id", { ascending: true })
        .range(from, to),
    );
  } catch (e) {
    console.warn("getRsvpCounts:", (e as Error).message);
    return {};
  }
  const counts: EventRsvpCounts = {};
  for (const row of data) {
    if (row.status === "registered" || row.status === "attended") {
      counts[row.event_id] =
        (counts[row.event_id] ?? 0) + 1 + (row.guest_count ?? 0);
    }
  }
  return counts;
}

// ============================================================
// Timezone helpers (chapter time; the input offset is fixed at UTC+7, no DST)
// All form datetime-local inputs are treated as UTC+7 local time.
// ============================================================

const HCM_OFFSET = "+07:00";

// Convert a datetime-local form value (YYYY-MM-DDTHH:MM) to a UTC ISO string,
// treating the input as local time at HCM_OFFSET (fixed UTC+7).
export function hcmInputToISO(local: string): string {
  // Form values are YYYY-MM-DDTHH:MM. Append seconds and HCM offset, then
  // hand it to Date which normalizes to UTC ISO.
  const seconds = local.length === 16 ? ":00" : "";
  return new Date(`${local}${seconds}${HCM_OFFSET}`).toISOString();
}

// Convert a UTC timestamp string to a YYYY-MM-DDTHH:MM string in HCM time,
// suitable for use as a default value on <input type="datetime-local">.
export function isoToHcmInput(iso: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHAPTER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

// ============================================================
// Display helpers
// ============================================================

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  learning: "Learning",
  membership: "Membership",
  social: "Social",
  my_eo: "myEO",
  forum: "Forum",
};

export function eventTypeLabel(t: EventType): string {
  return EVENT_TYPE_LABEL[t];
}

export const EVENT_TYPE_ORDER: EventType[] = [
  "learning",
  "membership",
  "social",
  "my_eo",
  "forum",
];

const TZ = CHAPTER_TIME_ZONE;

const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, day: "2-digit" });
const monthFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short" });
const yearFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric" });
const fullFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  month: "short",
  day: "numeric",
  year: "numeric",
});

export type FormattedEventDate = {
  day: string;
  month: string;
  monthUpper: string;
  year: string;
  full: string;
};

export function formatEventDateFor(
  event: Pick<EventRow, "slug" | "starts_at" | "ends_at">,
): FormattedEventDate {
  return tbcEventDate(event) ?? formatEventDate(event.starts_at, event.ends_at);
}

export function formatEventDate(
  startsAt: string,
  endsAt: string | null = null,
): FormattedEventDate {
  const s = new Date(startsAt);
  const day = dayFmt.format(s);
  const month = monthFmt.format(s);
  const year = yearFmt.format(s);
  let full = fullFmt.format(s);

  if (endsAt) {
    const e = new Date(endsAt);
    const sameMonthYear =
      monthFmt.format(e) === month && yearFmt.format(e) === year;
    const endDay = dayFmt.format(e);
    if (sameMonthYear && endDay !== day) {
      full = `${month} ${day}-${endDay}, ${year}`;
    } else if (!sameMonthYear) {
      full = `${full} – ${fullFmt.format(e)}`;
    }
  }

  return {
    day,
    month,
    monthUpper: month.toUpperCase(),
    year,
    full,
  };
}
