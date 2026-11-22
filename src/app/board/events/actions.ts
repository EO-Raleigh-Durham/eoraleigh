"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";
import { eventAudience, eventPath, hcmInputToISO } from "@/lib/events";
import type { RegistrationStatus } from "@/lib/events";
import type { Block } from "@/lib/blog";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import {
  newTicketCode,
  ticketUrl,
  normalizeTicketCode,
  validTicketCode,
} from "@/lib/tickets";
import {
  buildCheckInRoster,
  checkInEligibility,
  type CheckInCandidate,
} from "@/lib/check-in";
import { sendTicketEmail, isEmailConfigured, sendEventBroadcast } from "@/lib/email";
import { isNonRefundableEvent, noShowFeeForEvent } from "@/lib/event-fee-overrides";
import { isValidPhoneNumber } from "@/lib/phone-validation";
import {
  MTP_FNL_EVENT_ID,
  MTP_FULL_MESSAGE,
  MTP_SEAT_LIMIT,
  countMtpSeats,
  isMtpSelection,
  type MtpCountClient,
} from "@/lib/mtp-fnl-seats";
import {
  isRise4RevenueScale,
  isRise4Role,
  usesRise4GuestVetting,
  roleRequiresCompany,
  roleRequiresRevenueScale,
} from "@/lib/rise4-guest-vetting";
import {
  GUEST_INVITATION_ERROR,
  MYEO_DINNER_SLUG,
  dinnerMissingFieldError,
  dinnerPhoneNote,
  guestTicketNeedsInvitation,
  invitationCodeAllowed,
} from "@/lib/myeo-dinner";
import {
  getActiveTeamRegistrationRate,
  getTeamRegistrationOffer,
} from "@/lib/event-team-invite-server";
import {
  canReleaseUnattachedVoucherCheckout,
  secureStandardCheckoutSession,
} from "@/lib/event-voucher-checkout";
import {
  changedCheckoutStep,
  isAbandonedUnpaidRegistration,
  isSameCheckoutOrder,
  stableCheckoutExpiry,
} from "@/lib/event-checkout-recovery";
import {
  stripeProcessingFeeFor,
  ticketAmountFromStripeTotal,
} from "@/lib/stripe-processing-fee";
import { FIELD_MAX, checkLengths } from "@/lib/validation";
import {
  TICKET_SOLD_OUT_ERROR,
  isTicketSoldOutError,
  selectEventTicket,
} from "@/lib/event-ticket-selection";
import {
  coerceAttribution,
  deriveChannelSource,
  type Attribution,
} from "@/lib/attribution";
import { isReferralSourceOption } from "@/lib/rsvp-guest-context";
import { getSessionUser, provisionGuestUser, requireBoardOrAbove } from "@/lib/auth";
import { publishRecapForEvent } from "@/lib/event-recap-publish";
import { canView } from "@/lib/access";
import {
  RSVP_BURST_LIMIT,
  RSVP_BURST_WINDOW_MS,
  checkRsvpSubmission,
  isRsvpBurstLimited,
} from "@/lib/rsvp-anti-spam";
import {
  REGISTRATION_REVIEW_CLASSIFICATIONS,
  type RegistrationReviewClassification,
} from "@/lib/event-registration-review";
import {
  assignRsvpInviter,
  type InviterAssignmentStore,
} from "@/lib/rsvp-inviter";
import { after } from "next/server";
import { deliverTicketConfirmation } from "@/lib/event-ticket-confirmation";
import { syncRegistrationToGuestSheet } from "@/lib/event-guest-sheet";
import {
  complimentaryPolicyNote,
  persistComplimentaryRegistration,
  preserveComplimentaryPolicyNote,
} from "@/lib/complimentary-rsvp";
import {
  calculateVoucherPrice,
  isVoucherPercentage,
  normalizeVoucherCode,
  voucherErrorMessage,
  type VoucherPublicError,
} from "@/lib/event-vouchers";
import {
  findSubmissionPersonByEmail,
  resolveSubmissionPersonWithSupabase,
} from "@/lib/submission-person-supabase";
import {
  parseEventTicketPrice,
  resolveEventCheckoutCurrency,
} from "@/lib/event-ticket-pricing";
import {
  prepareFamilyDayPhotos,
  releaseFamilyDayRegistration,
  uploadFamilyDayPhotos,
  type FamilyDayPhotoContentType,
  type FamilyDayPhotoSource,
} from "@/lib/family-day-registration";
import {
  canAssignGlobalParticipationStatus,
  isGlobalEventParticipationStatus,
  reconcileGlobalParticipantAdds,
  type GlobalEventParticipationStatus,
} from "@/lib/global-event-participation-policy";
import { isGlobalParticipationSchemaUnavailable } from "@/lib/global-event-participation";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

// All event mutations live here. Server-side, secret-key client, bypasses RLS.

type ActionResult = { ok: true } | { ok: false; error: string };

type GlobalParticipationFailureCode =
  | "invalid_input"
  | "not_found"
  | "wrong_scope"
  | "ineligible"
  | "too_early"
  | "unavailable"
  | "database_error";

type GlobalParticipationFailure = {
  ok: false;
  code: GlobalParticipationFailureCode;
  error: string;
};

export type AddGlobalEventParticipantsResult =
  | {
      ok: true;
      added: string[];
      alreadyTracked: { personId: string; status: GlobalEventParticipationStatus }[];
      ineligible: string[];
    }
  | GlobalParticipationFailure;

export type UpdateGlobalEventParticipantResult =
  | {
      ok: true;
      personId: string;
      status: GlobalEventParticipationStatus;
    }
  | GlobalParticipationFailure;

export type RemoveGlobalEventParticipantResult =
  | {
      ok: true;
      personId: string;
    }
  | GlobalParticipationFailure;

function s(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function nullable(v: string): string | null {
  return v === "" ? null : v;
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

// Recap bodies reuse the blog Block[] shape (rendered by BlockRenderer).
// Authored as raw JSON in the event form, same as blog post bodies.
function parseBlocks(
  raw: string,
): { ok: true; blocks: Block[] | null } | { ok: false; error: string } {
  if (!raw.trim()) return { ok: true, blocks: null };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { ok: false, error: "Recap JSON must be an array of block objects" };
    }
    return { ok: true, blocks: parsed as Block[] };
  } catch (err) {
    return {
      ok: false,
      error: `Recap JSON could not be parsed: ${err instanceof Error ? err.message : "syntax error"}`,
    };
  }
}

type BuildResult =
  | { ok: true; patch: Record<string, unknown> }
  | { ok: false; error: string };

const GLOBAL_EVENT_SAFE_PATCH_FIELDS = new Set([
  "title",
  "type",
  "status",
  "visibility",
  "scope",
  "blurb",
  "speaker",
  "champion",
  "location",
  "starts_at",
  "ends_at",
  "cover_image_url",
  "featured",
  "cta_label",
  "cta_href",
  "tag_label",
  "primary_keyword",
  "secondary_keywords",
  "recap_blocks",
  "recap_published",
  "slug",
]);

function globalEventMetadataPatch(
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(patch).filter(([field]) => GLOBAL_EVENT_SAFE_PATCH_FIELDS.has(field)),
  );
}

function buildPatchFromForm(formData: FormData): BuildResult {
  const title = s(formData.get("title"));
  const type = s(formData.get("type"));
  const status = s(formData.get("status"));
  const visibility = s(formData.get("visibility"));
  const scope = s(formData.get("scope")) || "local";
  const blurb = s(formData.get("blurb"));
  const speaker = s(formData.get("speaker"));
  const champion = s(formData.get("champion"));
  const location = s(formData.get("location"));
  const startsAtLocal = s(formData.get("starts_at"));
  const endsAtLocal = s(formData.get("ends_at"));
  const capacityRaw = s(formData.get("capacity"));
  const cover = s(formData.get("cover_image_url"));
  const featured = formData.get("featured") === "on";
  const ctaLabel = s(formData.get("cta_label"));
  const ctaHref = s(formData.get("cta_href"));
  const tagLabel = s(formData.get("tag_label"));
  const priceNote = s(formData.get("price_note"));
  const priceDollarsRaw = s(formData.get("price_dollars"));
  const primaryKeyword = s(formData.get("primary_keyword"));
  const secondaryKeywordsRaw = s(formData.get("secondary_keywords"));
  const recapBlocksRaw = s(formData.get("recap_blocks"));
  const slugRaw = s(formData.get("slug"));

  if (!title) return { ok: false, error: "Title is required" };
  if (!type) return { ok: false, error: "Type is required" };
  if (!status) return { ok: false, error: "Status is required" };
  if (!visibility) return { ok: false, error: "Visibility is required" };
  if (scope !== "local" && scope !== "global") {
    return { ok: false, error: "Scope must be local or global" };
  }
  if (!startsAtLocal) return { ok: false, error: "Start date and time is required" };

  const capacity = capacityRaw === "" ? null : Number(capacityRaw);
  if (capacity !== null && (!Number.isFinite(capacity) || capacity < 0)) {
    return { ok: false, error: "Capacity must be a non-negative number" };
  }

  let priceAmount = 0;
  if (priceDollarsRaw !== "") {
    const dollars = Number(priceDollarsRaw);
    if (!Number.isFinite(dollars) || dollars < 0) {
      return { ok: false, error: "Price must be a non-negative number" };
    }
    priceAmount = Math.round(dollars * 100);
  }

  const maxGuestsRaw = s(formData.get("max_guests_per_member"));
  const maxGuestsPerMember = maxGuestsRaw === "" ? null : Number(maxGuestsRaw);
  if (
    maxGuestsPerMember !== null &&
    (!Number.isInteger(maxGuestsPerMember) || maxGuestsPerMember < 0)
  ) {
    return { ok: false, error: "Max guests per member must be a whole number of 0 or more" };
  }

  let guestPriceAmount = 0;
  const guestPriceDollarsRaw = s(formData.get("guest_price_dollars"));
  if (guestPriceDollarsRaw !== "") {
    const dollars = Number(guestPriceDollarsRaw);
    if (!Number.isFinite(dollars) || dollars < 0) {
      return { ok: false, error: "Cost per guest must be a non-negative number" };
    }
    guestPriceAmount = Math.round(dollars * 100);
  }

  const recap = parseBlocks(recapBlocksRaw);
  if (!recap.ok) return recap;

  const patch = {
    title,
    type,
    status,
    visibility,
    scope,
    blurb: nullable(blurb),
    speaker: nullable(speaker),
    champion: nullable(champion),
    location: nullable(location),
    starts_at: hcmInputToISO(startsAtLocal),
    ends_at: endsAtLocal ? hcmInputToISO(endsAtLocal) : null,
    capacity,
    cover_image_url: nullable(cover),
    featured,
    cta_label: nullable(ctaLabel),
    cta_href: nullable(ctaHref),
    tag_label: nullable(tagLabel),
    price_amount: priceAmount,
    price_note: nullable(priceNote),
    currency: "USD",
    survey_enabled: formData.get("survey_enabled") === "on",
    allow_guests: formData.get("allow_guests") === "on",
    max_guests_per_member: maxGuestsPerMember,
    guest_price_amount: guestPriceAmount,
    primary_keyword: nullable(primaryKeyword),
    secondary_keywords: parseTags(secondaryKeywordsRaw),
    recap_blocks: recap.blocks,
    recap_published: formData.get("recap_published") === "on",
  };

  // Slug is set only when the field is filled in: editing an event without
  // touching the slug keeps the existing one, and create auto-generates.
  const slug = normalizeSlug(slugRaw);
  if (slug) (patch as Record<string, unknown>).slug = slug;

  return { ok: true, patch };
}

// Lowercase, non-alphanumerics collapsed to single hyphens.
function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function revalidatePublicEventPaths() {
  revalidatePath("/board/events");
  revalidatePath("/events");
  revalidatePath("/global-events");
  revalidatePath("/community-events");
  revalidatePath("/past-events");
}

// Friendly URL segment from the title (migration 052). Deduplicated with a
// numeric suffix against existing slugs.
async function slugFromTitle(title: string): Promise<string> {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "event";
  const { data } = await supabase
    .from("events")
    .select("slug")
    .like("slug", `${base}%`);
  const taken = new Set(((data ?? []) as { slug: string | null }[]).map((r) => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

// Columns added by later migrations (060 scope, 072 guests, 073 price_note)
// that may not exist yet in a deploy-before-migration window. On a missing-column
// write error we strip these and retry, so event saves keep working until the
// migration is applied, same fail-soft posture as the ticket-types /
// register_for_event fallbacks.
const OPTIONAL_EVENT_COLUMNS = [
  "scope",
  "allow_guests",
  "max_guests_per_member",
  "guest_price_amount",
  "price_note",
];

function isMissingOptionalColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "42703" || err.code === "PGRST204") return true;
  const m = err.message ?? "";
  return (
    new RegExp(`(${OPTIONAL_EVENT_COLUMNS.join("|")})`, "i").test(m) &&
    /(column|schema cache|does not exist)/i.test(m)
  );
}

function withoutOptionalColumns(patch: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...patch };
  for (const c of OPTIONAL_EVENT_COLUMNS) delete rest[c];
  return rest;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type GlobalParticipationEvent = {
  id: string;
  scope: string | null;
  starts_at: string;
};

function globalParticipationFailure(
  code: GlobalParticipationFailureCode,
  error: string,
): GlobalParticipationFailure {
  return { ok: false, code, error };
}

function safeGlobalParticipationDatabaseFailure(
  operation: string,
  error: { code?: string | null } | null,
): GlobalParticipationFailure {
  if (isGlobalParticipationSchemaUnavailable(error)) {
    return globalParticipationFailure(
      "unavailable",
      "Global event participation tracking is temporarily unavailable",
    );
  }
  console.error(`${operation} failed`, { code: error?.code ?? "unknown" });
  return globalParticipationFailure(
    "database_error",
    "Global event participation could not be updated",
  );
}

async function loadGlobalParticipationEvent(
  eventId: string,
): Promise<
  | { ok: true; event: GlobalParticipationEvent }
  | GlobalParticipationFailure
> {
  const { data, error } = await supabase
    .from("events")
    .select("id, scope, starts_at")
    .eq("id", eventId)
    .maybeSingle();
  if (error) return safeGlobalParticipationDatabaseFailure("global event lookup", error);
  if (!data) return globalParticipationFailure("not_found", "Event not found");
  if (data.scope !== "global") {
    return globalParticipationFailure(
      "wrong_scope",
      "Participation tracking is available only for global events",
    );
  }
  return { ok: true, event: data as GlobalParticipationEvent };
}

async function loadEligibleGlobalParticipantIds(
  personIds: readonly string[],
): Promise<{ ok: true; personIds: Set<string> } | GlobalParticipationFailure> {
  const { data: chapter, error: chapterError } = await supabase
    .from("chapters")
    .select("id")
    .eq("chapter_name", CHAPTER_NAME)
    .maybeSingle();
  if (chapterError) {
    return safeGlobalParticipationDatabaseFailure("global participant chapter lookup", chapterError);
  }
  if (!chapter) return { ok: true, personIds: new Set() };

  const { data, error } = await supabase
    .from("chapter_memberships")
    .select("person_id")
    .eq("chapter_id", chapter.id)
    .in("person_id", [...personIds])
    .in("status", ["active", "on_leave"])
    .in("membership_type", ["Primary Membership", "Secondary Membership"]);
  if (error) {
    return safeGlobalParticipationDatabaseFailure(
      "global participant eligibility lookup",
      error,
    );
  }
  return {
    ok: true,
    personIds: new Set((data ?? []).map((row) => row.person_id)),
  };
}

async function loadActiveGlobalParticipation(
  eventId: string,
  personIds?: readonly string[],
): Promise<
  | {
      ok: true;
      rows: { personId: string; status: GlobalEventParticipationStatus }[];
    }
  | GlobalParticipationFailure
> {
  let query = supabase
    .from("global_event_participation")
    .select("person_id, status")
    .eq("event_id", eventId)
    .is("removed_at", null);
  if (personIds) query = query.in("person_id", [...personIds]);
  const { data, error } = await query;
  if (error) {
    return safeGlobalParticipationDatabaseFailure("global participation lookup", error);
  }
  return {
    ok: true,
    rows: (data ?? []).map((row) => ({
      personId: row.person_id,
      status: row.status as GlobalEventParticipationStatus,
    })),
  };
}

function revalidateGlobalParticipationPaths(eventId: string, personIds: readonly string[]) {
  try {
    revalidatePath(`/board/events/${eventId}`);
    revalidatePath("/board/member-engagement-review");
    revalidatePath("/board/the-pulse-of-the-chapter");
    for (const personId of new Set(personIds)) {
      revalidatePath(`/board/members/${personId}`);
    }
  } catch (error) {
    console.error("global participation revalidation failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

export async function addGlobalEventParticipants(
  eventId: string,
  personIds: string[],
  status: GlobalEventParticipationStatus,
): Promise<AddGlobalEventParticipantsResult> {
  const actor = await requireBoardOrAbove();
  const uniquePersonIds = [...new Set(personIds)];
  if (
    !UUID_PATTERN.test(eventId) ||
    uniquePersonIds.length === 0 ||
    uniquePersonIds.length > 250 ||
    uniquePersonIds.some((personId) => !UUID_PATTERN.test(personId)) ||
    !isGlobalEventParticipationStatus(status)
  ) {
    return globalParticipationFailure("invalid_input", "Choose valid members and a status");
  }

  const eventResult = await loadGlobalParticipationEvent(eventId);
  if (!eventResult.ok) return eventResult;
  if (!canAssignGlobalParticipationStatus(status, eventResult.event.starts_at)) {
    return globalParticipationFailure(
      "too_early",
      "Attended can be recorded only after the event starts",
    );
  }

  const eligibility = await loadEligibleGlobalParticipantIds(uniquePersonIds);
  if (!eligibility.ok) return eligibility;
  const eligible = uniquePersonIds.filter((personId) => eligibility.personIds.has(personId));
  const ineligible = uniquePersonIds.filter((personId) => !eligibility.personIds.has(personId));
  if (eligible.length === 0) {
    return globalParticipationFailure(
      "ineligible",
      `None of the selected people is an eligible ${CHAPTER_NAME} member`,
    );
  }

  let added: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const active = await loadActiveGlobalParticipation(eventId, eligible);
    if (!active.ok) return active;
    const reconciliation = reconcileGlobalParticipantAdds(eligible, active.rows, status);
    if (reconciliation.toAdd.length === 0) break;

    const { error } = await supabase.from("global_event_participation").insert(
      reconciliation.toAdd.map((personId) => ({
        event_id: eventId,
        person_id: personId,
        status,
        created_by_profile_id: actor.id,
        updated_by_profile_id: actor.id,
      })),
    );
    if (!error) {
      added = reconciliation.toAdd;
      break;
    }
    if (error.code === "23505" && attempt === 0) continue;
    return safeGlobalParticipationDatabaseFailure("global participation add", error);
  }

  const finalActive = await loadActiveGlobalParticipation(eventId, eligible);
  if (!finalActive.ok) return finalActive;
  const addedSet = new Set(added);
  const alreadyTracked = finalActive.rows.filter((row) => !addedSet.has(row.personId));
  if (added.length > 0) revalidateGlobalParticipationPaths(eventId, added);
  return {
    ok: true,
    added,
    alreadyTracked,
    ineligible,
  };
}

export async function updateGlobalEventParticipant(
  eventId: string,
  personId: string,
  status: GlobalEventParticipationStatus,
): Promise<UpdateGlobalEventParticipantResult> {
  const actor = await requireBoardOrAbove();
  if (
    !UUID_PATTERN.test(eventId) ||
    !UUID_PATTERN.test(personId) ||
    !isGlobalEventParticipationStatus(status)
  ) {
    return globalParticipationFailure("invalid_input", "Choose a valid member and status");
  }

  const eventResult = await loadGlobalParticipationEvent(eventId);
  if (!eventResult.ok) return eventResult;
  if (!canAssignGlobalParticipationStatus(status, eventResult.event.starts_at)) {
    return globalParticipationFailure(
      "too_early",
      "Attended can be recorded only after the event starts",
    );
  }
  const { data, error } = await supabase
    .from("global_event_participation")
    .update({ status, updated_by_profile_id: actor.id })
    .eq("event_id", eventId)
    .eq("person_id", personId)
    .is("removed_at", null)
    .select("person_id, status")
    .maybeSingle();
  if (error) return safeGlobalParticipationDatabaseFailure("global participation update", error);
  if (!data) return globalParticipationFailure("not_found", "Tracked member not found");

  revalidateGlobalParticipationPaths(eventId, [personId]);
  return {
    ok: true,
    personId: data.person_id,
    status: data.status as GlobalEventParticipationStatus,
  };
}

export async function removeGlobalEventParticipant(
  eventId: string,
  personId: string,
): Promise<RemoveGlobalEventParticipantResult> {
  const actor = await requireBoardOrAbove();
  if (!UUID_PATTERN.test(eventId) || !UUID_PATTERN.test(personId)) {
    return globalParticipationFailure("invalid_input", "Choose a valid tracked member");
  }

  const eventResult = await loadGlobalParticipationEvent(eventId);
  if (!eventResult.ok) return eventResult;
  const { data, error } = await supabase
    .from("global_event_participation")
    .update({
      removed_by_profile_id: actor.id,
      updated_by_profile_id: actor.id,
    })
    .eq("event_id", eventId)
    .eq("person_id", personId)
    .is("removed_at", null)
    .select("person_id")
    .maybeSingle();
  if (error) return safeGlobalParticipationDatabaseFailure("global participation remove", error);
  if (!data) return globalParticipationFailure("not_found", "Tracked member not found");

  revalidateGlobalParticipationPaths(eventId, [personId]);
  return {
    ok: true,
    personId: data.person_id,
  };
}

export async function createEvent(formData: FormData): Promise<ActionResult> {
  await requireBoardOrAbove();
  const built = buildPatchFromForm(formData);
  if (!built.ok) return built;

  const patch = built.patch.scope === "global"
    ? globalEventMetadataPatch(built.patch)
    : built.patch;
  const slug = patch.slug ?? (await slugFromTitle(String(patch.title ?? "")));
  let { data, error } = await supabase
    .from("events")
    .insert({ ...patch, slug })
    .select("id")
    .single();

  if (error && isMissingOptionalColumn(error)) {
    ({ data, error } = await supabase
      .from("events")
      .insert({ ...withoutOptionalColumns(patch), slug })
      .select("id")
      .single());
  }

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Could not create event" };
  }

  revalidatePublicEventPaths();
  redirect(`/board/events/${data.id}?saved=1`);
}

export async function updateEvent(id: string, formData: FormData): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!id) return { ok: false, error: "Missing event id" };
  const built = buildPatchFromForm(formData);
  if (!built.ok) return built;

  const { data: currentEvent, error: currentEventError } = await supabase
    .from("events")
    .select("scope")
    .eq("id", id)
    .maybeSingle();
  if (currentEventError) return { ok: false, error: currentEventError.message };
  if (!currentEvent) return { ok: false, error: "Event not found" };

  const targetIsGlobal = built.patch.scope === "global";
  if (currentEvent.scope !== "global" && targetIsGlobal) {
    const [registrations, ticketTypes, vouchers] = await Promise.all([
      supabase.from("event_registrations").select("id").eq("event_id", id).limit(1),
      supabase.from("event_ticket_types").select("id").eq("event_id", id).limit(1),
      supabase.from("event_vouchers").select("id").eq("event_id", id).limit(1),
    ]);
    const dependencyError = registrations.error ?? ticketTypes.error ?? vouchers.error;
    if (dependencyError) return { ok: false, error: dependencyError.message };
    if (
      (registrations.data?.length ?? 0) > 0 ||
      (ticketTypes.data?.length ?? 0) > 0 ||
      (vouchers.data?.length ?? 0) > 0
    ) {
      return {
        ok: false,
        error: "Remove local registrations, ticket types, and vouchers before changing this event to global scope",
      };
    }
  }

  // Global settings are metadata-only. Filter on both the persisted and target
  // scope so forged or stale forms cannot mutate registration operations.
  const patch = currentEvent.scope === "global" || targetIsGlobal
    ? globalEventMetadataPatch(built.patch)
    : built.patch;

  let { error } = await supabase
    .from("events")
    .update(patch)
    .eq("id", id);

  if (error && isMissingOptionalColumn(error)) {
    ({ error } = await supabase
      .from("events")
      .update(withoutOptionalColumns(patch))
      .eq("id", id));
  }

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/events/${id}`);
  revalidatePublicEventPaths();
  redirect(`/board/events/${id}?saved=1`);
}

export async function deleteEvent(id: string): Promise<void> {
  await requireBoardOrAbove();
  if (!id) return;
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) {
    // Surface to the user via a search-param redirect for now.
    redirect(`/board/events?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePublicEventPaths();
  redirect("/board/events?deleted=1");
}

// ============================================================
// Quick actions (Overview console — inline event management)
// ============================================================

const VALID_EVENT_STATUSES = [
  "draft",
  "published",
  "open",
  "closed",
  "completed",
  "cancelled",
] as const;

// Flip an event's lifecycle status from the Overview quick-actions bar without
// opening the full edit form. Public listings update on the next request.
export async function setEventStatus(
  eventId: string,
  status: string,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!eventId) return { ok: false, error: "Missing event id" };
  if (!VALID_EVENT_STATUSES.includes(status as (typeof VALID_EVENT_STATUSES)[number])) {
    return { ok: false, error: "Invalid status" };
  }
  const { error } = await supabase
    .from("events")
    .update({ status })
    .eq("id", eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/board/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  revalidatePublicEventPaths();
  return { ok: true };
}

// Adjust capacity inline. Empty string clears it (unlimited seats).
export async function setEventCapacity(
  eventId: string,
  capacityRaw: string,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!eventId) return { ok: false, error: "Missing event id" };
  const trimmed = capacityRaw.trim();
  const capacity = trimmed === "" ? null : Number(trimmed);
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 0)) {
    return { ok: false, error: "Capacity must be a whole number of seats" };
  }
  const { error } = await supabase
    .from("events")
    .update({ capacity })
    .eq("id", eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/board/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

// Toggle the post-event survey on/off. Drives whether the Feedback QR is live.
export async function setEventSurveyEnabled(
  eventId: string,
  enabled: boolean,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!eventId) return { ok: false, error: "Missing event id" };
  const { error } = await supabase
    .from("events")
    .update({ survey_enabled: enabled })
    .eq("id", eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/board/events/${eventId}`);
  revalidatePath(`/events/${eventId}/survey`);
  return { ok: true };
}

// ============================================================
// RSVPs
// ============================================================

const VALID_RSVP_STATUSES = [
  "pending_payment",
  "registered",
  "waitlisted",
  "cancelled",
  "attended",
  "no_show",
] as const;

export async function createRsvp(
  eventId: string,
  formData: FormData,
): Promise<
  | { ok: true; name: string; ticketPath: string }
  | { ok: false; error: string }
> {
  const sessionUser = await requireBoardOrAbove();
  if (!eventId) return { ok: false, error: "Missing event id" };
  const { data: rsvpEvent, error: rsvpEventError } = await supabase
    .from("events")
    .select("scope")
    .eq("id", eventId)
    .maybeSingle();
  if (rsvpEventError || !rsvpEvent) return { ok: false, error: "Event not found" };
  if (rsvpEvent.scope === "global") {
    return { ok: false, error: "Global event registration is managed externally" };
  }
  const email = s(formData.get("email")).toLowerCase();
  const name = s(formData.get("name"));
  const phone = s(formData.get("phone"));
  const company = s(formData.get("company"));
  const guestRaw = s(formData.get("guest_count"));
  const status = s(formData.get("status")) || "registered";
  const notes = s(formData.get("notes"));
  const complimentary = s(formData.get("complimentary")) === "true";
  const policyConfirmed = s(formData.get("no_show_policy_confirmed")) === "true";
  const ticketTypeId = s(formData.get("ticket_type_id"));

  if (!email) return { ok: false, error: "Email is required" };
  if (!email.includes("@")) return { ok: false, error: "Invalid email address" };
  if (complimentary && !name) return { ok: false, error: "Guest name is required" };
  if (complimentary && !company) return { ok: false, error: "Guest company is required" };
  if (complimentary && !policyConfirmed) {
    return { ok: false, error: "Confirm the late cancellation and no-show policy with the guest or sponsoring EO member first" };
  }
  const lenErr = checkLengths([
    ["Name", name, FIELD_MAX.name],
    ["Email", email, FIELD_MAX.email],
    ["Phone", phone, FIELD_MAX.phone],
    ["Company", company, FIELD_MAX.company],
    ["Notes", notes, FIELD_MAX.shortText],
  ]);
  if (lenErr) return { ok: false, error: lenErr };
  if (!VALID_RSVP_STATUSES.includes(status as (typeof VALID_RSVP_STATUSES)[number])) {
    return { ok: false, error: "Invalid status" };
  }
  const guestCount = guestRaw === "" ? 0 : Number(guestRaw);
  if (!Number.isFinite(guestCount) || guestCount < 0) {
    return { ok: false, error: "Guest count must be a non-negative number" };
  }
  if (complimentary && (status !== "registered" || guestCount !== 0)) {
    return { ok: false, error: "A complimentary guest must be one confirmed attendee" };
  }

  let complimentaryTicket: {
    id: string;
    name: string;
    price_amount: number;
    currency: string;
  } | null = null;
  if (complimentary) {
    if (!ticketTypeId) return { ok: false, error: "Choose a guest ticket" };
    const { data: ticket, error: ticketError } = await supabase
      .from("event_ticket_types")
      .select("id, name, price_amount, currency")
      .eq("id", ticketTypeId)
      .eq("event_id", eventId)
      .eq("active", true)
      .maybeSingle();
    if (ticketError) return { ok: false, error: ticketError.message };
    if (!ticket || ticket.price_amount <= 0) {
      return { ok: false, error: "Choose an active paid guest ticket" };
    }
    complimentaryTicket = ticket;
  }

  const policyNote = complimentary
    ? complimentaryPolicyNote(sessionUser.fullName || sessionUser.email)
    : "";
  const notesToSave = [policyNote, notes].filter(Boolean).join("\n") || null;
  const notesLengthError = checkLengths([
    ["Notes", notesToSave ?? "", FIELD_MAX.shortText],
  ]);
  if (notesLengthError) return { ok: false, error: notesLengthError };

  const personResult = await resolveSubmissionPersonWithSupabase({ email, name, phone });
  const person = personResult.data;
  if (personResult.error || !person) {
    return { ok: false, error: personResult.error?.message ?? "Could not save person" };
  }

  const ticketCode = newTicketCode();
  const registrationPayload = {
    event_id: eventId,
    person_id: person.id,
    status: complimentary ? "cancelled" : status,
    guest_count: guestCount,
    notes: notesToSave,
    ticket_code: ticketCode,
    ticket_type_id: complimentaryTicket?.id ?? null,
    waiver_accepted_at: null,
    confirmed_at: !complimentary && status === "attended" ? new Date().toISOString() : null,
    cancelled_at: complimentary ? new Date().toISOString() : null,
    cancellation_reason: complimentary ? "Incomplete complimentary registration" : null,
    ...(complimentaryTicket
      ? {
          amount_paid: 0,
          price_unit_amount: complimentaryTicket.price_amount,
          price_quantity: 1,
          price_base_total: complimentaryTicket.price_amount,
          price_discount_total: complimentaryTicket.price_amount,
          price_final_total: 0,
          price_currency: complimentaryTicket.currency.toUpperCase(),
        }
      : {}),
  };

  if (complimentary) {
    const result = await persistComplimentaryRegistration({
      async stageRegistration() {
        const { data, error } = await supabase
          .from("event_registrations")
          .insert(registrationPayload)
          .select("id")
          .single();
        return { data, error };
      },
      async addAttendee(registrationId) {
        const { error } = await supabase
          .from("event_registration_attendees")
          .insert({
            registration_id: registrationId,
            full_name: name,
            email,
            // The existing attendee schema predates assisted registrations and
            // stores phone as NOT NULL. Keep the row compatible while allowing an
            // organizer to register an email-reachable guest without inventing a
            // phone number.
            phone: phone || "",
            company,
            title: null,
            food_allergy: null,
          });
        return { error };
      },
      async activateRegistration(registrationId) {
        const { data, error } = await supabase
          .from("event_registrations")
          .update({
            status: "registered",
            confirmed_at: new Date().toISOString(),
            cancelled_at: null,
            cancellation_reason: null,
          })
          .eq("id", registrationId)
          .eq("event_id", eventId)
          .eq("status", "cancelled")
          .select("id")
          .maybeSingle();
        return { updated: Boolean(data), error };
      },
      async removeStagedRegistration(registrationId) {
        const { data, error } = await supabase
          .from("event_registrations")
          .delete()
          .eq("id", registrationId)
          .eq("event_id", eventId)
          .eq("status", "cancelled")
          .select("id")
          .maybeSingle();
        return { deleted: Boolean(data), error };
      },
    });
    if (!result.ok) return result;
  } else {
    // Unique on (event_id, person_id) prevents duplicate registrations.
    const { data: registration, error } = await supabase
      .from("event_registrations")
      .insert(registrationPayload)
      .select("id")
      .single();
    if (error || !registration) {
      if (/duplicate key/i.test(error?.message ?? "") || error?.code === "23505") {
        return {
          ok: false,
          error: "This person is already registered for this event.",
        };
      }
      return {
        ok: false,
        error: error?.message ?? "Could not add registration",
      };
    }
  }

  revalidatePath(`/board/events/${eventId}`);
  // Board-added attendee: mirror to the organiser guest-list sheet too (the
  // sync ignores other events and non-registered statuses, never throws).
  after(async () => {
    const { data: added } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", eventId)
      .eq("ticket_code", ticketCode)
      .maybeSingle();
    if (added) await syncRegistrationToGuestSheet(added.id);
  });

  revalidatePublicEventPaths();
  return { ok: true, name: name || email, ticketPath: `/t/${ticketCode}` };
}

export async function updateRsvpStatus(
  rsvpId: string,
  eventId: string,
  status: string,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!rsvpId || !eventId) return { ok: false, error: "Missing rsvp or event id" };
  if (!VALID_RSVP_STATUSES.includes(status as (typeof VALID_RSVP_STATUSES)[number])) {
    return { ok: false, error: "Invalid status" };
  }

  const patch: Record<string, unknown> = { status };
  if (status === "attended") patch.confirmed_at = new Date().toISOString();
  if (status === "cancelled") patch.cancelled_at = new Date().toISOString();

  const { error } = await supabase
    .from("event_registrations")
    .update(patch)
    .eq("id", rsvpId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/board/events/${eventId}`);
  return { ok: true };
}

export async function updateRsvpReviewClassification(
  rsvpId: string,
  eventId: string,
  classification: string,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!rsvpId || !eventId) return { ok: false, error: "Missing rsvp or event id" };
  if (
    !REGISTRATION_REVIEW_CLASSIFICATIONS.includes(
      classification as RegistrationReviewClassification,
    )
  ) {
    return { ok: false, error: "Invalid review classification" };
  }

  const { error } = await supabase.rpc("set_event_registration_review", {
    p_registration_id: rsvpId,
    p_event_id: eventId,
    p_classification: classification,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/board/events/${eventId}`);
  revalidatePath(`/board/events/${eventId}/check-in`);
  revalidatePublicEventPaths();
  return { ok: true };
}

export async function setRsvpProspect(
  rsvpId: string,
  eventId: string,
  isProspect: boolean,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!rsvpId || !eventId) return { ok: false, error: "Missing rsvp or event id" };

  const { data, error } = await supabase
    .from("event_registrations")
    .update({ is_prospect: isProspect })
    .eq("id", rsvpId)
    .eq("event_id", eventId)
    .neq("review_classification", "spam")
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.message.includes("is_prospect")) {
      return { ok: false, error: "Prospect labels are not enabled in the database yet" };
    }
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: "Registration not found for this event" };

  revalidatePath(`/board/events/${eventId}`);
  return { ok: true };
}

// Quick attendance toggle from the RSVP list checkbox. Mirrors the door
// scanner: ticking marks the person attended and stamps checked_in_at;
// unticking returns them to registered and clears the check-in time.
// Attendance everywhere (metrics, check-in counts) keys off status==="attended".
export async function setRsvpAttendance(
  rsvpId: string,
  eventId: string,
  attended: boolean,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!rsvpId || !eventId) return { ok: false, error: "Missing rsvp or event id" };

  const patch: Record<string, unknown> = attended
    ? { status: "attended", checked_in_at: new Date().toISOString() }
    : { status: "registered", checked_in_at: null };

  const { data, error } = await supabase
    .from("event_registrations")
    .update(patch)
    .eq("id", rsvpId)
    .eq("event_id", eventId)
    .neq("review_classification", "spam")
    .eq("status", attended ? "registered" : "attended")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: "Could not update attendance. Try again." };
  if (!data) {
    return {
      ok: false,
      error: "Registration not found for this event or attendance already changed",
    };
  }

  revalidatePath(`/board/events/${eventId}`);
  revalidatePath(`/board/events/${eventId}/check-in`);
  return { ok: true };
}

// ============================================================
// Check-in (door scanner — called from /board/events/[id]/check-in)
// ============================================================

type CheckInResult =
  | {
      ok: true;
      outcome: "ready" | "checked_in" | "already" | "blocked";
      candidate: CheckInCandidate;
      reason?: string;
    }
  | { ok: false; error: string };

type CheckInRow = {
  id: string;
  event_id: string;
  status: string;
  guest_count: number;
  checked_in_at: string | null;
  waiver_accepted_at: string | null;
  review_classification: RegistrationReviewClassification;
  person: { name: string | null; email: string } | null;
  ticket_type: { name: string } | null;
};

const CHECK_IN_SELECT =
  "id, event_id, status, guest_count, checked_in_at, waiver_accepted_at, review_classification, person:people!event_registrations_person_id_fkey(name, email), ticket_type:event_ticket_types!event_registrations_ticket_type_id_fkey(name)";

function checkInCandidate(row: CheckInRow): CheckInCandidate {
  return buildCheckInRoster([
    {
      ...row,
      status: row.status as RegistrationStatus,
      attendees: [],
    },
  ])[0];
}

async function findCheckInRegistration(
  eventId: string,
  registrationId: string,
): Promise<{ row: CheckInRow | null; failed: boolean }> {
  const { data, error } = await supabase
    .from("event_registrations")
    .select(CHECK_IN_SELECT)
    .eq("id", registrationId)
    .eq("event_id", eventId)
    .maybeSingle();
  return {
    row: error ? null : (data as unknown as CheckInRow | null),
    failed: Boolean(error),
  };
}

export async function resolveCheckInByCode(
  eventId: string,
  rawCode: string,
): Promise<CheckInResult> {
  await requireBoardOrAbove();
  if (typeof eventId !== "string" || !eventId) {
    return { ok: false, error: "Missing event id" };
  }
  if (typeof rawCode !== "string" || rawCode.length > 2048) {
    return { ok: false, error: "Invalid ticket QR" };
  }
  const code = normalizeTicketCode(rawCode);
  if (!validTicketCode(code)) return { ok: false, error: "Invalid ticket QR" };

  const { data, error } = await supabase
    .from("event_registrations")
    .select(CHECK_IN_SELECT)
    .eq("ticket_code", code)
    .maybeSingle();
  if (error) return { ok: false, error: "Could not read this ticket. Try again." };

  const reg = data as unknown as CheckInRow | null;
  if (!reg || reg.review_classification === "spam") {
    return { ok: false, error: "Ticket not found" };
  }
  if (reg.event_id !== eventId) {
    return { ok: false, error: "This ticket is for a different event" };
  }

  const candidate = checkInCandidate(reg);
  const eligibility = checkInEligibility(candidate);
  return eligibility.kind === "blocked"
    ? { ok: true, outcome: "blocked", candidate, reason: eligibility.reason }
    : { ok: true, outcome: eligibility.kind, candidate };
}

export async function confirmDoorCheckIn(
  eventId: string,
  registrationId: string,
): Promise<CheckInResult> {
  await requireBoardOrAbove();
  if (
    typeof eventId !== "string" ||
    typeof registrationId !== "string" ||
    !eventId ||
    !registrationId
  ) {
    return { ok: false, error: "Missing event or registration id" };
  }

  const found = await findCheckInRegistration(eventId, registrationId);
  if (found.failed) return { ok: false, error: "Could not read this registration. Try again." };
  if (!found.row || found.row.review_classification === "spam") {
    return { ok: false, error: "Registration not found for this event" };
  }

  const candidate = checkInCandidate(found.row);
  const eligibility = checkInEligibility(candidate);
  if (eligibility.kind === "already") {
    return { ok: true, outcome: "already", candidate };
  }
  if (eligibility.kind === "blocked") {
    return {
      ok: true,
      outcome: "blocked",
      candidate,
      reason: eligibility.reason,
    };
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("event_registrations")
    .update({
      status: "attended",
      checked_in_at: now,
      waiver_accepted_at: found.row.waiver_accepted_at ?? now,
    })
    .eq("id", registrationId)
    .eq("event_id", eventId)
    .eq("status", "registered")
    .neq("review_classification", "spam")
    .select(CHECK_IN_SELECT)
    .maybeSingle();
  if (updateError) {
    return { ok: false, error: "Could not check in this registration. Try again." };
  }

  if (!updated) {
    const reread = await findCheckInRegistration(eventId, registrationId);
    if (reread.failed || !reread.row) {
      return { ok: false, error: "Attendance changed. Search for the guest again." };
    }
    const current = checkInCandidate(reread.row);
    const currentEligibility = checkInEligibility(current);
    if (currentEligibility.kind === "already") {
      return { ok: true, outcome: "already", candidate: current };
    }
    return currentEligibility.kind === "blocked"
      ? {
          ok: true,
          outcome: "blocked",
          candidate: current,
          reason: currentEligibility.reason,
        }
      : { ok: false, error: "Attendance changed. Search for the guest again." };
  }

  revalidatePath(`/board/events/${eventId}`);
  revalidatePath(`/board/events/${eventId}/check-in`);
  return {
    ok: true,
    outcome: "checked_in",
    candidate: checkInCandidate(updated as unknown as CheckInRow),
  };
}


export async function updateRsvpNotes(
  rsvpId: string,
  eventId: string,
  notes: string,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!rsvpId || !eventId) return { ok: false, error: "Missing rsvp or event id" };
  const { data: existing, error: readError } = await supabase
    .from("event_registrations")
    .select("notes")
    .eq("id", rsvpId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };
  if (!existing) return { ok: false, error: "Registration not found for this event" };
  const notesToSave = preserveComplimentaryPolicyNote(existing.notes, notes);
  const lenErr = checkLengths([["Notes", notesToSave ?? "", FIELD_MAX.shortText]]);
  if (lenErr) return { ok: false, error: lenErr };
  const { error } = await supabase
    .from("event_registrations")
    .update({ notes: notesToSave })
    .eq("id", rsvpId)
    .eq("event_id", eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/board/events/${eventId}`);
  return { ok: true };
}

export async function setRsvpInviter(
  rsvpId: string,
  eventId: string,
  inviterPersonId: string,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  const store: InviterAssignmentStore = {
    async findTarget(targetRsvpId, targetEventId) {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("id, event_id, person_id, status, review_classification, invited_by_person_id")
        .eq("id", targetRsvpId)
        .eq("event_id", targetEventId)
        .maybeSingle();
      return { data, error: error?.message };
    },
    async findInviterEligibility(candidatePersonId) {
      const { data: candidate, error: candidateError } = await supabase
        .from("people")
        .select("id, is_eo_staff")
        .eq("id", candidatePersonId)
        .maybeSingle();
      if (candidateError) return { data: null, error: candidateError.message };
      if (candidate?.is_eo_staff) {
        return { data: { person_id: candidate.id, kind: "staff" as const } };
      }

      const { data: chapter, error: chapterError } = await supabase
        .from("chapters")
        .select("id")
        .eq("chapter_name", CHAPTER_NAME)
        .maybeSingle();
      if (chapterError || !chapter) {
        return { data: null, error: chapterError?.message ?? `${CHAPTER_NAME} chapter not found` };
      }
      const { data, error } = await supabase
        .from("chapter_memberships")
        .select("person_id, status")
        .eq("chapter_id", chapter.id)
        .eq("person_id", candidatePersonId)
        .in("status", ["active", "on_leave"])
        .maybeSingle();
      return {
        data: data
          ? { person_id: data.person_id, kind: "member" as const }
          : null,
        error: error?.message,
      };
    },
    async assignInviter(
      targetRsvpId,
      targetEventId,
      candidatePersonId,
      currentInviterPersonId,
    ) {
      const { data, error } = await supabase.rpc("set_event_registration_inviter_person", {
        p_registration_id: targetRsvpId,
        p_event_id: targetEventId,
        p_inviter_person_id: candidatePersonId,
        p_expected_inviter_person_id: currentInviterPersonId,
      });
      return { updated: data === true, error: error?.message };
    },
  };

  const result = await assignRsvpInviter(store, rsvpId, eventId, inviterPersonId);
  if (result.ok) revalidatePath(`/board/events/${eventId}`);
  return result;
}

export async function deleteRsvp(
  rsvpId: string,
  eventId: string,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!rsvpId || !eventId) return { ok: false, error: "Missing rsvp or event id" };
  const { error } = await supabase
    .from("event_registrations")
    .delete()
    .eq("id", rsvpId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/board/events/${eventId}`);
  return { ok: true };
}

// ============================================================
// Materials
// ============================================================

const VALID_MATERIAL_KINDS = [
  "slides",
  "recording",
  "handout",
  "cert",
  "photos",
  "recap",
] as const;

const VALID_MATERIAL_VISIBILITY = ["registered", "attended", "all"] as const;

export async function addMaterial(
  eventId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!eventId) return { ok: false, error: "Missing event id" };
  const title = s(formData.get("title"));
  const kind = s(formData.get("kind"));
  const url = s(formData.get("url"));
  const visibleTo = s(formData.get("visible_to")) || "registered";

  if (!title) return { ok: false, error: "Title is required" };
  if (!url) return { ok: false, error: "URL is required" };
  if (!VALID_MATERIAL_KINDS.includes(kind as (typeof VALID_MATERIAL_KINDS)[number])) {
    return { ok: false, error: "Invalid material kind" };
  }
  if (
    !VALID_MATERIAL_VISIBILITY.includes(
      visibleTo as (typeof VALID_MATERIAL_VISIBILITY)[number],
    )
  ) {
    return { ok: false, error: "Invalid visibility" };
  }

  const { error } = await supabase.from("event_materials").insert({
    event_id: eventId,
    kind,
    title,
    url,
    visible_to: visibleTo,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/board/events/${eventId}`);
  return { ok: true };
}

export async function deleteMaterial(
  materialId: string,
  eventId: string,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!materialId || !eventId) {
    return { ok: false, error: "Missing material or event id" };
  }
  const { error } = await supabase
    .from("event_materials")
    .delete()
    .eq("id", materialId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/board/events/${eventId}`);
  return { ok: true };
}

// ============================================================
// Ticket types
// ============================================================

type TicketBuildResult =
  | { ok: true; patch: Record<string, unknown> }
  | { ok: false; error: string };

function buildTicketPatchFromForm(formData: FormData): TicketBuildResult {
  const name = s(formData.get("name"));
  const description = s(formData.get("description"));
  const priceMajorUnitsRaw = s(formData.get("price_major_units"));
  const currencyRaw = s(formData.get("currency"));
  const capacityRaw = s(formData.get("capacity"));
  const maxAttendeesRaw = s(formData.get("max_attendees"));
  const sortOrderRaw = s(formData.get("sort_order"));
  const active = formData.get("active") === "on";

  if (!name) return { ok: false, error: "Ticket name is required" };

  const price = parseEventTicketPrice(priceMajorUnitsRaw, currencyRaw);
  if (!price.ok) return price;

  const capacity = capacityRaw === "" ? null : Number(capacityRaw);
  if (capacity !== null && (!Number.isFinite(capacity) || capacity < 0)) {
    return { ok: false, error: "Capacity must be a non-negative number" };
  }

  const maxAttendees = maxAttendeesRaw === "" ? null : Number(maxAttendeesRaw);
  if (maxAttendees !== null && (!Number.isInteger(maxAttendees) || maxAttendees < 1)) {
    return { ok: false, error: "Max attendees must be a whole number of 1 or more" };
  }

  const sortOrder = sortOrderRaw === "" ? 0 : Number(sortOrderRaw);
  if (!Number.isFinite(sortOrder)) {
    return { ok: false, error: "Sort order must be a number" };
  }

  return {
    ok: true,
    patch: {
      name,
      description: nullable(description),
      price_amount: price.priceAmount,
      currency: price.currency,
      capacity,
      max_attendees: maxAttendees,
      sort_order: sortOrder,
      active,
    },
  };
}

export async function createTicketType(
  eventId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!eventId) return { ok: false, error: "Missing event id" };
  const built = buildTicketPatchFromForm(formData);
  if (!built.ok) return built;

  const { error } = await supabase
    .from("event_ticket_types")
    .insert({ ...built.patch, event_id: eventId });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/board/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function updateTicketType(
  ticketId: string,
  eventId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!ticketId || !eventId) {
    return { ok: false, error: "Missing ticket or event id" };
  }
  const built = buildTicketPatchFromForm(formData);
  if (!built.ok) return built;

  const { data, error } = await supabase
    .from("event_ticket_types")
    .update(built.patch)
    .eq("id", ticketId)
    .eq("event_id", eventId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Ticket not found for this event" };

  revalidatePath(`/board/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function deleteTicketType(
  ticketId: string,
  eventId: string,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!ticketId || !eventId) {
    return { ok: false, error: "Missing ticket or event id" };
  }
  const { data: voucherReference, error: referenceError } = await supabase
    .from("event_voucher_ticket_types")
    .select("voucher_id")
    .eq("ticket_type_id", ticketId)
    .limit(1)
    .maybeSingle();
  if (referenceError && !isVoucherSchemaError(referenceError)) {
    return { ok: false, error: referenceError.message };
  }
  if (voucherReference) {
    return {
      ok: false,
      error: "This ticket is used by a voucher. Deactivate the ticket instead so existing campaign rules stay intact.",
    };
  }

  const { error } = await supabase
    .from("event_ticket_types")
    .delete()
    .eq("id", ticketId)
    .eq("event_id", eventId);
  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error: "This ticket is in use and cannot be deleted. Deactivate it instead.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/board/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

// ============================================================
// Voucher administration
// ============================================================

const VOUCHER_CODE_RE = /^[A-Z0-9][A-Z0-9_-]{1,63}$/;

type VoucherPatch = {
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
  eligible_ticket_ids: string[];
};

type VoucherBuildResult =
  | { ok: true; patch: VoucherPatch }
  | { ok: false; error: string };

function parsePositiveWholeNumber(raw: string, label: string): number | null | string {
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0
    ? value
    : `${label} must be a whole number greater than zero`;
}

function buildVoucherPatchFromForm(formData: FormData): VoucherBuildResult {
  const code = normalizeVoucherCode(s(formData.get("code")));
  const campaignLabel = s(formData.get("campaign_label"));
  const percentage = Number(s(formData.get("discount_percent")));
  const startsAtRaw = s(formData.get("starts_at"));
  const endsAtRaw = s(formData.get("ends_at"));
  const discountedSeatLimit = parsePositiveWholeNumber(
    s(formData.get("discounted_seat_limit")),
    "Discounted seat limit",
  );
  const perEmailSeatLimit = parsePositiveWholeNumber(
    s(formData.get("per_email_seat_limit")),
    "Per-email seat limit",
  );
  const ticketIds = [...new Set(
    formData.getAll("eligible_ticket_ids").map((value) => s(value)).filter(Boolean),
  )];
  const teamInviteEnabled = formData.get("team_invite_enabled") === "on";

  if (!VOUCHER_CODE_RE.test(code)) {
    return { ok: false, error: "Code must be 2 to 64 letters, numbers, underscores, or hyphens" };
  }
  if (!campaignLabel) return { ok: false, error: "Campaign label is required" };
  if (campaignLabel.length > 200) {
    return { ok: false, error: "Campaign label must be 200 characters or fewer" };
  }
  const internalNotes = s(formData.get("internal_notes"));
  if (internalNotes.length > 2000) {
    return { ok: false, error: "Internal notes must be 2,000 characters or fewer" };
  }
  if (!isVoucherPercentage(percentage)) {
    return { ok: false, error: "Discount must be a whole percentage from 1 to 100" };
  }
  if (typeof discountedSeatLimit === "string") {
    return { ok: false, error: discountedSeatLimit };
  }
  if (typeof perEmailSeatLimit === "string") {
    return { ok: false, error: perEmailSeatLimit };
  }
  if (ticketIds.length === 0) {
    return { ok: false, error: "Select at least one eligible ticket" };
  }
  if (teamInviteEnabled && ticketIds.length !== 1) {
    return { ok: false, error: "A team invitation voucher must apply to exactly one ticket" };
  }

  const startsAt = startsAtRaw ? hcmInputToISO(startsAtRaw) : null;
  const endsAt = endsAtRaw ? hcmInputToISO(endsAtRaw) : null;
  if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
    return { ok: false, error: "End time must be after the start time" };
  }

  return {
    ok: true,
    patch: {
      code,
      campaign_label: campaignLabel,
      discount_percent: percentage,
      starts_at: startsAt,
      ends_at: endsAt,
      discounted_seat_limit: discountedSeatLimit,
      per_email_seat_limit: perEmailSeatLimit,
      team_invite_enabled: teamInviteEnabled,
      active: formData.get("active") === "on",
      internal_notes: nullable(internalNotes),
      eligible_ticket_ids: ticketIds,
    },
  };
}

async function validateVoucherEventAndTickets(eventId: string, ticketIds: string[]): Promise<string | null> {
  const [{ data: event, error: eventError }, { data: tickets, error: ticketError }] = await Promise.all([
    supabase.from("events").select("id").eq("id", eventId).maybeSingle(),
    supabase.from("event_ticket_types").select("id").eq("event_id", eventId).in("id", ticketIds),
  ]);
  if (eventError || !event) return "Event not found";
  if (ticketError) return ticketError.message;
  if ((tickets ?? []).length !== ticketIds.length) {
    return "Every eligible ticket must belong to this event";
  }
  return null;
}

function voucherAdminError(error: { code?: string; message: string }): string {
  if (/event_vouchers_one_team_invite_idx/i.test(error.message)) {
    return "This event already has a team invitation voucher. Turn that setting off before choosing another one";
  }
  if (error.code === "23505") return "That voucher code already exists for this event";
  return error.message;
}

export async function createEventVoucher(eventId: string, formData: FormData): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!eventId) return { ok: false, error: "Missing event id" };
  const built = buildVoucherPatchFromForm(formData);
  if (!built.ok) return built;
  const scopeError = await validateVoucherEventAndTickets(eventId, built.patch.eligible_ticket_ids);
  if (scopeError) return { ok: false, error: scopeError };
  const { eligible_ticket_ids: ticketIds, ...voucherPatch } = built.patch;
  const { data: voucher, error } = await supabase
    .from("event_vouchers")
    .insert({ ...voucherPatch, event_id: eventId })
    .select("id")
    .single();
  if (error || !voucher) return { ok: false, error: voucherAdminError(error ?? { message: "Could not create voucher" }) };
  const { error: eligibilityError } = await supabase.from("event_voucher_ticket_types").insert(
    ticketIds.map((ticketTypeId) => ({ voucher_id: voucher.id, ticket_type_id: ticketTypeId })),
  );
  if (eligibilityError) {
    await supabase.from("event_vouchers").delete().eq("id", voucher.id).eq("event_id", eventId);
    return { ok: false, error: eligibilityError.message };
  }
  revalidatePath(`/board/events/${eventId}`);
  return { ok: true };
}

export async function updateEventVoucher(
  eventId: string,
  voucherId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!eventId || !voucherId) return { ok: false, error: "Missing event or voucher id" };
  const built = buildVoucherPatchFromForm(formData);
  if (!built.ok) return built;
  const scopeError = await validateVoucherEventAndTickets(eventId, built.patch.eligible_ticket_ids);
  if (scopeError) return { ok: false, error: scopeError };

  const [{ data: existing, error: existingError }, { data: redemptions, error: usageError }] = await Promise.all([
    supabase.from("event_vouchers").select("*").eq("id", voucherId).eq("event_id", eventId).maybeSingle(),
    supabase.from("event_voucher_redemptions")
      .select("state, discounted_seat_quantity, registration:event_registrations!event_voucher_redemptions_registration_id_fkey(review_classification)")
      .eq("voucher_id", voucherId),
  ]);
  if (existingError || !existing) return { ok: false, error: "Voucher not found for this event" };
  if (usageError) return { ok: false, error: usageError.message };

  const hasUsage = (redemptions ?? []).length > 0;
  const currentlyConsumed = (redemptions ?? [])
    .filter((row) => {
      const registration = Array.isArray(row.registration)
        ? row.registration[0]
        : row.registration;
      return registration?.review_classification !== "spam" &&
        (row.state === "reserved" || row.state === "redeemed");
    })
    .reduce((total, row) => total + row.discounted_seat_quantity, 0);
  if (hasUsage && (
    built.patch.code !== existing.code ||
    built.patch.discount_percent !== existing.discount_percent ||
    (built.patch.starts_at ? new Date(built.patch.starts_at).getTime() : null) !==
      (existing.starts_at ? new Date(existing.starts_at).getTime() : null)
  )) {
    return { ok: false, error: "Code, discount, start time, and eligible tickets are locked after first use" };
  }
  if (hasUsage &&
    built.patch.discounted_seat_limit !== null &&
    (existing.discounted_seat_limit === null ||
      built.patch.discounted_seat_limit < currentlyConsumed ||
      (existing.discounted_seat_limit !== null && built.patch.discounted_seat_limit < existing.discounted_seat_limit))
  ) {
    return { ok: false, error: `Discounted seat limit cannot be below its current limit or ${currentlyConsumed} seats already in use` };
  }
  if (hasUsage &&
    built.patch.per_email_seat_limit !== null &&
    (existing.per_email_seat_limit === null ||
      built.patch.per_email_seat_limit < existing.per_email_seat_limit)
  ) {
    return { ok: false, error: "Per-email seat limit can only increase after creation" };
  }
  if (hasUsage) {
    const { data: currentTickets } = await supabase
      .from("event_voucher_ticket_types")
      .select("ticket_type_id")
      .eq("voucher_id", voucherId);
    const before = (currentTickets ?? []).map((row) => row.ticket_type_id).sort().join(",");
    const after = [...built.patch.eligible_ticket_ids].sort().join(",");
    if (before !== after) {
      return { ok: false, error: "Eligible tickets are locked after first use" };
    }
  }

  const { data: updated, error: updateError } = await supabase.rpc(
    "update_event_voucher_configuration",
    {
      p_event_id: eventId,
      p_voucher_id: voucherId,
      p_code: built.patch.code,
      p_campaign_label: built.patch.campaign_label,
      p_discount_percent: built.patch.discount_percent,
      p_starts_at: built.patch.starts_at,
      p_ends_at: built.patch.ends_at,
      p_discounted_seat_limit: built.patch.discounted_seat_limit,
      p_per_email_seat_limit: built.patch.per_email_seat_limit,
      p_active: built.patch.active,
      p_internal_notes: built.patch.internal_notes,
      p_eligible_ticket_ids: built.patch.eligible_ticket_ids,
      p_team_invite_enabled: built.patch.team_invite_enabled,
      p_allow_rule_changes: !hasUsage,
    },
  );
  if (updateError || updated !== true) {
    return { ok: false, error: voucherAdminError(updateError ?? { message: "Could not update voucher" }) };
  }
  revalidatePath(`/board/events/${eventId}`);
  return { ok: true };
}

export async function deactivateEventVoucher(eventId: string, voucherId: string): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!eventId || !voucherId) return { ok: false, error: "Missing event or voucher id" };
  const { data, error } = await supabase
    .from("event_vouchers")
    .update({ active: false })
    .eq("id", voucherId)
    .eq("event_id", eventId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Voucher not found for this event" };
  revalidatePath(`/board/events/${eventId}`);
  return { ok: true };
}

// ============================================================
// Participant messaging (Overview > Messages)
// ============================================================

// Audience segments a chair can message. Kept flat and explicit so the set the
// chair picks always maps to a clear list of registration statuses.
const SEGMENT_STATUSES: Record<string, RegistrationStatus[]> = {
  all: ["registered", "attended", "pending_payment", "waitlisted"],
  registered: ["registered", "attended"],
  checked_in: ["attended"],
  no_show: ["no_show"],
  waitlist: ["waitlisted"],
};

export type SendMessageResult =
  | { ok: true; sent: number; failed: number; configured: boolean }
  | { ok: false; error: string };

export async function sendParticipantMessage(
  eventId: string,
  formData: FormData,
): Promise<SendMessageResult> {
  await requireBoardOrAbove();
  if (!eventId) return { ok: false, error: "Missing event id" };
  const segment = s(formData.get("segment"));
  const subject = s(formData.get("subject"));
  const body = s(formData.get("body"));

  const statuses = SEGMENT_STATUSES[segment];
  if (!statuses) return { ok: false, error: "Pick who to send to" };
  if (!subject) return { ok: false, error: "Subject is required" };
  if (!body) return { ok: false, error: "Message body is required" };
  if (subject.length > 200) return { ok: false, error: "Subject is too long" };
  if (body.length > 5000) return { ok: false, error: "Message is too long" };

  const { data: ev, error: evErr } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .maybeSingle();
  if (evErr || !ev) return { ok: false, error: "Event not found" };

  // Resolve recipients server-side from the chosen segment — never trust a
  // client-supplied address list.
  const { data: rows, error: rErr } = await supabase
    .from("event_registrations")
    .select("person:people!event_registrations_person_id_fkey(email, name)")
    .eq("event_id", eventId)
    .in("status", statuses)
    .neq("review_classification", "spam");
  if (rErr) return { ok: false, error: rErr.message };

  const seen = new Set<string>();
  const recipients: { email: string; name: string | null }[] = [];
  for (const row of (rows ?? []) as unknown as {
    person: { email: string | null; name: string | null } | null;
  }[]) {
    const email = row.person?.email?.trim().toLowerCase();
    if (!email || !email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    recipients.push({ email, name: row.person?.name ?? null });
  }

  if (recipients.length === 0) {
    return { ok: false, error: "No one with an email in that group yet" };
  }

  const res = await sendEventBroadcast({
    subject,
    bodyText: body,
    eventTitle: ev.title as string,
    recipients,
  });

  if (!res.configured) {
    return {
      ok: false,
      error:
        "Email sending is not configured yet. Set RESEND_API_KEY and a verified sender to enable it.",
    };
  }

  return { ok: true, sent: res.sent, failed: res.failed, configured: true };
}

// ============================================================
// Public RSVP (called from the public event detail page)
// ============================================================

type PublicRsvpResult =
  | { ok: true; checkoutUrl?: string; waitlisted?: boolean; ticketUrl?: string }
  | { ok: false; error: string };

async function snapshotStandardRegistrationPrice(input: {
  registrationId: string;
  amount: number;
  currency: string;
  stripeSessionId?: string;
}): Promise<string | null> {
  const { data, error } = await supabase.rpc("snapshot_standard_registration_price", {
    p_registration_id: input.registrationId,
    p_amount: input.amount,
    p_currency: input.currency,
    ...(input.stripeSessionId ? { p_stripe_session_id: input.stripeSessionId } : {}),
  });
  if (error || data !== true) {
    return error?.message ?? "Checkout amount and currency could not be secured";
  }
  return null;
}

async function attachStandardCheckoutSession(input: {
  registrationId: string;
  sessionId: string;
  amount: number | null;
  currency: string | null;
}): Promise<boolean> {
  if (
    input.amount == null ||
    !Number.isInteger(input.amount) ||
    input.amount <= 0 ||
    !input.currency ||
    !/^[A-Za-z]{3}$/.test(input.currency)
  ) {
    return false;
  }

  const { data, error } = await supabase.rpc("attach_standard_checkout_session", {
    p_registration_id: input.registrationId,
    p_stripe_session_id: input.sessionId,
    p_expected_amount: input.amount,
    p_expected_currency: input.currency.toUpperCase(),
  });
  if (error) {
    console.error("Standard checkout session attachment failed:", error.message);
  }
  return !error && data === true;
}

export type VoucherPreviewResult =
  | {
      ok: true;
      code: string;
      percentOff: number;
      unitPrice: number;
      quantity: number;
      currency: string;
      baseTotal: number;
      discountTotal: number;
      finalTotal: number;
    }
  | { ok: false; error: string; reason?: VoucherPublicError };

function voucherFailure(reason: VoucherPublicError): VoucherPreviewResult {
  return { ok: false, reason, error: voucherErrorMessage(reason) };
}

function isVoucherSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "42883" ||
    error.code === "PGRST202" ||
    /schema cache|event_voucher|reserve_event_registration_with_voucher/i.test(error.message ?? "")
  );
}

function publicVoucherReason(message: string): VoucherPublicError {
  if (/ineligible/i.test(message)) return "ineligible_ticket";
  if (/email_limit/i.test(message)) return "email_limit_reached";
  if (/exhausted|limit/i.test(message)) return "limit_reached";
  if (/not_found|inactive/i.test(message)) return "unavailable";
  return "invalid_request";
}

/** Advisory only. Final submission revalidates atomically in PostgreSQL. */
export async function previewEventVoucher(
  eventId: string,
  ticketTypeId: string,
  codeRaw: string,
  quantity: number,
  email?: string,
): Promise<VoucherPreviewResult> {
  const code = normalizeVoucherCode(codeRaw);
  if (!eventId || !ticketTypeId || !code) return voucherFailure("invalid_request");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return voucherFailure("invalid_quantity");
  }
  const [user, { data: event }] = await Promise.all([
    getSessionUser(),
    supabase
      .from("events")
      .select("audience, visibility")
      .eq("id", eventId)
      .maybeSingle(),
  ]);
  if (!event || !canView(user?.role ?? null, eventAudience(event))) {
    return voucherFailure("unavailable");
  }

  const { data: voucher, error: voucherError } = await supabase
    .from("event_vouchers")
    .select("id, code, campaign_label, discount_percent, starts_at, ends_at, discounted_seat_limit, per_email_seat_limit, active")
    .eq("event_id", eventId)
    .eq("code", code)
    .maybeSingle();
  if (voucherError) {
    console.error("previewEventVoucher lookup:", voucherError.message);
    return voucherFailure("unavailable");
  }
  if (!voucher) return voucherFailure("unavailable");
  const now = Date.now();
  if (
    !voucher.active ||
    (voucher.starts_at && now < new Date(voucher.starts_at).getTime()) ||
    (voucher.ends_at && now >= new Date(voucher.ends_at).getTime())
  ) return voucherFailure("unavailable");

  const [{ data: eligible, error: eligibleError }, { data: ticket, error: ticketError }] =
    await Promise.all([
      supabase.from("event_voucher_ticket_types").select("ticket_type_id")
        .eq("voucher_id", voucher.id).eq("ticket_type_id", ticketTypeId).maybeSingle(),
      supabase.from("event_ticket_types").select("id, price_amount, currency, active")
        .eq("id", ticketTypeId).eq("event_id", eventId).eq("active", true).maybeSingle(),
    ]);
  if (eligibleError || ticketError) {
    console.error("previewEventVoucher eligibility:", eligibleError?.message ?? ticketError?.message);
    return voucherFailure("unavailable");
  }
  if (!eligible || !ticket) return voucherFailure("ineligible_ticket");

  const { data: usageRows, error: usageError } = await supabase
    .from("event_voucher_redemptions")
    .select("primary_email, discounted_seat_quantity, state, reserved_until, stripe_session_id, registration:event_registrations!inner(review_classification)")
    .eq("voucher_id", voucher.id)
    .neq("registration.review_classification", "spam")
    .in("state", ["reserved", "redeemed"]);
  if (usageError) {
    console.error("previewEventVoucher usage:", usageError.message);
    return voucherFailure("unavailable");
  }
  const normalizedEmail = email?.trim().toLowerCase();
  const activeUsage = (usageRows ?? []).filter(
    (row) => row.state === "redeemed" || (
      row.state === "reserved" && (
        !!row.stripe_session_id ||
        (row.reserved_until && new Date(row.reserved_until).getTime() > now)
      )
    ),
  );
  const used = activeUsage.reduce((sum, row) => sum + row.discounted_seat_quantity, 0);
  if (voucher.discounted_seat_limit != null && used + quantity > voucher.discounted_seat_limit) {
    return voucherFailure("limit_reached");
  }
  if (normalizedEmail && voucher.per_email_seat_limit != null) {
    const emailUsed = activeUsage
      .filter((row) => row.primary_email === normalizedEmail)
      .reduce((sum, row) => sum + row.discounted_seat_quantity, 0);
    if (emailUsed + quantity > voucher.per_email_seat_limit) {
      return voucherFailure("email_limit_reached");
    }
  }
  const priced = calculateVoucherPrice({
    code,
    percentOff: voucher.discount_percent,
    ticketTypeId,
    unitPrice: ticket.price_amount,
    quantity,
    currency: ticket.currency,
    voucherId: voucher.id,
    campaignLabel: voucher.campaign_label,
  });
  if (!priced.ok) return voucherFailure(priced.error);
  return {
    ok: true,
    code: priced.code,
    percentOff: priced.percentOff,
    unitPrice: priced.unitPrice,
    quantity: priced.quantity,
    currency: priced.currency,
    baseTotal: priced.baseTotal,
    discountTotal: priced.discountTotal,
    finalTotal: priced.finalTotal,
  };
}

export async function publicRsvp(
  eventId: string,
  formData: FormData,
): Promise<PublicRsvpResult> {
  if (!eventId) return { ok: false, error: "Missing event id" };
  const voucherCode = normalizeVoucherCode(s(formData.get("voucher_code")));

  let spamCheck: ReturnType<typeof checkRsvpSubmission>;
  try {
    spamCheck = checkRsvpSubmission(
      s(formData.get("website")),
      s(formData.get("rsvp_form_token")),
      eventId,
    );
  } catch (error) {
    console.error("publicRsvp anti-spam configuration:", error);
    return { ok: false, error: "RSVP is temporarily unavailable. Please try again shortly." };
  }
  if (!spamCheck.ok) {
    if (spamCheck.reason === "too_fast") {
      return { ok: false, error: "Please take a moment to review your details, then try again." };
    }
    if (spamCheck.reason === "expired") {
      return { ok: false, error: "This RSVP form has expired. Refresh the page and try again." };
    }
    return { ok: false, error: "We could not process this RSVP. Refresh the page and try again." };
  }

  // Validate event exists and is open for RSVPs. select("*") so the guest
  // settings (migration 072) come through and a pre-migration deploy where the
  // columns do not exist yet still resolves the event rather than erroring.
  const { data: event, error: evErr } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (evErr || !event) return { ok: false, error: "Event not found" };
  const isRise4VettingEvent = usesRise4GuestVetting(event);
  // SLP Forum Training with Naeda Cheri (id 9f6db7c4-0121-47a1-86e1-931cb1c5982a):
  // SLPs registering for this event have no chapter account, so it must
  // accept RSVPs without a session. Scoped to this one event id only; every
  // other members-only event keeps the normal canView gate below.
  const isSlpForumTraining = event.id === "9f6db7c4-0121-47a1-86e1-931cb1c5982a";
  const user = await getSessionUser();
  if (!isSlpForumTraining && !canView(user?.role ?? null, eventAudience(event))) {
    return { ok: false, error: "Event not found" };
  }
  if (event.scope === "global") {
    return { ok: false, error: "Registration for this global event is managed externally" };
  }
  if (event.status !== "open" && event.status !== "published") {
    return { ok: false, error: "RSVPs are not open for this event" };
  }

  const ticketTypeId = s(formData.get("ticket_type_id"));
  // Optional free-text note attached to the registration. Backward compatible:
  // forms that do not send it (the shared RsvpForm) leave it empty. The AI-Era
  // landing page uses it to record the chosen membership tier.
  const notes = s(formData.get("notes"));

  // First-touch marketing attribution forwarded by the RSVP form (UTM params +
  // referrer captured on landing). Client-provided, so it is coerced (strings
  // only, length-capped) and stored best-effort, never trusted for anything
  // beyond reporting. Forms that do not send it are unaffected.
  let attribution: Attribution | null = null;
  const attributionRaw = s(formData.get("attribution"));
  if (attributionRaw) {
    try {
      attribution = coerceAttribution(JSON.parse(attributionRaw));
    } catch {
      attribution = null;
    }
  }
  // The "How did you hear about this event?" dropdown. Only the fixed options
  // are stored in the countable column; any other value (a forged request) is
  // dropped here, though it still appears inside the free-text notes.
  const referralRaw = s(formData.get("referral_source"));
  const referralSource = isReferralSourceOption(referralRaw) ? referralRaw : "";

  // Group registrations (migration 069): when the form sends an `attendees`
  // JSON array, this one submission covers multiple people under a single
  // ticket (e.g. a "Guests" ticket). Every other event's RSVP form never
  // sends this field, so the single-registrant path below is unchanged.
  const attendeesRaw = s(formData.get("attendees"));
  const waiverAccepted = s(formData.get("waiver_accepted")) === "true";

  type Attendee = {
    full_name: string;
    email: string;
    phone: string;
    company: string;
    title: string;
    food_allergy: string;
    role_in_company: string;
    revenue_scale: string;
  };
  let attendees: Attendee[] | null = null;
  if (attendeesRaw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(attendeesRaw);
    } catch {
      return { ok: false, error: "Invalid attendee data" };
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { ok: false, error: "Please add at least one attendee" };
    }
    if (parsed.length > 20) {
      return {
        ok: false,
        error: "A single registration can include at most 20 attendees",
      };
    }
    const rows = parsed as Record<string, unknown>[];
    attendees = rows.map((a) => ({
      full_name: s(typeof a.full_name === "string" ? a.full_name : null),
      email: s(typeof a.email === "string" ? a.email : null).toLowerCase(),
      phone: s(typeof a.phone === "string" ? a.phone : null),
      company: s(typeof a.company === "string" ? a.company : null),
      title: s(typeof a.title === "string" ? a.title : null),
      food_allergy: s(typeof a.food_allergy === "string" ? a.food_allergy : null),
      role_in_company:
        isRise4VettingEvent && typeof a.role_in_company === "string"
          ? s(a.role_in_company)
          : "",
      revenue_scale:
        isRise4VettingEvent && typeof a.revenue_scale === "string"
          ? s(a.revenue_scale)
          : "",
    }));
    for (const [i, a] of attendees.entries()) {
      const who = `Attendee ${i + 1}`;
      if (!a.full_name) return { ok: false, error: `${who}: please enter a full name` };
      if (!a.email || !a.email.includes("@"))
        return { ok: false, error: `${who}: please enter a valid email` };
      const attLenErr = checkLengths([
        [`${who} name`, a.full_name, FIELD_MAX.name],
        [`${who} email`, a.email, FIELD_MAX.email],
        [`${who} phone`, a.phone, FIELD_MAX.phone],
        [`${who} company`, a.company, FIELD_MAX.company],
        [`${who} title`, a.title, FIELD_MAX.title],
        [`${who} food allergy`, a.food_allergy, FIELD_MAX.food_allergy],
      ]);
      if (attLenErr) return { ok: false, error: attLenErr };
    }
  }
  if (!waiverAccepted) {
    return {
      ok: false,
      error: "Please accept the event waiver, cancellation, and no-show policy",
    };
  }

  const email = attendees ? attendees[0].email : s(formData.get("email")).toLowerCase();
  const name = attendees ? attendees[0].full_name : s(formData.get("name"));
  const phone = attendees ? attendees[0].phone : s(formData.get("phone"));

  if (!attendees) {
    if (!email || !email.includes("@")) {
      return { ok: false, error: "Please enter a valid email" };
    }
    if (!name) return { ok: false, error: "Please enter your name" };
    const lenErr = checkLengths([
      ["Name", name, FIELD_MAX.name],
      ["Email", email, FIELD_MAX.email],
      ["Phone", phone, FIELD_MAX.phone],
      ["Notes", notes, FIELD_MAX.shortText],
    ]);
    if (lenErr) return { ok: false, error: lenErr };
    // MyEO dinner: the restaurant needs a phone number and the allergy answer.
    if (event.slug === MYEO_DINNER_SLUG) {
      const missing = dinnerMissingFieldError(phone, notes);
      if (missing) return { ok: false, error: missing };
      if (!isValidPhoneNumber(phone)) {
        return { ok: false, error: "Please enter a valid phone number." };
      }
    }
  }

  if (attendees) {
    const uniqueEmails = new Set(attendees.map((attendee) => attendee.email));
    if (uniqueEmails.size !== attendees.length) {
      return { ok: false, error: "Each attendee needs a different email address" };
    }
  }

  // Keep the existing friendly same-event duplicate response ahead of burst
  // protection. The database uniqueness constraint remains the final guard for
  // concurrent submissions.
  const { data: existingPerson, error: existingPersonError } =
    await findSubmissionPersonByEmail(email);
  if (existingPersonError) {
    console.warn("publicRsvp duplicate lookup failed", {
      errorClass: existingPersonError.code ?? "unknown",
    });
  } else if (existingPerson) {
    const { data: existingRegistration, error: duplicateLookupError } = await supabase
      .from("event_registrations")
      .select("id, status, cancellation_reason, amount_paid, paid_at, stripe_payment_intent_id")
      .eq("event_id", eventId)
      .eq("person_id", existingPerson.id)
      .neq("review_classification", "spam")
      .limit(1)
      .maybeSingle();
    if (duplicateLookupError) {
      console.warn("publicRsvp registration lookup:", duplicateLookupError.message);
    } else if (
      existingRegistration &&
      !voucherCode &&
      isAbandonedUnpaidRegistration(existingRegistration)
    ) {
      // An expired or abandoned checkout left a cancelled, never-paid row.
      // Remove it so this person can register again. The filters repeat the
      // check in the database, so a paid registration is never deleted.
      const { error: abandonedDeleteError } = await supabase
        .from("event_registrations")
        .delete()
        .eq("id", existingRegistration.id)
        .eq("status", "cancelled")
        .eq("cancellation_reason", "payment_not_completed")
        .is("amount_paid", null)
        .is("paid_at", null)
        .is("stripe_payment_intent_id", null);
      if (abandonedDeleteError) {
        console.warn("publicRsvp abandoned checkout cleanup:", abandonedDeleteError.message);
      }
    } else if (
      existingRegistration &&
      existingRegistration.status !== "pending_payment" &&
      !voucherCode
    ) {
      return { ok: false, error: "You are already registered for this event." };
    }

    const burstWindowStart = new Date(Date.now() - RSVP_BURST_WINDOW_MS).toISOString();
    const { data: recentRegistrations, error: burstLookupError } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("person_id", existingPerson.id)
      .gte("created_at", burstWindowStart)
      .limit(RSVP_BURST_LIMIT);
    if (burstLookupError) {
      // Fail open if the protective lookup is unavailable. The normal database
      // constraints and human review remain in force, and legitimate RSVPs are
      // not lost because an optional anti-abuse query failed.
      console.warn("publicRsvp burst lookup:", burstLookupError.message);
    } else if (isRsvpBurstLimited((recentRegistrations ?? []).length)) {
      return {
        ok: false,
        error: "Too many RSVP attempts were made recently. Please wait 10 minutes and try again.",
      };
    }
  }

  // MTP + FNL Training (March 2027): the Moderator Training Program day has 12
  // seats. The event has no per-day capacity, so count MTP seats from the
  // registration notes. Fails soft (a read error never blocks registration).
  const takesMtpSeat = event.id === MTP_FNL_EVENT_ID && isMtpSelection(notes);
  if (takesMtpSeat) {
    const heldMtp = await countMtpSeats(supabase as unknown as MtpCountClient);
    if (heldMtp !== null && heldMtp >= MTP_SEAT_LIMIT) {
      return { ok: false, error: MTP_FULL_MESSAGE };
    }
  }

  const guestRaw = s(formData.get("guest_count"));
  let guestCount = attendees
    ? attendees.length - 1
    : guestRaw === ""
      ? 0
      : Number(guestRaw);
  if (!Number.isFinite(guestCount) || guestCount < 0) {
    return { ok: false, error: "Guest count must be a non-negative number" };
  }

  // Look up the chosen ticket type, if any. Tickets override the
  // event-level price_amount. If the event has 1+ active tickets,
  // the client must send a valid ticket_type_id.
  const { data: tickets, error: tErr } = await supabase
    .from("event_ticket_types")
    .select("id, name, price_amount, currency, max_attendees, active")
    .eq("event_id", eventId)
    .eq("active", true);
  // Fail closed: if the lookup fails the price is unknown. Falling back to the
  // event-level price (usually zero) would hand out a free ticket.
  if (tErr) console.error("publicRsvp ticket types:", tErr.message);
  const ticketRows = tickets ?? [];
  const ticketSelection = selectEventTicket({
    tickets: ticketRows,
    lookupFailed: Boolean(tErr),
    ticketTypeId,
  });
  if (!ticketSelection.ok) return { ok: false, error: ticketSelection.error };

  const ticket: {
    id: string;
    name: string;
    price_amount: number;
    currency: string;
    max_attendees: number | null;
  } | null = ticketSelection.ticket;

  if (attendees && ticket?.max_attendees != null && attendees.length > ticket.max_attendees) {
    return {
      ok: false,
      error: `The ${ticket.name} ticket allows at most ${ticket.max_attendees} ${ticket.max_attendees === 1 ? "attendee" : "attendees"} per registration`,
    };
  }

  // Member-brings-guests. Two entry points, both let a member add named guests
  // to their own registration, each charged a per-guest fee:
  //  - simple path (migration 072): no ticket tiers, event.allow_guests on;
  //    guests priced by event.guest_price_amount, capped by max_guests_per_member.
  //  - ticket path: a free "member" ticket is selected and a paid "guest" ticket
  //    also exists; guests priced by that guest ticket, capped by its max_attendees.
  const allowGuests = event.allow_guests === true;
  const memberGuestMode = !attendees && ticketRows.length === 0 && allowGuests;
  const isMemberTicketSelected =
    !!ticket && ticket.price_amount <= 0 && ticket.max_attendees === 1;
  const isLegacyGuestTicketSelected =
    !attendees && !!ticket && /^guest$/i.test(ticket.name.trim());

  // Guest ticket: every attendee must supply full contact details (email is
  // already required above) plus phone and company. Food allergy stays
  // optional. The member ticket keeps its lighter name+email-only requirement.
  const isGuestTicketSelected = !!attendees && !!ticket && !isMemberTicketSelected;
  if (isRise4VettingEvent && (isGuestTicketSelected || isLegacyGuestTicketSelected)) {
    const rawGuestContext = s(formData.get("guest_context"));
    let parsedGuestContext: unknown = null;

    try {
      parsedGuestContext = JSON.parse(rawGuestContext);
    } catch {
      parsedGuestContext = null;
    }

    let relationship = "";
    let hostMember = "";

    if (
      parsedGuestContext &&
      typeof parsedGuestContext === "object" &&
      !Array.isArray(parsedGuestContext)
    ) {
      const context = parsedGuestContext as Record<string, unknown>;
      relationship =
        typeof context.relationship === "string"
          ? context.relationship.trim()
          : "";
      hostMember =
        typeof context.host_member === "string"
          ? context.host_member.trim()
          : "";
    }

    if (!relationship) {
      return { ok: false, error: "Please select a registration type" };
    }

    const normalizedRelationship = relationship.toLowerCase();
    const invitedByMember =
      normalizedRelationship.includes("invited") &&
      normalizedRelationship.includes("member");

    if (invitedByMember && !hostMember) {
      return {
        ok: false,
        error: "Please enter the EO member who invited you",
      };
    }
  }

  if (isGuestTicketSelected && attendees) {
    for (const [i, a] of attendees.entries()) {
      const who = `Attendee ${i + 1}`;
      if (!a.phone.trim()) {
        return { ok: false, error: `${who}: please enter a phone number` };
      }
      if (!isValidPhoneNumber(a.phone)) {
        return { ok: false, error: `${who}: please enter a valid phone number` };
      }
      if (isRise4VettingEvent) {
        if (!isRise4Role(a.role_in_company)) {
          return { ok: false, error: `${who}: please select a role in the company` };
        }
        if (!roleRequiresCompany(a.role_in_company)) {
          a.company = "";
          a.revenue_scale = "";
        } else {
          a.company = a.company.trim();
          if (!a.company) {
            return { ok: false, error: `${who}: please enter a company` };
          }
          if (roleRequiresRevenueScale(a.role_in_company)) {
            if (!isRise4RevenueScale(a.revenue_scale)) {
              return { ok: false, error: `${who}: please select a revenue scale` };
            }
          } else {
            a.revenue_scale = "";
          }
        }
      } else if (!a.company) {
        return { ok: false, error: `${who}: please enter a company` };
      }
    }
  }
  if (isLegacyGuestTicketSelected) {
    if (!phone.trim()) {
      return { ok: false, error: "Please enter a phone number" };
    }
    if (!isValidPhoneNumber(phone)) {
      return { ok: false, error: "Please enter a valid phone number" };
    }
  }
  const activeTeamRate = isMemberTicketSelected
    ? await getActiveTeamRegistrationRate(eventId)
    : null;
  const submittedGuestNames = s(formData.get("guest_names"));
  if (
    activeTeamRate &&
    (guestCount > 0 || (submittedGuestNames !== "" && submittedGuestNames !== "[]"))
  ) {
    return {
      ok: false,
      error: "Register your member seat first, then use the team link in your confirmation email.",
    };
  }
  const guestTicketRow =
    isMemberTicketSelected && !activeTeamRate && ticketRows.length === 2
      ? (ticketRows.find((t) => t.id !== ticketTypeId && t.price_amount > 0) ?? null)
      : null;
  const guestsEnabled = memberGuestMode || !!guestTicketRow;
  const guestPrice = memberGuestMode
    ? (event.guest_price_amount ?? 0)
    : (guestTicketRow?.price_amount ?? 0);
  const guestCurrency = memberGuestMode
    ? event.currency
    : (guestTicketRow?.currency ?? event.currency);
  const guestCap = memberGuestMode
    ? (event.max_guests_per_member ?? null)
    : (guestTicketRow?.max_attendees ?? null);

  let guestNames: string[] = [];
  if (guestsEnabled) {
    const guestNamesRaw = s(formData.get("guest_names"));
    if (guestNamesRaw) {
      let parsedGuests: unknown;
      try {
        parsedGuests = JSON.parse(guestNamesRaw);
      } catch {
        return { ok: false, error: "Invalid guest data" };
      }
      if (!Array.isArray(parsedGuests)) {
        return { ok: false, error: "Invalid guest data" };
      }
      guestNames = parsedGuests
        .map((n) => s(typeof n === "string" ? n : null))
        .filter((n) => n.length > 0);
      if (guestNames.length > 20) {
        return { ok: false, error: "You can add at most 20 guests" };
      }
      const guestLenErr = checkLengths(
        guestNames.map(
          (n, i) => [`Guest ${i + 1} name`, n, FIELD_MAX.name] as [string, string, number],
        ),
      );
      if (guestLenErr) return { ok: false, error: guestLenErr };
      if (guestCap != null && guestNames.length > guestCap) {
        return {
          ok: false,
          error: `You can bring at most ${guestCap} guest${guestCap === 1 ? "" : "s"}`,
        };
      }
    }
    guestCount = guestNames.length;
  }
  // The legacy numeric guest_count is only honored as a paid-ticket seat
  // multiplier. On a free or ticketless event (e.g. a members-only,
  // one-per-member event where allow_guests is off) extra seats come only
  // through the allow_guests named-guest flow, so any stray count from the
  // legacy field or a crafted request is dropped. `!attendees` preserves the
  // collect_attendee_details group path.
  if (!attendees && !guestsEnabled && !(ticket && ticket.price_amount > 0)) {
    guestCount = 0;
  }
  if (
    !attendees &&
    !guestsEnabled &&
    ticket?.max_attendees != null &&
    1 + guestCount > ticket.max_attendees
  ) {
    return {
      ok: false,
      error: `The ${ticket.name} ticket allows at most ${ticket.max_attendees} ${ticket.max_attendees === 1 ? "attendee" : "attendees"} per registration`,
    };
  }

  const guestTotal = guestsEnabled ? guestCount * guestPrice : 0;

  // MyEO Beneath the Chopsticks: guests register only when invited, so the
  // Guest ticket needs a code. The voucher reservation below checks the code is
  // valid for this ticket.
  if (!voucherCode && guestTicketNeedsInvitation(event.slug, ticket?.name)) {
    return { ok: false, error: GUEST_INVITATION_ERROR };
  }

  // The dinner invitation code is for guests only.
  if (voucherCode && !invitationCodeAllowed(event.slug, ticket?.name)) {
    return voucherFailure("ineligible_ticket") as PublicRsvpResult;
  }

  // A voucher applies only to the selected ticket and its group attendee count.
  // Member guest add-ons are already discounted and deliberately excluded.
  if (voucherCode && (!ticket || guestsEnabled)) {
    return voucherFailure("ineligible_ticket") as PublicRsvpResult;
  }

  const priceAmount = ticket ? ticket.price_amount : event.price_amount;
  const currency = ticket ? ticket.currency : event.currency;
  const lineItemName = ticket
    ? `${event.title}: ${ticket.name}`
    : event.title;

  // Guest names ride along in the registration notes (no dedicated column).
  let notesToSave = notes;
  if (guestsEnabled && guestNames.length > 0) {
    const guestLine = `Guests: ${guestNames.join(", ")}`;
    notesToSave = notes ? `${notes}\n${guestLine}` : guestLine;
  }
  // MyEO dinner: keep the typed phone with the registration so the board
  // roster has it, even for an existing person whose profile is not updated.
  if (event.slug === MYEO_DINNER_SLUG && !attendees) {
    notesToSave = [dinnerPhoneNote(phone), notesToSave].filter(Boolean).join("\n");
  }

  const personResult = await resolveSubmissionPersonWithSupabase({ email, name, phone });
  const person = personResult.data;
  if (personResult.error || !person) {
    return {
      ok: false,
      error: "Could not save submission",
    };
  }

  const isPaid = priceAmount > 0 || guestTotal > 0;
  const standardCheckoutTotal = guestsEnabled
    ? priceAmount + guestTotal
    : priceAmount * (attendees ? attendees.length : 1 + guestCount);
  const checkoutCurrencyResult = resolveEventCheckoutCurrency([
    { amount: priceAmount, currency },
    { amount: guestTotal, currency: guestCurrency },
  ]);
  if (
    isPaid &&
    (!Number.isSafeInteger(standardCheckoutTotal) ||
      standardCheckoutTotal <= 0 ||
      !checkoutCurrencyResult.ok)
  ) {
    return {
      ok: false,
      error: "This event's payment amount or currency is invalid. Please contact the chapter.",
    };
  }
  const checkoutCurrency = checkoutCurrencyResult.ok
    ? checkoutCurrencyResult.currency
    : currency.trim().toUpperCase();
  // Paid seats are held as pending_payment until Stripe confirms; free seats
  // are registered immediately.
  const seatStatus: "registered" | "pending_payment" = isPaid
    ? "pending_payment"
    : "registered";

  // Every registration carries a ticket code from the moment it is created,
  // so a confirmed seat always resolves to a /t/<code> ticket + QR.
  const requestedTicketCode = newTicketCode();

  // Resolve the request origin once, used for the Stripe redirect URLs and
  // for the on-screen ticket link returned to the RSVP form.
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  // person and event are guarded non-null above, but that narrowing does not
  // reach into the reserveSeat closure below, so capture what it needs here.
  const personId = person.id;
  const eventCapacity = event.capacity;

  // Reserve a seat atomically: register_for_event() locks the event row,
  // counts held seats, and inserts in one transaction, so two concurrent
  // RSVPs can no longer both pass the capacity check and oversell.
  //
  // The function may be missing in environments where migration 029 has not
  // been applied yet. To keep deploying code before the migration from
  // breaking RSVPs, we detect that case and fall back to the previous
  // non-atomic count-then-insert path.
  type ReserveResult =
      | {
        registrationId: string;
        status: string;
        waitlistPosition: number | null;
        reused?: boolean;
        voucher?: {
          reused: boolean;
          unitAmount: number;
          quantity: number;
          baseTotal: number;
          discountTotal: number;
          finalTotal: number;
          currency: string;
          checkoutAttempt: number;
        };
      }
    | { duplicate: true };

  const isDuplicateError = (code?: string, message?: string): boolean =>
    code === "23505" || /duplicate key/i.test(message ?? "");

  async function reserveSeat(): Promise<ReserveResult> {
    if (voucherCode && ticket) {
      const { data, error } = await supabase.rpc("reserve_event_registration_with_voucher", {
        p_event_id: eventId,
        p_person_id: personId,
        p_primary_email: email,
        p_ticket_type_id: ticket.id,
        p_voucher_code: voucherCode,
        p_guest_count: guestCount,
        p_ticket_code: requestedTicketCode,
        p_hold_minutes: 30,
        p_inviter_ticket_code: nullable(s(formData.get("inviter_ticket_code"))),
      });
      if (error) {
        if (isDuplicateError(error.code, error.message)) return { duplicate: true };
        if (isVoucherSchemaError(error)) {
          throw new Error("Voucher checkout is temporarily unavailable. Please try again shortly.");
        }
        throw new Error(voucherErrorMessage(publicVoucherReason(error.message)));
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.registration_id) throw new Error("Could not reserve this voucher.");
      return {
        registrationId: row.registration_id,
        status: row.registration_status,
        waitlistPosition: row.waitlist_position,
        voucher: {
          reused: row.reused === true,
          unitAmount: row.unit_amount,
          quantity: row.quantity,
          baseTotal: row.base_total,
          discountTotal: row.discount_total,
          finalTotal: row.final_total,
          currency: row.currency,
          checkoutAttempt: row.checkout_attempt,
        },
      };
    }
    const { data, error } = await supabase.rpc("register_for_event", {
      p_event_id: eventId,
      p_person_id: personId,
      p_seat_status: seatStatus,
      p_guest_count: guestCount,
      p_ticket_type_id: ticket?.id ?? null,
      p_ticket_code: requestedTicketCode,
    });

    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      return {
        registrationId: row.registration_id,
        status: row.status,
        waitlistPosition: row.waitlist_position,
      };
    }

    if (isDuplicateError(error.code, error.message)) {
      return { duplicate: true };
    }

    if (isTicketSoldOutError(error.message)) {
      throw new Error(TICKET_SOLD_OUT_ERROR);
    }

    const functionMissing =
      error.code === "PGRST202" ||
      error.code === "42883" ||
      /register_for_event/.test(error.message) ||
      /schema cache/i.test(error.message);
    if (!functionMissing) {
      throw new Error(error.message);
    }

    // Fallback: the previous non-atomic capacity check + insert. Seats are
    // held by registered + attended + pending_payment.
    let status: "registered" | "waitlisted" | "pending_payment" = seatStatus;
    let waitlistPosition: number | null = null;
    if (eventCapacity) {
      // Seats occupied is 1 + guest_count per row, matching register_for_event()
      // (migration 069) — a plain row count would undercount group registrations.
      let heldResult = await supabase
        .from("event_registrations")
        .select("guest_count")
        .eq("event_id", eventId)
        .in("status", ["registered", "attended", "pending_payment"])
        .neq("review_classification", "spam");
      if (heldResult.error?.code === "42703") {
        heldResult = await supabase
          .from("event_registrations")
          .select("guest_count")
          .eq("event_id", eventId)
          .in("status", ["registered", "attended", "pending_payment"]);
      }
      const { data: heldRows, error: cErr } = heldResult;
      if (cErr) throw new Error(cErr.message);
      const takenSeats = (heldRows ?? []).reduce(
        (sum, r) => sum + 1 + (r.guest_count ?? 0),
        0,
      );
      if (takenSeats + 1 + guestCount > eventCapacity) {
        status = "waitlisted";
        let waitlistResult = await supabase
          .from("event_registrations")
          .select("waitlist_position")
          .eq("event_id", eventId)
          .eq("status", "waitlisted")
          .neq("review_classification", "spam")
          .order("waitlist_position", { ascending: false })
          .limit(1);
        if (waitlistResult.error?.code === "42703") {
          waitlistResult = await supabase
            .from("event_registrations")
            .select("waitlist_position")
            .eq("event_id", eventId)
            .eq("status", "waitlisted")
            .order("waitlist_position", { ascending: false })
            .limit(1);
        }
        const { data: wl } = waitlistResult;
        waitlistPosition =
          ((wl?.[0]?.waitlist_position as number | null) ?? 0) + 1;
      }
    }

    const { data: inserted, error: iErr } = await supabase
      .from("event_registrations")
      .insert({
        event_id: eventId,
        person_id: personId,
        status,
        waitlist_position: waitlistPosition,
        guest_count: guestCount,
        ticket_type_id: ticket?.id ?? null,
        ticket_code: requestedTicketCode,
      })
      .select("id")
      .single();

    if (iErr || !inserted) {
      if (isDuplicateError(iErr?.code, iErr?.message)) {
        return { duplicate: true };
      }
      throw new Error(iErr?.message ?? "Could not save submission");
    }

    return { registrationId: inserted.id, status, waitlistPosition };
  }

  let reserved: ReserveResult;
  try {
    reserved = await reserveSeat();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save RSVP";
    return { ok: false, error: message };
  }

  if ("duplicate" in reserved) {
    if (isPaid && !voucherCode) {
      const { data: pending, error: pendingError } = await supabase
        .from("event_registrations")
        .select(
          "id, status, waitlist_position, ticket_type_id, guest_count, price_final_total, stripe_session_id",
        )
        .eq("event_id", eventId)
        .eq("person_id", personId)
        .eq("status", "pending_payment")
        .maybeSingle();
      if (pendingError || !pending) {
        return { ok: false, error: "You are already registered for this event." };
      }
      if (
        isSameCheckoutOrder(pending, {
          ticketTypeId: ticket?.id ?? null,
          guestCount,
          total: standardCheckoutTotal,
        })
      ) {
        reserved = {
          registrationId: pending.id,
          status: pending.status,
          waitlistPosition: pending.waitlist_position,
          reused: true,
        };
      } else {
        // The buyer changed their order. The open Stripe checkout still charges
        // the old one, so it is closed first. The pending registration is only
        // replaced once Stripe confirms nobody can pay the old checkout.
        const changedOrderRetry = {
          ok: false as const,
          error: "We could not update your earlier checkout. Please try again in a moment.",
        };
        try {
          let step = changedCheckoutStep(
            pending.stripe_session_id
              ? await stripe.checkout.sessions.retrieve(pending.stripe_session_id)
              : null,
          );
          if (step === "expire" && pending.stripe_session_id) {
            step = changedCheckoutStep(
              await stripe.checkout.sessions.expire(pending.stripe_session_id),
            );
          }
          if (step === "already_paid") {
            return {
              ok: false,
              error:
                "Your earlier payment for this event went through, so you are registered. Please check your email for your ticket.",
            };
          }
          if (step !== "replace") return changedOrderRetry;
        } catch (err) {
          console.warn(
            "publicRsvp: could not close the earlier checkout:",
            err instanceof Error ? err.message : String(err),
          );
          return changedOrderRetry;
        }
        const releasePending = supabase
          .from("event_registrations")
          .delete()
          .eq("id", pending.id)
          .eq("status", "pending_payment")
          .is("paid_at", null);
        const { data: released, error: releaseError } = await (pending.stripe_session_id
          ? releasePending.eq("stripe_session_id", pending.stripe_session_id)
          : releasePending.is("stripe_session_id", null)
        ).select("id");
        if (releaseError || !released?.length) return changedOrderRetry;
        try {
          reserved = await reserveSeat();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Could not save RSVP";
          return { ok: false, error: message };
        }
        if ("duplicate" in reserved) {
          return { ok: false, error: "You are already registered for this event." };
        }
      }
    } else {
      return { ok: false, error: "You are already registered for this event." };
    }
  }

  const { registrationId, status } = reserved;
  let voucherReservation = reserved.voucher;

  // A registration that already existed (an open checkout resumed, or a
  // cancelled one revived by a voucher) keeps the ticket code it was created
  // with. Ticket links must use that stored code, not this request's new one.
  let ticketCode = requestedTicketCode;
  if (reserved.voucher || reserved.reused) {
    const { data: storedTicket, error: storedTicketError } = await supabase
      .from("event_registrations")
      .select("ticket_code")
      .eq("id", registrationId)
      .maybeSingle();
    if (storedTicketError) {
      console.warn("publicRsvp: could not read stored ticket code:", storedTicketError.message);
    }
    ticketCode = storedTicket?.ticket_code ?? requestedTicketCode;
  }

  if (status === "pending_payment" && !voucherReservation && !reserved.reused) {
    const snapshotError = await snapshotStandardRegistrationPrice({
      registrationId,
      amount: standardCheckoutTotal,
      currency: checkoutCurrency,
    });
    if (snapshotError) {
      console.error("publicRsvp: could not snapshot checkout price:", snapshotError);
      await supabase
        .from("event_registrations")
        .delete()
        .eq("id", registrationId)
        .eq("status", "pending_payment");
      return {
        ok: false,
        error: "Payment is temporarily unavailable. Please try again shortly.",
      };
    }
  }

  // Persist the optional note. register_for_event() has a fixed signature and
  // does not accept notes, so set it in a follow-up update that covers both the
  // RPC and the fallback insert path.
  if (notesToSave) {
    await supabase
      .from("event_registrations")
      .update({ notes: notesToSave })
      .eq("id", registrationId);
  }

  // Persist marketing attribution on the registration, mirroring what the
  // /join application stores (applications.ts, migration 028). Best-effort in
  // the same way: if migration 109 has not been applied yet, the warn fires
  // and the registration itself is untouched.
  if (attribution || referralSource) {
    const attrPatch: Record<string, unknown> = {};
    if (attribution) {
      attrPatch.channel_source = deriveChannelSource(attribution);
      attrPatch.utm_source = attribution.utm_source;
      attrPatch.utm_medium = attribution.utm_medium;
      attrPatch.utm_campaign = attribution.utm_campaign;
      attrPatch.utm_content = attribution.utm_content;
      attrPatch.utm_term = attribution.utm_term;
      attrPatch.referrer = attribution.referrer;
      attrPatch.landing_path = attribution.landing_path;
    }
    if (referralSource) {
      attrPatch.referral_source = referralSource;
    }
    const { error: attrErr } = await supabase
      .from("event_registrations")
      .update(attrPatch)
      .eq("id", registrationId);
    if (attrErr) {
      console.warn(
        "publicRsvp: attribution not stored (migration pending?):",
        attrErr.message,
      );
    }
  }

  // Two people can pass the check above at the same moment. Re-check once the
  // note is saved: if this registration landed past the 12th MTP seat, undo it.
  if (takesMtpSeat && !reserved.reused) {
    const { data: mine } = await supabase
      .from("event_registrations")
      .select("created_at")
      .eq("id", registrationId)
      .maybeSingle();
    if (mine?.created_at) {
      const { count: sameOrEarlier } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .in("status", ["registered", "attended", "pending_payment"])
        .like("notes", "%Training: Moderator Training Program (MTP)%")
        .lte("created_at", mine.created_at);
      if ((sameOrEarlier ?? 0) > MTP_SEAT_LIMIT) {
        await supabase.from("event_registrations").delete().eq("id", registrationId);
        return { ok: false, error: MTP_FULL_MESSAGE };
      }
    }
  }

  // Waiver acceptance is required for every registration (both this
  // single-registrant path and the group path below); stamped in the same
  // follow-up-update pattern as notes above, since register_for_event()'s
  // signature does not carry this data either.
  if (!voucherReservation?.reused && !reserved.reused) {
    await supabase
      .from("event_registrations")
      .update({ waiver_accepted_at: new Date().toISOString() })
      .eq("id", registrationId);
  }

  // Group registrations: persist each attendee's details.
  if (attendees && !voucherReservation?.reused && !reserved.reused) {
    const { error: attErr } = await supabase
      .from("event_registration_attendees")
      .insert(
        attendees.map((a) => ({
          registration_id: registrationId,
          full_name: a.full_name,
          email: a.email,
          phone: a.phone,
          company: nullable(a.company),
          title: nullable(a.title),
          food_allergy: nullable(a.food_allergy),
          ...(isRise4VettingEvent && isGuestTicketSelected
            ? {
                role_in_company: nullable(a.role_in_company),
                revenue_scale: roleRequiresRevenueScale(a.role_in_company)
                  ? nullable(a.revenue_scale)
                  : null,
              }
            : {}),
        })),
      );
    if (attErr) {
      console.error("publicRsvp: failed to save attendee details:", attErr.message);

      let cleanupSucceeded = false;
      if (voucherReservation) {
        const { data: released, error: releaseError } = await supabase.rpc(
          "release_voucher_registration",
          {
            p_registration_id: registrationId,
            p_stripe_session_id: null,
            p_reason: "attendee_save_failed",
          },
        );
        cleanupSucceeded = !releaseError && released === true;
        if (releaseError) {
          console.error("publicRsvp: voucher cleanup failed:", releaseError.message);
        }
      } else {
        const { error: deleteError } = await supabase
          .from("event_registrations")
          .delete()
          .eq("id", registrationId);
        cleanupSucceeded = !deleteError;
        if (deleteError) {
          console.error("publicRsvp: registration cleanup failed:", deleteError.message);
        }
      }

      return {
        ok: false,
        error: cleanupSucceeded
          ? "We couldn't save the attendee details, so the registration wasn't completed. Please try again."
          : `We couldn't save the attendee details or confirm that the reservation was released. Please contact ${CHAPTER_NAME} before trying again.`,
      };
    }
  }

  // Provision a guest auth account for the registrant (best-effort, non-blocking).
  // Skipped silently if the user_profiles table does not exist yet (migration not applied).
  if (person?.id) {
    provisionGuestUser(email, name, person.id).catch((err) => {
      console.warn("publicRsvp: guest provisioning failed (non-blocking):", err?.message ?? err);
    });
  }

  // Waitlisted: no payment, no ticket email; just confirm the spot in line.
  if (status === "waitlisted") {
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/board/events/${eventId}`);
    return { ok: true, waitlisted: true, ticketUrl: ticketUrl(ticketCode, origin) };
  }

  // Paid seat secured (held as pending_payment): send the buyer to Stripe.
  if (status === "pending_payment") {
    if (!isStripeConfigured()) {
      // Release the held seat — a phantom pending_payment row would count
      // against capacity for 30+ minutes with no way for the buyer to clear it.
      if (voucherReservation) {
        await supabase.rpc("release_voucher_registration", {
          p_registration_id: registrationId,
          p_stripe_session_id: null,
          p_reason: "payment_not_configured",
        });
      } else {
        await supabase.from("event_registrations").delete().eq("id", registrationId);
      }
      return {
        ok: false,
        error: "Payment is not configured. Please contact the chapter.",
      };
    }

    // Member-brings-guests bills the member seat and the guest fees as two
    // separate line items (either can be zero); every other path keeps the
    // single line item it always used (group registrations charge per attendee).
    type CheckoutLineItem = NonNullable<
      NonNullable<Parameters<typeof stripe.checkout.sessions.create>[0]>["line_items"]
    >[number];
    const seatLineItem: CheckoutLineItem = {
      price_data: {
        currency: checkoutCurrency.toLowerCase(),
        product_data: {
          name: lineItemName,
          description: event.blurb ?? undefined,
        },
        unit_amount: priceAmount,
      },
      quantity: attendees
        ? attendees.length
        : guestsEnabled
          ? 1
          : 1 + guestCount,
    };
    const lineItems: CheckoutLineItem[] = voucherReservation
      ? [{
          price_data: {
            currency: voucherReservation.currency.toLowerCase(),
            product_data: {
              name: lineItemName,
              description: `${voucherCode} voucher applied`,
            },
            unit_amount: voucherReservation.finalTotal,
          },
          quantity: 1,
        }]
      : guestsEnabled
      ? [
          ...(priceAmount > 0 ? [{ ...seatLineItem, quantity: 1 }] : []),
          ...(guestTotal > 0
            ? [
                {
                  price_data: {
                    currency: checkoutCurrency.toLowerCase(),
                    product_data: { name: `${event.title}: Guest` },
                    unit_amount: guestPrice,
                  },
                  quantity: guestCount,
                },
              ]
            : []),
        ]
      : [seatLineItem];

    // The payer covers the card processing fee as its own line item. The
    // price snapshot keeps the ticket amount; the fee is re-derived from it
    // wherever the Stripe total is checked.
    const ticketTotal = voucherReservation ? voucherReservation.finalTotal : standardCheckoutTotal;
    const ticketCurrency = voucherReservation ? voucherReservation.currency : checkoutCurrency;
    const processingFee = stripeProcessingFeeFor(ticketTotal, ticketCurrency);
    const checkoutLineItems: CheckoutLineItem[] = processingFee > 0
      ? [
          ...lineItems,
          {
            price_data: {
              currency: ticketCurrency.toLowerCase(),
              product_data: { name: "Card processing fee" },
              unit_amount: processingFee,
            },
            quantity: 1,
          },
        ]
      : lineItems;
    let standardTicketTotal = standardCheckoutTotal;

    let session;
    try {
      if (voucherReservation?.reused) {
        const { data: existing } = await supabase
          .from("event_registrations")
          .select("stripe_session_id")
          .eq("id", registrationId)
          .maybeSingle();
        if (existing?.stripe_session_id) {
          const prior = await stripe.checkout.sessions.retrieve(existing.stripe_session_id);
          if (prior.status === "open") {
            if (!prior.url) {
              return { ok: false, error: "Your existing checkout is still opening. Please try again shortly." };
            }
            session = prior;
          } else if (prior.status === "complete") {
            return {
              ok: false,
              error: "Your payment is being confirmed. Please check your email shortly.",
            };
          } else {
            const { data: nextAttempt, error: renewError } = await supabase.rpc(
              "renew_voucher_checkout_attempt",
              {
                p_registration_id: registrationId,
                p_stripe_session_id: prior.id,
                p_hold_minutes: 30,
              },
            );
            if (renewError || !Number.isInteger(nextAttempt)) {
              throw new Error(renewError?.message ?? "Could not renew expired checkout");
            }
            voucherReservation = {
              ...voucherReservation,
              reused: false,
              checkoutAttempt: nextAttempt,
            };
          }
        }
      }
      if (!voucherReservation && reserved.reused) {
        const { data: existing, error: existingError } = await supabase
          .from("event_registrations")
          .select("stripe_session_id, price_final_total")
          .eq("id", registrationId)
          .eq("status", "pending_payment")
          .maybeSingle();
        if (existingError || !existing) {
          throw new Error(existingError?.message ?? "Pending checkout not found");
        }
        if (existing.stripe_session_id) {
          const prior = await stripe.checkout.sessions.retrieve(existing.stripe_session_id);
          standardTicketTotal = existing.price_final_total ?? standardCheckoutTotal;
          if (prior.status !== "expired") {
            const priorSnapshotError =
              prior.amount_total == null || !prior.currency
                ? "Existing Stripe checkout is missing amount or currency"
                : await snapshotStandardRegistrationPrice({
                    registrationId,
                    amount: ticketAmountFromStripeTotal(
                      prior.amount_total,
                      existing.price_final_total,
                      prior.currency,
                    ),
                    currency: prior.currency,
                    stripeSessionId: prior.id,
                  });
            if (priorSnapshotError) {
              console.error("publicRsvp: existing checkout snapshot mismatch:", priorSnapshotError);
              return {
                ok: false,
                error: "Your existing checkout could not be verified. Please contact the chapter.",
              };
            }
          }
          if (prior.status === "open") {
            if (!prior.url) {
              return { ok: false, error: "Your existing checkout is still opening. Please try again shortly." };
            }
            session = prior;
          } else if (prior.status === "complete") {
            return {
              ok: false,
              error: "Your payment is being confirmed. Please check your email shortly.",
            };
          } else {
            await supabase
              .from("event_registrations")
              .delete()
              .eq("id", registrationId)
              .eq("status", "pending_payment");
            return { ok: false, error: "Your checkout expired. Please submit the form again." };
          }
        }
      }
      if (!voucherReservation && reserved.reused && !session) {
        const snapshotError = await snapshotStandardRegistrationPrice({
          registrationId,
          amount: standardCheckoutTotal,
          currency: checkoutCurrency,
        });
        if (snapshotError) {
          console.error("publicRsvp: reused checkout snapshot mismatch:", snapshotError);
          return {
            ok: false,
            error: "Your checkout amount or currency changed. Please contact the chapter.",
          };
        }
      }
      // The expiry is part of the request Stripe compares on a retry, so it is
      // held steady for a few minutes and included in the idempotency key.
      const checkoutExpiresAt = stableCheckoutExpiry(Date.now());
      session ??= await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: email,
        line_items: checkoutLineItems,
        expires_at: checkoutExpiresAt,
        success_url: `${origin}/events/${eventId}?paid=1&rid=${registrationId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/events/${eventId}?cancelled=1`,
        metadata: {
          registration_id: registrationId,
          event_id: eventId,
          person_id: person.id,
          ticket_type_id: ticket?.id ?? "",
          ...(voucherReservation ? { type: "event_voucher", voucher_code: voucherCode } : {}),
        },
      }, {
        idempotencyKey: voucherReservation
          ? `event-voucher-${registrationId}-${voucherReservation.checkoutAttempt}-${checkoutExpiresAt}`
          : `event-registration-${registrationId}-${checkoutExpiresAt}`,
      });
    } catch (err) {
      // A Stripe timeout can happen after the session was created. Keep the
      // pending registration so the same idempotency key can recover that
      // session on retry instead of risking a paid checkout without a ticket.
      const message = err instanceof Error ? err.message : "Stripe error";
      return { ok: false, error: `Could not start checkout: ${message}` };
    }

    if (!session.url) {
      if (voucherReservation) {
        let expirationConfirmed = session.status === "expired";
        try {
          if (session.status === "open") {
            const expired = await stripe.checkout.sessions.expire(session.id);
            expirationConfirmed = expired.status === "expired";
          }
        } catch (expireError) {
          console.warn("publicRsvp: could not expire URL-less voucher checkout", expireError);
        }
        if (canReleaseUnattachedVoucherCheckout(session.status, expirationConfirmed)) {
          await supabase.rpc("release_voucher_registration", {
            p_registration_id: registrationId,
            p_stripe_session_id: null,
            p_reason: "checkout_url_missing",
          });
        }
      } else {
        await supabase.from("event_registrations").delete().eq("id", registrationId);
      }
      return { ok: false, error: "Checkout session URL missing" };
    }

    // Stamp the held row with the session id so the webhook can match it.
    if (voucherReservation) {
      const { data: attached, error: attachError } = await supabase.rpc(
        "attach_voucher_checkout_session",
        { p_registration_id: registrationId, p_stripe_session_id: session.id },
      );
      if (attachError || attached !== true) {
        let expirationConfirmed = session.status === "expired";
        try {
          if (session.status === "open") {
            const expired = await stripe.checkout.sessions.expire(session.id);
            expirationConfirmed = expired.status === "expired";
          }
        } catch (expireError) {
          console.warn("publicRsvp: could not expire unattached voucher checkout", expireError);
        }
        if (canReleaseUnattachedVoucherCheckout(session.status, expirationConfirmed)) {
          await supabase.rpc("release_voucher_registration", {
            p_registration_id: registrationId,
            p_stripe_session_id: null,
            p_reason: "checkout_attach_failed",
          });
        }
        return { ok: false, error: "Could not secure checkout. Please try again." };
      }
    } else {
      const secured = await secureStandardCheckoutSession(session.status, {
        attach: () => attachStandardCheckoutSession({
          registrationId,
          sessionId: session.id,
          amount: session.amount_total == null || !session.currency
            ? session.amount_total
            : ticketAmountFromStripeTotal(session.amount_total, standardTicketTotal, session.currency),
          currency: session.currency,
        }),
        expire: async () => (await stripe.checkout.sessions.expire(session.id)).status,
        release: async () => {
          const { error } = await supabase
            .from("event_registrations")
            .delete()
            .eq("id", registrationId);
          if (error) {
            console.warn("publicRsvp: could not release unattached checkout", error);
          }
        },
        onExpireError: (error) => {
          console.warn("publicRsvp: could not expire unattached checkout", error);
        },
      });
      if (!secured) {
        return { ok: false, error: "Could not secure checkout. Please try again." };
      }
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/board/events/${eventId}`);
    return { ok: true, checkoutUrl: session.url };
  }

  // Free seat secured: mirror to the organiser guest-list sheet (dormant until the script URL is set,
  // never throws, runs after the response).
  after(() => syncRegistrationToGuestSheet(registrationId));

  // Free seat secured (registered): best-effort ticket email (env-flagged,
  // no-op without RESEND_API_KEY).
  if (isEmailConfigured()) {
    const teamRegistration = await getTeamRegistrationOffer({
      eventId,
      eventPublicPath: eventPath(event),
      inviterTicketCode: ticketCode,
      source: {
        status: "registered",
        reviewClassification: "normal",
        voucherId: voucherReservation ? voucherCode : null,
        ticketName: ticket?.name ?? null,
        amountPaid: 0,
      },
      origin,
    });
    const delivery = await deliverTicketConfirmation({
      send: () => sendTicketEmail({
        to: email,
        name,
        eventTitle: event.title,
        startsAt: event.starts_at,
        endsAt: event.ends_at,
        location: event.location,
        ticketUrl: ticketUrl(ticketCode, origin),
        ticketCode,
        teamRegistration: teamRegistration ?? undefined,
        noShowFeeUsd: noShowFeeForEvent(event),
        nonRefundable: isNonRefundableEvent(event),
      }),
      recordSent: async () => {
        const { data, error } = await supabase
          .from("event_registrations")
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq("id", registrationId)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Registration no longer exists");
      },
    });
    if (delivery.sent && !delivery.recorded) {
      console.warn(
        "publicRsvp: ticket email sent but confirmation timestamp could not be saved",
        delivery.error,
      );
    }
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/board/events/${eventId}`);
  return { ok: true, ticketUrl: ticketUrl(ticketCode, origin) };
}

// ---------------------------------------------------------------------------
// Recap generation (Event Recap Engine)
//
// Publishes on generation, with no approval step. That is safe only because
// the model writes prose and nothing else: every fact on the page is assembled
// in code by generateEventRecap. A validation failure writes nothing at all.
// ---------------------------------------------------------------------------

export async function generateRecap(eventId: string): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!eventId) return { ok: false, error: "Missing event id" };

  const result = await publishRecapForEvent(eventId);
  if (!result.ok) return result;

  revalidatePublicEventPaths();
  return { ok: true };
}

export async function unpublishRecap(eventId: string): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!eventId) return { ok: false, error: "Missing event id" };

  // Takes the recap off the public page but keeps the blocks, so a mistaken
  // unpublish is one click to undo and nothing is lost.
  const { error } = await supabase
    .from("events")
    .update({ recap_published: false, recap_status: "due" })
    .eq("id", eventId);

  if (error) return { ok: false, error: error.message };

  revalidatePublicEventPaths();
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// MyEO Family Day (PR #350 commit 2)
// ---------------------------------------------------------------------------
// Bespoke, intentionally public registration action for the MyEO Family Day
// event only (AGENTS.md: do not add authentication mechanically to
// intentionally public RSVP flows). It does not reuse publicRsvp() because
// this event's shape does not fit that function's ticket/voucher/team-rate
// model: one registration covers a family's whole guest list at once, with
// a single Masterclass opt-in for the group and a per-guest photo upload.
// It does reuse the same building blocks publicRsvp() uses: the anti-spam
// token check, the shared submission-person resolver, FIELD_MAX/checkLengths,
// and newTicketCode
// (every registration gets a ticket_code, matching house convention, even
// though this event's success screen does not surface a /t/ ticket link).
//
// Capacity: the tasting is uncapped; the Masterclass is capped and enforced
// atomically by register_myeo_family_day_party() (094), the same lock-count-insert
// shape as register_for_event(), scoped to the Masterclass ticket type
// instead of the whole event.

const MYEO_FAMILY_DAY_SLUG = "myeo-family-day";
// Per-photo and combined-total caps must stay comfortably under both the
// Server Action body limit (next.config.ts, 4MB) and Vercel's own ~4.5MB
// Serverless Function request body ceiling, leaving headroom for the JSON
// attendee payload, spam token, and multipart overhead on top of the photos
// themselves. Mirrored client-side in MyeoFamilyDayForm.tsx so a submission
// that would blow the limit is rejected with a clear message before it ever
// reaches the network, instead of failing as an opaque 413.
const MYEO_FAMILY_DAY_MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const MYEO_FAMILY_DAY_MAX_TOTAL_PHOTO_BYTES = 3.5 * 1024 * 1024;
const MYEO_FAMILY_DAY_MAX_TOTAL_INPUT_PIXELS = 40_000_000;
const MYEO_FAMILY_DAY_PHOTO_TYPES = ["image/jpeg", "image/png"];
const MYEO_FAMILY_DAY_PHOTO_BUCKET = "family-day-attendee-photos";
const MYEO_FAMILY_DAY_PHOTO_UPLOAD_CONCURRENCY = 4;

export type FamilyDayRegistrationResult =
  | { ok: true; photoWarning?: string; checkoutUrl?: string }
  | { ok: false; error: string };

const MYEO_FAMILY_DAY_MASTERCLASS_NAME = "Chocolate-making Masterclass";

type FamilyDayAttendeeInput = {
  full_name: string;
  age: string;
  dietary: string;
  photo_consent: boolean;
};

export async function registerMyeoFamilyDay(
  eventId: string,
  formData: FormData,
): Promise<FamilyDayRegistrationResult> {
  if (!eventId) return { ok: false, error: "Missing event id" };

  let spamCheck: ReturnType<typeof checkRsvpSubmission>;
  try {
    spamCheck = checkRsvpSubmission(
      s(formData.get("website")),
      s(formData.get("rsvp_form_token")),
      eventId,
    );
  } catch (error) {
    console.error("registerMyeoFamilyDay anti-spam configuration:", error);
    return { ok: false, error: "Registration is temporarily unavailable. Please try again shortly." };
  }
  if (!spamCheck.ok) {
    if (spamCheck.reason === "too_fast") {
      return { ok: false, error: "Please take a moment to review your details, then try again." };
    }
    if (spamCheck.reason === "expired") {
      return { ok: false, error: "This form has expired. Refresh the page and try again." };
    }
    return { ok: false, error: "We could not process this registration. Refresh the page and try again." };
  }

  const { data: event, error: evErr } = await supabase
    .from("events")
    .select("id, slug, status, title, starts_at, ends_at, location")
    .eq("id", eventId)
    .maybeSingle();
  if (evErr || !event) return { ok: false, error: "Event not found" };
  // This action is bespoke to one event; guard against it being called
  // against any other event id (the form only ever renders for this slug,
  // but the action is a callable server endpoint regardless).
  if (event.slug !== MYEO_FAMILY_DAY_SLUG) {
    return { ok: false, error: "Invalid event" };
  }
  if (event.status !== "open" && event.status !== "published") {
    return { ok: false, error: "Registration is not open for this event" };
  }

  const name = s(formData.get("name"));
  const email = s(formData.get("email")).toLowerCase();
  const wantsTasting = s(formData.get("wants_tasting")) === "true";
  const wantsMasterclass = s(formData.get("wants_masterclass")) === "true";
  const feeAck = s(formData.get("fee_ack")) === "true";
  const waiverAccepted = s(formData.get("waiver_accepted")) === "true";

  if (!name) return { ok: false, error: "Please enter your name" };
  if (!email || !email.includes("@")) return { ok: false, error: "Please enter a valid email" };
  if (!wantsTasting && !wantsMasterclass) {
    return { ok: false, error: "Please pick at least one session, the tasting, the making class, or both" };
  }
  if (wantsMasterclass && !feeAck) {
    return { ok: false, error: "Please confirm the Masterclass fee acknowledgment" };
  }
  if (!waiverAccepted) {
    return { ok: false, error: "Please accept the event waiver, cancellation, and no-show policy" };
  }

  // Masterclass pricing is sourced from the DB, never the client, and must
  // exist before we let the family submit their details for it.
  let masterclassTicket: { id: string; price_amount: number; currency: string } | null = null;
  if (wantsMasterclass) {
    const { data: ticketRow, error: ticketErr } = await supabase
      .from("event_ticket_types")
      .select("id, price_amount, currency")
      .eq("event_id", eventId)
      .eq("name", MYEO_FAMILY_DAY_MASTERCLASS_NAME)
      .eq("active", true)
      .maybeSingle();
    if (ticketErr || !ticketRow) {
      return { ok: false, error: "Masterclass pricing is not configured. Please contact the chapter." };
    }
    masterclassTicket = ticketRow;
  }

  const topLenErr = checkLengths([
    ["Name", name, FIELD_MAX.name],
    ["Email", email, FIELD_MAX.email],
  ]);
  if (topLenErr) return { ok: false, error: topLenErr };

  const attendeesRaw = s(formData.get("attendees"));
  if (!attendeesRaw) return { ok: false, error: "Please list at least one person coming" };
  let parsedAttendees: unknown;
  try {
    parsedAttendees = JSON.parse(attendeesRaw);
  } catch {
    return { ok: false, error: "Invalid attendee data" };
  }
  if (!Array.isArray(parsedAttendees) || parsedAttendees.length === 0) {
    return { ok: false, error: "Please list at least one person coming" };
  }
  if (parsedAttendees.length > 20) {
    return { ok: false, error: "A single registration can include at most 20 people" };
  }

  const attendeeRows = parsedAttendees as Record<string, unknown>[];
  const attendees: FamilyDayAttendeeInput[] = attendeeRows.map((a) => ({
    full_name: s(typeof a.full_name === "string" ? a.full_name : null),
    age: s(typeof a.age === "string" ? a.age : null),
    dietary: s(typeof a.dietary === "string" ? a.dietary : null),
    photo_consent: a.photo_consent === true,
  }));

  const masterclassCheckoutTotal = masterclassTicket
    ? masterclassTicket.price_amount * attendees.length
    : 0;
  const masterclassCurrency = masterclassTicket?.currency.trim().toUpperCase() ?? "";
  if (
    masterclassTicket &&
    (!Number.isSafeInteger(masterclassCheckoutTotal) ||
      masterclassCheckoutTotal <= 0 ||
      !/^[A-Z]{3}$/.test(masterclassCurrency))
  ) {
    return {
      ok: false,
      error: "Masterclass payment amount or currency is invalid. Please contact the chapter.",
    };
  }

  for (const [i, a] of attendees.entries()) {
    const who = `Guest ${i + 1}`;
    if (!a.full_name) return { ok: false, error: `${who}: please enter a name` };
    if (i > 0 && !a.age) return { ok: false, error: `${who}: please enter an age` };
    if (a.age) {
      const ageNum = Number(a.age);
      if (!Number.isInteger(ageNum) || ageNum < 0 || ageNum > 120) {
        return { ok: false, error: `${who}: please enter a valid age (e.g. 9)` };
      }
    }
    const attLenErr = checkLengths([
      [`${who} name`, a.full_name, FIELD_MAX.name],
      [`${who} allergy note`, a.dietary, FIELD_MAX.food_allergy],
    ]);
    if (attLenErr) return { ok: false, error: attLenErr };
  }

  // Masterclass age policy: a child aged 8-12 may join, but only with an
  // adult in the same party. A blank age is our own convention for "adult"
  // (see the form's "leave blank for adults" hint), so this checks for at
  // least one blank-age attendee alongside any 8-12 year old.
  if (wantsMasterclass) {
    const hasChild8to12 = attendees.some((a) => {
      if (!a.age) return false;
      const ageNum = Number(a.age);
      return ageNum >= 8 && ageNum <= 12;
    });
    const hasAdult = attendees.some((a) => !a.age);
    if (hasChild8to12 && !hasAdult) {
      return {
        ok: false,
        error:
          "Children aged 8 to 12 need an adult with them in the Masterclass. Please add an adult to the party (leave their age blank), or remove the Masterclass for this child.",
      };
    }
  }

  // Photos cannot travel inside the `attendees` JSON, so each File arrives as
  // its own FormData entry, keyed by the attendee's index in that same array.
  const photos: Array<File | null> = attendees.map((_, i) => {
    const entry = formData.get(`attendee_photo_${i}`);
    return entry instanceof File && entry.size > 0 ? entry : null;
  });
  for (const [i, file] of photos.entries()) {
    if (!file) continue;
    if (!attendees[i].photo_consent) {
      return { ok: false, error: `Guest ${i + 1}: please tick the photo consent box, or remove the photo` };
    }
    if (!MYEO_FAMILY_DAY_PHOTO_TYPES.includes(file.type)) {
      return { ok: false, error: `Guest ${i + 1}: please choose a JPEG or PNG image` };
    }
    if (file.size > MYEO_FAMILY_DAY_MAX_PHOTO_BYTES) {
      return { ok: false, error: `Guest ${i + 1}: photo is over 3 MB` };
    }
  }
  const totalPhotoBytes = photos.reduce((sum, f) => sum + (f?.size ?? 0), 0);
  if (totalPhotoBytes > MYEO_FAMILY_DAY_MAX_TOTAL_PHOTO_BYTES) {
    return {
      ok: false,
      error: "The photos together are too large. Please remove a photo or choose smaller ones, then submit again.",
    };
  }

  // Decode and re-encode every photo before any database or storage write.
  // This validates the actual image format, applies source orientation, and
  // strips EXIF/XMP/IPTC/ICC metadata. Sharp is already part of Next's image
  // stack and pinned in this repository, so this adds no unrelated processor.
  const photoSources: Array<FamilyDayPhotoSource | null> = [];
  for (const [i, file] of photos.entries()) {
    if (!file) {
      photoSources.push(null);
      continue;
    }
    photoSources.push({
      data: Buffer.from(await file.arrayBuffer()),
      declaredContentType: file.type as FamilyDayPhotoContentType,
      guestName: attendees[i].full_name || `Guest ${i + 1}`,
    });
  }
  const prepared = await prepareFamilyDayPhotos(photoSources, {
    maxPhotoBytes: MYEO_FAMILY_DAY_MAX_PHOTO_BYTES,
    maxTotalPhotoBytes: MYEO_FAMILY_DAY_MAX_TOTAL_PHOTO_BYTES,
    maxTotalInputPixels: MYEO_FAMILY_DAY_MAX_TOTAL_INPUT_PIXELS,
  });
  const preparedPhotos = prepared.photos;
  const failedPhotoGuests = [...prepared.failedGuests];

  const personResult = await resolveSubmissionPersonWithSupabase({ email, name });
  const person = personResult.data;
  if (personResult.error || !person) {
    return { ok: false, error: "Could not save registration" };
  }

  const { data: existingRegistration } = await supabase
    .from("event_registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("person_id", person.id)
    .neq("review_classification", "spam")
    .maybeSingle();
  if (existingRegistration) {
    return { ok: false, error: "You are already registered for this event." };
  }

  const ticketCode = newTicketCode();
  const registrationId = randomUUID();
  const attendeeRecords = attendees.map((attendee, i) => {
    const id = randomUUID();
    const photo = preparedPhotos[i];
    return {
      id,
      full_name: attendee.full_name,
      age: attendee.age ? Number(attendee.age) : null,
      food_allergy: nullable(attendee.dietary),
      photo_consent: attendee.photo_consent,
      photo_path: photo ? `${registrationId}/${id}.${photo.extension}` : null,
    };
  });
  const photoPaths = attendeeRecords.flatMap((attendee) =>
    attendee.photo_path ? [attendee.photo_path] : [],
  );

  try {
    const { data, error } = await supabase.rpc("register_myeo_family_day_party", {
      p_registration_id: registrationId,
      p_event_id: eventId,
      p_person_id: person.id,
      p_wants_tasting: wantsTasting,
      p_wants_masterclass: wantsMasterclass,
      p_waiver_accepted: true,
      p_ticket_code: ticketCode,
      p_registration_email: email,
      p_attendees: attendeeRecords,
    });
    if (error) {
      if (error.code === "23505" || /duplicate key/i.test(error.message)) {
        return { ok: false, error: "You are already registered for this event." };
      }
      if (/masterclass is full/i.test(error.message)) {
        return {
          ok: false,
          error:
            "The Masterclass just filled up. Please refresh the page, unselect the Masterclass, and submit again for the tasting only.",
        };
      }
      throw new Error(error.message);
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Could not save registration");
  } catch (err) {
    console.error(
      "registerMyeoFamilyDay: atomic party registration failed:",
      err instanceof Error ? err.message : err,
    );
    return { ok: false, error: "Your registration was not saved. Please try again." };
  }

  if (wantsMasterclass && masterclassTicket) {
    const snapshotError = await snapshotStandardRegistrationPrice({
      registrationId,
      amount: masterclassCheckoutTotal,
      currency: masterclassCurrency,
    });
    if (snapshotError) {
      console.error("registerMyeoFamilyDay: could not snapshot checkout price:", snapshotError);
      const { error: releaseError } = await supabase
        .from("event_registrations")
        .delete()
        .eq("id", registrationId)
        .eq("event_id", eventId);
      if (releaseError) {
        console.error(
          "registerMyeoFamilyDay: could not release registration after price snapshot failure:",
          releaseError.message,
        );
      }
      return {
        ok: false,
        error: releaseError
          ? "Payment is temporarily unavailable, and we could not safely release your saved registration. Please contact the chapter before trying again."
          : "Payment is temporarily unavailable. Please try again shortly.",
      };
    }
  }

  // The atomic RPC pre-links each photo's deterministic private path to its
  // attendee. An interrupted upload can leave a missing object, but never an
  // unowned object. Keep that ownership record even when the upload client
  // reports an error because the remote write may have succeeded before a
  // network failure reached this process.
  const uploadResult = await uploadFamilyDayPhotos(
    preparedPhotos.map((photo, i) => ({
      guestName: attendees[i].full_name || `Guest ${i + 1}`,
      path: attendeeRecords[i].photo_path,
      photo,
    })),
    async (path, data, contentType) => {
      const { error } = await supabase.storage
        .from(MYEO_FAMILY_DAY_PHOTO_BUCKET)
        .upload(path, data, { contentType, upsert: false });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    MYEO_FAMILY_DAY_PHOTO_UPLOAD_CONCURRENCY,
  );
  failedPhotoGuests.push(...uploadResult.failedGuests);
  if (uploadResult.ambiguousPaths.length > 0) {
    console.error(
      `registerMyeoFamilyDay: ${uploadResult.ambiguousPaths.length} photo upload outcome(s) are ambiguous`,
    );
  }

  const rollbackFamilyDayRegistration = async (reason: string): Promise<boolean> => {
    const released = await releaseFamilyDayRegistration({
      photoPaths,
      async removePhotos(paths) {
        const { error } = await supabase.storage
          .from(MYEO_FAMILY_DAY_PHOTO_BUCKET)
          .remove(paths);
        return error ? { ok: false, error: error.message } : { ok: true };
      },
      async deleteRegistration() {
        const { error } = await supabase
          .from("event_registrations")
          .delete()
          .eq("id", registrationId)
          .eq("event_id", eventId);
        return error ? { ok: false, error: error.message } : { ok: true };
      },
      preserveRegistration: uploadResult.ambiguousPaths.length > 0,
    });
    if (!released.released) {
      console.error(
        `registerMyeoFamilyDay: could not safely release registration after ${reason}:`,
        released.error,
      );
    }
    return released.released;
  };

  // Best-effort guest account provisioning, same as publicRsvp(). Never
  // blocks the registration on its own success or failure.
  provisionGuestUser(email, name, person.id).catch((err) => {
    console.warn("registerMyeoFamilyDay: guest provisioning failed (non-blocking):", err?.message ?? err);
  });

  // Best-effort ticket confirmation email (env-flagged, no-op without
  // RESEND_API_KEY). Only sent for tasting-only registrations here; the
  // Masterclass path below redirects to Stripe and the webhook sends the
  // email after payment is confirmed.
  if (!wantsMasterclass && isEmailConfigured()) {
    const h = await headers();
    const host = h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const emailOrigin = `${proto}://${host}`;
    const delivery = await deliverTicketConfirmation({
      send: () => sendTicketEmail({
        to: email,
        name,
        eventTitle: event.title,
        startsAt: event.starts_at,
        endsAt: event.ends_at ?? null,
        location: event.location ?? null,
        ticketUrl: ticketUrl(ticketCode, emailOrigin),
        ticketCode,
      }),
      recordSent: async () => {
        const { data, error } = await supabase
          .from("event_registrations")
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq("id", registrationId)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Registration no longer exists");
      },
    });
    if (delivery.sent && !delivery.recorded) {
      console.warn(
        "registerMyeoFamilyDay: ticket email sent but confirmation timestamp could not be saved",
        (delivery as { error?: unknown }).error,
      );
    }
  }

  // Masterclass fee: send the family to Stripe. Until Stripe confirms a
  // usable session, the party is a pending-payment hold. A definite checkout
  // failure releases its private photos before deleting the database owner.
  if (wantsMasterclass && masterclassTicket) {
    if (!isStripeConfigured()) {
      const released = await rollbackFamilyDayRegistration("missing Stripe configuration");
      return {
        ok: false,
        error: released
          ? "Payment is not configured. Please contact the chapter."
          : "Payment is not configured, and we could not safely release your saved registration. Please contact the chapter before trying again.",
      };
    }

    const h = await headers();
    const host = h.get("host") || "localhost:3000";
    const proto =
      h.get("x-forwarded-proto") ||
      (host.startsWith("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;

    let session;
    try {
      session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: email,
          line_items: [
            {
              price_data: {
                currency: masterclassCurrency.toLowerCase(),
                product_data: { name: `MyEO Family Day: ${MYEO_FAMILY_DAY_MASTERCLASS_NAME}` },
                unit_amount: masterclassTicket.price_amount,
              },
              quantity: attendees.length,
            },
          ],
          expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
          success_url: `${origin}/events/${eventId}?paid=1&rid=${registrationId}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/events/${eventId}?cancelled=1`,
          metadata: {
            registration_id: registrationId,
            event_id: eventId,
            person_id: person.id,
            ticket_type_id: masterclassTicket.id,
          },
        },
        { idempotencyKey: `family-day-masterclass-${registrationId}` },
      );
    } catch (err) {
      // A timeout can occur after Stripe created the session. Without its ID
      // we cannot confirm expiration, so keep the party and private owners.
      console.error("registerMyeoFamilyDay: checkout creation outcome uncertain", err);
      return {
        ok: false,
        error: "We could not confirm checkout. Your registration was preserved because the payment state is uncertain. Please contact the chapter before trying again.",
      };
    }

    if (!session.url) {
      let released = false;
      await secureStandardCheckoutSession(session.status, {
        attach: async () => false,
        expire: async () => (await stripe.checkout.sessions.expire(session.id)).status,
        release: async () => {
          released = await rollbackFamilyDayRegistration("missing checkout URL");
        },
        onExpireError: (error) => {
          console.warn("registerMyeoFamilyDay: could not expire checkout without a URL", error);
        },
      });
      return {
        ok: false,
        error: released
          ? "Checkout session URL missing"
          : "Checkout could not be opened. Your registration was preserved because the payment state is uncertain. Please contact the chapter before trying again.",
      };
    }

    const release: {
      state: "not_attempted" | "released" | "failed";
    } = { state: "not_attempted" };
    const secured = await secureStandardCheckoutSession(session.status, {
      attach: () => attachStandardCheckoutSession({
        registrationId,
        sessionId: session.id,
        amount: session.amount_total,
        currency: session.currency,
      }),
      expire: async () => (await stripe.checkout.sessions.expire(session.id)).status,
      release: async () => {
        release.state = (await rollbackFamilyDayRegistration("unattached checkout"))
          ? "released"
          : "failed";
      },
      onExpireError: (error) => {
        console.warn("registerMyeoFamilyDay: could not expire unattached checkout", error);
      },
    });
    if (!secured) {
      let error: string;
      switch (release.state) {
        case "released":
          error = "Could not secure checkout. Please try again.";
          break;
        case "failed":
          error = "Could not secure checkout, and we could not safely release your saved registration. Please contact the chapter before trying again.";
          break;
        default:
          error = "Could not secure checkout. Your registration was preserved because the payment state is uncertain. Please contact the chapter before trying again.";
      }
      return {
        ok: false,
        error,
      };
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/board/events/${eventId}`);
    return { ok: true, checkoutUrl: session.url };
  }

  revalidatePath(`/board/events/${eventId}`);

  if (failedPhotoGuests.length > 0) {
    return {
      ok: true,
      photoWarning: `Your registration is saved. We could not save the photo for ${failedPhotoGuests.join(", ")}. Please email us a copy if you can.`,
    };
  }
  return { ok: true };
}
