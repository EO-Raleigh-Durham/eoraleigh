"use client";

import {
  SAP_DEAL_STATUS_LABEL,
  SAP_DEAL_TYPE_LABEL,
  type SapDealStatus,
  type SapDealType,
  type SapPartner,
} from "@/lib/sap";

type Props = {
  partners: SapPartner[];
  onSelect: (dealId: string) => void;
};

export function PartnersList({ partners, onSelect }: Props) {
  if (partners.length === 0) {
    return <div className="admin-stub">No partners tracked yet.</div>;
  }
  const ordered = [...partners].sort((a, b) => {
    const o: Record<SapDealStatus, number> = {
      active: 0,
      in_discussion: 1,
      lead: 2,
      lost: 3,
    };
    const diff = o[a.deal.status] - o[b.deal.status];
    if (diff !== 0) return diff;
    return a.company.name.localeCompare(b.company.name);
  });

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Partner</th>
            <th>Industry</th>
            <th>Status</th>
            <th>Tier</th>
            <th>Amount</th>
            <th>Discount</th>
            <th>Owner</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map(({ deal, company, contacts }) => (
            <tr
              key={deal.id}
              onClick={() => onSelect(deal.id)}
              className="sap-row-clickable"
            >
              <td>
                <span className="admin-table-link">{company.name}</span>
                {contacts.length > 0 && (
                  <div className="admin-table-meta">
                    {contacts[0].name ?? contacts[0].email}
                    {contacts.length > 1 ? ` +${contacts.length - 1}` : ""}
                  </div>
                )}
              </td>
              <td className="admin-table-meta">{company.industry ?? "—"}</td>
              <td>
                <span className={statusBadgeClass(deal.status)}>
                  {SAP_DEAL_STATUS_LABEL[deal.status]}
                </span>
              </td>
              <td>
                {deal.deal_type ? (
                  <span className={tierBadgeClass(deal.deal_type)}>
                    {SAP_DEAL_TYPE_LABEL[deal.deal_type]}
                  </span>
                ) : (
                  <span className="admin-table-meta">—</span>
                )}
              </td>
              <td className="admin-table-meta">
                {deal.amount_usd > 0
                  ? `$${deal.amount_usd.toLocaleString()}`
                  : "—"}
              </td>
              <td className="admin-table-meta">{deal.discount_note ?? "—"}</td>
              <td className="admin-table-meta">{deal.deal_owner ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function statusBadgeClass(status: SapDealStatus): string {
  switch (status) {
    case "active":
      return "admin-badge admin-badge--ok";
    case "in_discussion":
      return "admin-badge admin-badge--neutral";
    case "lead":
      return "admin-badge admin-badge--muted";
    case "lost":
      return "admin-badge admin-badge--err";
  }
}

function tierBadgeClass(tier: SapDealType): string {
  return `sap-tier sap-tier--${tier}`;
}
