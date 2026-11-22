"use client";

import { useState, useTransition } from "react";
import type { EventTicketType } from "@/lib/events";
import { createTicketType, updateTicketType, deleteTicketType } from "./actions";
import { formatMoney, isZeroDecimalCurrency, toMajorUnits } from "@/lib/currency";
import { SUPPORTED_EVENT_PAYMENT_CURRENCIES } from "@/lib/event-ticket-pricing";

type Props = {
  eventId: string;
  tickets: EventTicketType[];
};

export function TicketsSection({ eventId, tickets }: Props) {
  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2 className="admin-section-h2">Tickets ({tickets.length})</h2>
      </div>
      <p className="admin-section-desc">
        Define one row per ticket type (e.g. Member, Non-member). The public RSVP form shows these as choices; the chosen ticket sets the Stripe price. If no tickets are defined, the event uses the default price above.
      </p>

      <AddTicketForm eventId={eventId} />

      {tickets.length === 0 ? (
        <div className="admin-stub" style={{ marginTop: 16 }}>
          No ticket types yet. Add at least one to enable tiered pricing.
        </div>
      ) : (
        <div className="admin-table-wrap" style={{ marginTop: 16 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Price</th>
                <th>Capacity</th>
                <th>Max attendees</th>
                <th>Sort</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <TicketRow key={t.id} eventId={eventId} ticket={t} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AddTicketForm({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        className="admin-btn admin-btn--ghost"
        onClick={() => setOpen(true)}
      >
        Add ticket type
      </button>
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createTicketType(eventId, formData);
      if (res.ok) {
        setOpen(false);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="admin-card admin-rsvp-add">
      {error && <div className="admin-banner admin-banner--err">{error}</div>}
      <div className="admin-form-row admin-form-row--3">
        <label className="admin-field">
          <span className="admin-label">Name</span>
          <input name="name" type="text" required placeholder="Member, Non-member, Spouse, etc." />
        </label>
        <label className="admin-field">
          <span className="admin-label">Price</span>
          <input
            name="price_major_units"
            type="number"
            min={0}
            step={isZeroDecimalCurrency(currency) ? 1 : "0.01"}
            defaultValue={0}
          />
        </label>
        <label className="admin-field">
          <span className="admin-label">Currency</span>
          <select
            name="currency"
            required
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            {SUPPORTED_EVENT_PAYMENT_CURRENCIES.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="admin-form-row">
        <label className="admin-field admin-field--full">
          <span className="admin-label">Description</span>
          <input name="description" type="text" placeholder="Optional fine print shown next to the ticket name" />
        </label>
      </div>
      <div className="admin-form-row admin-form-row--3">
        <label className="admin-field">
          <span className="admin-label">Capacity</span>
          <input name="capacity" type="number" min={0} step={1} placeholder="Blank = use event capacity" />
        </label>
        <label className="admin-field">
          <span className="admin-label">Sort order</span>
          <input name="sort_order" type="number" step={1} defaultValue={0} />
        </label>
        <label className="admin-field admin-field--inline" style={{ alignSelf: "end", paddingBottom: 10 }}>
          <input name="active" type="checkbox" defaultChecked />
          <span>Active</span>
        </label>
      </div>
      <div className="admin-form-row">
        <label className="admin-field">
          <span className="admin-label">Max attendees per registration</span>
          <input
            name="max_attendees"
            type="number"
            min={1}
            step={1}
            placeholder="Blank = no per-registration cap (1 = single attendee only)"
          />
        </label>
      </div>
      <div className="admin-form-actions">
        <button
          type="button"
          className="admin-btn admin-btn--ghost"
          onClick={() => { setOpen(false); setError(null); }}
        >
          Cancel
        </button>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={pending}>
          {pending ? "Adding..." : "Add ticket type"}
        </button>
      </div>
    </form>
  );
}

function TicketRow({ eventId, ticket }: { eventId: string; ticket: EventTicketType }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!confirm(`Delete ticket "${ticket.name}"? Tickets used by registrations or vouchers cannot be deleted and should be deactivated instead.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteTicketType(ticket.id, eventId);
      if (!res.ok) setError(res.error);
    });
  }

  function save(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateTicketType(ticket.id, eventId, formData);
      if (res.ok) {
        setEditing(false);
      } else {
        setError(res.error);
      }
    });
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={8}>
          <form action={save} className="admin-card admin-rsvp-add" style={{ margin: 0 }}>
            {error && <div className="admin-banner admin-banner--err">{error}</div>}
            <div className="admin-form-row admin-form-row--2">
              <label className="admin-field">
                <span className="admin-label">Name</span>
                <input name="name" type="text" required defaultValue={ticket.name} />
              </label>
              <label className="admin-field">
                <span className="admin-label">Price ({ticket.currency.toUpperCase()})</span>
                <input
                  name="price_major_units"
                  type="number"
                  min={0}
                  step={isZeroDecimalCurrency(ticket.currency) ? 1 : "0.01"}
                  defaultValue={toMajorUnits(ticket.price_amount, ticket.currency)}
                />
                <input name="currency" type="hidden" value={ticket.currency.toUpperCase()} />
              </label>
            </div>
            <div className="admin-form-row">
              <label className="admin-field admin-field--full">
                <span className="admin-label">Description</span>
                <input name="description" type="text" defaultValue={ticket.description ?? ""} />
              </label>
            </div>
            <div className="admin-form-row admin-form-row--3">
              <label className="admin-field">
                <span className="admin-label">Capacity</span>
                <input
                  name="capacity"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={ticket.capacity ?? ""}
                />
              </label>
              <label className="admin-field">
                <span className="admin-label">Sort order</span>
                <input
                  name="sort_order"
                  type="number"
                  step={1}
                  defaultValue={ticket.sort_order}
                />
              </label>
              <label className="admin-field admin-field--inline" style={{ alignSelf: "end", paddingBottom: 10 }}>
                <input name="active" type="checkbox" defaultChecked={ticket.active} />
                <span>Active</span>
              </label>
            </div>
            <div className="admin-form-row">
              <label className="admin-field">
                <span className="admin-label">Max attendees per registration</span>
                <input
                  name="max_attendees"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={ticket.max_attendees ?? ""}
                  placeholder="Blank = no per-registration cap (1 = single attendee only)"
                />
              </label>
            </div>
            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => { setEditing(false); setError(null); }}
              >
                Cancel
              </button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={pending}>
                {pending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr>
        <td><strong>{ticket.name}</strong></td>
        <td className="admin-table-meta">{ticket.description ?? ""}</td>
        <td>{formatMoney(ticket.price_amount, ticket.currency)}</td>
        <td className="admin-table-meta">{ticket.capacity ?? ""}</td>
        <td className="admin-table-meta">{ticket.max_attendees ?? ""}</td>
        <td className="admin-table-meta">{ticket.sort_order}</td>
        <td className="admin-table-meta">{ticket.active ? "Yes" : "No"}</td>
        <td>
          <button
            type="button"
            className="admin-link-action"
            onClick={() => setEditing(true)}
            disabled={pending}
          >
            Edit
          </button>
          {" "}
          <button
            type="button"
            className="admin-link-action admin-link-action--danger"
            onClick={remove}
            disabled={pending}
          >
            Delete
          </button>
        </td>
      </tr>
      {error && (
        <tr><td colSpan={8}><div className="admin-banner admin-banner--err">{error}</div></td></tr>
      )}
    </>
  );
}
