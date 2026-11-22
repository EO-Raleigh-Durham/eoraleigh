import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { EventForm } from "../EventForm";
import { RsvpSection } from "../RsvpSection";
import { AttendeePhotosSection } from "../AttendeePhotosSection";
import { MaterialsSection } from "../MaterialsSection";
import { FeedbackSection } from "../FeedbackSection";
import { TicketsSection } from "../TicketsSection";
import { VouchersSection } from "../VouchersSection";
import {
  getEventById,
  getMaterialsForEvent,
  getFeedbackForEvent,
  getTicketTypesForEvent,
  getEventVouchersForEvent,
  eventPath,
  eventScope,
  formatEventDate,
  eventTypeLabel,
  type EventRow,
} from "@/lib/events";
import {
  getBoardRegistrationsForEvent,
  getEventInviterCandidates,
} from "@/lib/board-event-registrations";
import {
  getGlobalEventParticipationPageData,
  type GlobalEventParticipant,
  type GlobalEventParticipationCandidate,
  type GlobalEventParticipationCounts,
} from "@/lib/global-event-participation";
import { canAssignGlobalParticipationStatus } from "@/lib/global-event-participation-policy";
import { isEmailConfigured } from "@/lib/email";
import { qrSvg } from "@/lib/tickets";
import { EventTabs, type TabKey } from "./EventTabs";
import { Overview, type EventStats } from "./Overview";
import { GlobalEventOverview } from "./GlobalEventOverview";
import { GlobalEventCohort } from "./GlobalEventCohort";
import { MessageParticipants, type SegmentKey } from "./MessageParticipants";
import {
  isConfirmedRegistration,
  isPaymentDueRegistration,
  isSpamRegistration,
  filterSpamLinkedFeedback,
} from "@/lib/event-registration-review";
import { activeRosterPeopleCount } from "@/lib/rsvp-roster";
import { summarizeFeedbackRatings } from "@/lib/event-feedback";
import { getEventFeedbackTrend } from "@/lib/event-metrics";
import { CHAPTER_DOMAIN, CHAPTER_NAME, CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

export const metadata = {
  title: "Manage event",
  description: `Manage one ${CHAPTER_NAME} event.`,
};
export const dynamic = "force-dynamic";

const hcmTimeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: CHAPTER_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

function formatEventTimeRange(startsAt: string, endsAt: string | null): string {
  const start = hcmTimeFmt.format(new Date(startsAt));
  if (!endsAt) return start;
  return `${start} - ${hcmTimeFmt.format(new Date(endsAt))}`;
}

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string; tab?: string }>;

export default async function ManageEventPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { saved, tab } = await searchParams;

  const event = await getEventById(id);
  if (!event) notFound();

  if (eventScope(event) === "global") {
    return renderGlobalEventPage(event, saved, tab);
  }

  return renderLocalEventPage(event, saved, tab);
}

function EventHeading({
  event,
  showPresent,
}: {
  event: EventRow;
  showPresent: boolean;
}) {
  const when = formatEventDate(event.starts_at, event.ends_at);
  const metaBits = [
    when.full,
    event.location,
    event.speaker ? `Speaker: ${event.speaker}` : null,
  ].filter(Boolean);

  return (
    <div className="admin-page-head admin-page-head--row">
      <div>
        <div className="admin-breadcrumb">
          <Link href="/board/events">Events</Link>
          <span>/</span>
          <span>{event.title}</span>
        </div>
        <div className="admin-eyebrow">{eventTypeLabel(event.type)} event</div>
        <h1 className="admin-page-title">{event.title}</h1>
        {metaBits.length > 0 && (
          <p className="admin-page-sub">{metaBits.join(" · ")}</p>
        )}
      </div>
      {showPresent && (
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href={`/board/events/${event.id}/present`}
            className="admin-btn admin-btn--ghost"
            target="_blank"
          >
            Present
          </Link>
        </div>
      )}
    </div>
  );
}

async function renderGlobalEventPage(
  event: EventRow,
  saved: string | undefined,
  tab: string | undefined,
) {
  const participationPromise = getGlobalEventParticipationPageData(event.id).then(
    (data) => ({ ok: true as const, data }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  const [materials, participationLoad] = await Promise.all([
    getMaterialsForEvent(event.id),
    participationPromise,
  ]);
  let participants: GlobalEventParticipant[] = [];
  let candidates: GlobalEventParticipationCandidate[] = [];
  let counts: GlobalEventParticipationCounts = { going: 0, attended: 0, total: 0 };
  let available = true;
  let loadError = false;

  if (participationLoad.ok) {
    available = participationLoad.data.available;
    if (participationLoad.data.available) {
      participants = participationLoad.data.participants;
      candidates = participationLoad.data.candidates;
      counts = participationLoad.data.counts;
    }
  } else {
    console.error("global event cohort page read failed", {
      error:
        participationLoad.error instanceof Error
          ? participationLoad.error.name
          : "unknown",
    });
    loadError = true;
  }

  const initialTab: TabKey =
    saved === "1"
      ? "settings"
      : (["overview", "people", "settings"].includes(tab ?? "")
          ? (tab as TabKey)
          : "overview");
  const panels: Partial<Record<TabKey, ReactNode>> = {
    overview: (
      <GlobalEventOverview
        event={event}
        participants={participants}
        counts={counts}
        available={available && !loadError}
      />
    ),
    people: (
      <GlobalEventCohort
        eventId={event.id}
        eventStartsAt={event.starts_at}
        canMarkAttended={canAssignGlobalParticipationStatus("attended", event.starts_at)}
        participants={participants}
        candidates={candidates}
        counts={counts}
        available={available}
        loadError={loadError}
      />
    ),
    settings: (
      <>
        <EventForm event={event} saved={saved === "1"} variant="global" />
        <MaterialsSection eventId={event.id} materials={materials} />
      </>
    ),
  };

  return (
    <div>
      <EventHeading event={event} showPresent={false} />
      <EventTabs
        variant="global"
        panels={panels}
        initialTab={initialTab}
        counts={{ people: counts.total }}
      />
    </div>
  );
}

async function renderLocalEventPage(
  event: EventRow,
  saved: string | undefined,
  tab: string | undefined,
) {
  const id = event.id;
  const [
    registrations,
    materials,
    feedback,
    tickets,
    vouchers,
    inviterCandidates,
    feedbackTrend,
  ] = await Promise.all([
    getBoardRegistrationsForEvent(id),
    getMaterialsForEvent(id),
    getFeedbackForEvent(id),
    getTicketTypesForEvent(id),
    getEventVouchersForEvent(id),
    getEventInviterCandidates(),
    getEventFeedbackTrend(event.starts_at),
  ]);

  const operationalRegistrations = registrations.filter((r) => !isSpamRegistration(r));
  const operationalFeedback = filterSpamLinkedFeedback(feedback, registrations);
  const registered = registrations
    .filter(isConfirmedRegistration)
    .reduce((sum, r) => sum + 1 + (r.guest_count ?? 0), 0);
  const checkedIn = operationalRegistrations
    .filter((r) => r.status === "attended")
    .reduce((sum, r) => sum + 1 + (r.guest_count ?? 0), 0);
  const waitlisted = operationalRegistrations.filter((r) => r.status === "waitlisted").length;
  const guests = registrations
    .filter(isConfirmedRegistration)
    .reduce((sum, r) => sum + (r.guest_count || 0), 0);
  const paid = operationalRegistrations.filter((r) => (r.amount_paid ?? 0) > 0).length;
  const revenueUsd = Math.round(
    operationalRegistrations.reduce((sum, r) => sum + (r.amount_paid ?? 0), 0) / 100,
  );
  const isPaidEvent =
    event.price_amount > 0 || tickets.some((ticket) => ticket.price_amount > 0) || paid > 0;
  const due = isPaidEvent
    ? operationalRegistrations.filter(isPaymentDueRegistration).length
    : 0;

  const feedbackRatings = summarizeFeedbackRatings(operationalFeedback);
  const primaryRating = feedbackRatings.eventValue.responses
    ? {
        label: "Avg event value",
        note: "attendee value rating",
        ...feedbackRatings.eventValue,
      }
    : {
        label: "Avg growth",
        note: "historical member growth rating",
        ...feedbackRatings.growth,
      };
  const stats: EventStats = {
    registered,
    capacity: event.capacity,
    checkedIn,
    waitlisted,
    guests,
    responses: operationalFeedback.length,
    avgFeedback: primaryRating.average,
    feedbackLabel: primaryRating.label,
    feedbackNote: primaryRating.note,
    revenueUsd,
    paid,
    due,
    isPaidEvent,
  };

  const byStatus = (statuses: string[]) =>
    operationalRegistrations.filter((registration) => statuses.includes(registration.status))
      .length;
  const segmentCounts: Record<SegmentKey, number> = {
    all: byStatus(["registered", "attended", "pending_payment", "waitlisted"]),
    registered: byStatus(["registered", "attended"]),
    checked_in: byStatus(["attended"]),
    no_show: byStatus(["no_show"]),
    waitlist: byStatus(["waitlisted"]),
  };
  const peopleCount = activeRosterPeopleCount(registrations);

  const h = await headers();
  const host = h.get("host") || CHAPTER_DOMAIN;
  const proto =
    h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const slug = event.slug ?? event.id;
  const registerUrl = `${origin}/events/${slug}`;
  const surveyUrl = `${origin}/events/${slug}/survey`;
  const surveyLive = event.survey_enabled && event.status !== "draft";
  const [registerSvg, surveySvg] = await Promise.all([
    qrSvg(registerUrl),
    surveyLive ? qrSvg(surveyUrl) : Promise.resolve(null),
  ]);

  const when = formatEventDate(event.starts_at, event.ends_at);
  const eventTime = formatEventTimeRange(event.starts_at, event.ends_at);
  const initialTab: TabKey =
    saved === "1"
      ? "settings"
      : (["overview", "people", "feedback", "messages", "settings"].includes(tab ?? "")
          ? (tab as TabKey)
          : "overview");
  const panels: Record<TabKey, ReactNode> = {
    overview: (
      <Overview
        event={event}
        stats={stats}
        registrations={operationalRegistrations}
        registerUrl={registerUrl}
        surveyUrl={surveyUrl}
        registerSvg={registerSvg}
        surveySvg={surveySvg}
        surveyLive={surveyLive}
      />
    ),
    people: (
      <>
        <RsvpSection
          eventId={event.id}
          capacity={event.capacity}
          eventPriceAmount={event.price_amount}
          eventCurrency={event.currency}
          guestPriceAmount={event.guest_price_amount ?? 0}
          registrations={registrations}
          tickets={tickets}
          inviterCandidates={inviterCandidates}
        />
        <AttendeePhotosSection registrations={registrations} />
      </>
    ),
    feedback: (
      <FeedbackSection
        feedback={operationalFeedback}
        trend={feedbackTrend}
        eventId={event.id}
        surveySentAt={event.survey_sent_at}
        surveySentCount={event.survey_sent_count}
      />
    ),
    messages: (
      <MessageParticipants
        eventId={event.id}
        eventTitle={event.title}
        eventDate={when.full}
        eventTime={eventTime}
        eventLocation={event.location}
        eventUrl={registerUrl}
        surveyUrl={surveyUrl}
        counts={segmentCounts}
        emailConfigured={isEmailConfigured()}
      />
    ),
    settings: (
      <>
        <EventForm event={event} saved={saved === "1"} />
        <TicketsSection eventId={event.id} tickets={tickets} />
        <VouchersSection
          eventId={event.id}
          publicEventPath={eventPath(event)}
          tickets={tickets}
          vouchers={vouchers}
        />
        <MaterialsSection eventId={event.id} materials={materials} />
      </>
    ),
  };

  return (
    <div>
      <EventHeading event={event} showPresent />
      <EventTabs
        panels={panels}
        initialTab={initialTab}
        counts={{ people: peopleCount, feedback: feedback.length }}
      />
    </div>
  );
}
