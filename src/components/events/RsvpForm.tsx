"use client";

import { CHAPTER_NAME, CHAPTER_PHONE_PLACEHOLDER } from "@/kernel/config/chapter";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  previewEventVoucher,
  publicRsvp,
  type VoucherPreviewResult,
} from "@/app/board/events/actions";
import { RsvpSpamFields } from "@/components/events/RsvpSpamFields";
import { EventPolicyNotice } from "@/components/events/EventPolicyNotice";
import { isNonRefundableEvent, noShowFeeForEvent } from "@/lib/event-fee-overrides";
import { isValidPhoneNumber } from "@/lib/phone-validation";
import { getInitialTicketId } from "@/lib/rsvp-ticket-selection";
import {
  RISE4_REVENUE_SCALE_OPTIONS,
  RISE4_ROLE_OPTIONS,
  usesRise4GuestVetting,
  roleRequiresCompany,
  roleRequiresRevenueScale,
} from "@/lib/rise4-guest-vetting";
import type { EventTicketType } from "@/lib/events";
import {
  DINNER_ALLERGY_MAX,
  MYEO_DINNER_SLUG,
  dinnerAllergyNote,
  guestTicketNeedsInvitation,
  invitationCodeAllowed,
} from "@/lib/myeo-dinner";
import {
  buildGuestRegistrationNotes,
  REFERRAL_SOURCE_OPTIONS,
  type GuestRegistrationContext,
} from "@/lib/rsvp-guest-context";
import { readFirstTouch } from "@/lib/attribution-client";

type Props = {
  eventId: string;
  // The event's category and title, used only to look up the correct
  // no-show fee to display/enforce (see event-fee-overrides.ts).
  eventType?: string | null;
  eventTitle?: string | null;
  eventSlug?: string | null;
  antiSpamToken: string;
  capacity: number | null;
  registeredCount: number;
  priceAmount: number;
  currency: string;
  tickets: EventTicketType[];
  // Migration 069: when true, render the multi-attendee form (per-attendee
  // Full Name/Email/Phone/Company/Title/Dietary needs + waiver acceptance)
  // instead of the legacy single name/email/phone/guest_count fields. Every
  // event that does not opt in renders exactly as before.
  collectAttendeeDetails?: boolean;
  // Migration 072: when true, a member can add named guests to their own
  // registration on the simple RSVP path, each charged guestPrice (in cents),
  // up to maxGuestsPerMember (null = no cap).
  allowGuests?: boolean;
  maxGuestsPerMember?: number | null;
  guestPrice?: number;
  // Prefill for a signed-in member: their name/email/phone from their profile.
  // Null for logged-out visitors, so the form renders blank exactly as before.
  defaultName?: string | null;
  defaultEmail?: string | null;
  defaultPhone?: string | null;
  initialVoucherCode?: string;
  initialTicketTypeId?: string;
  preferredTicket?: "member" | "guest";
  // The page already chose the ticket for the registrant (MyEO dinner gate), so
  // show no picker. The chosen ticket still posts as ticket_type_id.
  hideTicketPicker?: boolean;
  autoApplyInitialVoucher?: boolean;
  teamRegistration?: boolean;
  inviterTicketCode?: string;
  teamRateLabel?: string;
};

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

const EMPTY_ATTENDEE: Attendee = {
  full_name: "",
  email: "",
  phone: "",
  company: "",
  title: "",
  food_allergy: "",
  role_in_company: "",
  revenue_scale: "",
};

// The chapter's free member ticket, e.g. "<chapter name> Member".
const MEMBER_TICKET_NAME = new RegExp(
  `^${CHAPTER_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} Member$`,
  "i",
);

const EMPTY_GUEST_CONTEXT: GuestRegistrationContext = {
  relationship: "",
  host_member: "",
  visiting_chapter: "",
  referral_source: "",
};

const GUEST_RELATIONSHIP_OPTIONS = [
  `Invited by an ${CHAPTER_NAME} member`,
  "Spouse or life partner of an EO member",
  "Visiting EO member from another chapter",
  "Other",
];

// RISE 4 is not open to SLPs (Chapter Manager, 6 Nov 2026).
const RISE4_GUEST_RELATIONSHIP_OPTIONS = GUEST_RELATIONSHIP_OPTIONS.filter(
  (option) => option !== "Spouse or life partner of an EO member",
);

function formatPriceLabel(amount: number, currency: string): string {
  if (amount <= 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function displayTicketName(ticket: EventTicketType): string {
  if (/^EO Guests, SLPs$/i.test(ticket.name)) return "Guest ticket";
  return ticket.name;
}

function displayTicketDescription(ticket: EventTicketType): string | null {
  if (MEMBER_TICKET_NAME.test(ticket.name)) {
    return `Included with ${CHAPTER_NAME} membership. One registration per member.`;
  }
  if (/^EO Guests, SLPs$/i.test(ticket.name)) {
    return ticket.max_attendees === 1
      ? "For non-member attendees, visiting EO members, and spouses or life partners. Please register each attendee separately."
      : "For non-member attendees, visiting EO members, and spouses or life partners. You may register multiple attendees in one signup.";
  }
  return ticket.description;
}

export function RsvpForm({
  eventId,
  eventType,
  eventTitle,
  eventSlug = "",
  antiSpamToken,
  capacity,
  registeredCount,
  priceAmount,
  currency,
  tickets,
  collectAttendeeDetails = false,
  allowGuests = false,
  maxGuestsPerMember = null,
  guestPrice = 0,
  defaultName = null,
  defaultEmail = null,
  defaultPhone = null,
  initialVoucherCode = "",
  initialTicketTypeId = "",
  preferredTicket,
  hideTicketPicker = false,
  autoApplyInitialVoucher = false,
  teamRegistration = false,
  inviterTicketCode = "",
  teamRateLabel,
}: Props) {
  const activeTickets = tickets.filter(
    (ticket) => ticket.active && (!teamRegistration || ticket.id === initialTicketTypeId),
  );
  const hasTickets = activeTickets.length > 0;
  const preferredTicketId =
    preferredTicket === "guest"
      ? (
          activeTickets.find((ticket) => /^guest$/i.test(ticket.name)) ??
          activeTickets.find((ticket) => ticket.price_amount > 0)
        )?.id
      : preferredTicket === "member"
        ? (
            activeTickets.find((ticket) => MEMBER_TICKET_NAME.test(ticket.name)) ??
            activeTickets.find((ticket) => ticket.price_amount <= 0)
          )?.id
        : undefined;

  const [selectedTicketId, setSelectedTicketId] = useState<string>(
    getInitialTicketId({
      tickets: activeTickets,
      preferredTicketId,
      initialTicketTypeId,
    }),
  );
  // With two or more tickets nothing is preselected, so the details, waiver and
  // submit button wait until the registrant has chosen member or guest.
  const awaitingTicket = hasTickets && !selectedTicketId;
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState<
    null | { kind: "registered" | "waitlisted"; ticketUrl?: string }
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([
    {
      ...EMPTY_ATTENDEE,
      full_name: teamRegistration ? "" : (defaultName ?? ""),
      email: teamRegistration ? "" : (defaultEmail ?? ""),
      phone: teamRegistration ? "" : (defaultPhone ?? ""),
    },
  ]);
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [simpleGuestCount, setSimpleGuestCount] = useState(0);
  const [dinnerAllergy, setDinnerAllergy] = useState("");
  const asksDinnerAllergy = eventSlug === MYEO_DINNER_SLUG;
  const [simpleEmail, setSimpleEmail] = useState(teamRegistration ? "" : (defaultEmail ?? ""));
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [hasScrolledWaiver, setHasScrolledWaiver] = useState(false);
  const [guestContext, setGuestContext] = useState<GuestRegistrationContext>({
    ...EMPTY_GUEST_CONTEXT,
  });
  const errorRef = useRef<HTMLDivElement | null>(null);
  const voucherInputRef = useRef<HTMLInputElement | null>(null);
  const voucherRequestRef = useRef(0);
  const [voucherCode, setVoucherCode] = useState(initialVoucherCode.toUpperCase());
  const [voucherPreview, setVoucherPreview] = useState<{
    key: string;
    result: VoucherPreviewResult;
  } | null>(null);
  const [voucherApplying, setVoucherApplying] = useState(false);

  const remaining = capacity !== null ? Math.max(0, capacity - registeredCount) : null;
  const willWaitlist = capacity !== null && remaining === 0;

  const selectedTicket = activeTickets.find((t) => t.id === selectedTicketId);
  const effectivePrice = hasTickets
    ? (selectedTicket?.price_amount ?? 0)
    : priceAmount;
  const effectiveCurrency = hasTickets
    ? (selectedTicket?.currency ?? currency)
    : currency;
  const isMemberTicket =
    collectAttendeeDetails &&
    !!selectedTicket &&
    selectedTicket.max_attendees === 1 &&
    effectivePrice <= 0;
  // True for RISE 4: its guests are qualified with the role, company and
  // connection questions. The MyEO dinner guests are not.
  const isRise4Event = usesRise4GuestVetting({ slug: eventSlug, title: eventTitle });
  const isRise4GuestVetting =
    isRise4Event &&
    !!selectedTicket &&
    /^guest$/i.test((selectedTicket.name ?? "").trim());
  const isGuestTicket =
    (collectAttendeeDetails || isRise4GuestVetting) &&
    !!selectedTicket &&
    !isMemberTicket;
  const isLegacyGuestTicket =
    !collectAttendeeDetails && /^guest$/i.test((selectedTicket?.name ?? "").trim());

  const maxAttendees = collectAttendeeDetails
    ? (selectedTicket?.max_attendees ?? null)
    : null;
  const canAddAttendee =
    collectAttendeeDetails &&
    !isMemberTicket &&
    maxAttendees !== 1 &&
    (maxAttendees === null || attendees.length < maxAttendees);

  // Member-brings-guests. Two mutually exclusive entry points:
  //  - simple path: the event has no ticket tiers and allow_guests is on;
  //    guests are priced by the event's guest_price_amount.
  //  - ticket path: a free "member" ticket is selected and a paid "guest"
  //    ticket also exists; guests are priced by that guest ticket, so a member
  //    can add guests to their own free registration without switching tickets.
  const memberGuestMode = allowGuests && !collectAttendeeDetails && !hasTickets;
  // A designated team rate intentionally replaces this mixed-ticket shortcut.
  // Vouchers price one selected ticket, so members confirm their own free seat
  // first and use the emailed team link for every discounted colleague.
  const guestTicketForMember =
    isMemberTicket && activeTickets.length === 2 && !teamRateLabel
      ? (activeTickets.find((t) => t.id !== selectedTicketId && t.price_amount > 0) ?? null)
      : null;
  const guestsEnabled = memberGuestMode || !!guestTicketForMember;
  const effectiveGuestPrice = guestTicketForMember
    ? guestTicketForMember.price_amount
    : guestPrice;
  const effectiveGuestCap = guestTicketForMember
    ? guestTicketForMember.max_attendees
    : maxGuestsPerMember;
  const canAddGuest =
    guestsEnabled &&
    (effectiveGuestCap == null || guestNames.length < effectiveGuestCap);
  const guestSubtotal = guestsEnabled ? guestNames.length * effectiveGuestPrice : 0;

  const ticketQuantity = collectAttendeeDetails
    ? attendees.length
    : hasTickets && !guestsEnabled
      ? 1 + simpleGuestCount
      : 1;
  const totalAttendees = ticketQuantity + (guestsEnabled ? guestNames.length : 0);
  const chargeTotal = effectivePrice * ticketQuantity + guestSubtotal;
  const voucherQuantity = ticketQuantity;
  const voucherEmail = (collectAttendeeDetails
    ? attendees[0]?.email
    : simpleEmail
  )?.trim().toLowerCase() ?? "";
  const voucherInputKey = [
    voucherCode.trim().toUpperCase(),
    selectedTicketId,
    voucherQuantity,
    voucherEmail,
  ].join("|");
  const voucherResult = voucherPreview?.result ?? null;
  const voucherStale = voucherPreview?.key !== voucherInputKey;
  const appliedVoucher = voucherResult?.ok && !voucherStale ? voucherResult : null;
  const appliedVoucherNeedsRefresh = voucherResult?.ok === true && voucherStale;
  const payableTotal = appliedVoucher?.finalTotal ?? chargeTotal;
  const payableIsPaid = payableTotal > 0;
  const payableLabel = formatPriceLabel(payableTotal, effectiveCurrency);
  // A voucher can only discount a paid ticket. On a free (member) ticket there
  // is nothing to discount, so hide the code field rather than let a member
  // apply a code and hit a "does not apply" error that looks like a breakage.
  // The dinner shows the invitation code box on the Guest ticket only.
  const voucherApplies =
    hasTickets && effectivePrice > 0 && invitationCodeAllowed(eventSlug, selectedTicket?.name);
  // Dinner guests register only with an invitation code.
  const needsInviteCode = guestTicketNeedsInvitation(eventSlug, selectedTicket?.name);

  async function applyVoucher() {
    const code = voucherCode.trim();
    if (!code) {
      setVoucherPreview({ key: voucherInputKey, result: { ok: false, error: "Enter an invitation code." } });
      voucherInputRef.current?.focus();
      return;
    }
    if (!selectedTicketId) {
      setVoucherPreview({ key: voucherInputKey, result: { ok: false, error: "Choose a ticket before applying a voucher." } });
      return;
    }
    const requestId = ++voucherRequestRef.current;
    const requestKey = voucherInputKey;
    setVoucherApplying(true);
    const result = await previewEventVoucher(
      eventId,
      selectedTicketId,
      code,
      voucherQuantity,
      voucherEmail || undefined,
    );
    if (requestId !== voucherRequestRef.current) return;
    setVoucherApplying(false);
    setVoucherPreview({ key: requestKey, result });
    if (result.ok) setVoucherCode(result.code);
  }

  useEffect(() => {
    if (
      !autoApplyInitialVoucher ||
      !initialVoucherCode ||
      !initialTicketTypeId ||
      selectedTicketId !== initialTicketTypeId ||
      voucherCode.trim().toUpperCase() !== initialVoucherCode.trim().toUpperCase()
    ) return;
    const requestId = ++voucherRequestRef.current;
    const requestKey = voucherInputKey;
    const timer = window.setTimeout(async () => {
      setVoucherApplying(true);
      const result = await previewEventVoucher(
        eventId,
        selectedTicketId,
        initialVoucherCode,
        voucherQuantity,
        voucherEmail || undefined,
      );
      if (requestId !== voucherRequestRef.current) return;
      setVoucherApplying(false);
      setVoucherPreview({ key: requestKey, result });
      if (result.ok) setVoucherCode(result.code);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    eventId,
    autoApplyInitialVoucher,
    initialVoucherCode,
    initialTicketTypeId,
    selectedTicketId,
    voucherCode,
    voucherEmail,
    voucherInputKey,
    voucherQuantity,
  ]);

  // Shared "add guests by name" block, rendered on both the simple path and
  // under a member ticket. Renders nothing when guests are not enabled.
  const guestSection = guestsEnabled ? (
    <fieldset className="rsvp-attendee-block">
      <legend className="rsvp-label">
        Guests
        {effectiveGuestPrice > 0
          ? ` (${formatPriceLabel(effectiveGuestPrice, effectiveCurrency)} each)`
          : ""}
      </legend>
      {guestNames.length === 0 && (
        <p className="rsvp-help">Bringing someone? Add their name below.</p>
      )}
      {guestNames.map((g, i) => (
        <div key={i} className="rsvp-field" style={{ marginBottom: 8 }}>
          <span className="rsvp-label">Guest {i + 1}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              required
              placeholder="Full name"
              value={g}
              onChange={(e) => updateGuest(i, e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => removeGuest(i)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      {canAddGuest && (
        <button
          type="button"
          className="btn btn--ghost"
          onClick={addGuest}
          style={{ marginTop: 4 }}
        >
          + Add guest
        </button>
      )}
      <input type="hidden" name="guest_names" value={JSON.stringify(guestNames)} />
    </fieldset>
  ) : null;

  function selectTicket(id: string) {
    setSelectedTicketId(id);
    setError(null);
    const next = activeTickets.find((t) => t.id === id);
    if (next?.max_attendees === 1) setSimpleGuestCount(0);
    if (collectAttendeeDetails && next?.max_attendees === 1 && attendees.length > 1) {
      setAttendees((prev) => [prev[0]]);
    }
  }

  function updateAttendee(index: number, field: keyof Attendee, value: string) {
    setAttendees((prev) =>
      prev.map((a, i) => {
        if (i !== index) return a;
        const next = { ...a, [field]: value };
        if (field === "role_in_company") {
          if (!roleRequiresRevenueScale(value)) next.revenue_scale = "";
          if (!roleRequiresCompany(value)) next.company = "";
        }
        return next;
      }),
    );
  }

  function addAttendee() {
    setAttendees((prev) => [...prev, { ...EMPTY_ATTENDEE }]);
  }

  function removeAttendee(index: number) {
    setAttendees((prev) => prev.filter((_, i) => i !== index));
  }

  function updateGuest(index: number, value: string) {
    setGuestNames((prev) => prev.map((g, i) => (i === index ? value : g)));
  }

  function addGuest() {
    setGuestNames((prev) => [...prev, ""]);
  }

  function removeGuest(index: number) {
    setGuestNames((prev) => prev.filter((_, i) => i !== index));
  }

  const attendeesJson = useMemo(() => JSON.stringify(attendees), [attendees]);
  const guestContextNotes = isGuestTicket
    ? buildGuestRegistrationNotes(guestContext)
    : "";

  useEffect(() => {
    if (!error) return;
    errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => errorRef.current?.focus(), 150);
  }, [error]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // First-touch marketing attribution (UTM + referrer captured on landing
    // by AttributionCapture). Sent for every ticket type; the server coerces
    // it and stores it best-effort on the registration.
    const firstTouch = readFirstTouch();
    if (firstTouch) {
      formData.set("attribution", JSON.stringify(firstTouch));
    }
    setError(null);
    if (!waiverAccepted) {
      setError("Please accept the event waiver, cancellation, and no-show policy.");
      return;
    }
    if (isLegacyGuestTicket) {
      const phone =
        isGuestTicket && (collectAttendeeDetails || isRise4GuestVetting)
          ? (attendees[0]?.phone ?? "")
          : String(formData.get("phone") ?? "");
      if (!isValidPhoneNumber(phone)) {
        setError(phone.trim() ? "Please enter a valid phone number." : "Please enter a phone number.");
        return;
      }
    }
    startTransition(async () => {
      const res = await publicRsvp(eventId, formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setSubmitted({
        kind: res.waitlisted ? "waitlisted" : "registered",
        ticketUrl: res.ticketUrl,
      });
    });
  }

  if (submitted) {
    const isWait = submitted.kind === "waitlisted";
    return (
      <div className="rsvp-success">
        <h3 style={{ margin: 0, marginBottom: 8 }}>
          {isWait ? "You are on the waitlist" : "You are in"}
        </h3>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          {isWait
            ? "The event is full. We will let you know if a seat opens up."
            : "We have your RSVP. Open your ticket below to see your QR code, and save the link to find it again."}
        </p>
        {submitted.ticketUrl && (
          <a
            href={submitted.ticketUrl}
            className="btn btn--primary"
            style={{ marginTop: 16, display: "inline-block" }}
          >
            {isWait ? "View my waitlist status" : "View my ticket and QR code"}
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rsvp-form">
      <RsvpSpamFields token={antiSpamToken} />
      <input type="hidden" name="voucher_code" value={appliedVoucher?.code ?? ""} />
      {teamRegistration && inviterTicketCode && (
        <input type="hidden" name="inviter_ticket_code" value={inviterTicketCode} />
      )}
      {teamRegistration && (
        <div className="rsvp-voucher__summary" style={{ marginBottom: 20 }}>
          <p><strong>Team registration</strong></p>
          <p>Add one or more colleagues below. The team voucher applies to every attendee in this registration.</p>
        </div>
      )}
      {error && (
        <div
          ref={errorRef}
          className="rsvp-error"
          role="alert"
          tabIndex={-1}
        >
          {error}
        </div>
      )}
      {willWaitlist && (
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
          This event is full. RSVPing now puts you on the waitlist.
        </p>
      )}

      {appliedVoucher && (
        <div className="rsvp-voucher-offer" role="status" aria-live="polite">
          <div className="rsvp-voucher-offer__message">
            <strong>{appliedVoucher.code} applied</strong>
            <span>
              You save {formatPriceLabel(appliedVoucher.discountTotal, appliedVoucher.currency)}.
            </span>
          </div>
          <div className="rsvp-voucher-offer__price">
            <strong>{formatPriceLabel(appliedVoucher.finalTotal, appliedVoucher.currency)}</strong>
            <span>{appliedVoucher.quantity > 1 ? `${appliedVoucher.quantity} attendees total` : "total"}</span>
          </div>
        </div>
      )}

      {hasTickets && hideTicketPicker && selectedTicketId && (
        <input type="hidden" name="ticket_type_id" value={selectedTicketId} />
      )}
      {hasTickets && !(hideTicketPicker && selectedTicketId) && (
        <fieldset className="rsvp-ticket-picker">
          <legend className="rsvp-label">Ticket</legend>
          <div className="rsvp-ticket-list">
            {activeTickets.map((t) => {
              const description = displayTicketDescription(t);
              const ticketVoucher =
                selectedTicketId === t.id ? appliedVoucher : null;
              return (
                <label
                  key={t.id}
                  className={`rsvp-ticket-option${selectedTicketId === t.id ? " rsvp-ticket-option--selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="ticket_type_id"
                    value={t.id}
                    required
                    checked={selectedTicketId === t.id}
                    onChange={() => selectTicket(t.id)}
                  />
                  <span className="rsvp-ticket-body">
                    <span className="rsvp-ticket-name">{displayTicketName(t)}</span>
                    {description && (
                      <span className="rsvp-ticket-desc">{description}</span>
                    )}
                  </span>
                  {ticketVoucher ? (
                    <span
                      className="rsvp-ticket-price rsvp-ticket-price--discounted"
                      aria-label={`Discounted price ${formatPriceLabel(ticketVoucher.finalTotal, ticketVoucher.currency)}, reduced from ${formatPriceLabel(ticketVoucher.baseTotal, ticketVoucher.currency)}`}
                    >
                      <s>{formatPriceLabel(ticketVoucher.baseTotal, ticketVoucher.currency)}</s>
                      <strong>{formatPriceLabel(ticketVoucher.finalTotal, ticketVoucher.currency)}</strong>
                    </span>
                  ) : (
                    <span className="rsvp-ticket-price">
                      {t.price_amount <= 0 && MEMBER_TICKET_NAME.test(t.name)
                        ? "Included"
                        : formatPriceLabel(t.price_amount, t.currency)}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      {!teamRegistration && teamRateLabel && isMemberTicket && (
        <p className="rsvp-voucher__notice">
          Register yourself first. Your confirmation email will include a link to add colleagues at {teamRateLabel} each.
        </p>
      )}
      {!teamRegistration && teamRateLabel && isGuestTicket && (
        <p className="rsvp-voucher__notice">
          Need more seats? Add colleagues after registration for {teamRateLabel} each.
        </p>
      )}

      {awaitingTicket ? (
        <p role="status" style={{ color: "var(--text-muted)", margin: "4px 0 0" }}>
          Choose your ticket above to continue.
        </p>
      ) : (
      <>
      {collectAttendeeDetails || isRise4GuestVetting ? (
        <>
          <input type="hidden" name="attendees" value={attendeesJson} />
          {guestContextNotes && (
            <input type="hidden" name="notes" value={guestContextNotes} />
          )}
          <input
            type="hidden"
            name="guest_context"
            value={isGuestTicket && isRise4GuestVetting ? JSON.stringify(guestContext) : ""}
          />
          {attendees.map((a, i) => (
            <fieldset key={i} className="rsvp-attendee-block">
              <legend className="rsvp-label">
                {isMemberTicket
                  ? "Member details"
                  : attendees.length === 1
                    ? "Your details"
                    : `Attendee ${i + 1}`}
              </legend>
              <div className="rsvp-form-grid">
                <label className="rsvp-field">
                  <span className="rsvp-label">Full name</span>
                  <input
                    type="text"
                    autoComplete={i === 0 ? "name" : undefined}
                    required
                    placeholder="Full name"
                    value={a.full_name}
                    onChange={(e) => updateAttendee(i, "full_name", e.target.value)}
                  />
                </label>
                <label className="rsvp-field">
                  <span className="rsvp-label">Email</span>
                  <input
                    type="email"
                    autoComplete={i === 0 ? "email" : undefined}
                    required
                    placeholder="you@example.com"
                    value={a.email}
                    onChange={(e) => updateAttendee(i, "email", e.target.value)}
                  />
                </label>
                {isGuestTicket && (
                  <>
                    <label className="rsvp-field">
                      <span className="rsvp-label">Phone</span>
                      <input
                        type="tel"
                        autoComplete={i === 0 ? "tel" : undefined}
                        required
                        placeholder={CHAPTER_PHONE_PLACEHOLDER}
                        value={a.phone}
                        onChange={(e) => updateAttendee(i, "phone", e.target.value)}
                      />
                    </label>

                    {isRise4GuestVetting ? (
                      <>
                        <label className="rsvp-field">
                          <span className="rsvp-label">Role</span>
                          <select
                            required
                            value={a.role_in_company}
                            onChange={(e) =>
                              updateAttendee(i, "role_in_company", e.target.value)
                            }
                          >
                            <option value="">Select role</option>
                            {RISE4_ROLE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        {roleRequiresRevenueScale(a.role_in_company) && (
                          <label className="rsvp-field">
                            <span className="rsvp-label">Revenue Scale</span>
                            <select
                              required
                              value={a.revenue_scale}
                              onChange={(e) =>
                                updateAttendee(i, "revenue_scale", e.target.value)
                              }
                            >
                              <option value="">Select revenue scale</option>
                              {RISE4_REVENUE_SCALE_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        {roleRequiresCompany(a.role_in_company) && (
                          <label className="rsvp-field">
                            <span className="rsvp-label">Company</span>
                            <input
                              type="text"
                              autoComplete={i === 0 ? "organization" : undefined}
                              required
                              placeholder="Company name"
                              value={a.company}
                              onChange={(e) => updateAttendee(i, "company", e.target.value)}
                            />
                          </label>
                        )}
                      </>
                    ) : (
                      <>
                        <label className="rsvp-field">
                          <span className="rsvp-label">Company</span>
                          <input
                            type="text"
                            autoComplete={i === 0 ? "organization" : undefined}
                            required
                            placeholder="Company name"
                            value={a.company}
                            onChange={(e) => updateAttendee(i, "company", e.target.value)}
                          />
                        </label>
                        <label className="rsvp-field">
                          <span className="rsvp-label">Title or role</span>
                          <input
                            type="text"
                            autoComplete={i === 0 ? "organization-title" : undefined}
                            placeholder="e.g. Founder, CEO"
                            value={a.title}
                            onChange={(e) => updateAttendee(i, "title", e.target.value)}
                          />
                        </label>
                      </>
                    )}
                  </>
                )}
                <label className="rsvp-field">
                  <span className="rsvp-label">Dietary needs or allergies (if any)</span>
                  <input
                    type="text"
                    placeholder="e.g. vegetarian, halal, peanut allergy"
                    value={a.food_allergy}
                    onChange={(e) => updateAttendee(i, "food_allergy", e.target.value)}
                  />
                </label>
              </div>
              {i > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => removeAttendee(i)}
                  style={{ marginTop: 8 }}
                >
                  Remove attendee
                </button>
              )}
            </fieldset>
          ))}
          {isGuestTicket && (
            <fieldset className="rsvp-guest-context">
              <legend className="rsvp-label">How are you joining us?</legend>
              <p className="rsvp-help">
                If an EO member invited you, or you are visiting from another EO
                chapter, add those details here.
              </p>
              <div className="rsvp-form-grid">
                <label className="rsvp-field">
                  <span className="rsvp-label">Registration type</span>
                  <select
                    required={isRise4GuestVetting}
                    value={guestContext.relationship}
                    onChange={(e) =>
                      setGuestContext((prev) => ({
                        ...prev,
                        relationship: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select one</option>
                    {(isRise4GuestVetting
                      ? RISE4_GUEST_RELATIONSHIP_OPTIONS
                      : GUEST_RELATIONSHIP_OPTIONS
                    ).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rsvp-field">
                  <span className="rsvp-label">{isRise4GuestVetting ? "Invited by" : "Invited by (if applicable)"}</span>
                  <input
                    type="text"
                    placeholder="EO member name"
                    required={isRise4GuestVetting && guestContext.relationship.toLowerCase().includes("invited") && guestContext.relationship.toLowerCase().includes("member")}
                    value={guestContext.host_member}
                    onChange={(e) =>
                      setGuestContext((prev) => ({
                        ...prev,
                        host_member: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="rsvp-field">
                  <span className="rsvp-label">Home EO chapter (if applicable)</span>
                  <input
                    type="text"
                    placeholder="e.g. EO Singapore"
                    value={guestContext.visiting_chapter}
                    onChange={(e) =>
                      setGuestContext((prev) => ({
                        ...prev,
                        visiting_chapter: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="rsvp-field">
                  <span className="rsvp-label">How did you hear about this event?</span>
                  <select
                    name="referral_source"
                    value={guestContext.referral_source}
                    onChange={(e) =>
                      setGuestContext((prev) => ({
                        ...prev,
                        referral_source: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select one</option>
                    {REFERRAL_SOURCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>
          )}
          {canAddAttendee && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={addAttendee}
              style={{ marginBottom: 16 }}
            >
              + Add attendee
            </button>
          )}

          {guestSection}
        </>
      ) : (
        <>
          <div className="rsvp-form-grid">
            <label className="rsvp-field">
              <span className="rsvp-label">Name</span>
              <input name="name" type="text" autoComplete="name" required placeholder="Your name" defaultValue={teamRegistration ? "" : (defaultName ?? "")} />
            </label>
            <label className="rsvp-field">
              <span className="rsvp-label">Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={simpleEmail}
                onChange={(event) => setSimpleEmail(event.target.value)}
              />
            </label>
            <label className="rsvp-field">
              <span className="rsvp-label">Phone</span>
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                required={isLegacyGuestTicket || asksDinnerAllergy}
                placeholder={CHAPTER_PHONE_PLACEHOLDER}
                defaultValue={teamRegistration ? "" : (defaultPhone ?? "")}
              />
            </label>
            {asksDinnerAllergy && (
              <label className="rsvp-field">
                <span className="rsvp-label">Food allergies or dietary needs</span>
                <span className="rsvp-field__hint">
                  Please read the menu above carefully. If there is any dish you cannot eat, let us know here. Write None if there is nothing.
                </span>
                <input
                  type="text"
                  required
                  maxLength={DINNER_ALLERGY_MAX}
                  placeholder="e.g. None, shellfish allergy, vegetarian"
                  value={dinnerAllergy}
                  onChange={(event) => setDinnerAllergy(event.target.value)}
                />
              </label>
            )}
            {asksDinnerAllergy && (
              <input type="hidden" name="notes" value={dinnerAllergyNote(dinnerAllergy)} />
            )}
            {/* Legacy numeric "Guests" field. It only makes sense as a paid
                seat-quantity selector (charged via 1 + simpleGuestCount). On a
                free or ticketless event (e.g. a members-only, one-per-member
                event) guests are disabled, or come only through the
                allow_guests named-guest UI above, so it must not render. */}
            {!guestsEnabled && hasTickets && effectivePrice > 0 && selectedTicket?.max_attendees !== 1 && (
              <label className="rsvp-field">
                <span className="rsvp-label">Guests</span>
                <input
                  name="guest_count"
                  type="number"
                  min={0}
                  max={selectedTicket?.max_attendees != null ? Math.max(0, selectedTicket.max_attendees - 1) : undefined}
                  step={1}
                  value={simpleGuestCount}
                  onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10);
                    const maxGuests = selectedTicket?.max_attendees != null
                    ? Math.max(0, selectedTicket.max_attendees - 1)
                    : Number.POSITIVE_INFINITY;
                    setSimpleGuestCount(Number.isFinite(next) ? Math.min(maxGuests, Math.max(0, next)) : 0);
                  }}
                />
              </label>
            )}
          </div>
          {guestSection}
        </>
      )}

      <div className="rsvp-waiver">
        <EventPolicyNotice
          forceOpen
          noShowFeeUsd={noShowFeeForEvent({ id: eventId, type: eventType, title: eventTitle })}
          nonRefundable={isNonRefundableEvent({ id: eventId })}
          onScrolledToEnd={() => setHasScrolledWaiver(true)}
        />
        <label className="rsvp-waiver__checkbox">
          <input
            type="checkbox"
            name="waiver_accepted"
            value="true"
            checked={waiverAccepted}
            disabled={!hasScrolledWaiver}
            onChange={(e) => setWaiverAccepted(e.target.checked)}
          />
          <span>
            I have read and agree to the Event Waiver, Cancellation, and No-show Policy
            / Tôi đã đọc và đồng ý với Chính sách Miễn trừ Trách nhiệm và
            Chính sách Hủy đăng ký và Không tham dự.
          </span>
        </label>
        {!hasScrolledWaiver && (
          <p className="rsvp-waiver__hint">
            Scroll to the end of the policy above to continue.
          </p>
        )}
      </div>

      {voucherApplies && (
        <section className="rsvp-voucher" aria-labelledby="rsvp-voucher-title">
          <div className="rsvp-voucher__heading">
            <div>
              <h3 id="rsvp-voucher-title">Private invitation</h3>
              <p>
                {needsInviteCode
                  ? "Guests register with an invitation code. Enter the code you were sent."
                  : "Received a guest invitation from an EO member or partner? Enter the code they shared with you."}
              </p>
            </div>
          </div>
          <div className="rsvp-voucher__controls">
            <label className="rsvp-field">
              <span className="rsvp-label">Invitation code</span>
              <input
                ref={voucherInputRef}
                value={voucherCode}
                autoCapitalize="characters"
                autoComplete="off"
                onChange={(event) => {
                  setVoucherCode(event.target.value.toUpperCase());
                  if (!voucherResult?.ok) setVoucherPreview(null);
                }}
                placeholder="Enter the code you received"
              />
            </label>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={voucherApplying || !voucherCode.trim()}
              onClick={applyVoucher}
            >
              {voucherApplying ? "Applying..." : "Apply code"}
            </button>
          </div>
          <div className="rsvp-voucher__status" aria-live="polite" aria-atomic="true">
            {voucherStale && voucherResult?.ok ? (
              <p className="rsvp-voucher__notice">Ticket details changed. Apply the code again to refresh the price.</p>
            ) : voucherResult?.ok ? (
              <div className="rsvp-voucher__summary">
                <p><strong>{voucherResult.code}</strong> applied, {voucherResult.percentOff}% off</p>
                <dl>
                  <div><dt>Original</dt><dd>{formatPriceLabel(voucherResult.baseTotal, voucherResult.currency)}</dd></div>
                  <div><dt>Discount</dt><dd>−{formatPriceLabel(voucherResult.discountTotal, voucherResult.currency)}</dd></div>
                  <div className="rsvp-voucher__total"><dt>Total</dt><dd>{formatPriceLabel(voucherResult.finalTotal, voucherResult.currency)}</dd></div>
                </dl>
              </div>
            ) : voucherResult ? (
              <p className="rsvp-voucher__error" role="alert">{voucherResult.error}</p>
            ) : null}
          </div>
        </section>
      )}

      <button
        type="submit"
        className="btn btn--primary btn--lg"
        disabled={
          pending ||
          (hasTickets && !selectedTicketId) ||
          !waiverAccepted ||
          appliedVoucherNeedsRefresh ||
          (needsInviteCode && (!appliedVoucher || voucherApplying)) ||
          (teamRegistration && (!appliedVoucher || voucherApplying))
        }
        style={{ marginTop: 16 }}
      >
        {pending
          ? payableIsPaid && !willWaitlist
            ? "Redirecting to checkout..."
            : "Submitting..."
          : willWaitlist
            ? "Join the waitlist"
            : payableIsPaid
              ? `Pay ${payableLabel} and RSVP${totalAttendees > 1 ? ` (${totalAttendees} people)` : ""}`
              : isMemberTicket
                ? "Confirm my place"
                : "RSVP"}
      </button>
      {payableIsPaid && !willWaitlist && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12, marginBottom: 0 }}>
          You will be redirected to Stripe to complete payment. Your seat is held for 30 minutes.
        </p>
      )}
      </>
      )}
    </form>
  );
}
