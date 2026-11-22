"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type {
  EventInviterCandidate,
  EventRegistration,
  EventTicketType,
  RegistrationStatus,
} from "@/lib/events";
import {
  createRsvp,
  updateRsvpStatus,
  updateRsvpNotes,
  updateRsvpReviewClassification,
  setRsvpProspect,
  setRsvpInviter,
} from "./actions";
import {
  isSpamRegistration,
  occupiedSeats,
  registrationAttendeeCount,
  type RegistrationReviewClassification,
} from "@/lib/event-registration-review";
import { isZeroDecimalCurrency } from "@/lib/currency";
import {
  filterRosterRegistrations,
  inviterPersonId,
  isActiveRosterRegistration,
  isMemberTicket,
  isRosterPaymentDue,
  registrationAmountCents,
  registrationCompanies,
  registrationDetailAttendees,
  rosterFilterCounts,
  type InviterFilter,
  type ProspectFilter,
  type RosterFilter,
} from "@/lib/rsvp-roster";
import { hasComplimentaryPolicyAudit } from "@/lib/complimentary-rsvp";
import { getGuestRegistrationDetails } from "@/lib/rsvp-guest-context";
import { registrationSourceLines } from "@/lib/registration-source";
import { InternalNoteMarker } from "./InternalNoteMarker";
import { CHAPTER_NAME, CHAPTER_PHONE_PLACEHOLDER } from "@/kernel/config/chapter";

const NOTES_MAX = 1000;

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  pending_payment: "Pending payment",
  registered: "Registered",
  waitlisted: "Waitlisted",
  cancelled: "Cancelled",
  attended: "Attended",
  no_show: "No-show",
};

const STATUS_ORDER: RegistrationStatus[] = [
  "registered",
  "pending_payment",
  "waitlisted",
  "attended",
  "no_show",
  "cancelled",
];

type Props = {
  eventId: string;
  capacity: number | null;
  eventPriceAmount: number;
  eventCurrency: string;
  guestPriceAmount: number;
  registrations: EventRegistration[];
  tickets: EventTicketType[];
  inviterCandidates: EventInviterCandidate[];
};

function formatPayment(amount: number, currency = "USD"): string {
  if (isZeroDecimalCurrency(currency)) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
}

function personName(rsvp: EventRegistration): string {
  return rsvp.person?.name || rsvp.person?.email || "Guest";
}

function shortInviterName(person: NonNullable<EventRegistration["inviter"]>["person"]): string {
  if (!person) return "recorded inviter";
  const name = person.preferred_name || person.first_name || person.name || person.email;
  const firstToken = name.trim().split(/\s+/)[0];
  return firstToken.includes("@") ? firstToken.split("@")[0] : firstToken;
}

export function RsvpSection({
  eventId,
  capacity,
  eventPriceAmount,
  eventCurrency,
  guestPriceAmount,
  registrations,
  tickets,
  inviterCandidates,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RosterFilter>("active");
  const [inviterFilter, setInviterFilter] = useState<InviterFilter>("all");
  const [prospectFilter, setProspectFilter] = useState<ProspectFilter>("all");
  const activeCount = occupiedSeats(registrations);
  const attendedCount = registrations
    .filter((registration) => registration.status === "attended" && !isSpamRegistration(registration))
    .reduce((sum, registration) => sum + registrationAttendeeCount(registration), 0);
  const remaining = capacity === null ? null : Math.max(0, capacity - activeCount);
  const counts = useMemo(() => rosterFilterCounts(registrations), [registrations]);
  const inviterFilterOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const registration of registrations) {
      const inviterId = inviterPersonId(registration);
      const inviterName =
        registration.inviter?.person?.name || registration.inviter?.person?.email;
      if (inviterId && inviterName) options.set(inviterId, inviterName);
    }
    return Array.from(options, ([id, name]) => ({ id, name })).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }, [registrations]);
  const visibleRegistrations = useMemo(
    () => filterRosterRegistrations(
      registrations,
      filter,
      search,
      inviterFilter,
      prospectFilter,
    ),
    [registrations, filter, search, inviterFilter, prospectFilter],
  );
  const visibleProspectCount = useMemo(
    () => filterRosterRegistrations(
      registrations,
      filter,
      search,
      inviterFilter,
      "prospects",
    ).length,
    [registrations, filter, search, inviterFilter],
  );

  return (
    <section className="admin-section admin-roster-section">
      <div className="admin-roster-summary" aria-label="Event attendance summary">
        <span><strong>{activeCount}</strong> active</span>
        <span aria-hidden="true">·</span>
        <span><strong>{attendedCount}</strong> attended</span>
        {remaining !== null && (
          <>
            <span aria-hidden="true">·</span>
            <span><strong>{remaining}</strong> seats remaining</span>
          </>
        )}
      </div>

      <div className="admin-roster-toolbar">
        <label className="admin-roster-search">
          <span className="sr-only">Search registrations</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search person or inviter"
          />
        </label>
        <label className="admin-roster-filter">
          <span className="sr-only">Filter registrations</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value as RosterFilter)}>
            <option value="active">Active ({counts.active})</option>
            <option value="cancelled">Cancelled ({counts.cancelled})</option>
            <option value="spam">Spam ({counts.spam})</option>
            <option value="all">All ({counts.all})</option>
          </select>
        </label>
        {inviterFilterOptions.length > 0 && (
          <label className="admin-roster-filter admin-roster-inviter-filter">
            <span className="sr-only">Filter by inviter</span>
            <select
              value={inviterFilter}
              onChange={(event) => setInviterFilter(event.target.value)}
              aria-label="Filter by inviter"
            >
              <option value="all">All inviters</option>
              {inviterFilterOptions.map((inviter) => (
                <option key={inviter.id} value={inviter.id}>{inviter.name}</option>
              ))}
              <option value="none">No inviter</option>
            </select>
          </label>
        )}
        <div className="admin-roster-prospect-filter" aria-label="Filter by prospect status">
          <button
            type="button"
            aria-pressed={prospectFilter === "all"}
            onClick={() => setProspectFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            aria-pressed={prospectFilter === "prospects"}
            onClick={() => setProspectFilter("prospects")}
          >
            Prospects ({visibleProspectCount})
          </button>
        </div>
        <AddRsvpForm eventId={eventId} tickets={tickets} />
        <Link href={`/board/events/${eventId}/check-in`} className="admin-btn admin-btn--ghost">
          Check-in
        </Link>
      </div>

      {registrations.length === 0 ? (
        <div className="admin-stub admin-roster-empty">
          No RSVPs yet. Add one, or wait for the public form to start collecting them.
        </div>
      ) : visibleRegistrations.length === 0 ? (
        <div className="admin-stub admin-roster-empty">
          No registrations match this search and filter.
        </div>
      ) : (
        <div className="admin-table-wrap admin-roster-table-wrap">
          <table className="admin-table admin-rsvp-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Company</th>
                <th>Source</th>
                <th>Payment</th>
                <th>Status</th>
                <th className="admin-roster-actions-head">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRegistrations.map((registration) => (
                <RsvpRow
                  key={registration.id}
                  eventId={eventId}
                  rsvp={registration}
                  eventPriceAmount={eventPriceAmount}
                  eventCurrency={eventCurrency}
                  guestPriceAmount={guestPriceAmount}
                  tickets={tickets}
                  inviterCandidates={inviterCandidates}
                  onInviterChanged={(previousInviterId) => {
                    if (previousInviterId === inviterFilter) setInviterFilter("all");
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return createPortal(
    <div className="admin-roster-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className="admin-roster-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-roster-modal-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <h2 id="admin-roster-modal-title">{title}</h2>
        {children}
      </section>
    </div>,
    document.body,
  );
}

function AddRsvpForm({ eventId, tickets }: { eventId: string; tickets: EventTicketType[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complimentary, setComplimentary] = useState(false);
  const [success, setSuccess] = useState<{ name: string; ticketPath: string } | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const guestTickets = tickets.filter((ticket) => ticket.active && ticket.price_amount > 0);

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
    setComplimentary(false);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createRsvp(eventId, formData);
      if (result.ok) {
        setSuccess({ name: result.name, ticketPath: result.ticketPath });
        setCopyMessage(null);
        setOpen(false);
        setError(null);
        setComplimentary(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      {success && (
        <div className="admin-banner admin-banner--ok admin-roster-add-success" role="status">
          <span><strong>{success.name}</strong> is registered.</span>
          <Link href={success.ticketPath} target="_blank">Open ticket</Link>
          <button
            type="button"
            className="admin-link-action"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}${success.ticketPath}`);
                setCopyMessage("Link copied");
              } catch {
                setCopyMessage("Could not copy. Open the ticket and copy its URL.");
              }
            }}
          >
            Copy ticket link
          </button>
          {copyMessage && <span>{copyMessage}</span>}
        </div>
      )}
      <button type="button" className="admin-btn admin-btn--primary" onClick={() => setOpen(true)}>
        Add attendee
      </button>
      {open && (
        <Modal title={complimentary ? "Add complimentary guest" : "Add attendee"} onClose={close}>
          <form action={handleSubmit} className="admin-roster-form">
            {error && <div className="admin-banner admin-banner--err" role="alert">{error}</div>}
            <label className="admin-field admin-field--inline admin-roster-complimentary-toggle">
              <input
                name="complimentary"
                type="checkbox"
                value="true"
                checked={complimentary}
                onChange={(event) => setComplimentary(event.target.checked)}
              />
              <span>Complimentary guest</span>
            </label>
            {complimentary && (
              <div className="admin-banner admin-banner--warn">
                Use this only after the guest or sponsoring EO member confirms the late cancellation and no-show policy with you. This creates a free, confirmed ticket without public checkout.
              </div>
            )}
            <label className="admin-field">
              <span className="admin-label">Name</span>
              <input name="name" type="text" required={complimentary} placeholder={complimentary ? "Guest full name" : "Optional"} />
            </label>
            <label className="admin-field">
              <span className="admin-label">Email</span>
              <input name="email" type="email" required placeholder="guest@example.com" />
            </label>
            {complimentary && (
              <div className="admin-form-row admin-form-row--2">
                <label className="admin-field">
                  <span className="admin-label">Phone (optional)</span>
                  <input name="phone" type="tel" placeholder={CHAPTER_PHONE_PLACEHOLDER} />
                </label>
                <label className="admin-field">
                  <span className="admin-label">Company</span>
                  <input name="company" type="text" required placeholder="Company name" />
                </label>
              </div>
            )}
            {complimentary ? (
              <>
                <label className="admin-field">
                  <span className="admin-label">Guest ticket</span>
                  <select name="ticket_type_id" required defaultValue={guestTickets[0]?.id ?? ""}>
                    {guestTickets.length === 0 && <option value="">No active paid guest ticket</option>}
                    {guestTickets.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>{ticket.name}</option>
                    ))}
                  </select>
                </label>
                <input type="hidden" name="status" value="registered" />
                <input type="hidden" name="guest_count" value="0" />
                <label className="admin-field admin-field--inline admin-roster-policy-confirmation">
                  <input name="no_show_policy_confirmed" type="checkbox" value="true" required />
                  <span>
                    I confirmed with this guest or their sponsoring EO member that cancellations within 48 hours or a no-show incur a US$100 fee.
                  </span>
                </label>
              </>
            ) : (
              <div className="admin-form-row admin-form-row--2">
                <label className="admin-field">
                  <span className="admin-label">Status</span>
                  <select name="status" defaultValue="registered">
                    {STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>{STATUS_LABEL[status]}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span className="admin-label">Guests</span>
                  <input name="guest_count" type="number" min={0} step={1} defaultValue={0} />
                </label>
              </div>
            )}
            <label className="admin-field">
              <span className="admin-label">Internal note</span>
              <input name="notes" type="text" maxLength={NOTES_MAX} placeholder="Optional" />
            </label>
            <div className="admin-form-actions">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={close} disabled={pending}>Cancel</button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={pending || (complimentary && guestTickets.length === 0)}>
                {pending ? "Adding..." : complimentary ? "Register complimentary guest" : "Add attendee"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function RsvpRow({
  eventId,
  rsvp,
  eventPriceAmount,
  eventCurrency,
  guestPriceAmount,
  tickets,
  inviterCandidates,
  onInviterChanged,
}: {
  eventId: string;
  rsvp: EventRegistration;
  eventPriceAmount: number;
  eventCurrency: string;
  guestPriceAmount: number;
  tickets: EventTicketType[];
  inviterCandidates: EventInviterCandidate[];
  onInviterChanged: (previousInviterId: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAttendees, setShowAttendees] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState<RegistrationStatus>(rsvp.status);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(rsvp.notes ?? "");
  const [inviterOpen, setInviterOpen] = useState(false);
  const [inviterDraft, setInviterDraft] = useState("");
  const [inviterSearch, setInviterSearch] = useState("");
  const [reviewDraft, setReviewDraft] = useState<RegistrationReviewClassification | null>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const attendees = registrationDetailAttendees(rsvp);
  const registrationDetails = getGuestRegistrationDetails(rsvp.notes);
  const name = personName(rsvp);
  const email = rsvp.person?.email ?? "";
  const attendeeCount = registrationAttendeeCount(rsvp);
  const companies = registrationCompanies(rsvp);
  const sourceLines = registrationSourceLines(rsvp);
  const paymentAmount = registrationAmountCents(
    rsvp,
    eventPriceAmount,
    guestPriceAmount,
    tickets,
  );
  const paymentCurrency =
    rsvp.price_currency?.toUpperCase() ||
    rsvp.ticket_type?.currency?.toUpperCase() ||
    eventCurrency.toUpperCase();
  const paid = paymentAmount > 0 && (rsvp.amount_paid ?? 0) >= paymentAmount;
  const due = isRosterPaymentDue(rsvp, paymentAmount);
  const member = isMemberTicket(rsvp.ticket_type?.name);
  const inviterName = rsvp.inviter?.person?.name || rsvp.inviter?.person?.email || null;
  const currentInviterPersonId = inviterPersonId(rsvp);
  const availableInviters = inviterCandidates.filter(
    (candidate) => candidate.personId !== rsvp.person_id,
  );
  const visibleInviters = availableInviters.filter((candidate) => {
    const query = inviterSearch.trim().toLowerCase();
    return !query || [candidate.name, candidate.email, candidate.roleLabel ?? ""]
      .some((value) => value.toLowerCase().includes(query));
  });
  const hasInviter = Boolean(currentInviterPersonId);

  function closeMenu() {
    if (menuRef.current) menuRef.current.open = false;
  }

  function clearActionError() {
    setError(null);
  }

  function changeStatus() {
    setError(null);
    startTransition(async () => {
      const result = await updateRsvpStatus(rsvp.id, eventId, statusDraft);
      if (result.ok) setStatusOpen(false);
      else setError(result.error);
    });
  }

  function saveNotes() {
    setError(null);
    startTransition(async () => {
      const result = await updateRsvpNotes(rsvp.id, eventId, notesDraft);
      if (result.ok) setNotesOpen(false);
      else setError(result.error);
    });
  }

  function updateReview() {
    if (!reviewDraft) return;
    setError(null);
    startTransition(async () => {
      const result = await updateRsvpReviewClassification(rsvp.id, eventId, reviewDraft);
      if (result.ok) setReviewDraft(null);
      else setError(result.error);
    });
  }

  function toggleProspect() {
    setError(null);
    startTransition(async () => {
      const result = await setRsvpProspect(rsvp.id, eventId, !rsvp.is_prospect);
      if (!result.ok) setError(result.error);
    });
  }

  function saveInviter() {
    if (!inviterDraft) return;
    setError(null);
    startTransition(async () => {
      const result = await setRsvpInviter(rsvp.id, eventId, inviterDraft);
      if (result.ok) {
        onInviterChanged(currentInviterPersonId);
        setInviterOpen(false);
        setInviterDraft("");
        setInviterSearch("");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <tr>
        <td data-label="Person">
          <div className="admin-roster-person">
            <div className="admin-roster-person-line">
              <strong>{name}</strong>
              {member && <span className="admin-member-marker" title={`${CHAPTER_NAME} member`} aria-label={`${CHAPTER_NAME} member`}>M</span>}
              {rsvp.is_prospect && <span className="admin-prospect-marker">Prospect</span>}
              {hasComplimentaryPolicyAudit(rsvp.notes) && <span className="admin-comp-marker" title="Complimentary guest">Comp</span>}
              {attendeeCount > 1 && <span className="admin-party-count">{attendeeCount} people</span>}
              <InternalNoteMarker note={rsvp.notes} />
              {rsvp.review_classification === "needs_review" && <span className="admin-review-badge is-needs_review">Needs review</span>}
            </div>
            <span className="admin-table-meta">{email}</span>
            {hasInviter && (
              <span
                className="admin-inviter-source"
                title={inviterName ? `Invited by ${inviterName}` : "Inviter attribution recorded"}
              >
                {`via ${shortInviterName(rsvp.inviter?.person ?? null)}`}
              </span>
            )}
            {error && <div className="admin-banner admin-banner--err admin-row-error" role="alert">{error}</div>}
          </div>
        </td>
        <td data-label="Company" className="admin-roster-company">
          {companies.join(", ")}
        </td>
        <td data-label="Source" className="admin-table-meta">
          {sourceLines.length === 0
            ? "—"
            : sourceLines.map((line, i) => <div key={i}>{line}</div>)}
        </td>
        <td data-label="Payment" className="admin-roster-payment">
          <span>{formatPayment(paymentAmount, paymentCurrency)}</span>
          {paid && <span className="is-paid">Paid</span>}
          {due && <span className="is-due">Due</span>}
        </td>
        <td data-label="Status">
          <span className={`admin-status-pill is-${rsvp.status}`}>{STATUS_LABEL[rsvp.status]}</span>
        </td>
        <td data-label="Actions" className="admin-roster-actions-cell">
          <details className="admin-actions-menu" ref={menuRef}>
            <summary>Actions</summary>
            <div className="admin-actions-menu-panel">
              <button type="button" onClick={() => {
                closeMenu();
                clearActionError();
                setStatusDraft(rsvp.status);
                setStatusOpen(true);
              }}>Change status</button>
              {attendees.length > 0 && (
                <button type="button" onClick={() => {
                  closeMenu();
                  setShowAttendees((value) => !value);
                }}>
                  {showAttendees ? "Hide" : "View"} party details
                </button>
              )}
              {rsvp.ticket_code && <a href={`/t/${rsvp.ticket_code}`} target="_blank" rel="noreferrer">View ticket</a>}
              <button type="button" onClick={() => {
                closeMenu();
                clearActionError();
                setNotesDraft(rsvp.notes ?? "");
                setNotesOpen(true);
              }}>{rsvp.notes ? "Edit internal note" : "Add internal note"}</button>
              <button type="button" disabled={pending} onClick={() => {
                closeMenu();
                toggleProspect();
              }}>{rsvp.is_prospect ? "Remove prospect" : "Mark as prospect"}</button>
              {isActiveRosterRegistration(rsvp) && availableInviters.length > 0 && (
                <button type="button" onClick={() => {
                  closeMenu();
                  clearActionError();
                  setInviterDraft(currentInviterPersonId ?? "");
                  setInviterSearch("");
                  setInviterOpen(true);
                }}>{hasInviter ? "Update inviter" : "Set inviter"}</button>
              )}
              <button
                type="button"
                className={isSpamRegistration(rsvp) ? undefined : "is-danger"}
                onClick={() => {
                  closeMenu();
                  clearActionError();
                  setReviewDraft(isSpamRegistration(rsvp) ? "normal" : "spam");
                }}
              >
                {isSpamRegistration(rsvp) ? "Restore registration" : "Mark as spam"}
              </button>
            </div>
          </details>
        </td>
      </tr>

      {showAttendees && attendees.length > 0 && (
        <tr className="admin-attendee-detail-row">
          <td colSpan={6}>
            <div className="admin-attendee-detail-head">
              <strong>Party details</strong>
              <span>{rsvp.ticket_type?.name ?? "General ticket"}</span>
            </div>
            <div className="admin-nested-table-wrap">
              <table className="admin-table admin-table--nested">
                <thead>
                  <tr><th>Full name</th><th>Age</th><th>Email</th><th>Phone</th><th>Company</th>{attendees.some((attendee) => attendee.role_in_company || attendee.revenue_scale) && <><th>Role in Company</th><th>Revenue Scale</th></>}<th>Title</th><th>Food allergy</th></tr>
                </thead>
                <tbody>
                  {attendees.map((attendee) => (
                    <tr key={attendee.id}>
                      <td>{attendee.full_name}</td>
                      <td className="admin-table-meta">{attendee.age ?? ""}</td>
                      <td className="admin-table-meta">{attendee.email}</td>
                      <td className="admin-table-meta">{attendee.phone}</td>
                      <td className="admin-table-meta">{attendee.company ?? ""}</td>
                      {attendees.some((entry) => entry.role_in_company || entry.revenue_scale) && <>
                        <td className="admin-table-meta">{attendee.role_in_company ?? ""}</td>
                        <td className="admin-table-meta">{attendee.revenue_scale ?? ""}</td>
                      </>}
                      <td className="admin-table-meta">{attendee.title ?? ""}</td>
                      <td className="admin-table-meta">{attendee.food_allergy ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {registrationDetails.length > 0 && (
              <dl className="admin-attendee-context" aria-label="Registration details">
                {registrationDetails.map((detail) => (
                  <div key={detail.label}>
                    <dt>{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </td>
        </tr>
      )}

      {statusOpen && (
        <Modal title={`Change status for ${name}`} onClose={() => {
          if (!pending) {
            setStatusOpen(false);
            clearActionError();
          }
        }}>
          <div className="admin-roster-form">
            {error && <div className="admin-banner admin-banner--err" role="alert">{error}</div>}
            <label className="admin-field">
              <span className="admin-label">Status</span>
              <select autoFocus value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as RegistrationStatus)}>
                {STATUS_ORDER.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
              </select>
            </label>
            {statusDraft === "cancelled" && (
              <div className="admin-banner admin-banner--warn">This removes the registration from the active roster and frees its seats.</div>
            )}
            <div className="admin-form-actions">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => {
                setStatusOpen(false);
                clearActionError();
              }} disabled={pending}>Cancel</button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={changeStatus} disabled={pending || statusDraft === rsvp.status}>
                {pending ? "Updating..." : "Update status"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {notesOpen && (
        <Modal title={`${rsvp.notes ? "Edit" : "Add"} internal note`} onClose={() => {
          if (!pending) {
            setNotesOpen(false);
            clearActionError();
          }
        }}>
          <div className="admin-roster-form">
            {error && <div className="admin-banner admin-banner--err" role="alert">{error}</div>}
            <p className="admin-section-desc">Visible to board users managing this event.</p>
            <label className="admin-field">
              <span className="admin-label">Note</span>
              <textarea rows={5} maxLength={NOTES_MAX} value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} autoFocus />
              <span className="admin-roster-character-count">{notesDraft.length} / {NOTES_MAX}</span>
            </label>
            <div className="admin-form-actions">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => {
                setNotesOpen(false);
                clearActionError();
              }} disabled={pending}>Cancel</button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={saveNotes} disabled={pending || notesDraft === (rsvp.notes ?? "")}>
                {pending ? "Saving..." : "Save note"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {inviterOpen && (
        <Modal title={`${hasInviter ? "Update" : "Set"} inviter for ${name}`} onClose={() => {
          if (!pending) {
            setInviterOpen(false);
            setInviterDraft("");
            setInviterSearch("");
            clearActionError();
          }
        }}>
          <div className="admin-roster-form">
            {error && <div className="admin-banner admin-banner--err" role="alert">{error}</div>}
            <p className="admin-inviter-help">
              {hasInviter
                ? "Change the person used for attribution reporting."
                : "Choose the person who directly invited this attendee."}
            </p>
            <label className="admin-field">
              <span className="admin-label">Search members or chapter staff</span>
              <input
                autoFocus
                type="search"
                value={inviterSearch}
                onChange={(event) => setInviterSearch(event.target.value)}
                placeholder="Search name or email"
              />
            </label>
            <div className="admin-inviter-picker" role="radiogroup" aria-label="Invited by">
              {visibleInviters.length === 0 ? (
                <p className="admin-section-desc">No eligible inviters match this search.</p>
              ) : visibleInviters.map((candidate) => (
                <button
                  key={candidate.personId}
                  type="button"
                  role="radio"
                  aria-checked={inviterDraft === candidate.personId}
                  className={inviterDraft === candidate.personId ? "is-selected" : undefined}
                  onClick={() => setInviterDraft(candidate.personId)}
                >
                  <span className="admin-inviter-identity">
                    <span className="admin-inviter-name-row">
                      <strong>{candidate.name}</strong>
                      {candidate.roleLabel && <small className="admin-inviter-badge">{candidate.roleLabel}</small>}
                      {candidate.membershipStatus === "on_leave" && <small className="admin-inviter-badge">On leave</small>}
                    </span>
                    <small>{candidate.email}</small>
                  </span>
                  <span className="admin-inviter-choice-mark" aria-hidden="true">
                    {inviterDraft === candidate.personId ? "✓" : ""}
                  </span>
                </button>
              ))}
            </div>
            <div className="admin-form-actions">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => {
                setInviterOpen(false);
                setInviterDraft("");
                setInviterSearch("");
                clearActionError();
              }} disabled={pending}>Cancel</button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={saveInviter}
                disabled={pending || !inviterDraft || inviterDraft === currentInviterPersonId}
              >
                {pending ? "Saving..." : hasInviter ? "Update inviter" : "Save inviter"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {reviewDraft && (
        <Modal title={reviewDraft === "spam" ? `Mark ${name} as spam?` : `Restore ${name}?`} onClose={() => {
          if (!pending) {
            setReviewDraft(null);
            clearActionError();
          }
        }}>
          <div className="admin-roster-form">
            {error && <div className="admin-banner admin-banner--err" role="alert">{error}</div>}
            <div className={`admin-banner ${reviewDraft === "spam" ? "admin-banner--warn" : "admin-banner--ok"}`}>
              {reviewDraft === "spam"
                ? "This hides the registration from the active roster, capacity, feedback, and check-in. You can restore it later."
                : "This returns the registration to normal review. Its lifecycle status will not change."}
            </div>
            <div className="admin-form-actions">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => {
                setReviewDraft(null);
                clearActionError();
              }} disabled={pending}>Cancel</button>
              <button type="button" className={reviewDraft === "spam" ? "admin-btn admin-btn--danger" : "admin-btn admin-btn--primary"} onClick={updateReview} disabled={pending}>
                {pending ? "Updating..." : reviewDraft === "spam" ? "Mark as spam" : "Restore registration"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
