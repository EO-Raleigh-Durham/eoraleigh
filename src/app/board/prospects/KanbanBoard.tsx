"use client";

import { useMemo, useState, useTransition } from "react";
import {
  MEMBER_ACQUISITION_STAGES,
  daysInStage,
  fullName,
  type DealCard,
} from "@/lib/deals";
import { changeStage } from "./actions";

type Props = {
  deals: DealCard[];
  onSelect: (dealId: string) => void;
};

const STALE_DAYS = 14;

const QL_CHIPS: { key: keyof DealCard["deal"]; label: string }[] = [
  { key: "ql_founder_controlling_owner", label: "Founder" },
  { key: "ql_revenue_verified", label: "$1M+" },
  { key: "ql_financial_commitment", label: "Fin" },
  { key: "ql_time_commitment", label: "Time" },
];

function colModifier(stage: string): string {
  if (stage === "Closed Won") return "funnel-col--won";
  if (stage === "Closed Lost") return "funnel-col--lost";
  return "";
}

function formatAmount(amount: number | null, currency: string): string | null {
  if (amount == null || amount <= 0) return null;
  const prefix = currency === "USD" ? "$" : `${currency} `;
  return `${prefix}${amount.toLocaleString()}`;
}

function chipClass(value: boolean | null): string {
  if (value === true) return "funnel-chip funnel-chip--yes";
  if (value === false) return "funnel-chip funnel-chip--no";
  return "funnel-chip funnel-chip--null";
}

// Client-side kanban with native HTML5 drag-and-drop, mirroring the
// SAP board: cards move optimistically on drop and call changeStage;
// on error the card snaps back and an inline banner shows. Clicking a
// card (without dragging) opens the detail shelf via onSelect.

export function KanbanBoard({ deals, onSelect }: Props) {
  const [local, setLocal] = useState(deals);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<string, DealCard[]> = {};
    for (const stage of MEMBER_ACQUISITION_STAGES) g[stage] = [];
    for (const c of local) {
      if (g[c.deal.stage]) g[c.deal.stage].push(c);
    }
    return g;
  }, [local]);

  function onDragStart(e: React.DragEvent, dealId: string) {
    setDragId(dealId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dealId);
  }
  function onDragEnd() {
    setDragId(null);
  }
  function onDragOver(e: React.DragEvent, col: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overCol !== col) setOverCol(col);
  }
  function onDragLeaveCol(col: string) {
    if (overCol === col) setOverCol(null);
  }

  function onDrop(e: React.DragEvent, target: string) {
    e.preventDefault();
    setOverCol(null);
    const dealId = e.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    if (!dealId) return;

    const moving = local.find((c) => c.deal.id === dealId);
    if (!moving || moving.deal.stage === target) return;

    const previous = local;
    setLocal((cur) =>
      cur.map((c) =>
        c.deal.id === dealId ? { ...c, deal: { ...c.deal, stage: target } } : c,
      ),
    );
    setError(null);

    startTransition(async () => {
      const res = await changeStage(dealId, target);
      if (!res.ok) {
        setLocal(previous);
        setError(res.error);
      }
    });
  }

  function handleCardClick(e: React.MouseEvent, dealId: string) {
    if (dragId) return;
    e.preventDefault();
    onSelect(dealId);
  }

  return (
    <div className="funnel-kanban-wrap">
      {error && (
        <div
          className="admin-banner admin-banner--err"
          style={{ marginBottom: 16 }}
        >
          {error}
        </div>
      )}
      <div className="funnel-kanban">
        {MEMBER_ACQUISITION_STAGES.map((stage) => (
          <div
            key={stage}
            className={`funnel-col ${colModifier(stage)} ${overCol === stage ? "is-over" : ""}`.trim()}
            onDragOver={(e) => onDragOver(e, stage)}
            onDragLeave={() => onDragLeaveCol(stage)}
            onDrop={(e) => onDrop(e, stage)}
          >
            <div className="sap-col-head">
              <span className="sap-col-title">{stage}</span>
              <span className="sap-col-count">{grouped[stage].length}</span>
            </div>
            <div className="sap-col-body">
              {grouped[stage].length === 0 && (
                <div className="sap-col-empty">Drop here</div>
              )}
              {grouped[stage].map((card) => {
                const { deal, person, company, manager } = card;
                const days = daysInStage(deal);
                const amount = formatAmount(deal.amount, deal.currency);
                return (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, deal.id)}
                    onDragEnd={onDragEnd}
                    onClick={(e) => handleCardClick(e, deal.id)}
                    className={`sap-card ${dragId === deal.id ? "is-dragging" : ""} ${pending ? "is-pending" : ""}`.trim()}
                  >
                    <div className="funnel-card-top">
                      <span className="sap-card-name">{fullName(person)}</span>
                      <span
                        className={`funnel-days ${days >= STALE_DAYS ? "funnel-days--stale" : ""}`.trim()}
                      >
                        {days}d
                      </span>
                    </div>
                    {company?.name && (
                      <div className="sap-card-meta">{company.name}</div>
                    )}
                    <div className="funnel-card-row">
                      {amount && <span className="sap-card-amount">{amount}</span>}
                      {manager && (
                        <span className="funnel-mgr">RM: {fullName(manager)}</span>
                      )}
                    </div>
                    <div className="funnel-chips">
                      {QL_CHIPS.map(({ key, label }) => (
                        <span
                          key={key}
                          className={chipClass(deal[key] as boolean | null)}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
