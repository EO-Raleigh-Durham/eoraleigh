"use client";

import { useMemo, useState, useTransition } from "react";
import {
  SAP_DEAL_STATUS_LABEL,
  SAP_DEAL_STATUS_ORDER,
  SAP_DEAL_TYPE_LABEL,
  SAP_PIPELINE_STAGE_LABEL,
  type SapDealStatus,
  type SapPartner,
} from "@/lib/sap";
import { changeStatus } from "./actions";

type Props = {
  partners: SapPartner[];
  onSelect: (dealId: string) => void;
};

// Client-side kanban with native HTML5 drag-and-drop.
// Cards optimistically move on drop and call the server action;
// on error the card snaps back and an inline banner appears.
// Clicking (without dragging) calls onSelect to open the shelf.

export function KanbanBoard({ partners, onSelect }: Props) {
  const [local, setLocal] = useState(partners);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<SapDealStatus | null>(null);

  const grouped = useMemo(() => {
    const g: Record<SapDealStatus, SapPartner[]> = {
      lead: [],
      in_discussion: [],
      active: [],
      lost: [],
    };
    for (const p of local) g[p.deal.status].push(p);
    for (const s of SAP_DEAL_STATUS_ORDER) {
      g[s].sort((a, b) => a.company.name.localeCompare(b.company.name));
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

  function onDragOver(e: React.DragEvent, col: SapDealStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overCol !== col) setOverCol(col);
  }

  function onDragLeaveCol(col: SapDealStatus) {
    if (overCol === col) setOverCol(null);
  }

  function onDrop(e: React.DragEvent, target: SapDealStatus) {
    e.preventDefault();
    setOverCol(null);
    const dealId = e.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    if (!dealId) return;

    const moving = local.find((p) => p.deal.id === dealId);
    if (!moving || moving.deal.status === target) return;

    const previous = local;
    setLocal((cur) =>
      cur.map((p) =>
        p.deal.id === dealId ? { ...p, deal: { ...p.deal, status: target } } : p,
      ),
    );
    setError(null);

    startTransition(async () => {
      const res = await changeStatus(dealId, target);
      if (!res.ok) {
        setLocal(previous);
        setError(res.error);
      }
    });
  }

  function handleCardClick(e: React.MouseEvent, dealId: string) {
    // Don't open the shelf if the user was actually dragging — dragend may
    // not have fired yet on some platforms.
    if (dragId) return;
    e.preventDefault();
    onSelect(dealId);
  }

  return (
    <div className="sap-kanban-wrap">
      {error && (
        <div className="admin-banner admin-banner--err" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}
      <div className="sap-kanban">
        {SAP_DEAL_STATUS_ORDER.map((col) => (
          <div
            key={col}
            className={`sap-col sap-col--${col} ${overCol === col ? "is-over" : ""}`}
            onDragOver={(e) => onDragOver(e, col)}
            onDragLeave={() => onDragLeaveCol(col)}
            onDrop={(e) => onDrop(e, col)}
          >
            <div className="sap-col-head">
              <span className="sap-col-title">{SAP_DEAL_STATUS_LABEL[col]}</span>
              <span className="sap-col-count">{grouped[col].length}</span>
            </div>
            <div className="sap-col-body">
              {grouped[col].length === 0 && (
                <div className="sap-col-empty">Drop here</div>
              )}
              {grouped[col].map(({ deal, company, contacts, referredBy }) => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, deal.id)}
                  onDragEnd={onDragEnd}
                  onClick={(e) => handleCardClick(e, deal.id)}
                  className={`sap-card ${dragId === deal.id ? "is-dragging" : ""} ${pending ? "is-pending" : ""}`}
                >
                  <div className="sap-card-name">{company.name}</div>
                  <div className="sap-card-meta">
                    {company.industry ?? "Uncategorised"}
                  </div>
                  <div className="sap-card-row">
                    {deal.status === "in_discussion" && deal.pipeline_stage && (
                      <span className="sap-stage-chip">
                        {SAP_PIPELINE_STAGE_LABEL[deal.pipeline_stage]}
                      </span>
                    )}
                    {deal.deal_type && (
                      <span className={`sap-tier sap-tier--${deal.deal_type}`}>
                        {SAP_DEAL_TYPE_LABEL[deal.deal_type]}
                      </span>
                    )}
                    {deal.amount_usd > 0 && (
                      <span className="sap-card-amount">
                        ${deal.amount_usd.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {deal.discount_note && (
                    <div className="sap-card-discount">{deal.discount_note}</div>
                  )}
                  {contacts.length > 0 && (
                    <div className="sap-card-contact">
                      {contacts[0].name ?? contacts[0].email}
                      {contacts.length > 1 ? ` +${contacts.length - 1}` : ""}
                    </div>
                  )}
                  {deal.deal_owner && (
                    <div className="sap-card-owner">Owner: {deal.deal_owner}</div>
                  )}
                  {referredBy?.name && (
                    <div className="sap-card-referrer">
                      Referred by {referredBy.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
