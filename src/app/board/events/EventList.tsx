"use client";

import {
  eventTypeLabel,
  formatEventDate,
  type EventRow,
  type EventStatus,
} from "@/lib/events";

type Props = {
  events: EventRow[];
  counts: Record<string, number>;
  emptyMessage: string;
  onSelect: (id: string) => void;
};

const STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Draft",
  published: "Published",
  open: "Open",
  closed: "Closed",
  completed: "Completed",
  cancelled: "Cancelled",
};

function statusToneClass(status: EventStatus): string {
  switch (status) {
    case "open":
    case "published":
      return "admin-badge admin-badge--ok";
    case "draft":
      return "admin-badge admin-badge--neutral";
    case "closed":
    case "completed":
      return "admin-badge admin-badge--muted";
    case "cancelled":
      return "admin-badge admin-badge--err";
    default:
      return "admin-badge";
  }
}

export function EventList({ events, counts, emptyMessage, onSelect }: Props) {
  if (events.length === 0) {
    return <div className="admin-stub">{emptyMessage}</div>;
  }
  return (
    <div className="admin-table-wrap">
      <table className="admin-table admin-table--clickable">
        <thead>
          <tr>
            <th>Title</th>
            <th>Date</th>
            <th>Type</th>
            <th>Status</th>
            <th>RSVPs</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const date = formatEventDate(e.starts_at, e.ends_at);
            const rsvp = counts[e.id] ?? 0;
            const cap = e.capacity ?? null;
            return (
              <tr
                key={e.id}
                onClick={() => onSelect(e.id)}
                tabIndex={0}
                role="button"
                aria-label={`Open shelf for ${e.title}`}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    onSelect(e.id);
                  }
                }}
              >
                <td>
                  <span className="admin-table-link">{e.title}</span>
                  {e.featured && (
                    <span className="admin-pill admin-pill--accent">Featured</span>
                  )}
                </td>
                <td className="admin-table-meta">{date.full}</td>
                <td className="admin-table-meta">{eventTypeLabel(e.type)}</td>
                <td>
                  <span className={statusToneClass(e.status)}>
                    {STATUS_LABEL[e.status]}
                  </span>
                </td>
                <td className="admin-table-meta">
                  {rsvp}
                  {cap !== null ? ` / ${cap}` : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
