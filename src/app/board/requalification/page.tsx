import Link from "next/link";
import { requireBoardOrAbove } from "@/lib/auth";
import { canViewRevenue } from "@/lib/revenue-access";
import { getRosterWithDetails } from "@/lib/people";
import {
  getAllRequalifications,
  getRequalificationCount,
  listRequalFiscalYears,
  fyShort,
  REQUAL_FY_START,
} from "@/lib/requalification";
import FiscalYearSelect from "@/components/FiscalYearSelect";
import { CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

export const metadata = {
  title: "Requalification",
  description: "Annual member re-qualification status for the membership year, member by member.",
};
export const dynamic = "force-dynamic";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    timeZone: CHAPTER_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function money(n: number | null): string {
  return n != null ? `$${n.toLocaleString("en-US")}` : "—";
}

// Requalification command centre for the Membership and Finance chairs: every
// submission for the selected fiscal year, plus the chase-down list of active
// members who have NOT submitted yet (requalification is mandatory). Restricted
// to the two chairs (+ temporary allowlist) because it shows member revenue;
// other board users get a courteous restricted notice instead of the data.
export default async function RequalificationPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const user = await requireBoardOrAbove();
  if (!(await canViewRevenue(user))) {
    return (
      <div>
        <div className="admin-page-head">
          <div className="admin-eyebrow">Membership</div>
          <h1 className="admin-page-title">Annual Member Re-qualification</h1>
        </div>
        <div className="admin-stub">
          <strong>Restricted</strong>
          This page contains restricted information related to member
          re-qualification, including company revenue. Access is limited to the
          Membership Chair and the Finance Chair. If you believe you need
          access, contact the board
        </div>
      </div>
    );
  }

  const { fy } = await searchParams;
  const requested = fy ? Number(fy) : NaN;
  const selected = Number.isInteger(requested) ? requested : REQUAL_FY_START;

  const [rows, priorCount, years, roster] = await Promise.all([
    getAllRequalifications(selected),
    getRequalificationCount(selected - 1),
    listRequalFiscalYears(),
    getRosterWithDetails(),
  ]);
  const options = Array.from(new Set([selected, ...years])).sort(
    (a, b) => b - a,
  );

  // Chase-down list: active roster members with no submission for the CURRENT
  // requalification year (the roster loader joins that year's requal map).
  const outstanding = roster.filter(
    (m) => m.membership_status === "active_member" && !m.requalification,
  );

  // The revenue figure members enter is their most recent completed calendar
  // year, i.e. the year before the FY they are re-qualifying into.
  const revenueYearLabel = `${selected - 1} revenue`;

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">Membership · {fyShort(selected)}</div>
        <h1 className="admin-page-title">Annual Member Re-qualification</h1>
        <p className="admin-page-sub">
          Every member is required to re-qualify each membership year. Members
          complete the form at{" "}
          <Link href="/member/requalify" className="admin-link-action">
            /member/requalify
          </Link>
          , once per fiscal year. Collect-only: revenue and the prior-exit
          answer are recorded, not scored
        </p>
        <FiscalYearSelect options={options} selected={selected} />
      </div>

      <div className="admin-card-grid" style={{ marginBottom: 32 }}>
        <Stat label={`Responses · ${fyShort(selected)}`} value={rows.length} />
        <Stat
          label={`Outstanding · ${fyShort(REQUAL_FY_START)}`}
          value={outstanding.length}
        />
        <Stat label={`Responses · ${fyShort(selected - 1)}`} value={priorCount} />
      </div>

      <h2 className="admin-section-title">Submissions</h2>
      {rows.length === 0 ? (
        <div className="admin-stub">
          <strong>No responses yet</strong>
          Submissions appear here once members complete the form.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Company</th>
                <th>{revenueYearLabel}</th>
                <th>Employees</th>
                <th>Ownership</th>
                <th>Exited &gt;$8M</th>
                <th>Biggest challenge</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.personId}>
                  <td>
                    <Link
                      href={`/board/members/${r.personId}`}
                      className="admin-link-action"
                    >
                      {r.confirmedName ?? "—"}
                    </Link>
                  </td>
                  <td>{r.confirmedCompany ?? "—"}</td>
                  <td>{money(r.revenue)}</td>
                  <td>
                    {r.employeeCount != null ? r.employeeCount.toLocaleString() : "—"}
                  </td>
                  <td>{r.ownershipPct != null ? `${r.ownershipPct}%` : "—"}</td>
                  <td>
                    {r.exitedOver8m == null
                      ? "—"
                      : r.exitedOver8m
                        ? "Yes"
                        : "No"}
                  </td>
                  <td className="admin-table-meta">{r.biggestChallenge ?? "—"}</td>
                  <td className="admin-table-meta">{formatDate(r.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="admin-section-title" style={{ marginTop: 40 }}>
        Not yet submitted · {fyShort(REQUAL_FY_START)}
      </h2>
      <p className="admin-page-sub" style={{ marginBottom: 16 }}>
        Active members with no re-qualification on file for the current
        membership year. Chase these down
      </p>
      {outstanding.length === 0 ? (
        <div className="admin-stub">
          <strong>Everyone is in</strong>
          Every active member has submitted for {fyShort(REQUAL_FY_START)}.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Company</th>
                <th>Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {outstanding.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link
                      href={`/board/members/${m.id}`}
                      className="admin-link-action"
                    >
                      {m.name ?? m.email}
                    </Link>
                  </td>
                  <td>{m.company?.name ?? "—"}</td>
                  <td className="admin-table-meta">{m.email}</td>
                  <td className="admin-table-meta">{m.phone ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="admin-card" style={{ cursor: "default" }}>
      <div className="admin-card-label">{label}</div>
      <div className="admin-card-title">{value}</div>
    </div>
  );
}
