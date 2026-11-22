"use client";

import { useEffect } from "react";
import {
  MEMBERSHIP_STATUS_LABEL,
  MEMBERSHIP_TYPE_LABEL,
  type RosterMember,
} from "@/lib/people";
import { ForumPicker } from "./ForumPicker";
import { MemberActivity } from "./MemberActivity";
import { CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

type Props = {
  member: RosterMember;
  forums: { id: string; name: string }[];
  // False when the viewer may not see revenue (server already stripped the
  // values); renders "Restricted" instead of the revenue figure.
  revenueAccess: boolean;
  onClose: () => void;
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

// Right-side slide-in panel. Closes on Escape, backdrop click, or X.
// Locks body scroll while open.

export function MemberShelf({ member, forums, revenueAccess, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const statusLabel = member.membership_status
    ? MEMBERSHIP_STATUS_LABEL[member.membership_status]
    : null;
  const typeLabel = member.membership_type
    ? MEMBERSHIP_TYPE_LABEL[member.membership_type]
    : null;

  return (
    <div className="admin-shelf-portal">
      <button
        type="button"
        aria-label="Close"
        className="admin-shelf-backdrop"
        onClick={onClose}
      />
      <aside
        className="admin-shelf"
        role="dialog"
        aria-label={`Member ${member.name ?? member.email}`}
      >
        <div className="admin-shelf-head">
          <div>
            <div className="admin-shelf-eyebrow">
              {[statusLabel, typeLabel].filter(Boolean).join(" · ") || "Member"}
            </div>
            <h2 className="admin-shelf-title">{member.name ?? "—"}</h2>
            <div className="admin-shelf-sub">
              <a href={`mailto:${member.email}`} className="admin-link-action">
                {member.email}
              </a>
            </div>
          </div>
          <button
            type="button"
            className="admin-shelf-close"
            onClick={onClose}
            aria-label="Close shelf"
          >
            ✕
          </button>
        </div>

        <div className="admin-shelf-body">
          <Section title="Contact">
            <Field label="Phone" value={member.phone ?? "—"} />
            <Field label="City" value={member.city ?? "—"} />
          </Section>

          <Section title="Company">
            <Field label="Name" value={member.company?.name ?? "—"} />
            <Field label="Industry" value={member.company?.industry ?? "—"} />
            <Field
              label="Employees"
              value={
                member.company?.employees != null
                  ? member.company.employees.toLocaleString()
                  : "—"
              }
            />
          </Section>

          <Section title="Membership">
            <Field label="Member since" value={formatDate(member.member_since)} />
            <Field
              label="Latest pulse"
              value={
                member.latestPulse
                  ? `${member.latestPulse.rating}/5 · ${formatDate(member.latestPulse.submittedAt)}`
                  : "—"
              }
            />
          </Section>

          <Section title="Re-qualification">
            {member.requalification ? (
              <>
                <Field
                  label="Submitted"
                  value={formatDate(member.requalification.submittedAt)}
                />
                <Field
                  label="2025 revenue"
                  value={
                    !revenueAccess
                      ? "Restricted"
                      : member.requalification.revenue != null
                        ? `$${member.requalification.revenue.toLocaleString("en-US")}`
                        : "—"
                  }
                />
                <Field
                  label="Employees"
                  value={
                    member.requalification.employeeCount != null
                      ? member.requalification.employeeCount.toLocaleString()
                      : "—"
                  }
                />
                <Field
                  label="Ownership"
                  value={
                    member.requalification.ownershipPct != null
                      ? `${member.requalification.ownershipPct}%`
                      : "—"
                  }
                />
                <Field
                  label="Biggest challenge"
                  value={member.requalification.biggestChallenge ?? "—"}
                />
                {member.requalification.exitedOver8m != null && (
                  <Field
                    label="Exited a company over $8M"
                    value={member.requalification.exitedOver8m ? "Yes" : "No"}
                  />
                )}
              </>
            ) : (
              <div className="admin-shelf-placeholder">Not submitted yet</div>
            )}
          </Section>

          <Section title="Forum">
            <ForumPicker member={member} forums={forums} />
          </Section>

          <MemberActivity personId={member.id} />

          <Section title="SLP">
            <div className="admin-shelf-placeholder">SLP details coming soon</div>
          </Section>

          <Section title="Children">
            <div className="admin-shelf-placeholder">
              Children&apos;s names coming soon
            </div>
          </Section>
        </div>
      </aside>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-shelf-section">
      <h3 className="admin-shelf-section-title">{title}</h3>
      <div className="admin-shelf-section-body">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-shelf-row">
      <div className="admin-shelf-row-label">{label}</div>
      <div className="admin-shelf-row-value">{value}</div>
    </div>
  );
}
