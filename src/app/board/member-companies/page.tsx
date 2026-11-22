import Link from "next/link";
import { requireBoardOrAbove } from "@/lib/auth";
import { canViewRevenue } from "@/lib/revenue-access";
import { getMemberCompanies } from "@/lib/companies";
import { fyShort, REQUAL_FY_START } from "@/lib/requalification";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Member Companies",
  description: `Every company linked to an active or on-leave ${CHAPTER_NAME} member, refreshed by annual re-qualification.`,
};
export const dynamic = "force-dynamic";

function money(n: number | null): string {
  return n != null ? `$${n.toLocaleString("en-US")}` : "—";
}

// Every company linked to an active or on-leave roster member, with the
// chapter rollups (total employees, total revenue). The four rollup cards and
// the employees column are visible to the whole board; only the PER-COMPANY
// revenue column is masked for everyone except the Finance and Membership
// chairs.
export default async function MemberCompaniesPage() {
  const user = await requireBoardOrAbove();
  const revenueAccess = await canViewRevenue(user);
  const { companies, totalEmployees, totalRevenue } = await getMemberCompanies();

  const revenueYearLabel = `${REQUAL_FY_START - 1} revenue`;

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">Membership</div>
        <h1 className="admin-page-title">Member Companies</h1>
        <p className="admin-page-sub">
          Every company linked to an active or on-leave member. Figures refresh
          when members complete the annual re-qualification at{" "}
          <Link href="/member/requalify" className="admin-link-action">
            /member/requalify
          </Link>
          {revenueAccess
            ? ""
            : ". Per-company revenue figures are visible to the Finance and Membership chairs only"}
        </p>
      </div>

      <div className="admin-card-grid" style={{ marginBottom: 32 }}>
        <Stat label="Member companies" value={companies.length} />
        <Stat label="Total employees" value={totalEmployees.toLocaleString()} />
        <Stat label={`Total ${revenueYearLabel}`} value={money(totalRevenue)} />
        <Stat
          label={`Requalified · ${fyShort(REQUAL_FY_START)}`}
          value={`${companies.filter((c) => c.requalified).length} / ${companies.length}`}
        />
      </div>

      {companies.length === 0 ? (
        <div className="admin-stub">
          <strong>No member companies yet</strong>
          Companies appear here once roster members are linked to a company.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Member(s)</th>
                <th>Industry</th>
                <th>Location</th>
                <th>Employees</th>
                {revenueAccess && <th>{revenueYearLabel}</th>}
                <th>Requalified</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => {
                const location =
                  [c.city, c.country].filter(Boolean).join(", ") || "—";
                return (
                  <tr key={c.id}>
                    <td>
                      {c.website ? (
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noreferrer"
                          className="admin-link-action"
                        >
                          {c.name}
                        </a>
                      ) : (
                        c.name
                      )}
                    </td>
                    <td>
                      {c.members.map((m, i) => (
                        <span key={m.id}>
                          {i > 0 && ", "}
                          <Link
                            href={`/board/members/${m.id}`}
                            className="admin-link-action"
                          >
                            {m.name ?? "Unnamed"}
                          </Link>
                        </span>
                      ))}
                    </td>
                    <td className="admin-table-meta">{c.industry ?? "—"}</td>
                    <td className="admin-table-meta">{location}</td>
                    <td>
                      {c.employees != null ? c.employees.toLocaleString() : "—"}
                    </td>
                    {revenueAccess && <td>{money(c.revenue)}</td>}
                    <td>
                      {c.requalified ? (
                        <span className="admin-badge admin-badge--ok">✓</span>
                      ) : (
                        <span className="admin-badge admin-badge--muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
