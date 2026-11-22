"use client";

import {
  MEMBER_ACQUISITION_STAGES,
  daysInStage,
  fullName,
  type DealCard,
} from "@/lib/deals";

type Props = {
  deals: DealCard[];
  onSelect: (dealId: string) => void;
};

const STAGE_ORDER: Record<string, number> = Object.fromEntries(
  MEMBER_ACQUISITION_STAGES.map((s, i) => [s, i]),
);

export function ProspectsList({ deals, onSelect }: Props) {
  if (deals.length === 0) {
    return <div className="admin-stub">No prospects in this pipeline yet.</div>;
  }

  const ordered = [...deals].sort((a, b) => {
    const sa = STAGE_ORDER[a.deal.stage] ?? 99;
    const sb = STAGE_ORDER[b.deal.stage] ?? 99;
    if (sa !== sb) return sa - sb;
    const ta = a.deal.last_activity_at ?? "";
    const tb = b.deal.last_activity_at ?? "";
    return tb.localeCompare(ta);
  });

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Company</th>
            <th>Stage</th>
            <th>Days in stage</th>
            <th>Amount</th>
            <th>Channel</th>
            <th>Manager</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map(({ deal, person, company, manager }) => (
            <tr
              key={deal.id}
              onClick={() => onSelect(deal.id)}
              className={`sap-row-clickable ${deal.stage === "Closed Lost" ? "is-muted" : ""}`.trim()}
            >
              <td>
                <span className="admin-table-link">{fullName(person)}</span>
                {person?.email && (
                  <div className="admin-table-meta">{person.email}</div>
                )}
              </td>
              <td className="admin-table-meta">{company?.name ?? "—"}</td>
              <td>
                <span className="admin-badge admin-badge--neutral">
                  {deal.stage}
                </span>
              </td>
              <td className="admin-table-meta">{daysInStage(deal)}d</td>
              <td className="admin-table-meta">
                {deal.amount != null
                  ? `${deal.currency} ${deal.amount.toLocaleString()}`
                  : "—"}
              </td>
              <td className="admin-table-meta">
                {deal.channel_source ?? person?.channel_source ?? "—"}
              </td>
              <td className="admin-table-meta">
                {manager ? fullName(manager) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
