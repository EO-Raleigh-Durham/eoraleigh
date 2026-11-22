// Automatic post-event survey email. Pure selection logic lives here so it is
// unit tested; the hourly cron (/api/cron/event-survey-send) supplies the
// Supabase client and the mail sender, and only runs once email is
// configured, so a claimed event always has a real send attempt.
//
// Rule: every held chapter event (scope local, survey on, not draft or
// cancelled) is emailed its survey link once, 1 to 72 hours after it ends.
// Recipients are everyone registered or checked in, plus named guests, minus
// spam registrations and anyone who has already rated the event.

import { CHAPTER_NAME } from "../kernel/config/chapter.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SURVEY_SEND_MIN_HOURS = 1;
export const SURVEY_SEND_MAX_HOURS = 72;
const HOUR = 60 * 60 * 1000;

export type SurveySendEvent = {
  id: string;
  title: string;
  slug: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  scope: string;
  survey_enabled: boolean;
  survey_sent_at: string | null;
};

export function isDueForSurvey(event: SurveySendEvent, now: Date): boolean {
  if (event.survey_sent_at) return false;
  if (!event.survey_enabled) return false;
  if (event.scope !== "local") return false;
  if (event.status === "draft" || event.status === "cancelled") return false;
  const endedAt = new Date(event.ends_at ?? event.starts_at).getTime();
  const hoursSince = (now.getTime() - endedAt) / HOUR;
  return hoursSince >= SURVEY_SEND_MIN_HOURS && hoursSince <= SURVEY_SEND_MAX_HOURS;
}

export type SurveyRegistrationRow = {
  status: string;
  review_classification: string | null;
  person: { email: string | null; name: string | null } | null;
  attendees?: { email: string | null; full_name: string | null }[] | null;
};

export type SurveyRecipient = { email: string; name: string | null };

const SURVEY_STATUSES = new Set(["registered", "attended"]);

function cleanEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase();
  return email && email.includes("@") ? email : null;
}

export function pickSurveyRecipients(
  registrations: SurveyRegistrationRow[],
  respondedEmails: Iterable<string>,
): SurveyRecipient[] {
  const skip = new Set(
    [...respondedEmails].map((e) => e.trim().toLowerCase()),
  );
  const out: SurveyRecipient[] = [];
  const add = (email: string | null, name: string | null) => {
    if (!email || skip.has(email)) return;
    skip.add(email);
    out.push({ email, name });
  };
  for (const reg of registrations) {
    if (!SURVEY_STATUSES.has(reg.status)) continue;
    if (reg.review_classification === "spam") continue;
    add(cleanEmail(reg.person?.email), reg.person?.name ?? null);
    for (const guest of reg.attendees ?? []) {
      add(cleanEmail(guest.email), guest.full_name ?? null);
    }
  }
  return out;
}

export function surveyEmailBody(eventTitle: string, surveyUrl: string): string {
  return `Thanks for joining ${eventTitle}.\n\nHow valuable was it for you? Two minutes, one rating from 1 to 5 and two short questions. Your answer shapes the next event.\n\nRate the event: ${surveyUrl}\n\nThank you,\n${CHAPTER_NAME}`;
}

export type SurveyMailer = (input: {
  subject: string;
  bodyText: string;
  eventTitle: string;
  recipients: SurveyRecipient[];
}) => Promise<{ sent: number; failed: number }>;

export type SurveySendReport = {
  checked: number;
  sent: { eventId: string; title: string; recipients: number; failed: number }[];
};

export async function runEventSurveySend(
  client: Pick<SupabaseClient, "from">,
  mailer: SurveyMailer,
  siteUrl: string,
  now: Date = new Date(),
): Promise<SurveySendReport> {
  // Events can run past midnight, so look back a little further than the
  // 72-hour window on starts_at and let isDueForSurvey decide.
  const since = new Date(now.getTime() - (SURVEY_SEND_MAX_HOURS + 48) * HOUR);
  const { data, error } = await client
    .from("events")
    .select(
      "id, title, slug, starts_at, ends_at, status, scope, survey_enabled, survey_sent_at",
    )
    .gte("starts_at", since.toISOString())
    .lte("starts_at", now.toISOString())
    .is("survey_sent_at", null);
  if (error) throw new Error(`event-survey-send events: ${error.message}`);

  const due = ((data ?? []) as SurveySendEvent[]).filter((e) =>
    isDueForSurvey(e, now),
  );
  const report: SurveySendReport = { checked: due.length, sent: [] };

  for (const event of due) {
    const [regResult, fbResult] = await Promise.all([
      client
        .from("event_registrations")
        .select(
          "status, review_classification, person:people!event_registrations_person_id_fkey(email, name), attendees:event_registration_attendees(email, full_name)",
        )
        .eq("event_id", event.id),
      client
        .from("event_feedback")
        .select("person:people!event_feedback_person_id_fkey(email)")
        .eq("event_id", event.id),
    ]);
    if (regResult.error || fbResult.error) {
      console.warn(
        "event-survey-send recipients:",
        regResult.error?.message ?? fbResult.error?.message,
      );
      continue;
    }
    const responded = ((fbResult.data ?? []) as unknown as {
      person: { email: string | null } | null;
    }[])
      .map((row) => row.person?.email)
      .filter((e): e is string => Boolean(e));
    const recipients = pickSurveyRecipients(
      (regResult.data ?? []) as unknown as SurveyRegistrationRow[],
      responded,
    );

    // Claim the event first so two overlapping runs can never double-send.
    const { data: claimed, error: claimError } = await client
      .from("events")
      .update({ survey_sent_at: now.toISOString(), survey_sent_count: 0 })
      .eq("id", event.id)
      .is("survey_sent_at", null)
      .select("id");
    if (claimError || !claimed || claimed.length === 0) continue;

    if (recipients.length === 0) {
      report.sent.push({ eventId: event.id, title: event.title, recipients: 0, failed: 0 });
      continue;
    }

    const surveyUrl = `${siteUrl}/events/${event.slug ?? event.id}/survey`;
    const result = await mailer({
      subject: `How was ${event.title}?`,
      bodyText: surveyEmailBody(event.title, surveyUrl),
      eventTitle: event.title,
      recipients,
    });

    await client
      .from("events")
      .update({ survey_sent_count: result.sent })
      .eq("id", event.id);
    report.sent.push({
      eventId: event.id,
      title: event.title,
      recipients: result.sent,
      failed: result.failed,
    });
  }

  return report;
}
