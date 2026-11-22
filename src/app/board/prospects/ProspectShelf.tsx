"use client";

import { useEffect, useState } from "react";
import {
  daysInStage,
  fullName,
  isRevenueEligible,
  REVENUE_ELIGIBILITY_FLOOR,
  type DealCard,
  type DealPerson,
} from "@/lib/deals";
import { ProspectForm } from "./ProspectForm";
import { NoteFeed } from "../NoteFeed";

type Props = {
  card: DealCard;
  staff: DealPerson[];
  onClose: () => void;
};

type Tab = "overview" | "qualification" | "notes" | "close" | "edit";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function chipClass(value: boolean | null): string {
  if (value === true) return "funnel-chip funnel-chip--yes";
  if (value === false) return "funnel-chip funnel-chip--no";
  return "funnel-chip funnel-chip--null";
}

const QL = [
  { key: "ql_founder_controlling_owner", label: "Founder / owner" },
  { key: "ql_revenue_verified", label: "Revenue verified" },
  { key: "ql_financial_commitment", label: "Financial commitment" },
  { key: "ql_time_commitment", label: "Time commitment" },
] as const;

// Right-side slide-in detail drawer for a prospect. Read-only tabs
// (Overview / Qualification / Notes / Close) plus an Edit tab that
// embeds ProspectForm. Closes on Escape, backdrop, or X; body scroll
// locked while open (mirrors the SAP PartnerShelf).

export function ProspectShelf({ card, staff, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const { deal, person, company, manager } = card;

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

  return (
    <div className="sap-shelf-portal">
      <button
        type="button"
        aria-label="Close"
        className="sap-shelf-backdrop"
        onClick={onClose}
      />
      <aside className="sap-shelf" role="dialog" aria-label={`Deal ${deal.name}`}>
        <div className="sap-shelf-head">
          <div>
            <div className="sap-shelf-eyebrow">
              {deal.stage}
              {` · ${daysInStage(deal)}d in stage`}
            </div>
            <h2 className="sap-shelf-title">{fullName(person)}</h2>
            {company?.name && <div className="sap-shelf-sub">{company.name}</div>}
          </div>
          <button
            type="button"
            className="sap-shelf-close"
            onClick={onClose}
            aria-label="Close shelf"
          >
            ✕
          </button>
        </div>

        <div className="sap-shelf-body">
          <div className="funnel-shelf-tabs">
            {(
              [
                ["overview", "Overview"],
                ["qualification", "Qualification"],
                ["notes", "Notes"],
                ["close", "Close"],
                ["edit", "Edit"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`funnel-shelf-tab ${tab === id ? "is-active" : ""}`.trim()}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <>
              <dl className="funnel-dl">
                <dt>Name</dt>
                <dd>{fullName(person)}</dd>
                <dt>Email</dt>
                <dd>{person?.email ?? "—"}</dd>
                <dt>Phone</dt>
                <dd>{person?.phone ?? "—"}</dd>
                <dt>City</dt>
                <dd>{person?.city ?? "—"}</dd>
                <dt>Channel</dt>
                <dd>{person?.channel_source ?? deal.channel_source ?? "—"}</dd>
              </dl>
              <dl className="funnel-dl">
                <dt>Company</dt>
                <dd>{company?.name ?? "—"}</dd>
                <dt>Industry</dt>
                <dd>{company?.industry ?? "—"}</dd>
                <dt>FY revenue</dt>
                <dd>
                  {company?.fiscal_year_gross_revenue != null
                    ? `$${company.fiscal_year_gross_revenue.toLocaleString()}`
                    : "—"}
                </dd>
              </dl>
              <dl className="funnel-dl">
                <dt>Amount</dt>
                <dd>
                  {deal.amount != null
                    ? `${deal.currency} ${deal.amount.toLocaleString()}`
                    : "—"}
                </dd>
                <dt>Interest</dt>
                <dd>{deal.primary_interest ?? "—"}</dd>
                <dt>Manager</dt>
                <dd>{manager ? fullName(manager) : "—"}</dd>
                <dt>Last activity</dt>
                <dd>{fmtDate(deal.last_activity_at)}</dd>
              </dl>
            </>
          )}

          {tab === "qualification" && (
            <>
              <div className="funnel-chips" style={{ marginBottom: 16 }}>
                {QL.map(({ key, label }) => (
                  <span key={key} className={chipClass(deal[key])}>
                    {label}
                  </span>
                ))}
              </div>
              <div
                className={`funnel-eligible ${isRevenueEligible(company) ? "funnel-eligible--ok" : "funnel-eligible--warn"}`}
              >
                {isRevenueEligible(company)
                  ? `Revenue eligible (≥ $${REVENUE_ELIGIBILITY_FLOOR.toLocaleString()})`
                  : `Below the $${REVENUE_ELIGIBILITY_FLOOR.toLocaleString()} revenue floor`}
              </div>
            </>
          )}

          {tab === "notes" && <NoteFeed text={deal.description} />}

          {tab === "close" && (
            <dl className="funnel-dl">
              <dt>Status</dt>
              <dd>{deal.deal_status}</dd>
              <dt>Close date</dt>
              <dd>{fmtDate(deal.close_date)}</dd>
              <dt>Won reason</dt>
              <dd>{deal.closed_won_reason ?? "—"}</dd>
              <dt>Lost reason</dt>
              <dd>{deal.closed_lost_description ?? "—"}</dd>
              <dt>Lost detail</dt>
              <dd>{deal.closed_lost_reason ?? "—"}</dd>
              <dt>Disqualified</dt>
              <dd>{deal.disqualification_reason ?? "—"}</dd>
            </dl>
          )}

          {tab === "edit" && (
            <ProspectForm
              deal={deal}
              person={person}
              company={company}
              staff={staff}
              onClose={onClose}
            />
          )}
        </div>
      </aside>
    </div>
  );
}
