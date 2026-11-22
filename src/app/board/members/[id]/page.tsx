import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRosterMemberById,
  MEMBERSHIP_STATUS_LABEL,
  MEMBERSHIP_TYPE_LABEL,
} from "@/lib/people";
import { listForums } from "@/lib/forums";
import {
  loadMemberEngagementForPerson,
  ENGAGEMENT_SIGNAL_LABEL,
  type EngagementSignal,
} from "@/lib/engagement";
import { sentimentScore, suggestedStep, whyLine } from "@/lib/member-signal";
import { loadMember360, loadMemberEmailAliases } from "@/lib/member-360";
import { requireBoardOrAbove } from "@/lib/auth";
import { canViewRevenue, redactMemberFinancials } from "@/lib/revenue-access";
import { MemberProfileForm } from "../MemberProfileForm";
import { ForumPicker } from "../ForumPicker";
import { MemberActivity } from "../MemberActivity";
import { CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

export const metadata = {
  title: "Member",
  description: "One member's profile: contact details, engagement signal, and activity history.",
};
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const SIGNAL_BADGE: Record<EngagementSignal, string> = {
  healthy: "admin-badge--ok",
  value_risk: "admin-badge--warn",
  drifting: "admin-badge--muted",
  at_risk: "admin-badge--err",
  new: "admin-badge--accent",
  quiet: "admin-badge--neutral",
};

const SIGNAL_SENTENCE: Record<EngagementSignal, string> = {
  healthy: "Came to a chapter event in the last 90 days and rates the chapter well",
  value_risk: "Shows up, but scores the chapter under 4: value may not be landing",
  drifting: "In a forum but no chapter event in 90 days",
  at_risk: "No chapter event in 90 days, and no forum or a low score: likely to churn",
  new: "Joined within the last 30 days: settling in, no flags yet",
  quiet: "No recorded activity",
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

function fyShort(fyStart: number): string {
  return `FY${fyStart}/${String((fyStart + 1) % 100).padStart(2, "0")}`;
}

// Full-page member record, organized around five questions: who are they,
// are they engaged (do), are they happy (say), is there a say-do gap, and
// what next. The engagement score derives from the same query path as
// /board/member-engagement-review, so the two pages cannot disagree.
export default async function MemberDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireBoardOrAbove();
  const [revenueAccess, loaded, forums] = await Promise.all([
    canViewRevenue(user),
    getRosterMemberById(id),
    listForums(),
  ]);
  if (!loaded) notFound();
  // Revenue is for the Finance and Membership chairs only. Redact on the
  // server: client children (profile form, forum picker) receive the member
  // object as serialized props, so UI-only masking would still ship the values.
  const member = revenueAccess ? loaded : redactMemberFinancials(loaded);

  const [engagement, voice, emailAliases] = await Promise.all([
    loadMemberEngagementForPerson(id),
    loadMember360(id, member.company_id ?? null),
    loadMemberEmailAliases(id),
  ]);

  const statusLabel = member.membership_status
    ? MEMBERSHIP_STATUS_LABEL[member.membership_status]
    : null;
  const typeLabel = member.membership_type
    ? MEMBERSHIP_TYPE_LABEL[member.membership_type]
    : null;
  const detail = engagement.detail;
  const bandLabel = detail ? ENGAGEMENT_SIGNAL_LABEL[detail.signal] : null;
  const whyInput = detail
    ? {
        eventsLast90: detail.eventsLast90,
        inForum: detail.inForum,
        secondary: detail.membershipType === "secondary_member",
        latestPulse: detail.latestPulse,
        avgEventRating: detail.avgEventRating,
      }
    : null;
  const score = detail ? sentimentScore(detail.latestPulse, detail.avgEventRating) : null;
  const nextStep = detail && whyInput ? suggestedStep(detail.signal, whyInput) : null;

  // Earliest trace of this member across check-ins, Pulse responses, and
  // event feedback. Used to flag an import-artifact member_since date.
  const firstActivityAt = [
    engagement.earliestAttendedAt,
    voice.pulseHistory.at(-1)?.submittedAt ?? null,
    voice.eventRatings.at(-1)?.createdAt ?? null,
  ]
    .filter((d): d is string => !!d)
    .sort()[0] ?? null;
  const tenureSuspect =
    !!member.member_since &&
    !!firstActivityAt &&
    firstActivityAt < member.member_since;

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-breadcrumb">
          <Link href="/board/members">Members</Link>
          <span>/</span>
          <span>{member.name ?? member.email}</span>
        </div>
        <div className="admin-eyebrow">
          {[statusLabel, typeLabel, bandLabel].filter(Boolean).join(" · ") ||
            "Member"}
        </div>
        <h1 className="admin-page-title">{member.name ?? "—"}</h1>
        <p className="admin-page-sub">
          <a href={`mailto:${member.email}`} className="admin-link-action">
            {member.email}
          </a>
        </p>
      </div>

      <div className="mbr-detail">
        <MemberProfileForm member={member} />

        <section className="admin-shelf-section">
          <h3 className="admin-shelf-section-title">Other emails</h3>
          <div className="admin-shelf-section-body">
            {emailAliases.status === "unavailable" ? (
              <div className="admin-shelf-placeholder">
                Other emails unavailable. Refresh the page to try again
              </div>
            ) : emailAliases.emails.length === 0 ? (
              <div className="admin-shelf-placeholder">No other emails recorded</div>
            ) : (
              <ul className="admin-list">
                {emailAliases.emails.map((email) => (
                  <li key={email}>{email}</li>
                ))}
              </ul>
            )}
            <p className="admin-table-meta" style={{ marginTop: 10 }}>
              Corrections require a site administrator review
            </p>
          </div>
        </section>

        <section className="admin-shelf-section">
          <h3 className="admin-shelf-section-title">Member engagement</h3>
          {detail ? (
            <div className="admin-shelf-section-body">
              <Row label="Why" value={whyLine(whyInput!)} />
              <Row
                label="Score"
                value={score === null ? "No ratings yet" : `${Math.round(score * 10) / 10} of 5 (Growth Pulse counts twice, event ratings once)`}
              />
              <Row
                label="Signal"
                value={
                  detail.overrideNote ? (
                    <>
                      <span className={`admin-badge ${SIGNAL_BADGE[detail.signal]}`}>
                        {ENGAGEMENT_SIGNAL_LABEL[detail.signal]}
                      </span>{" "}
                      Board override ({formatDate(detail.overrideAt)}):{" "}
                      {detail.overrideNote} Computed:{" "}
                      {ENGAGEMENT_SIGNAL_LABEL[detail.computedSignal]}
                    </>
                  ) : (
                    <>
                      <span className={`admin-badge ${SIGNAL_BADGE[detail.signal]}`}>
                        {ENGAGEMENT_SIGNAL_LABEL[detail.signal]}
                      </span>{" "}
                      {SIGNAL_SENTENCE[detail.signal]}
                    </>
                  )
                }
              />
              {nextStep && <Row label="Next step" value={nextStep} />}
              <Row label="Last activity" value={formatDate(detail.lastActivityAt)} />
              <Row
                label="All-time attendance"
                value={`${engagement.attendedAllTime} attended · ${engagement.noShowsAllTime} no-shows`}
              />
              <Row
                label="Upcoming"
                value={
                  engagement.upcoming.length === 0
                    ? "—"
                    : engagement.upcoming
                        .map((u) => `${u.title} (${formatDate(u.startsAt)})`)
                        .join(" · ")
                }
              />
              <p className="admin-table-meta" style={{ marginTop: 10 }}>
                Healthy means a chapter event in the last 90 days and a score of 4 or
                more. Forum members without a chapter event are drifting; anyone else
                without one is at risk. Check-in data is only reliable since QR
                ticketing, so treat a flag as a prompt to look closer.{" "}
                <Link
                  href="/board/the-pulse-of-the-chapter"
                  className="admin-link-action"
                >
                  Full review →
                </Link>
              </p>
            </div>
          ) : (
            <div className="admin-shelf-placeholder">
              Not on the active-member roster, no engagement signal
            </div>
          )}
        </section>

        <section className="admin-shelf-section">
          <h3 className="admin-shelf-section-title">Voice of the member</h3>
          <div className="admin-shelf-section-body">
            {voice.pulseHistory.length === 0 ? (
              <Row label="Growth Pulse" value="No responses yet" />
            ) : (
              <>
                <Row
                  label="Growth Pulse trend"
                  value={`${voice.pulseHistory
                    .slice()
                    .reverse()
                    .map((p) => p.rating)
                    .join(" → ")} (oldest to newest)`}
                />
                {voice.pulseHistory.slice(0, 8).map((p, i) => {
                  const prev = voice.pulseHistory[i + 1];
                  const arrow = !prev
                    ? ""
                    : p.rating > prev.rating
                      ? " ▲"
                      : p.rating < prev.rating
                        ? " ▼"
                        : " →";
                  return (
                    <Row
                      key={p.submittedAt}
                      label={formatDate(p.submittedAt)}
                      value={`${p.rating}/5${arrow}`}
                    />
                  );
                })}
              </>
            )}
            {voice.eventRatings.length > 0 && (
              <>
                <div className="member-act-heading" style={{ marginTop: 12 }}>
                  Event ratings given ({voice.eventRatings.length})
                </div>
                {voice.eventRatings.slice(0, 6).map((r) => (
                  <Row
                    key={r.createdAt}
                    label={r.eventTitle}
                    value={`${r.rating !== null ? `${r.rating}/5${r.metric ? ` ${r.metric.toLowerCase()}` : ""}` : "—"} · ${formatDate(r.createdAt)}`}
                  />
                ))}
              </>
            )}
          </div>
        </section>

        <section className="admin-shelf-section">
          <h3 className="admin-shelf-section-title">Company</h3>
          <div className="admin-shelf-section-body">
            <Row label="Name" value={member.company?.name ?? "—"} />
            <Row label="Industry" value={member.company?.industry ?? "—"} />
            <Row
              label="Employees"
              value={
                member.company?.employees != null
                  ? member.company.employees.toLocaleString()
                  : "—"
              }
            />
            <Row
              label="Gross revenue (FY)"
              value={
                !revenueAccess
                  ? "Restricted"
                  : voice.companyDetail?.revenue != null
                    ? `$${voice.companyDetail.revenue.toLocaleString("en-US")}`
                    : "—"
              }
            />
            <Row label="Status" value={voice.companyDetail?.status ?? "—"} />
            <Row
              label="Website"
              value={
                voice.companyDetail?.website ? (
                  <a
                    href={voice.companyDetail.website}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-link-action"
                  >
                    {voice.companyDetail.website}
                  </a>
                ) : (
                  "—"
                )
              }
            />
          </div>
        </section>

        <section className="admin-shelf-section">
          <h3 className="admin-shelf-section-title">Membership</h3>
          <div className="admin-shelf-section-body">
            <Row label="Member since" value={formatDate(member.member_since)} />
            {firstActivityAt && (
              <Row label="First recorded activity" value={formatDate(firstActivityAt)} />
            )}
            {voice.renewals.map((r) => (
              <Row
                key={r.cycle}
                label={`Renewal ${r.cycle}`}
                value={`${r.status}${r.completedAt ? ` · ${formatDate(r.completedAt)}` : ""}`}
              />
            ))}
            <Row
              label="Latest pulse"
              value={
                member.latestPulse
                  ? `${member.latestPulse.rating}/5 · ${formatDate(member.latestPulse.submittedAt)}`
                  : "—"
              }
            />
            {tenureSuspect && (
              <p className="admin-table-meta" style={{ marginTop: 10 }}>
                Activity predates the member-since date, which comes from an import
                and may understate real tenure
              </p>
            )}
          </div>
        </section>

        <section className="admin-shelf-section">
          <h3 className="admin-shelf-section-title">Annual re-qualification</h3>
          <div className="admin-shelf-section-body">
            {member.requalification ? (
              <>
                <Row
                  label="Submitted"
                  value={formatDate(member.requalification.submittedAt)}
                />
                <Row
                  label="2025 revenue"
                  value={
                    !revenueAccess
                      ? "Restricted"
                      : member.requalification.revenue != null
                        ? `$${member.requalification.revenue.toLocaleString("en-US")}`
                        : "—"
                  }
                />
                <Row
                  label="Current employees"
                  value={
                    member.requalification.employeeCount != null
                      ? member.requalification.employeeCount.toLocaleString()
                      : "—"
                  }
                />
                <Row
                  label="Ownership"
                  value={
                    member.requalification.ownershipPct != null
                      ? `${member.requalification.ownershipPct}%`
                      : "—"
                  }
                />
                {revenueAccess && member.requalification.exitedOver8m != null && (
                  <Row
                    label="Exited a company over $8M"
                    value={
                      member.requalification.exitedOver8m
                        ? `Yes${member.requalification.exitDetails ? ` · ${member.requalification.exitDetails}` : ""}`
                        : "No"
                    }
                  />
                )}
                <Row
                  label="Biggest challenge"
                  value={member.requalification.biggestChallenge ?? "—"}
                />
              </>
            ) : (
              <div className="admin-shelf-placeholder">
                No re-qualification submitted for the current year
              </div>
            )}
          </div>
        </section>

        {voice.boardRoles.length > 0 && (
          <section className="admin-shelf-section">
            <h3 className="admin-shelf-section-title">Board roles</h3>
            <div className="admin-shelf-section-body">
              {voice.boardRoles.map((r) => (
                <Row
                  key={`${r.fiscalYearStart}-${r.roleName}`}
                  label={fyShort(r.fiscalYearStart)}
                  value={`${r.roleName} · ${r.position}`}
                />
              ))}
            </div>
          </section>
        )}

        <section className="admin-shelf-section">
          <h3 className="admin-shelf-section-title">Forum</h3>
          <ForumPicker member={member} forums={forums} />
        </section>

        <MemberActivity personId={member.id} />

        <section className="admin-shelf-section">
          <h3 className="admin-shelf-section-title">SLP</h3>
          <div className="admin-shelf-placeholder">SLP details coming soon</div>
        </section>

        <section className="admin-shelf-section">
          <h3 className="admin-shelf-section-title">Children</h3>
          <div className="admin-shelf-placeholder">
            Children&apos;s names coming soon
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="admin-shelf-row">
      <div className="admin-shelf-row-label">{label}</div>
      <div className="admin-shelf-row-value">{value}</div>
    </div>
  );
}
