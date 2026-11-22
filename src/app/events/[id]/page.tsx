import Link from "next/link";
import type { ComponentProps } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { Reveal } from "@/components/Reveal";
import { Logo } from "@/components/Logo";
import { RsvpForm } from "@/components/events/RsvpForm";
import { MyeoDinnerRsvp } from "@/components/events/MyeoDinnerRsvp";
import { MyeoDinnerMenu } from "@/components/events/MyeoDinnerMenu";
import { Rise4LandingPage } from "@/components/events/Rise4LandingPage";
import { RetreatGuideSection, RETREAT_EVENT_SLUG } from "@/components/events/RetreatGuideSection";
import "@/components/events/rise4-landing.css";
import { MyeoFamilyDayForm, MYEO_EVENT_URL } from "@/components/events/MyeoFamilyDayForm";
import { getSessionContact, getSessionUser } from "@/lib/auth";
import { MYEO_DINNER_SLUG } from "@/lib/myeo-dinner";
import {
  getEventBySlugOrId,
  getOccupiedSeatsForEvent,
  getSeatsForTicketType,
  getTicketTypesForEvent,
  getTicketCodeForCheckoutReturn,
  eventAudience,
  eventTypeLabel,
  eventPath,
  eventScope,
  formatEventDateFor,
  type EventRow,
} from "@/lib/events";
import { formatPrice } from "@/lib/stripe";
import { canView } from "@/lib/access";
import { DEFAULT_OG_IMAGE } from "@/app/layout";
import { createRsvpFormToken } from "@/lib/rsvp-anti-spam";
import { publicEventAvailability } from "@/lib/public-event-availability";
import {
  getActiveTeamRegistrationRate,
  getVoucherLandingTicketId,
} from "@/lib/event-team-invite-server";
import { BlockRenderer } from "@/components/blog/BlockRenderer";
import type { Block } from "@/lib/blog";
import { EVENT_RECAPS } from "@/content/event-recaps";
import { AI_ERA_QUOTES } from "@/content/event-landing-quotes";
import { getPostForEvent, type LinkedPost } from "@/lib/event-recap-link";
import { getEventRecapStats } from "@/lib/event-recap-stats-server";
import type { RecapStatsResult } from "@/lib/event-recap-stats";
import "@/components/blog/blog-blocks.css";
import { isEventDateTbc } from "@/lib/event-date-tbc";
import { InterestForm } from "../InterestForm";
import EventBlurb from "@/components/events/EventBlurb";
import { plainBlurb } from "@/lib/event-blurb";
import { CHAPTER_CITY, CHAPTER_MARKETING_EMAIL, CHAPTER_NAME, CHAPTER_SITE_URL, CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

const SITE_URL = CHAPTER_SITE_URL;
// This DB row backs the bespoke `/events/slp-forum-training-naeda-cheri`
// page (real RSVPs, fee override, etc). Its own slug/UUID must never render
// the generic template here (it's blank aside from speaker/date/time) —
// redirect both straight to the bespoke page instead.
const SLP_FORUM_TRAINING_EVENT_ID = "9f6db7c4-0121-47a1-86e1-931cb1c5982a";
const SLP_FORUM_TRAINING_DB_SLUG = "slp-forum-training-with-naeda-cheri";
const SLP_FORUM_TRAINING_BESPOKE_PATH = "/events/slp-forum-training-naeda-cheri";
const CHARLES_VOGL_EVENT_ID = "112d848e-4acc-4558-a812-a53a547e24ed";
const CHARLES_VOGL_EVENT_SLUG = "art-of-belonging-charles-vogl";
const CHARLES_VOGL_ASSET_BASE = "/images/events/art-of-belonging-charles-vogl";
const CHARLES_VOGL_IMAGES = {
  cover: `${CHARLES_VOGL_ASSET_BASE}/cover.png`,
  audience: `${CHARLES_VOGL_ASSET_BASE}/workshop-audience.jpg`,
  keynote: `${CHARLES_VOGL_ASSET_BASE}/charles-vogl-keynote.jpg`,
  headshot: `${CHARLES_VOGL_ASSET_BASE}/charles-vogl-headshot.png`,
  book: `${CHARLES_VOGL_ASSET_BASE}/art-of-community-cover.png`,
};

const EVENT_SEGMENT_OVERRIDES: Record<string, string> = {
  "building-unbreakable-teams": CHARLES_VOGL_EVENT_ID,
  [CHARLES_VOGL_EVENT_SLUG]: CHARLES_VOGL_EVENT_ID,
};

const CHARLES_VOGL_DESCRIPTION =
  "An intimate, interactive workshop for founders on building trust, belonging, and resilient relationships with teams, customers, partners, peers, and family.";

// "Leadership in the AI Era" reuses the bespoke `aie-*` design (already in
// globals.css) built for the earlier static AI-era landing page. Facts (date,
// location, cover) come from the DB event; the reused "proof" below (speaker,
// stats, testimonials, the ROI hook) is confirmed to still apply.
const LEADERSHIP_AI_ERA_SLUG = "leadership-ai-era-2026";
// MyEO Family Day (Sun 13 Sep 2026). The event still renders through this
// shared template; only the RSVP section swaps in `MyeoFamilyDayForm` so we
// can collect per-attendee ages, dietary needs, photo-with-consent for a
// personalized keepsake, and the mandatory MyEO handoff. Hero, About, and
// sidebar stay stock.
const MYEO_FAMILY_DAY_SLUG = "myeo-family-day";
const AI_ERA_IMAGES = {
  cover: "/images/events/aie-cover.png",
  speaker: "/images/events/aie-speaker.png",
};
const AI_ERA_TOPICS: { num: string; title: string; body: string }[] = [
  {
    num: "Day 01",
    title: "Leading Yourself",
    body: "Stay clear, decisive, and energised when everything around you is shifting. Sharpen how you make decisions and hold focus under constant change.",
  },
  {
    num: "Day 02",
    title: "Leading Others",
    body: "Bring your team and your company with you, not just your strategy. Align people, communicate change, and build leaders beneath you.",
  },
  {
    num: "Format",
    title: "Executive-MBA style",
    body: `Built with faculty from Georgetown's McDonough School of Business, delivered in ${CHAPTER_CITY}. Come for one day or both, and bring as many of your team as you like.`,
  },
];

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{
  paid?: string;
  cancelled?: string;
  rid?: string;
  session_id?: string;
  voucher?: string;
  ticket?: string;
  team?: string;
  invite?: string;
  rsvp_ticket?: string | string[];
}>;

function requestTimestamp() {
  return Date.now();
}

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const { event, viewable } = await getPublicEvent(id);
  if (!event || eventAudience(event) === "board") return { title: "Event not found" };
  if (!viewable) {
    return {
      title: `${event.title} · Members only`,
      description:
        `This event is reserved for ${CHAPTER_NAME} members. Join to unlock 20+ member events a year.`,
    };
  }
  const isCharlesVogl = isCharlesVoglEvent(event);
  const description = isCharlesVogl
    ? CHARLES_VOGL_DESCRIPTION
    : plainBlurb(event.blurb);
  // Always ship a share card: use the event's cover, fall back to the brand image.
  const image = isCharlesVogl
    ? CHARLES_VOGL_IMAGES.cover
    : event.cover_image_url ?? DEFAULT_OG_IMAGE;
  const url = canonicalEventPath(event);
  return {
    title: event.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: event.title,
      description,
      url,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: [image],
    },
  };
}

export default async function PublicEventDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const rise4Query = await searchParams;
  const rise4RawTicket = rise4Query.rsvp_ticket;
  const rise4TicketIntent = Array.isArray(rise4RawTicket)
    ? rise4RawTicket[0]
    : rise4RawTicket;
  const preferredRsvpTicket =
    rise4TicketIntent === "guest" || rise4TicketIntent === "member"
      ? rise4TicketIntent
      : undefined;
  const {
    paid,
    cancelled,
    rid,
    session_id: sessionId,
    voucher,
    ticket,
    team,
    invite,
  } = await searchParams;
  const { event, viewable } = await getPublicEvent(id);
  if (!event) notFound();

  // This event's own generic template is blank (speaker/date/time only) and
  // must never render publicly under any circumstance: not draft, not
  // cancelled, not with a ?voucher=/?team=/?paid=/?cancelled= query string
  // attached. Redirect unconditionally, before the lifecycle 404 check and
  // before the query-string-gated redirect below (which intentionally skips
  // for legitimate Stripe-return traffic on other events).
  if (isSlpForumTrainingEvent(event)) {
    permanentRedirect(SLP_FORUM_TRAINING_BESPOKE_PATH);
  }

  // Resolve a legitimate Stripe return before applying lifecycle visibility.
  // A board cancellation can race with an already-open checkout; a buyer who
  // completes that checkout must still reach the ticket Stripe sent them to.
  const paidTicketCode =
    paid === "1" && rid && sessionId
      ? await getTicketCodeForCheckoutReturn(event.id, rid, sessionId)
      : null;
  const paymentConfirmed = Boolean(paidTicketCode);

  // Hide drafts and cancelled events from public view.
  if (
    event.status === "draft" ||
    (event.status === "cancelled" && !paidTicketCode)
  ) notFound();

  // Legacy UUID URLs 301 to the friendly slug. Skip when checkout params are
  // present so the Stripe return trip is never interrupted.
  const canonicalPath = canonicalEventPath(event);
  if (id !== canonicalPath.split("/").pop() && !paid && !cancelled && !voucher && !team) {
    permanentRedirect(canonicalPath);
  }

  // Members-only events render a join pitch for non-member viewers instead of
  // a 404: the blog and listings advertise them as a membership benefit
  // (owner decision, 2026-07-24). Board-audience events remain hidden, drafts
  // and cancelled events were already filtered above, and no registration,
  // ticket, or availability data is loaded for the pitch.
  const isPast = new Date(event.starts_at).getTime() < requestTimestamp();

  if (!viewable) {
    if (eventAudience(event) === "board") notFound();
    // A published recap is public content even for a members-only event, so
    // the pitch carries it. Aggregate stats and a link to the write-up only:
    // still no registration, ticket, or availability data.
    const [pitchRecapStats, pitchLinkedPost] = await Promise.all([
      isPast ? getEventRecapStats(event.id) : Promise.resolve(null),
      getPostForEvent(event.id),
    ]);
    return (
      <MemberEventPitch
        event={event}
        recapStats={pitchRecapStats}
        linkedPost={pitchLinkedPost}
      />
    );
  }

  const initialVoucherCode = voucher?.slice(0, 64) ?? "";
  const [activeCount, tickets, memberContact, teamRate, voucherLandingTicketId] = await Promise.all([
    getOccupiedSeatsForEvent(event.id),
    getTicketTypesForEvent(event.id),
    getSessionContact(),
    getActiveTeamRegistrationRate(event.id),
    initialVoucherCode
      ? getVoucherLandingTicketId(event.id, initialVoucherCode)
      : Promise.resolve(null),
  ]);
  const activeTickets = tickets.filter((t) => t.active);
  const requestedTicketId = ticket?.slice(0, 64) ?? "";
  const teamTicket = activeTickets.find((candidate) => candidate.id === requestedTicketId);
  const teamRegistration =
    team === "1" && Boolean(voucher && invite && teamTicket);
  const initialTicketTypeId = teamRegistration
    ? teamTicket?.id
    : (voucherLandingTicketId ?? undefined);

  const ticketPrices = activeTickets.map((t) => t.price_amount);
  const priceDisplay = activeTickets.length > 0
    ? ticketPrices.every((p) => p === ticketPrices[0])
      ? formatPrice(ticketPrices[0], activeTickets[0].currency)
      : `${formatPrice(Math.min(...ticketPrices), activeTickets[0].currency)} to ${formatPrice(Math.max(...ticketPrices), activeTickets[0].currency)}`
    : formatPrice(event.price_amount, event.currency);
  const guestTicket = activeTickets.find((ticket) => ticket.price_amount > 0);

  const date = formatEventDateFor(event);
  const timeRange = formatEventTimeRange(event);
  const rsvpsOpen =
    !isPast && (event.status === "open" || event.status === "published");
  const antiSpamToken = rsvpsOpen ? createRsvpFormToken(event.id) : "";

  // Global (EO / regional) events are registered off-site. We never take an
  // internal RSVP for them: hide the form and surface the outbound CTA instead.
  const isGlobal = eventScope(event) === "global";

  // Prefer a published DB recap; otherwise fall back to a static recap keyed by
  // slug (companion blog posts condensed into recap voice). DB always wins.
  const dbRecap =
    event.recap_published && event.recap_blocks && event.recap_blocks.length > 0
      ? event.recap_blocks
      : null;
  const recapBlocks =
    dbRecap ?? (event.slug ? EVENT_RECAPS[event.slug] ?? null : null);

  // The blog post this event was written up in, if one is tagged to it. The
  // recap is the appetiser; the post is the meal.
  const linkedPost = await getPostForEvent(event.id);

  // Social proof for past events. Every stat can be suppressed, in which case
  // nothing renders: silence beats a wrong number on a public page.
  const recapStats = isPast ? await getEventRecapStats(event.id) : null;

  // No schema.org Event while the date is unconfirmed: it requires a startDate.
  const jsonLd = isEventDateTbc(event) ? null : buildEventJsonLd(event);
  const isCharlesVogl = isCharlesVoglEvent(event);
  const isAiEra = isLeadershipAiEraEvent(event);
  const isMyeoFamilyDay = isMyeoFamilyDayEvent(event);
  const isMyeoDinner = event.slug === MYEO_DINNER_SLUG;
  const isChapterRetreat = event.slug === RETREAT_EVENT_SLUG;
  const isRise4 =
    event.slug === "eo-rise-4" ||
    event.slug === "eo-rise-4-zero-to-200m" ||
    event.slug === "eo-rise-4-building-brands-that-become-lifestyles" ||
    event.title.toLowerCase().includes("rise 4");

  // Masterclass capacity is its own ticket type (086), not event.capacity:
  // the tasting is uncapped, so event.capacity would either be null (no cap
  // shown at all) or, if set, would wrongly cap the whole event instead of
  // just the Masterclass.
  const masterclassTicket = isMyeoFamilyDay
    ? (activeTickets.find((t) => t.name === "Chocolate-making Masterclass") ?? null)
    : null;
  const masterclassRegistered = masterclassTicket
    ? await getSeatsForTicketType(masterclassTicket.id)
    : 0;

  const rsvpFormProps: ComponentProps<typeof RsvpForm> = {
    eventId: event.id,
    eventType: event.type,
    eventTitle: event.title,
    eventSlug: event.slug,
    preferredTicket: isRise4 ? preferredRsvpTicket : undefined,
    antiSpamToken: antiSpamToken,
    capacity: event.capacity,
    registeredCount: activeCount,
    priceAmount: event.price_amount,
    currency: event.currency,
    tickets: activeTickets,
    collectAttendeeDetails: event.collect_attendee_details ?? false,
    allowGuests: event.allow_guests ?? false,
    maxGuestsPerMember: event.max_guests_per_member ?? null,
    guestPrice: event.guest_price_amount ?? 0,
    defaultName: memberContact?.name ?? null,
    defaultEmail: memberContact?.email ?? null,
    defaultPhone: memberContact?.phone ?? null,
    initialVoucherCode: initialVoucherCode,
    initialTicketTypeId: initialTicketTypeId,
    autoApplyInitialVoucher: teamRegistration || Boolean(voucherLandingTicketId),
    teamRegistration: teamRegistration,
    inviterTicketCode: teamRegistration ? invite?.slice(0, 64) : undefined,
    teamRateLabel: teamRate ? formatPrice(teamRate.discountedUnitAmount, teamRate.currency) : undefined,
  };

  return (
    <div className="event-detail-page">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {isRise4 ? (
        <Rise4LandingPage
          dateLabel={date.full}
          timeRange={timeRange}
          startsAt={event.starts_at}
          isPast={isPast}
          guestPriceDisplay={guestTicket
            ? formatPrice(guestTicket.price_amount, guestTicket.currency)
            : null}
          seatLimit={event.capacity ?? 50}
        />
      ) : isCharlesVogl ? (
        <>
          <CharlesVoglHero
            event={event}
            dateLabel={date.full}
            timeRange={timeRange}
            isPast={isPast}
          />
          <CharlesVoglEventSections
            event={event}
            activeCount={activeCount}
            guestPriceDisplay={guestTicket
              ? formatPrice(guestTicket.price_amount, guestTicket.currency)
              : priceDisplay}
          />
        </>
      ) : isAiEra ? (
        <div className="aie-page">
          <AiEraHero event={event} dateLabel={date.full} tbc={isEventDateTbc(event)} />
          <AiEraEventSections event={event} dateLabel={date.full} tbc={isEventDateTbc(event)} />
        </div>
      ) : (
        <>
          <DefaultEventHero event={event} dateLabel={date.full} isPast={isPast} />

          {/* COVER: the event photo, or a branded fallback so no event looks empty */}
          <EventCover event={event} dateLabel={date.full} />

          {/* ABOUT: the description, with the author's paragraph breaks preserved */}
          {event.blurb && (
            <section className="section section--tight">
              <div className="container container--narrow">
                <Reveal>
                  <span className="eyebrow eyebrow--accent">About this event</span>
                  <EventBlurb blurb={event.blurb} />
                </Reveal>
              </div>
            </section>
          )}

          {/* MENU: the dinner's seven courses, shown as their own section */}
          {isMyeoDinner && <MyeoDinnerMenu />}

          {/* GUIDE: the retreat landing page, linked from the event page while the trip is ahead */}
          {isChapterRetreat && !isPast && <RetreatGuideSection />}

          {/* Type/price/capacity only matter while the event can still be
              attended; past-event pages lead with the recap instead. */}
          {!isPast && (
            <section className="section">
              <div className="container container--narrow">
                <Reveal>
                  <EventMeta
                    event={event}
                    activeCount={activeCount}
                    priceDisplay={priceDisplay}
                    isGlobal={isGlobal}
                  />
                </Reveal>
              </div>
            </section>
          )}

        </>
      )}

      <EventRecapSections
        recapBlocks={recapBlocks}
        recapStats={recapStats}
        linkedPost={linkedPost}
      />

      {isGlobal ? (
        <section className="section section--alt">
          <div className="container container--narrow">
            <Reveal>
              <span className="eyebrow eyebrow--accent">Register</span>
              <h2
                className="display-3"
                style={{ marginTop: 12, marginBottom: 24 }}
              >
                {isPast ? "This event has passed" : "Sign up through EO"}
              </h2>
              {!isPast && event.cta_href ? (
                <>
                  <a
                    href={event.cta_href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--primary"
                    style={{ display: "inline-block" }}
                  >
                    {event.cta_label ?? "Register"} →
                  </a>
                  <p
                    className="lead"
                    style={{ color: "var(--text-muted)", marginTop: 16 }}
                  >
                    Registration for this event is handled by EO. Use the link
                    above to sign up.
                  </p>
                </>
              ) : (
                <p className="lead" style={{ color: "var(--text-muted)" }}>
                  {isPast
                    ? "This event has already happened."
                    : "Registration details are coming soon."}
                </p>
              )}
            </Reveal>
          </div>
        </section>
      ) : isAiEra && isEventDateTbc(event) ? null : (
      <section id="rsvp" className={`section section--alt${isCharlesVogl ? " cvb-rsvp" : isRise4 ? " r4-rsvp" : ""}`}>
        <div className="container container--narrow">
          <Reveal>
            <span className="eyebrow eyebrow--accent">RSVP</span>
            <h2 className="display-3" style={{ marginTop: 12, marginBottom: 24 }}>
              {paymentConfirmed
                ? "You are in"
                : rsvpsOpen
                  ? isCharlesVogl
                    ? "Reserve your place"
                    : isRise4
                      ? "Reserve your seat"
                      : "Reserve your spot"
                  : "RSVPs are closed"}
            </h2>
            {paymentConfirmed && (
              <div
                style={{
                  padding: 16,
                  background: "rgba(34,197,94,0.08)",
                  color: "#15803D",
                  borderRadius: 8,
                  marginBottom: 24,
                }}
              >
                <div style={{ marginBottom: paidTicketCode || isMyeoFamilyDay ? 14 : 0 }}>
                  Payment received and your seat is confirmed.
                </div>
                {/* Family Day's mandatory MyEO confirmation (step 2) applies
                    to every registrant, paid or free. Free (tasting-only)
                    registrants see this in MyeoFamilyDayForm's own success
                    state; a paid Masterclass registrant lands back here
                    instead, after Stripe, so the same requirement has to be
                    repeated in this shared banner or it would silently never
                    reach them. */}
                {isMyeoFamilyDay && (
                  <div style={{ marginBottom: 14 }}>
                    <strong>One more step: your spot is not booked until you confirm on MyEO.</strong>
                    <br />
                    <a
                      href={MYEO_EVENT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--primary"
                      style={{ display: "inline-block", marginTop: 10 }}
                    >
                      Confirm your spot on MyEO
                    </a>
                  </div>
                )}
                {paidTicketCode && (
                  <Link
                    href={`/t/${paidTicketCode}`}
                    className="btn btn--primary"
                    style={{ display: "inline-block" }}
                  >
                    View my ticket and QR code
                  </Link>
                )}
              </div>
            )}
            {cancelled === "1" && (
              <div
                style={{
                  padding: 16,
                  background: "rgba(234,179,8,0.10)",
                  color: "#854D0E",
                  borderRadius: 8,
                  marginBottom: 24,
                }}
              >
                Checkout cancelled. Your seat was not held. You can try RSVP again below.
              </div>
            )}
            {rsvpsOpen && !paymentConfirmed ? (
              isMyeoFamilyDay ? (
                // Family Day gets a bespoke form for per-attendee ages,
                // dietary needs, photo-with-consent for the door gift, and
                // the mandatory MyEO handoff (no waiver signed here).
                <MyeoFamilyDayForm
                  eventId={event.id}
                  antiSpamToken={antiSpamToken}
                  defaultName={memberContact?.name ?? null}
                  defaultEmail={memberContact?.email ?? null}
                  masterclassCapacity={masterclassTicket?.capacity ?? null}
                  masterclassRegistered={masterclassRegistered}
                />
              ) : (
                <>
                  {isRise4 && (
                    <p className="r4-photo-optout">
                      <strong style={{ fontWeight: 900 }}>Prefer not to be included in event photos, videos, or recordings? Please email {CHAPTER_MARKETING_EMAIL}, and we’ll make arrangements to accommodate your request.</strong>
                    </p>
                  )}
                  {isMyeoDinner ? (
                    <MyeoDinnerRsvp formProps={rsvpFormProps} />
                  ) : (
                    <RsvpForm {...rsvpFormProps} />
                  )}
              </>
              )
            ) : !rsvpsOpen ? (
              isPast ? (
                <div>
                  <p className="lead" style={{ color: "var(--text-muted)" }}>
                    This event has already happened.
                  </p>
                  {event.survey_enabled && (
                    <Link
                      href={`${eventPath(event)}/survey`}
                      className="btn btn--primary"
                      style={{ marginTop: 8, display: "inline-block" }}
                    >
                      Share your feedback
                    </Link>
                  )}
                </div>
              ) : (
                <p className="lead" style={{ color: "var(--text-muted)" }}>
                  RSVPs are not currently open. Check back soon.
                </p>
              )
            ) : null}
          </Reveal>
        </div>
      </section>
      )}
    </div>
  );
}

// Loads the event and whether the current viewer may see the full page.
// A members-only event is still returned for logged-out or non-member viewers
// (viewable: false) so the page can render a membership pitch instead of a
// 404 (owner decision, 2026-07-24). Board-audience events stay hidden.
async function getPublicEvent(
  segment: string,
): Promise<{ event: EventRow | null; viewable: boolean }> {
  const user = await getSessionUser();
  const event = await getEventBySlugOrId(EVENT_SEGMENT_OVERRIDES[segment] ?? segment);
  if (!event) return { event: null, viewable: false };
  return { event, viewable: canView(user?.role ?? null, eventAudience(event)) };
}

// Recap, stats and the teaser back to the write-up. Rendered for members and
// for the members-only pitch alike: a published recap is public content, and
// past events are how the chapter ranks. Everything here is either already
// public (the recap body) or aggregate (counts and averages, no names).
function EventRecapSections({
  recapBlocks,
  recapStats,
  linkedPost,
}: {
  recapBlocks: Block[] | null;
  recapStats: RecapStatsResult | null;
  linkedPost: LinkedPost | null;
}) {
  return (
    <>
      {recapStats && recapStats.stats.length > 0 && (
        <section className="section section--tight">
          <div className="container container--narrow">
            <Reveal>
              <span className="eyebrow eyebrow--accent">By the numbers</span>
              <ul className="event-stat-band">
                {recapStats.stats.map((stat) => (
                  <li key={stat.key} className={`event-stat event-stat--${stat.color}`}>
                    <span className="event-stat__value">{stat.value}</span>
                    <span className="event-stat__label">{stat.label}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      )}

      {recapBlocks && recapBlocks.length > 0 && (
        <section className="section">
          <div className="container container--narrow">
            <Reveal>
              <span className="eyebrow eyebrow--accent">Recap</span>
              <BlockRenderer blocks={recapBlocks} />
            </Reveal>
          </div>
        </section>
      )}

      {linkedPost && (
        <section className="section section--tight">
          <div className="container container--narrow">
            <Reveal>
              <div className="event-post-teaser">
                <p className="event-post-teaser__lead">
                  There is a lot more where this came from
                </p>
                <Link href={linkedPost.href} className="blog-cta-btn blog-cta-btn--primary">
                  For the full event gallery and learnings, click here
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}

// Membership ad shown to non-members on a members-only event. Shows just
// enough of the event to sell the benefit, never registration or pricing.
function MemberEventPitch({
  event,
  recapStats,
  linkedPost,
}: {
  event: EventRow;
  recapStats: RecapStatsResult | null;
  linkedPost: LinkedPost | null;
}) {
  // A published recap is public even here. The pitch still sells membership,
  // but a past event leads with what happened rather than a locked door.
  const recapBlocks =
    event.recap_published && event.recap_blocks && event.recap_blocks.length > 0
      ? event.recap_blocks
      : (event.slug ? EVENT_RECAPS[event.slug] ?? null : null);

  const date = formatEventDateFor(event);
  const metaLine = [eventTypeLabel(event.type), date.full, event.location]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="event-page">
      <section className="section section--hero">
        <div className="container container--text">
          <Reveal>
            <span className="eyebrow eyebrow--accent">Members only</span>
            <h1
              className="display-1"
              style={{ fontSize: "clamp(36px, 5vw, 64px)", marginTop: 16, marginBottom: 16 }}
            >
              {event.title}
            </h1>
            <div className="caption mono" style={{ color: "var(--text-muted)", marginBottom: 20 }}>
              {metaLine}
            </div>
            {event.blurb && (
              <p className="lead" style={{ color: "var(--text-muted)", maxWidth: 720 }}>
                {plainBlurb(event.blurb)}
              </p>
            )}
          </Reveal>
        </div>
      </section>

      <EventRecapSections
        recapBlocks={recapBlocks}
        recapStats={recapStats}
        linkedPost={linkedPost}
      />

      <section className="section section--dark">
        <div className="container container--text" style={{ textAlign: "center" }}>
          <Reveal>
            <span className="eyebrow eyebrow--on-dark">Membership</span>
            <h2 className="display-2" style={{ marginTop: 16, marginBottom: 24, color: "#fff" }}>
              This event is reserved for members
            </h2>
            <p
              className="lead"
              style={{
                color: "var(--text-on-dark-muted)",
                maxWidth: 580,
                margin: "0 auto 32px",
              }}
            >
              {CHAPTER_NAME} members get 20+ events a year: monthly learning days
              with world-class operators, Forum, the chapter retreat, and access
              to global EO programs in 61 countries.
            </p>
            <Link href="/join" className="btn btn--primary btn--lg">
              Join {CHAPTER_NAME}
            </Link>
            <p style={{ marginTop: 24 }}>
              <Link
                href={`/login?next=${eventPath(event)}`}
                style={{ color: "var(--text-on-dark-muted)" }}
              >
                Already a member? Log in
              </Link>
            </p>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

function isCharlesVoglEvent(event: Pick<EventRow, "id" | "slug">): boolean {
  return event.id === CHARLES_VOGL_EVENT_ID || event.slug === CHARLES_VOGL_EVENT_SLUG;
}

function isLeadershipAiEraEvent(event: Pick<EventRow, "slug">): boolean {
  return event.slug === LEADERSHIP_AI_ERA_SLUG;
}

function isMyeoFamilyDayEvent(event: Pick<EventRow, "slug">): boolean {
  return event.slug === MYEO_FAMILY_DAY_SLUG;
}

function isSlpForumTrainingEvent(event: Pick<EventRow, "id" | "slug">): boolean {
  return (
    event.id === SLP_FORUM_TRAINING_EVENT_ID ||
    event.slug === SLP_FORUM_TRAINING_DB_SLUG
  );
}

function canonicalEventPath(event: Pick<EventRow, "id" | "slug">): string {
  if (isCharlesVoglEvent(event)) return `/events/${CHARLES_VOGL_EVENT_SLUG}`;
  if (isSlpForumTrainingEvent(event)) return SLP_FORUM_TRAINING_BESPOKE_PATH;
  return eventPath(event);
}

const hcmTimeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: CHAPTER_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

function formatEventTimeRange(event: Pick<EventRow, "starts_at" | "ends_at">): string {
  const start = hcmTimeFmt.format(new Date(event.starts_at));
  if (!event.ends_at) return start;
  return `${start} - ${hcmTimeFmt.format(new Date(event.ends_at))}`;
}

function DefaultEventHero({
  event,
  dateLabel,
  isPast,
}: {
  event: EventRow;
  dateLabel: string;
  isPast: boolean;
}) {
  return (
    <section className="section section--hero section--dark events-hero">
      <div className="container container--narrow">
        <Reveal>
          <Link href="/events" className="eyebrow eyebrow--on-dark" style={{ textDecoration: "none" }}>
            ← All events
          </Link>
          <div
            className="caption mono"
            style={{ color: "var(--accent)", marginTop: 24, marginBottom: 16 }}
          >
            {dateLabel}
            {event.location ? ` · ${event.location}` : ""}
          </div>
          <h1
            className="display-1"
            style={{ marginBottom: 20, color: "#fff", fontSize: "clamp(36px, 5vw, 64px)" }}
          >
            {event.title}
          </h1>
          <div className="evd-hero-tags">
            <span className="evd-chip">{eventTypeLabel(event.type)}</span>
            {event.tag_label && (
              <span className="evd-chip evd-chip--ghost">{event.tag_label}</span>
            )}
            {isPast && <span className="evd-chip evd-chip--ghost">Past event</span>}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function EventMeta({
  event,
  activeCount,
  priceDisplay,
  isGlobal,
}: {
  event: EventRow;
  activeCount: number;
  priceDisplay: string;
  isGlobal: boolean;
}) {
  const availability = publicEventAvailability(event.capacity, activeCount);

  return (
    <div className="event-detail-meta">
      <div>
        <div className="caption text-faint">Type</div>
        <div className="event-detail-meta-val">{eventTypeLabel(event.type)}</div>
      </div>
      {event.speaker && (
        <div>
          <div className="caption text-faint">Speaker</div>
          <div className="event-detail-meta-val">{event.speaker}</div>
        </div>
      )}
      {event.location && (
        <div>
          <div className="caption text-faint">Location</div>
          <div className="event-detail-meta-val">{event.location}</div>
        </div>
      )}
      {availability && (
        <div>
          <div className="caption text-faint">Availability</div>
          <div className="event-detail-meta-val">{availability}</div>
        </div>
      )}
      {!isGlobal && (
        <div>
          <div className="caption text-faint">Price</div>
          <div className="event-detail-meta-val">
            {event.price_note || priceDisplay}
          </div>
        </div>
      )}
    </div>
  );
}

function CharlesVoglHero({
  event,
  dateLabel,
  timeRange,
  isPast,
}: {
  event: EventRow;
  dateLabel: string;
  timeRange: string;
  isPast: boolean;
}) {
  return (
    <section className="section section--hero section--dark cvb-hero">
      <div
        className="cvb-hero-media"
        style={{ backgroundImage: `url(${CHARLES_VOGL_IMAGES.audience})` }}
        aria-hidden="true"
      />
      <div className="container cvb-hero-inner">
        <Reveal className="cvb-hero-copy">
          <Link href="/events" className="eyebrow eyebrow--on-dark cvb-back">
            ← All events
          </Link>
          <div className="caption mono cvb-hero-date">
            {dateLabel}
            {event.location ? ` · ${event.location}` : ""}
          </div>
          <h1 className="display-1 cvb-hero-title">{event.title}</h1>
          <p className="lead cvb-hero-lead">
            A half-day workshop for founders on building trust, belonging, and
            resilient relationships with the people most important to their work
            and life.
          </p>
          <div className="cvb-hero-actions">
            {!isPast && (
              <a href="#rsvp" className="btn btn--primary btn--lg">
                Reserve your place
              </a>
            )}
            <a href="#learn" className="btn btn--ghost-on-dark btn--lg">
              What you will learn
            </a>
          </div>
          <div className="cvb-hero-facts">
            <div>
              <span className="caption mono">Time</span>
              <strong>{timeRange}</strong>
            </div>
            <div>
              <span className="caption mono">Format</span>
              <strong>Interactive workshop</strong>
            </div>
            {event.capacity && (
              <div>
                <span className="caption mono">Cohort</span>
                <strong>Limited to {event.capacity}</strong>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CharlesVoglEventSections({
  event,
  activeCount,
  guestPriceDisplay,
}: {
  event: EventRow;
  activeCount: number;
  guestPriceDisplay: string;
}) {
  const availability = publicEventAvailability(event.capacity, activeCount);

  return (
    <>
      <section className="section section--tight cvb-intro">
        <div className="container cvb-intro-grid">
          <Reveal>
            <span className="eyebrow eyebrow--accent">Why this matters</span>
            <h2 className="display-3 cvb-section-title">
              Networks are useful. Real community is stronger
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="cvb-intro-copy">
              <p>
                In a time of uncertainty and fragmentation, founders need more
                than a room full of contacts. They need communities of trust,
                mutual concern, and shared purpose.
              </p>
              <p>
                Charles Vogl will work with {CHAPTER_NAME} members on practical ways
                to design invitations, recognition moments, and intimate
                campfire experiences that create belonging and strengthen
                relationships that endure.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section section--alt cvb-speaker">
        <div className="container cvb-speaker-grid">
          <Reveal>
            <div className="cvb-speaker-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CHARLES_VOGL_IMAGES.headshot} alt="Charles Vogl" />
            </div>
          </Reveal>
          <Reveal delay={100}>
            <span className="eyebrow eyebrow--accent">About Charles</span>
            <h2 className="display-3 cvb-section-title">
              Author of The Art of Community
            </h2>
            <p className="lead cvb-speaker-lead">
              Charles Vogl is an adviser, speaker, and author whose work helps
              leaders build deep community, resilience, and connectedness.
            </p>
            <div className="cvb-proof-list">
              <span>Trusted by Google School for Leaders</span>
              <span>Founding member of Google Vitality Lab</span>
              <span>Work used by Airbnb, LinkedIn, Twitch, Amazon, Target, Dow, and the U.S. Army</span>
              <span>Yale M.Div. in spiritual traditions, ethics, and business</span>
            </div>
          </Reveal>
          <Reveal delay={160}>
            <div className="cvb-book">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CHARLES_VOGL_IMAGES.book} alt="The Art of Community book cover" />
              <div>
                <span className="caption mono">Pre-read</span>
                <strong>The Art of Community</strong>
                <a href="https://www.charlesvogl.com/books" target="_blank" rel="noopener noreferrer">
                  View the book
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="learn" className="section cvb-learn">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--accent">What you will learn</span>
            <h2 className="display-3 cvb-section-title">
              Practical tools for relationships that outlast the event
            </h2>
          </Reveal>
          <div className="cvb-learning-grid">
            {[
              ["Community vs audience", "Recognize the difference between a list of people and a group that carries mutual concern."],
              ["Intentional invitations", "Design invitations that make people feel seen, chosen, and ready to participate."],
              ["Campfire experiences", "Create small moments where people share enough truth to build meaningful trust."],
              ["Recognition rituals", "Use acknowledgment, symbols, and simple rituals to strengthen belonging."],
              ["Resilient relationships", "Protect critical relationships before stress, change, or emergencies test them."],
              ["Next actions", "Leave with specific moves you can use with your team, customers, peers, and family."],
            ].map(([title, body], index) => (
              <Reveal key={title} delay={index * 45}>
                <article className="cvb-learning-card">
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="workshop" className="section section--tight section--alt cvb-details">
        <div className="container cvb-details-grid">
          <Reveal>
            <span className="eyebrow eyebrow--accent">Workshop format</span>
            <h2 className="display-3 cvb-section-title">A working room, not a lecture</h2>
            <p className="lead text-muted">
              Attendance is capped at 50 to protect the quality of discussion,
              reflection, and small-group exercises. Come ready to apply the
              principles to real relationships.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="cvb-admission-card">
              <h3 className="eyebrow eyebrow--accent">Admission</h3>
              <div className="cvb-admission-grid">
                <div>
                  <span className="caption text-faint">EO members</span>
                  <strong>Included</strong>
                </div>
                <div>
                  <span className="caption text-faint">Guests</span>
                  <strong>{guestPriceDisplay}</strong>
                </div>
                {availability && (
                  <div>
                    <span className="caption text-faint">Availability</span>
                    <strong>{availability}</strong>
                  </div>
                )}
              </div>
              <a href="#rsvp" className="btn btn--primary">
                Reserve your place
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function AiEraHero({
  event,
  dateLabel,
  tbc,
}: {
  event: EventRow;
  dateLabel: string;
  tbc: boolean;
}) {
  return (
    <section className="aie-hero">
      <div className="aie-hero-geo" aria-hidden="true" />
      <div className="aie-hero-inner">
        <Link href="/events" className="aie-back-link">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All events
        </Link>

        <div className="aie-hero-date-pill">
          <span className="aie-hero-date-dot" aria-hidden="true" />
          {dateLabel}
          {event.location ? ` · ${event.location}` : ""}
        </div>

        <h1 className="aie-hero-title">
          Leadership in the
          <span className="aie-hero-title-accent"> AI Era</span>
        </h1>

        <p className="aie-hero-sub">
          Two full days that change how you lead, built for founders facing the AI
          era. An executive-MBA-style format with faculty from Georgetown&rsquo;s
          McDonough School of Business, delivered here in {CHAPTER_CITY}.
        </p>

        <div className="aie-hero-ctas">
          <a href={tbc ? "#interest" : "#rsvp"} className="aie-btn aie-btn--yellow">
            {tbc ? "Join the interest list" : "Reserve my spot"}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <div className="aie-hero-pricing-hint">
            $250 for EO members &nbsp;·&nbsp; $1,000 for non-members
          </div>
        </div>
      </div>
    </section>
  );
}

function AiEraEventSections({
  event,
  dateLabel,
  tbc,
}: {
  event: EventRow;
  dateLabel: string;
  tbc: boolean;
}) {
  return (
    <>
      {/* EVENT DETAILS STRIP */}
      <section className="aie-details-block">
        <div className="aie-details-inner">
          <div className="aie-detail-item">
            <svg className="aie-detail-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="4" width="14" height="14" rx="2" />
              <path d="M3 8h14M7 2v4M13 2v4" />
            </svg>
            <div>
              <div className="aie-detail-label">Date</div>
              <div className="aie-detail-value">{dateLabel}</div>
            </div>
          </div>
          <div className="aie-detail-divider" aria-hidden="true" />
          <div className="aie-detail-item">
            <svg className="aie-detail-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="10" cy="10" r="7" />
              <path d="M10 6v4l2.5 2.5" />
            </svg>
            <div>
              <div className="aie-detail-label">Format</div>
              <div className="aie-detail-value">Two full days</div>
              <div className="aie-detail-subvalue">Come for one day or both</div>
            </div>
          </div>
          <div className="aie-detail-divider" aria-hidden="true" />
          <div className="aie-detail-item">
            <svg className="aie-detail-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M10 2C6.686 2 4 4.686 4 8c0 4.5 6 10 6 10s6-5.5 6-10c0-3.314-2.686-6-6-6z" />
              <circle cx="10" cy="8" r="2" />
            </svg>
            <div>
              <div className="aie-detail-label">Venue</div>
              <div className="aie-detail-value">{event.location ?? CHAPTER_CITY}</div>
            </div>
          </div>
          <div className="aie-detail-divider" aria-hidden="true" />
          <div className="aie-detail-item">
            <svg className="aie-detail-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="10" cy="7" r="3" />
              <path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6" />
            </svg>
            <div>
              <div className="aie-detail-label">Faculty</div>
              <div className="aie-detail-value">Dr. Brooks Holtom</div>
              <div className="aie-detail-subvalue">Georgetown McDonough</div>
            </div>
          </div>
          <div className="aie-detail-divider" aria-hidden="true" />
          <div className="aie-detail-item">
            <svg className="aie-detail-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="2" y="6" width="16" height="10" rx="2" />
              <path d="M6 6V5a4 4 0 0 1 8 0v1" />
            </svg>
            <div>
              <div className="aie-detail-label">Ticket Price</div>
              <div className="aie-detail-value">$250 for EO members</div>
              <div className="aie-detail-subvalue">$1,000 non-members · +$500 per staff</div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="aie-stats-strip">
        <div className="aie-stats-inner">
          <div className="aie-stat">
            <span className="aie-stat-num">26,000+</span>
            <span className="aie-stat-label">Academic citations behind the framework</span>
          </div>
          <div className="aie-stat-divider" aria-hidden="true" />
          <div className="aie-stat">
            <span className="aie-stat-num">4.8 / 5</span>
            <span className="aie-stat-label">Average rating from past participants</span>
          </div>
          <div className="aie-stat-divider" aria-hidden="true" />
          <div className="aie-stat">
            <span className="aie-stat-num">Georgetown</span>
            <span className="aie-stat-label">University where the curriculum is now taught</span>
          </div>
        </div>
      </section>

      {/* COVER IMAGE */}
      <div className="aie-cover-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.cover_image_url ?? AI_ERA_IMAGES.cover}
          alt="Leadership in the AI Era, event cover"
          style={{ display: "block", width: "100%", maxWidth: 1100, height: "auto", margin: "0 auto" }}
        />
      </div>

      {/* PROBLEM / HOOK */}
      <section className="aie-hook-section">
        <div className="aie-hook-inner">
          <div className="aie-hook-stat">
            <span className="aie-hook-pct">95%</span>
            <span className="aie-hook-pct-label">of AI initiatives report no ROI</span>
          </div>
          <div className="aie-hook-body">
            <p className="aie-hook-headline">The problem is not the technology</p>
            <p className="aie-hook-text">
              Most organisations adopt AI tools without the leadership systems to
              absorb them. The result: wasted budget, confused teams, and founders
              still in every decision loop. These two days close the gaps that
              actually matter, leading yourself with clarity and leading others
              through change.
            </p>
            <a href={tbc ? "#interest" : "#rsvp"} className="aie-btn aie-btn--dark">
              {tbc ? "Register my interest" : "Reserve my spot"}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* WHAT YOU WILL LEARN */}
      <section className="aie-topics-section">
        <div className="aie-topics-inner">
          <div className="aie-topics-header">
            <span className="aie-label aie-label--light">What you will learn</span>
            <h2 className="aie-section-title aie-section-title--light">
              Two days.
              <br />
              Immediate results
            </h2>
          </div>
          <div className="aie-topics-grid">
            {AI_ERA_TOPICS.map((t) => (
              <div key={t.num} className="aie-topic-card">
                <span className="aie-topic-num">{t.num}</span>
                <h3 className="aie-topic-title">{t.title}</h3>
                <p className="aie-topic-body">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SPEAKER */}
      <section className="aie-speaker-section">
        <div className="aie-speaker-inner">
          <div className="aie-speaker-img-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={AI_ERA_IMAGES.speaker}
              alt="Dr. Brooks C. Holtom, Georgetown University"
              style={{ width: "100%", height: "auto", borderRadius: 12, display: "block" }}
            />
            <div className="aie-speaker-badge">
              <span className="aie-speaker-badge-line">Georgetown University</span>
              <span className="aie-speaker-badge-sub">McDonough School of Business</span>
            </div>
          </div>

          <div className="aie-speaker-body">
            <span className="aie-label">Your faculty</span>
            <h2 className="aie-section-title">
              Dr. Brooks
              <br />
              C. Holtom
            </h2>
            <p className="aie-speaker-bio">
              Former Senior Associate Dean at Georgetown University&rsquo;s
              McDonough School of Business. Dr. Holtom&rsquo;s research has produced
              over 26,000 academic citations. He has advised the World Bank, IMF,
              and Microsoft on leadership and organisational effectiveness.
            </p>
            <ul className="aie-speaker-creds">
              <li>26,000+ academic citations</li>
              <li>Advisor to World Bank, IMF, Microsoft</li>
              <li>Award-winning leadership scholar</li>
              <li>Curriculum adopted into Georgetown Executive MBA</li>
            </ul>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="aie-quotes-section">
        <div className="aie-quotes-inner">
          <span className="aie-label aie-label--light">What past participants say</span>
          <h2 className="aie-section-title aie-section-title--light" style={{ marginBottom: 48 }}>
            Rated 4.8 out of 5
          </h2>
          <div className="aie-quotes-grid">
            {AI_ERA_QUOTES.map((q) => (
              <blockquote key={q.name} className="aie-quote">
                <p className="aie-quote-text">&ldquo;{q.quote}&rdquo;</p>
                <footer className="aie-quote-footer">
                  <strong>{q.name}</strong>
                  <span>{q.role}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="aie-pricing-section">
        <div className="aie-pricing-inner">
          <div className="aie-pricing-header">
            <span className="aie-label">Pricing</span>
            <h2 className="aie-section-title">Simple and transparent</h2>
          </div>
          <div className="aie-pricing-grid">
            <div className="aie-price-card aie-price-card--free">
              <div className="aie-price-tag">$250</div>
              <div className="aie-price-who">{CHAPTER_NAME} Members</div>
              <p className="aie-price-note">
                Per member, for both days. Bring your team for $500 per staff
                member. Come for one day or both.
              </p>
              <a href={tbc ? "#interest" : "#rsvp"} className="aie-btn aie-btn--green">
                {tbc ? "Add my name" : "Register as member"}
              </a>
            </div>
            <div className="aie-price-card">
              <div className="aie-price-tag">$1,000</div>
              <div className="aie-price-who">Non-Members &amp; Guests</div>
              <p className="aie-price-note">
                Per person. Includes both days of sessions, materials, and
                resources.
              </p>
              <a href={tbc ? "#interest" : "#rsvp"} className="aie-btn aie-btn--outline">
                {tbc ? "Add my name" : "Register now"}
              </a>
            </div>
          </div>
        </div>
      </section>

      {tbc && (
        <section id="interest" className="aie-register-section">
          <div className="aie-register-inner">
            <div className="aie-register-header">
              <span className="aie-label aie-label--light">Interest list</span>
              <h2 className="aie-section-title aie-section-title--light">
                Leave your name and email
              </h2>
            </div>
            <div className="aie-register-form-wrap">
              <InterestForm />
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// The event photo when one is set, otherwise a branded gradient band so an
// image-less event still reads as designed rather than broken.
function EventCover({
  event,
  dateLabel,
}: {
  event: EventRow;
  dateLabel: string;
}) {
  return (
    <section className="section section--tight" style={{ paddingTop: 40 }}>
      <div className="container container--narrow">
        <Reveal>
          {event.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="evd-cover-img"
            />
          ) : (
            <div className="evd-cover-fallback">
              <Logo inverted />
              <span className="evd-cover-fallback-meta mono">{dateLabel}</span>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function buildEventJsonLd(event: EventRow) {
  const inPerson = !!event.location;
  const url = `${SITE_URL}${canonicalEventPath(event)}`;

  const statusMap: Record<string, string> = {
    open: "https://schema.org/EventScheduled",
    published: "https://schema.org/EventScheduled",
    closed: "https://schema.org/EventScheduled",
    completed: "https://schema.org/EventScheduled",
    cancelled: "https://schema.org/EventCancelled",
  };

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: plainBlurb(event.blurb),
    startDate: event.starts_at,
    endDate: event.ends_at ?? undefined,
    eventStatus: statusMap[event.status] ?? "https://schema.org/EventScheduled",
    eventAttendanceMode: inPerson
      ? "https://schema.org/OfflineEventAttendanceMode"
      : "https://schema.org/OnlineEventAttendanceMode",
    url,
    image: isCharlesVoglEvent(event)
      ? `${SITE_URL}${CHARLES_VOGL_IMAGES.cover}`
      : event.cover_image_url ?? undefined,
    organizer: {
      "@type": "Organization",
      name: CHAPTER_NAME,
      url: SITE_URL,
    },
    location: inPerson
      ? {
          "@type": "Place",
          name: event.location,
          address: event.location,
        }
      : {
          "@type": "VirtualLocation",
          url,
        },
  };

  if (event.price_amount > 0) {
    jsonLd.offers = {
      "@type": "Offer",
      price: (event.price_amount / 100).toFixed(2),
      priceCurrency: event.currency.toUpperCase(),
      url,
      availability: "https://schema.org/InStock",
    };
  }

  if (event.speaker) {
    jsonLd.performer = {
      "@type": "Person",
      name: event.speaker,
    };
  }

  return jsonLd;
}
