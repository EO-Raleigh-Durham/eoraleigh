"use client";

import { useState, useTransition } from "react";
import { isoToHcmInput, type EventTicketType, type EventVoucher } from "@/lib/events";
import { calculateVoucherPrice } from "@/lib/event-vouchers";
import { createEventVoucher, deactivateEventVoucher, updateEventVoucher } from "./actions";
import { CHAPTER_TIME_ZONE_LABEL } from "@/kernel/config/chapter";

type Props = {
  eventId: string;
  publicEventPath: string;
  tickets: EventTicketType[];
  vouchers: EventVoucher[];
};

const money = (amount: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);

function discountedPrice(ticket: EventTicketType, voucher: EventVoucher): number {
  const result = calculateVoucherPrice({
    code: voucher.code,
    percentOff: voucher.discount_percent,
    ticketTypeId: ticket.id,
    unitPrice: ticket.price_amount,
    quantity: 1,
    currency: ticket.currency,
  });
  return result.ok ? result.finalTotal : ticket.price_amount;
}

export function VouchersSection({ eventId, publicEventPath, tickets, vouchers }: Props) {
  const [adding, setAdding] = useState(false);
  return (
    <section className="admin-section voucher-section" aria-labelledby="voucher-heading">
      <div className="admin-section-head voucher-section-head">
        <div>
          <h2 id="voucher-heading" className="admin-section-h2">Vouchers ({vouchers.length})</h2>
          <p className="admin-section-desc">
            Create event-specific percentage discounts and choose exactly which tickets accept each code.
          </p>
        </div>
        {!adding && (
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setAdding(true)}>
            Add voucher
          </button>
        )}
      </div>

      {adding && (
        <VoucherForm
          eventId={eventId}
          tickets={tickets}
          onCancel={() => setAdding(false)}
          onSaved={() => setAdding(false)}
        />
      )}

      {vouchers.length === 0 && !adding ? (
        <div className="admin-stub">No voucher campaigns yet</div>
      ) : (
        <div className="voucher-list">
          {vouchers.map((voucher) => (
            <VoucherCard
              key={voucher.id}
              eventId={eventId}
              publicEventPath={publicEventPath}
              tickets={tickets}
              voucher={voucher}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function VoucherCard({ eventId, publicEventPath, tickets, voucher }: Omit<Props, "vouchers"> & { voucher: EventVoucher }) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const used = voucher.redemptions.length > 0;
  const link = `${publicEventPath}?voucher=${encodeURIComponent(voucher.code)}`;

  async function copy(value: string, label: string) {
    try {
      const absolute = value.startsWith("/") ? `${window.location.origin}${value}` : value;
      await navigator.clipboard.writeText(absolute);
      setMessage(`${label} copied`);
    } catch {
      setMessage("Could not copy. Select the value and copy it manually.");
    }
  }

  function deactivate() {
    if (!confirm(`Deactivate ${voucher.code}? Existing reporting will be preserved.`)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deactivateEventVoucher(eventId, voucher.id);
      setMessage(result.ok ? "Voucher deactivated" : result.error);
    });
  }

  if (editing) {
    return (
      <VoucherForm
        eventId={eventId}
        tickets={tickets}
        voucher={voucher}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  return (
    <article className="admin-card voucher-card">
      <div className="voucher-card-head">
        <div>
          <div className="voucher-code-row">
            <strong className="voucher-code">{voucher.code}</strong>
            <span className={`voucher-status ${voucher.active ? "voucher-status--active" : ""}`}>
              {voucher.active ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="admin-table-meta">{voucher.campaign_label} · {voucher.discount_percent}% off</div>
          {voucher.team_invite_enabled && <div className="admin-table-meta">Included in confirmation emails as the team rate</div>}
        </div>
        <div className="voucher-actions">
          <button type="button" className="admin-link-action" onClick={() => copy(voucher.code, "Code")}>Copy code</button>
          <button type="button" className="admin-link-action" onClick={() => copy(link, "Invitation link")}>Copy link</button>
          <button type="button" className="admin-link-action" onClick={() => setEditing(true)}>Edit</button>
          {voucher.active && (
            <button type="button" className="admin-link-action admin-link-action--danger" disabled={pending} onClick={deactivate}>
              Deactivate
            </button>
          )}
        </div>
      </div>
      {message && <p className="voucher-feedback" role="status">{message}</p>}

      <div className="voucher-ticket-outcomes" aria-label="Eligible ticket prices">
        {tickets.filter((ticket) => voucher.eligible_ticket_ids.includes(ticket.id)).map((ticket) => (
          <span key={ticket.id}>
            {ticket.name}: <s>{money(ticket.price_amount, ticket.currency)}</s>{" "}
            <strong>{money(discountedPrice(ticket, voucher), ticket.currency)}</strong>
          </span>
        ))}
      </div>
      <dl className="voucher-metrics">
        <div><dt>Reserved</dt><dd>{voucher.metrics.reserved_seats} seats</dd></div>
        <div><dt>Redeemed</dt><dd>{voucher.metrics.redeemed_seats} seats</dd></div>
        <div><dt>Released</dt><dd>{voucher.metrics.released_seats} seats</dd></div>
        <div><dt>Base value</dt><dd>{money(voucher.metrics.base_total)}</dd></div>
        <div><dt>Discount</dt><dd>{money(voucher.metrics.discount_total)}</dd></div>
        <div><dt>Net</dt><dd>{money(voucher.metrics.net_total)}</dd></div>
      </dl>

      <div className="voucher-meta-grid">
        <span>Campaign limit: {voucher.discounted_seat_limit ?? "Unlimited"}</span>
        <span>Per email: {voucher.per_email_seat_limit ?? "Unlimited"}</span>
        <span>Starts: {voucher.starts_at ? new Date(voucher.starts_at).toLocaleString() : "Immediately"}</span>
        <span>Ends: {voucher.ends_at ? new Date(voucher.ends_at).toLocaleString() : "No end date"}</span>
      </div>
      {voucher.internal_notes && <p className="voucher-notes">{voucher.internal_notes}</p>}
      {used && <p className="voucher-lock-note">Code, percentage, start time, and eligible tickets are locked because this voucher has registration history.</p>}

      <button
        type="button"
        className="admin-link-action voucher-registration-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Hide" : "Show"} linked registrations ({voucher.metrics.linked_registrations})
      </button>
      {expanded && (
        <div className="voucher-registration-list">
          {voucher.redemptions.length === 0 ? <p>No registrations yet</p> : voucher.redemptions.map((row) => (
            <div key={row.id} className="voucher-registration-row">
              <div>
                <strong>{row.registration?.person?.name || row.primary_email}</strong>
                <span>{row.registration?.person?.email || row.primary_email}</span>
              </div>
              <span>
                {row.registration?.review_classification === "spam" ? "spam · " : ""}
                {row.state} · {row.discounted_seat_quantity} seats · {money(row.final_total)}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function VoucherForm({ eventId, tickets, voucher, onCancel, onSaved }: {
  eventId: string;
  tickets: EventTicketType[];
  voucher?: EventVoucher;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const used = (voucher?.redemptions.length ?? 0) > 0;

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = voucher
        ? await updateEventVoucher(eventId, voucher.id, formData)
        : await createEventVoucher(eventId, formData);
      if (result.ok) onSaved();
      else setError(result.error);
    });
  }

  return (
    <form action={submit} className="admin-card voucher-form">
      <div className="voucher-form-title">{voucher ? `Edit ${voucher.code}` : "Add voucher"}</div>
      {error && <div className="admin-banner admin-banner--err" role="alert">{error}</div>}
      <div className="admin-form-row admin-form-row--3">
        <label className="admin-field">
          <span className="admin-label">Code</span>
          <input name="code" required minLength={2} maxLength={64} pattern="[A-Za-z0-9][A-Za-z0-9_-]+" defaultValue={voucher?.code} disabled={used} />
          {used && <input type="hidden" name="code" value={voucher?.code} />}
        </label>
        <label className="admin-field">
          <span className="admin-label">Campaign label</span>
          <input name="campaign_label" required maxLength={200} defaultValue={voucher?.campaign_label} placeholder="Yale alumni group" />
        </label>
        <label className="admin-field">
          <span className="admin-label">Discount (%)</span>
          <input name="discount_percent" type="number" required min={1} max={100} step={1} defaultValue={voucher?.discount_percent ?? 50} disabled={used} />
          {used && <input type="hidden" name="discount_percent" value={voucher?.discount_percent} />}
        </label>
      </div>
      <fieldset className="voucher-ticket-picker" disabled={used}>
        <legend>Eligible tickets</legend>
        {tickets.length === 0 ? <p>Add a ticket type before creating a voucher.</p> : tickets.map((ticket) => (
          <label key={ticket.id}>
            <input
              type="checkbox"
              name="eligible_ticket_ids"
              value={ticket.id}
              defaultChecked={voucher?.eligible_ticket_ids.includes(ticket.id)}
            />
            <span>{ticket.name} ({money(ticket.price_amount, ticket.currency)})</span>
          </label>
        ))}
      </fieldset>
      {used && voucher?.eligible_ticket_ids.map((id) => <input key={id} type="hidden" name="eligible_ticket_ids" value={id} />)}
      <div className="admin-form-row admin-form-row--2">
        <label className="admin-field">
          <span className="admin-label">Starts ({CHAPTER_TIME_ZONE_LABEL})</span>
          <input name="starts_at" type="datetime-local" defaultValue={voucher?.starts_at ? isoToHcmInput(voucher.starts_at) : ""} disabled={used} />
          {used && <input type="hidden" name="starts_at" value={voucher?.starts_at ? isoToHcmInput(voucher.starts_at) : ""} />}
        </label>
        <label className="admin-field">
          <span className="admin-label">Ends ({CHAPTER_TIME_ZONE_LABEL})</span>
          <input name="ends_at" type="datetime-local" defaultValue={voucher?.ends_at ? isoToHcmInput(voucher.ends_at) : ""} />
        </label>
      </div>
      <div className="admin-form-row admin-form-row--2">
        <label className="admin-field">
          <span className="admin-label">Discounted seat limit</span>
          <input name="discounted_seat_limit" type="number" min={1} step={1} defaultValue={voucher?.discounted_seat_limit ?? ""} placeholder="Blank = unlimited" />
        </label>
        <label className="admin-field">
          <span className="admin-label">Per-email seat limit</span>
          <input name="per_email_seat_limit" type="number" min={1} step={1} defaultValue={voucher?.per_email_seat_limit ?? ""} placeholder="Blank = unlimited" />
        </label>
      </div>
      <label className="admin-field admin-field--full">
        <span className="admin-label">Internal notes</span>
        <textarea name="internal_notes" rows={3} maxLength={2000} defaultValue={voucher?.internal_notes ?? ""} />
      </label>
      <label className="admin-field admin-field--inline">
        <input name="active" type="checkbox" defaultChecked={voucher?.active ?? true} />
        <span>Active</span>
      </label>
      <label className="admin-field admin-field--inline">
        <input name="team_invite_enabled" type="checkbox" defaultChecked={voucher?.team_invite_enabled ?? false} />
        <span>Include this voucher as the team-rate link in confirmation emails</span>
      </label>
      <p className="admin-help">A team-rate voucher must apply to exactly one ticket. Leave the per-email limit blank to let a founder register several colleagues together.</p>
      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={pending || tickets.length === 0}>
          {pending ? "Saving..." : "Save voucher"}
        </button>
      </div>
    </form>
  );
}
