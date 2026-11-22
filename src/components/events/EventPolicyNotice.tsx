"use client";

import {
  CHAPTER_MANAGER_EMAIL,
  CHAPTER_MANAGER_NAME,
  CHAPTER_MANAGER_WHATSAPP,
  CHAPTER_NAME,
} from "@/kernel/config/chapter";
import { useEffect, useRef, useState } from "react";

// ", <name>," when a manager name is configured, otherwise nothing.
const MANAGER_NAME = CHAPTER_MANAGER_NAME ? `, ${CHAPTER_MANAGER_NAME},` : "";
// " or WhatsApp +1..." when a WhatsApp number is configured.
const MANAGER_WHATSAPP = CHAPTER_MANAGER_WHATSAPP ? ` or WhatsApp ${CHAPTER_MANAGER_WHATSAPP}` : "";

type Props = {
  compact?: boolean;
  defaultOpen?: boolean;
  summary?: string;
  // When true, renders the policy without the collapsible <details> toggle: a
  // waiver the visitor hasn't opened can't have been scrolled through, so any
  // form gating acceptance on scroll progress must force it open.
  forceOpen?: boolean;
  // Fires once, the first time the content is scrolled to its end (and on
  // mount/resize if the content already fits without scrolling, so a short
  // waiver in a tall viewport never requires a phantom scroll). Forms use
  // this to gate their own acceptance checkbox.
  onScrolledToEnd?: () => void;
  // Overrides the standard USD$200 no-show fee for events with a different
  // policy (e.g. a higher fee for a limited-seat training). Late-cancellation
  // stays at the standard USD$100 regardless.
  noShowFeeUsd?: number;
  // For prepaid events whose payments are non-refundable (see
  // src/lib/event-fee-overrides.ts): replaces the late-cancellation and no-show
  // fee terms, which do not apply, with a plain non-refundable statement.
  nonRefundable?: boolean;
};

const SCROLL_END_THRESHOLD_PX = 4;

export function EventPolicyNotice({
  compact = false,
  defaultOpen = false,
  summary = "Review event waiver, cancellation, and no-show policy",
  forceOpen = false,
  onScrolledToEnd,
  noShowFeeUsd = 200,
  nonRefundable = false,
}: Props) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);

  function checkReachedEnd() {
    if (reachedEnd) return;
    const el = contentRef.current;
    if (!el) return;
    const atEnd =
      el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_END_THRESHOLD_PX;
    if (atEnd) {
      setReachedEnd(true);
      onScrolledToEnd?.();
    }
  }

  // Covers the "already fits without scrolling" case, and re-checks if the
  // viewport is resized before the visitor has scrolled.
  useEffect(() => {
    checkReachedEnd();
    window.addEventListener("resize", checkReachedEnd);
    return () => window.removeEventListener("resize", checkReachedEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const content = (
    <div
      className="rsvp-waiver__content"
      ref={contentRef}
      onScroll={checkReachedEnd}
    >
      <p className="rsvp-waiver__heading">Event Waiver</p>
      <p>
        By attending this {CHAPTER_NAME} event, I confirm that my participation is
        voluntary. I understand that in-person events may involve certain
        risks, including injury, illness, property loss, or other unexpected
        situations. I agree not to hold {CHAPTER_NAME}, Entrepreneurs&rsquo;
        Organization, event partners, sponsors, venue, vendors, staff,
        volunteers, or representatives responsible for any claims, loss,
        damage, injury, or illness related to my participation in the event.
        I understand that photos, videos, and recordings may be taken during
        the event and may be used by {CHAPTER_NAME} and Entrepreneurs&rsquo;
        Organization for communication, marketing, social media, and
        promotional purposes.
      </p>
      {nonRefundable ? (
        <>
          <p className="rsvp-waiver__heading">Cancellation and Refunds</p>
          <p>
            All payments for this event are non-refundable. If you can no
            longer attend, please let the Chapter Manager{MANAGER_NAME} know
            at {CHAPTER_MANAGER_EMAIL}{MANAGER_WHATSAPP}.
          </p>
        </>
      ) : (
        <>
          <p className="rsvp-waiver__heading">Cancellation and Late Fee</p>
          <p>
            <em>On-time cancellation:</em> Notify the Chapter
            Manager{MANAGER_NAME} at {CHAPTER_MANAGER_EMAIL}{MANAGER_WHATSAPP}{" "}
            at least 48 hours before the event start time. No charge.
          </p>
          <p>
            <em>Late cancellation fee:</em> Cancelling with less than 48
            hours&rsquo; notice, USD$100 per person. Not attending without
            notice (no-show), USD${noShowFeeUsd} per person.
          </p>
          <p>
            <em>Fee waiver applies only when</em> there is a death in the
            immediate family (spouse/partner, child, parent, sibling), or a
            medical emergency (involving the member, spouse/partner, or legal
            dependent) with a doctor&rsquo;s certification. Supporting
            documentation must be submitted within 1 week of the event date
            and approved by the Board/Chapter Manager before the fee is
            waived. No exceptions are made for personal or business reasons.
          </p>
          <p>
            <em>Public health situations:</em> The Board may apply the
            cancellation policy flexibly in the event of an official
            quarantine or health order.
          </p>
          <p>
            Repeated non-compliance with this cancellation policy may result
            in restricted access to future events.
          </p>
        </>
      )}
    </div>
  );

  if (forceOpen) {
    return <div className="rsvp-waiver__details is-open">{content}</div>;
  }

  return (
    <details
      className={`rsvp-waiver__details${compact ? " is-compact" : ""}`}
      open={defaultOpen}
    >
      <summary>{summary}</summary>
      {content}
    </details>
  );
}
