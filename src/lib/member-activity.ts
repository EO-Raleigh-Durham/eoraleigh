import { supabase } from "@/lib/supabase";
import { eventTypeLabel, type EventType } from "@/lib/events";
import { fyLabel, fyStartForDate } from "@/lib/event-metrics";
import { filterSpamLinkedFeedback } from "@/lib/event-registration-review";
import { getFeedbackRating } from "@/lib/event-feedback";
import { loadMemberEventAttendance } from "@/lib/member-event-attendance";

// ============================================================
// One member's events + surveys, grouped by fiscal year, for the
// admin member shelf. Loaded on demand (one member at a time) so the
// per-query result sets are small and need no pagination.
//
// "Attended" comes from the normalized server-only attendance source, which
// includes confirmed global cohort attendance without creating registrations.
// Its FY comes from the event's start date. Post-event surveys
// (event_feedback) bucket by their event's FY; chapter surveys
// (survey_responses, e.g. the Pulse) bucket by submission date.
// Server-only.
// ============================================================

export type ActivityEvent = {
  id: string; // event id
  title: string;
  startsAt: string;
  typeLabel: string;
};

export type SurveyAnswer = { label: string; value: string };

export type ActivitySurvey = {
  id: string;
  source: "post_event" | "chapter";
  sourceLabel: string;
  title: string;
  score: number | null; // main score, out of 5
  submittedAt: string;
  answers: SurveyAnswer[];
};

export type MemberActivityFy = {
  fyStart: number;
  label: string; // e.g. "FY2025/26"
  events: ActivityEvent[];
  surveys: ActivitySurvey[];
};

function yesNo(v: boolean | null): string | null {
  if (v == null) return null;
  return v ? "Yes" : "No";
}

export async function getMemberActivity(
  personId: string,
): Promise<MemberActivityFy[]> {
  if (!personId) return [];

  const [attendedRes, feedbackRes, responsesRes] = await Promise.all([
    loadMemberEventAttendance({ personIds: [personId] }),
    supabase
      .from("event_feedback")
      .select(
        "id, event_id, person_id, event_value_rating, rating_overall, rating_speaker, would_recommend, comments, loved_text, improve_text, created_at, person:people!event_feedback_person_id_fkey(email)",
      )
      .eq("person_id", personId),
    supabase
      .from("survey_responses")
      .select("id, survey_id, rating, comment, will_renew, submitted_at")
      .eq("person_id", personId),
  ]);
  if (feedbackRes.error)
    console.warn("getMemberActivity: feedback", feedbackRes.error.message);
  if (responsesRes.error)
    console.warn("getMemberActivity: responses", responsesRes.error.message);

  const attended = attendedRes;
  const rawFeedback = (feedbackRes.data ?? []) as unknown as {
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
    person: { email: string } | null;
  }[];
  const responses = (responsesRes.data ?? []) as {
    id: string;
    survey_id: string | null;
    rating: number | null;
    comment: string | null;
    will_renew: boolean | null;
    submitted_at: string;
  }[];

  // Resolve the events these rows reference, the survey names, and the
  // topic tags, each via a batched lookup (skipped when nothing to fetch).
  const feedbackEventIds = new Set<string>();
  for (const f of rawFeedback) if (f.event_id) feedbackEventIds.add(f.event_id);

  let feedback = rawFeedback;
  if (feedbackEventIds.size > 0) {
    const { data: registrations, error } = await supabase
      .from("event_registrations")
      .select("event_id, person_id, review_classification, person:people!event_registrations_person_id_fkey(email), attendees:event_registration_attendees(email)")
      .in("event_id", Array.from(feedbackEventIds));
    if (error) {
      console.warn("getMemberActivity: registration review", error.message);
      feedback = [];
    } else {
      feedback = filterSpamLinkedFeedback(
        rawFeedback,
        (registrations ?? []) as unknown as {
          event_id: string;
          person_id: string;
          review_classification: string;
          person: { email: string } | null;
          attendees: { email: string }[];
        }[],
      );
    }
  }
  const surveyIds = Array.from(
    new Set(responses.map((r) => r.survey_id).filter((id): id is string => !!id)),
  );
  const responseIds = responses.map((r) => r.id);

  const eventById = new Map<
    string,
    { title: string; startsAt: string; type: string }
  >();
  for (const row of attended) {
    eventById.set(row.event_id, {
      title: row.event_title,
      startsAt: row.event_starts_at,
      type: row.event_type,
    });
  }
  const unresolvedEventIds = [...feedbackEventIds].filter((id) => !eventById.has(id));
  if (unresolvedEventIds.length > 0) {
    const { data, error } = await supabase
      .from("events")
      .select("id, title, starts_at, type")
      .in("id", unresolvedEventIds);
    if (error) console.warn("getMemberActivity: events", error.message);
    for (const e of (data ?? []) as {
      id: string;
      title: string;
      starts_at: string;
      type: string;
    }[]) {
      eventById.set(e.id, {
        title: e.title,
        startsAt: e.starts_at,
        type: e.type,
      });
    }
  }

  const surveyNameById = new Map<string, string>();
  if (surveyIds.length > 0) {
    const { data, error } = await supabase
      .from("surveys")
      .select("id, name")
      .in("id", surveyIds);
    if (error) console.warn("getMemberActivity: surveys", error.message);
    for (const s of (data ?? []) as { id: string; name: string }[]) {
      surveyNameById.set(s.id, s.name);
    }
  }

  const topicsByResponse = new Map<string, string[]>();
  if (responseIds.length > 0) {
    const { data, error } = await supabase
      .from("survey_response_topics")
      .select("response_id, topic")
      .in("response_id", responseIds);
    if (error) console.warn("getMemberActivity: topics", error.message);
    for (const t of (data ?? []) as {
      response_id: string;
      topic: string;
    }[]) {
      const arr = topicsByResponse.get(t.response_id) ?? [];
      arr.push(t.topic);
      topicsByResponse.set(t.response_id, arr);
    }
  }

  const byFy = new Map<number, MemberActivityFy>();
  const fy = (start: number): MemberActivityFy => {
    let g = byFy.get(start);
    if (!g) {
      g = { fyStart: start, label: fyLabel(start), events: [], surveys: [] };
      byFy.set(start, g);
    }
    return g;
  };

  for (const r of attended) {
    const ev = eventById.get(r.event_id);
    if (!ev) continue;
    fy(fyStartForDate(ev.startsAt)).events.push({
      id: r.event_id,
      title: ev.title,
      startsAt: ev.startsAt,
      typeLabel: eventTypeLabel(ev.type as EventType),
    });
  }

  for (const f of feedback) {
    const ev = f.event_id ? eventById.get(f.event_id) : null;
    const startsAt = ev?.startsAt ?? f.created_at;
    const answers: SurveyAnswer[] = [];
    if (f.event_value_rating != null)
      answers.push({ label: "Event value", value: `${f.event_value_rating}/5` });
    if (f.rating_overall != null)
      answers.push({ label: "Historical growth rating", value: `${f.rating_overall}/5` });
    if (f.rating_speaker != null)
      answers.push({ label: "Speaker rating", value: `${f.rating_speaker}/5` });
    const rec = yesNo(f.would_recommend);
    if (rec) answers.push({ label: "Would recommend", value: rec });
    if (f.loved_text?.trim())
      answers.push({
        label: f.event_value_rating != null ? "Most valuable part" : "What they loved",
        value: f.loved_text.trim(),
      });
    if (f.improve_text?.trim())
      answers.push({ label: "What to improve", value: f.improve_text.trim() });
    if (f.comments?.trim())
      answers.push({ label: "Other comments", value: f.comments.trim() });
    fy(fyStartForDate(startsAt)).surveys.push({
      id: f.id,
      source: "post_event",
      sourceLabel: "Post-event",
      title: ev?.title ?? "Event survey",
      score: getFeedbackRating(f)?.value ?? null,
      submittedAt: startsAt,
      answers,
    });
  }

  for (const r of responses) {
    const answers: SurveyAnswer[] = [];
    if (r.rating != null)
      answers.push({ label: "Rating", value: `${r.rating}/5` });
    const renew = yesNo(r.will_renew);
    if (renew) answers.push({ label: "Will renew", value: renew });
    if (r.comment?.trim())
      answers.push({ label: "Comment", value: r.comment.trim() });
    const topics = topicsByResponse.get(r.id);
    if (topics?.length)
      answers.push({ label: "Topics", value: topics.join(", ") });
    fy(fyStartForDate(r.submitted_at)).surveys.push({
      id: r.id,
      source: "chapter",
      sourceLabel: "Chapter",
      title: r.survey_id
        ? surveyNameById.get(r.survey_id) ?? "Chapter survey"
        : "Chapter survey",
      score: r.rating,
      submittedAt: r.submitted_at,
      answers,
    });
  }

  const groups = Array.from(byFy.values());
  for (const g of groups) {
    g.events.sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    g.surveys.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }
  groups.sort((a, b) => b.fyStart - a.fyStart);
  return groups;
}
