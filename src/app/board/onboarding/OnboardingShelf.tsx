"use client";

import { useEffect, useState } from "react";
import {
  daysInStage,
  fullName,
  type DealCard,
  type DealPerson,
} from "@/lib/deals";
import { OnboardingForm } from "./OnboardingForm";
import { NoteFeed } from "../NoteFeed";

type Props = {
  card: DealCard;
  staff: DealPerson[];
  onClose: () => void;
};

type Tab = "overview" | "notes" | "edit";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

// Right-side slide-in detail drawer for an onboarding deal. Slimmer
// than the Prospect shelf: read-only Overview / Notes tabs plus an Edit
// tab that embeds OnboardingForm. No Qualification or Close tabs, since
// onboarding has no qualification gates or won/lost outcomes. Closes on
// Escape, backdrop, or X; body scroll locked while open.

export function OnboardingShelf({ card, staff, onClose }: Props) {
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
                ["notes", "Notes"],
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
              </dl>
              <dl className="funnel-dl">
                <dt>Company</dt>
                <dd>{company?.name ?? "—"}</dd>
                <dt>Industry</dt>
                <dd>{company?.industry ?? "—"}</dd>
              </dl>
              <dl className="funnel-dl">
                <dt>Stage</dt>
                <dd>{deal.stage}</dd>
                <dt>Forum group</dt>
                <dd>—</dd>
                <dt>Manager</dt>
                <dd>{manager ? fullName(manager) : "—"}</dd>
                <dt>Last activity</dt>
                <dd>{fmtDate(deal.last_activity_at)}</dd>
              </dl>
            </>
          )}

          {tab === "notes" && <NoteFeed text={deal.description} />}

          {tab === "edit" && (
            <OnboardingForm
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
