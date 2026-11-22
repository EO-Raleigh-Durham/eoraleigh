import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Logo } from "@/components/Logo";
import { EventPolicyNotice } from "@/components/events/EventPolicyNotice";
import { isNonRefundableEvent, noShowFeeForEvent } from "@/lib/event-fee-overrides";
import {
  getRegistrationByTicketCode,
  formatEventDate,
  eventTypeLabel,
  type RegistrationStatus,
} from "@/lib/events";
import { qrSvg, ticketUrl } from "@/lib/tickets";
import { CHAPTER_NAME, CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

export const dynamic = "force-dynamic";

// Tickets are personal links — keep them out of search engines.
export const metadata = {
  title: "Your ticket",
  robots: { index: false, follow: false },
};

type Params = Promise<{ code: string }>;

function requestTimestamp() {
  return Date.now();
}

const TZ = CHAPTER_TIME_ZONE;
const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
});

type StatusMeta = { label: string; cls: string };

const STATUS_META: Record<RegistrationStatus, StatusMeta> = {
  registered: { label: "Confirmed", cls: "is-confirmed" },
  attended: { label: "Checked in", cls: "is-attended" },
  pending_payment: { label: "Payment pending", cls: "is-pending" },
  waitlisted: { label: "Waitlisted", cls: "is-waitlisted" },
  cancelled: { label: "Cancelled", cls: "is-cancelled" },
  no_show: { label: "No show", cls: "is-cancelled" },
};

export default async function TicketPage({ params }: { params: Params }) {
  const { code } = await params;
  const reg = await getRegistrationByTicketCode(code);
  if (!reg || !reg.event || reg.review_classification === "spam") notFound();

  const ev = reg.event;
  const date = formatEventDate(ev.starts_at, ev.ends_at);
  const startTime = timeFmt.format(new Date(ev.starts_at));
  const endTime = ev.ends_at ? timeFmt.format(new Date(ev.ends_at)) : null;
  const status = STATUS_META[reg.status];

  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const svg = await qrSvg(ticketUrl(reg.ticket_code, origin));

  const isPast = new Date(ev.starts_at).getTime() < requestTimestamp();
  const showSurvey =
    isPast && ev.survey_enabled && (reg.status === "attended" || reg.status === "registered");
  // A QR is only a valid entry pass for a held seat.
  const passValid = reg.status === "registered" || reg.status === "attended";

  return (
    <div className="tkt-page">
      <div className="tkt-card">
        <div className="tkt-top">
          <Logo />
          <span className={`tkt-status ${status.cls}`}>{status.label}</span>
        </div>

        <div className="tkt-cat">{eventTypeLabel(ev.type)}</div>
        <h1 className="tkt-title">{ev.title}</h1>

        <div className="tkt-meta">
          <div className="tkt-meta-row">
            <span className="tkt-meta-label">When</span>
            <span className="tkt-meta-val">
              {date.full}
              {endTime ? ` · ${startTime}–${endTime}` : ` · ${startTime}`}
            </span>
          </div>
          {ev.location && (
            <div className="tkt-meta-row">
              <span className="tkt-meta-label">Where</span>
              <span className="tkt-meta-val">{ev.location}</span>
            </div>
          )}
          <div className="tkt-meta-row">
            <span className="tkt-meta-label">Attendee</span>
            <span className="tkt-meta-val">Registered attendee</span>
          </div>
          {reg.ticket_type?.name && (
            <div className="tkt-meta-row">
              <span className="tkt-meta-label">Ticket</span>
              <span className="tkt-meta-val">{reg.ticket_type.name}</span>
            </div>
          )}
          {reg.guest_count > 0 && (
            <div className="tkt-meta-row">
              <span className="tkt-meta-label">Guests</span>
              <span className="tkt-meta-val">+{reg.guest_count}</span>
            </div>
          )}
        </div>

        <div className="tkt-qr-wrap">
          <div
            className={`tkt-qr ${passValid ? "" : "tkt-qr--muted"}`}
            dangerouslySetInnerHTML={{ __html: svg }}
            aria-label="Ticket QR code"
          />
          <div className="tkt-code">{reg.ticket_code}</div>
          <p className="tkt-hint">
            {passValid
              ? "Show this QR at the door to check in"
              : reg.status === "pending_payment"
                ? "Your seat is held while payment completes"
                : reg.status === "waitlisted"
                  ? "We will email you if a seat opens up"
                  : "This ticket is not active"}
          </p>
        </div>

        <div className="tkt-policy rsvp-waiver">
          <div className="tkt-policy-status">
            <span
              className={`tkt-policy-badge${reg.waiver_accepted_at ? " is-accepted" : ""}`}
            >
              {reg.waiver_accepted_at
                ? "Policy accepted"
                : "Please confirm at check-in"}
            </span>
            <p>
              Event responsibility, photos and recordings, cancellation,
              and no-show terms apply.
            </p>
          </div>
          <EventPolicyNotice
            compact
            summary="Review the event responsibility policy"
            noShowFeeUsd={noShowFeeForEvent(ev)}
            nonRefundable={isNonRefundableEvent(ev)}
          />
        </div>

        {showSurvey && (
          <Link href={`/events/${ev.id}/survey`} className="tkt-survey-cta">
            Share your feedback on this event →
          </Link>
        )}
      </div>

      <p className="tkt-foot">{CHAPTER_NAME} · keep this link to access your ticket</p>
    </div>
  );
}
