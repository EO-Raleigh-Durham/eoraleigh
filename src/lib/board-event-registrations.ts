import { CHAPTER_MANAGER_EMAIL, CHAPTER_NAME } from "../kernel/config/chapter.ts";
import "server-only";

import { requireBoardOrAbove } from "./auth";
import type { EventInviterCandidate, EventRegistration } from "./events";
import { supabase } from "./supabase";
import { fetchAllRows } from "./supabase-page";

const ATTENDEE_BASE_COLUMNS =
  "id, registration_id, full_name, email, phone, company, title, food_allergy, created_at";
// age/photo_path/photo_consent (085/086, MyEO Family Day) are optional here
// for the same reason is_prospect/invited_by_person_id are: this query serves
// every event's people tab, and must not go dark for all events just because
// one recent migration has not reached this environment yet.
const ATTENDEE_FAMILY_DAY_COLUMNS = "age, photo_path, photo_consent";
const ATTENDEE_VETTING_COLUMNS = "role_in_company, revenue_scale";
// First-touch attribution (migration 109). Optional for the same reason.
const ATTRIBUTION_COLUMNS = "channel_source, utm_source, utm_medium, utm_campaign, utm_content, referral_source";

function registrationSelect(includeAttendeeFamilyDayColumns: boolean, includeAttendeeVettingColumns: boolean): string {
  const attendeeColumns = [ATTENDEE_BASE_COLUMNS, includeAttendeeFamilyDayColumns ? ATTENDEE_FAMILY_DAY_COLUMNS : null, includeAttendeeVettingColumns ? ATTENDEE_VETTING_COLUMNS : null].filter((value): value is string => value !== null).join(", ");
  return `id, event_id, person_id, status, waitlist_position, guest_count, confirmed_at, cancelled_at, cancellation_reason, notes, stripe_session_id, stripe_payment_intent_id, amount_paid, price_final_total, price_currency, paid_at, ticket_code, checked_in_at, waiver_accepted_at, review_classification, invited_by_registration_id, created_at, updated_at, person:people!event_registrations_person_id_fkey(id, email, name, first_name, preferred_name), attendees:event_registration_attendees(${attendeeColumns}), ticket_type:event_ticket_types!event_registrations_ticket_type_id_fkey(id, name, price_amount, currency, max_attendees)`;
}

async function loadRows(
  eventId: string,
  includeProspect: boolean,
  includeInviterPerson: boolean,
  includeAttendeeFamilyDayColumns: boolean,
  includeAttendeeVettingColumns: boolean,
  includeAttribution: boolean,
): Promise<EventRegistration[]> {
  const extras = [
    includeProspect ? "is_prospect" : null,
    includeInviterPerson ? "invited_by_person_id" : null,
    includeAttribution ? ATTRIBUTION_COLUMNS : null,
  ].filter(Boolean);
  const base = registrationSelect(includeAttendeeFamilyDayColumns, includeAttendeeVettingColumns);
  const select = extras.length > 0 ? `${base}, ${extras.join(", ")}` : base;
  const rows = await fetchAllRows((from, to) =>
    supabase
      .from("event_registrations")
      .select(select)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .range(from, to),
  );
  return rows as unknown as EventRegistration[];
}

async function attachInviters(
  registrations: EventRegistration[],
): Promise<EventRegistration[]> {
  const legacyInviterIds = Array.from(
    new Set(
      registrations
        .map((registration) => registration.invited_by_registration_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const legacyPersonByRegistration = new Map<string, string>();
  if (legacyInviterIds.length > 0) {
    const { data: inviterRows, error } = await supabase
      .from("event_registrations")
      .select("id, person_id")
      .in("id", legacyInviterIds);
    if (error) {
      console.warn("getBoardRegistrationsForEvent legacy inviters:", error.message);
    } else {
      for (const row of inviterRows ?? []) {
        legacyPersonByRegistration.set(row.id, row.person_id);
      }
    }
  }

  const inviterPersonIds = Array.from(
    new Set(
      registrations
        .map((registration) =>
          registration.invited_by_person_id ??
          (registration.invited_by_registration_id
            ? legacyPersonByRegistration.get(registration.invited_by_registration_id)
            : null),
        )
        .filter((id): id is string => Boolean(id)),
    ),
  );
  if (inviterPersonIds.length === 0) return registrations;

  const { data: inviterPeople, error } = await supabase
    .from("people")
    .select("id, email, name, first_name, preferred_name")
    .in("id", inviterPersonIds);
  if (error) {
    console.warn("getBoardRegistrationsForEvent inviters:", error.message);
    return registrations;
  }

  const inviterByPersonId = new Map((inviterPeople ?? []).map((person) => [person.id, person]));
  return registrations.map((registration) => ({
    ...registration,
    invited_by_person_id:
      registration.invited_by_person_id ??
      (registration.invited_by_registration_id
        ? legacyPersonByRegistration.get(registration.invited_by_registration_id) ?? null
        : null),
    inviter: (() => {
      const personId =
        registration.invited_by_person_id ??
        (registration.invited_by_registration_id
          ? legacyPersonByRegistration.get(registration.invited_by_registration_id)
          : null);
      if (!personId) return null;
      return {
        id: personId,
        person: (inviterByPersonId.get(personId) as EventRegistration["person"]) ?? null,
      };
    })(),
  }));
}

export async function getBoardRegistrationsForEvent(
  eventId: string,
): Promise<EventRegistration[]> {
  await requireBoardOrAbove();

  try {
    let includeProspect = true;
    let includeInviterPerson = true;
    let includeAttendeeFamilyDayColumns = true;
    let includeAttendeeVettingColumns = true;
    let includeAttribution = true;
    let rows: EventRegistration[] | null = null;
    for (let attempt = 0; attempt < 6 && !rows; attempt += 1) {
      try {
        rows = await loadRows(
          eventId,
          includeProspect,
          includeInviterPerson,
          includeAttendeeFamilyDayColumns,
          includeAttendeeVettingColumns,
          includeAttribution,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (includeInviterPerson && message.includes("invited_by_person_id")) {
          includeInviterPerson = false;
          continue;
        }
        if (includeProspect && message.includes("is_prospect")) {
          includeProspect = false;
          continue;
        }
        if (
          includeAttendeeFamilyDayColumns &&
          (message.includes("photo_path") || message.includes("photo_consent") || message.includes("age"))
        ) {
          includeAttendeeFamilyDayColumns = false;
          continue;
        }
        if (includeAttendeeVettingColumns && (message.includes("role_in_company") || message.includes("revenue_scale"))) {
          includeAttendeeVettingColumns = false;
          continue;
        }
        if (
          includeAttribution &&
          (message.includes("channel_source") ||
            message.includes("utm_") ||
            message.includes("referral_source"))
        ) {
          includeAttribution = false;
          continue;
        }
        throw error;
      }
    }

    if (!rows) return [];
    if (!includeProspect) {
      rows = rows.map((row) => ({ ...row, is_prospect: false }));
    }

    return attachInviters(rows);
  } catch (error) {
    console.warn(
      "getBoardRegistrationsForEvent:",
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }
}

export async function getEventInviterCandidates(): Promise<EventInviterCandidate[]> {
  await requireBoardOrAbove();

  const { data: chapter, error: chapterError } = await supabase
    .from("chapters")
    .select("id")
    .eq("chapter_name", CHAPTER_NAME)
    .maybeSingle();
  if (chapterError || !chapter) {
    console.warn("getEventInviterCandidates chapter:", chapterError?.message ?? "not found");
    return [];
  }

  const [{ data: memberships, error: membershipError }, { data: staff, error: staffError }] =
    await Promise.all([
      supabase
        .from("chapter_memberships")
        .select(
          "status, person:people!chapter_memberships_person_id_fkey(id, email, name, first_name, last_name, preferred_name)",
        )
        .eq("chapter_id", chapter.id)
        .in("status", ["active", "on_leave"]),
      supabase
        .from("people")
        .select("id, email, name, first_name, last_name, preferred_name")
        .eq("is_eo_staff", true),
    ]);
  if (membershipError || staffError) {
    console.warn(
      "getEventInviterCandidates:",
      membershipError?.message ?? staffError?.message,
    );
    return [];
  }

  type CandidatePerson = {
    id: string;
    email: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    preferred_name: string | null;
  };
  const displayName = (person: CandidatePerson) =>
    person.preferred_name ||
    [person.first_name, person.last_name].filter(Boolean).join(" ") ||
    person.name ||
    person.email;
  const candidates = new Map<string, EventInviterCandidate>();

  for (const row of memberships ?? []) {
      const person = row.person as unknown as {
        id: string;
        email: string;
        name: string | null;
        first_name: string | null;
        last_name: string | null;
        preferred_name: string | null;
      } | null;
      if (!person) continue;
      candidates.set(person.id, {
        personId: person.id,
        name: displayName(person),
        email: person.email,
        eligibility: "member",
        membershipStatus: row.status as EventInviterCandidate["membershipStatus"],
        roleLabel: null,
      });
  }

  for (const person of (staff ?? []) as CandidatePerson[]) {
    if (candidates.has(person.id)) continue;
    candidates.set(person.id, {
      personId: person.id,
      name: displayName(person),
      email: person.email,
      eligibility: "staff",
      membershipStatus: null,
      roleLabel: CHAPTER_MANAGER_EMAIL && person.email.toLowerCase() === CHAPTER_MANAGER_EMAIL.toLowerCase()
        ? "Chapter manager"
        : "Chapter staff",
    });
  }

  return Array.from(candidates.values())
    .sort((left, right) => left.name.localeCompare(right.name));
}
