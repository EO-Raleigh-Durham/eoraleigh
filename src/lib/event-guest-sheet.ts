import "server-only";

import { supabase } from "./supabase";
import { companyRole, toPayloadRows, type GuestRow } from "./event-guest-sheet-rows";

// Mirrors confirmed registrations for ONE event into a Google Sheet via a
// small Apps Script web app (see docs/event-guest-sheet-apps-script.md). The
// script numbers rows and skips emails already listed. Called after a seat is
// secured (free RSVP path and Stripe webhook). It must NEVER throw or block a
// registration: every failure is logged and swallowed.
//
// The event and script URL below are fixed for this event; the script URL is
// the deployed Apps Script web app and an empty URL means dormant. The shared
// key the script checks comes from EVENT_GUEST_SHEET_KEY; without it nothing
// is posted.

const GUEST_SHEET = {
  eventId: "dd39163e-97b4-4560-883a-c56986563ddd",
  scriptUrl:
    "https://script.google.com/macros/s/AKfycby9pWVlgKACwbzHgKl9hlmGIXIqB17ygddNqXpE9Qf4ScRByLTj410ZXgk_S6aMuhwB/exec",
};

type RegistrationRow = {
  status: string;
  event_id: string;
  review_classification: string | null;
  person: { name: string | null; email: string } | null;
  ticket_type: { name: string } | null;
  attendees: { full_name: string; email: string; company: string | null; title: string | null }[] | null;
};

export async function syncRegistrationToGuestSheet(registrationId: string): Promise<void> {
  try {
    if (!GUEST_SHEET.scriptUrl) return;

    const { data, error } = await supabase
      .from("event_registrations")
      .select(
        "status, event_id, review_classification, person:people!event_registrations_person_id_fkey(name, email), ticket_type:event_ticket_types!event_registrations_ticket_type_id_fkey(name), attendees:event_registration_attendees(full_name, email, company, title)",
      )
      .eq("id", registrationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const reg = data as unknown as RegistrationRow | null;
    if (
      !reg ||
      reg.event_id !== GUEST_SHEET.eventId ||
      reg.status !== "registered" ||
      reg.review_classification === "spam"
    ) {
      return;
    }

    const memberType = reg.ticket_type?.name ?? "";
    const guests: GuestRow[] =
      reg.attendees && reg.attendees.length > 0
        ? reg.attendees.map((a) => ({
            name: a.full_name,
            companyRole: companyRole(a.company, a.title),
            email: a.email,
            memberType,
          }))
        : reg.person?.email
          ? [{ name: reg.person.name ?? "", companyRole: "", email: reg.person.email, memberType }]
          : [];
    const rows = toPayloadRows(guests);
    if (rows.length === 0) return;

    const key = process.env.EVENT_GUEST_SHEET_KEY;
    if (!key) {
      console.warn("syncRegistrationToGuestSheet skipped: EVENT_GUEST_SHEET_KEY is not set");
      return;
    }

    const res = await fetch(GUEST_SHEET.scriptUrl, {
      method: "POST",
      headers: { "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ key, rows }),
      signal: AbortSignal.timeout(15_000),
    });
    const result = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !result?.ok) {
      throw new Error(`guest sheet script failed (${res.status}): ${result?.error ?? "no response"}`);
    }
  } catch (err) {
    console.warn(
      "syncRegistrationToGuestSheet failed (non-blocking):",
      err instanceof Error ? err.message : err,
    );
  }
}
