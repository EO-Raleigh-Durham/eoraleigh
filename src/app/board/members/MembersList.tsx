"use client";

import {
  MEMBERSHIP_STATUS_LABEL,
  MEMBERSHIP_TYPE_LABEL,
  type LatestPulse,
  type MembershipStatus,
  type MembershipType,
  type RosterMember,
} from "@/lib/people";
import { CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

type Props = {
  members: RosterMember[];
  onSelect: (id: string) => void;
};

const STATUS_TONE: Record<MembershipStatus, string> = {
  active_member: "admin-badge admin-badge--ok",
  on_leave: "admin-badge admin-badge--neutral",
  alumni: "admin-badge admin-badge--muted",
  not_member: "admin-badge admin-badge--muted",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    timeZone: CHAPTER_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MembersList({ members, onSelect }: Props) {
  if (members.length === 0) {
    return <div className="admin-stub">No active members on the roster.</div>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table admin-table--clickable">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Type</th>
            <th>Company</th>
            <th>Employees</th>
            <th>City</th>
            <th>Pulse</th>
            <th>Re-qual</th>
            <th>Member Since</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr
              key={m.id}
              onClick={() => onSelect(m.id)}
              tabIndex={0}
              role="button"
              aria-label={`Open shelf for ${m.name ?? m.email}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(m.id);
                }
              }}
            >
              <td>
                <span className="admin-table-link">{m.name ?? "—"}</span>
              </td>
              <td className="admin-table-meta">{m.email}</td>
              <td>
                {m.membership_status && (
                  <span className={STATUS_TONE[m.membership_status]}>
                    {MEMBERSHIP_STATUS_LABEL[m.membership_status]}
                  </span>
                )}
              </td>
              <td className="admin-table-meta">
                {m.membership_type
                  ? MEMBERSHIP_TYPE_LABEL[m.membership_type as MembershipType]
                  : "—"}
              </td>
              <td>{m.company?.name ?? <span className="admin-table-meta">—</span>}</td>
              <td className="admin-table-meta">
                {m.company?.employees != null
                  ? m.company.employees.toLocaleString()
                  : "—"}
              </td>
              <td className="admin-table-meta">{m.city ?? "—"}</td>
              <td>
                <PulseCell pulse={m.latestPulse} />
              </td>
              <td>
                {m.requalification ? (
                  <span
                    className="admin-badge admin-badge--ok"
                    title={`Submitted ${formatDate(m.requalification.submittedAt)}`}
                  >
                    ✓ {formatDate(m.requalification.submittedAt)}
                  </span>
                ) : (
                  <span className="admin-table-meta">—</span>
                )}
              </td>
              <td className="admin-table-meta">{formatDate(m.member_since)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PulseCell({ pulse }: { pulse: LatestPulse | null }) {
  if (!pulse) return <span className="admin-table-meta">—</span>;
  const rating = Math.max(0, Math.min(5, Math.round(pulse.rating)));
  return (
    <div>
      <div
        aria-label={`Rated ${rating} out of 5`}
        title={`${rating}/5`}
        style={{ color: "#F59E0B", letterSpacing: 1, fontSize: 14, lineHeight: 1 }}
      >
        {"★".repeat(rating)}
        <span style={{ color: "#E5E7EB" }}>{"★".repeat(5 - rating)}</span>
      </div>
      <div className="admin-table-meta" style={{ fontSize: 11, marginTop: 4 }}>
        {formatDate(pulse.submittedAt)}
      </div>
    </div>
  );
}
