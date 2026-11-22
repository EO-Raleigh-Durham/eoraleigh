"use client";

import { useEffect } from "react";
import {
  SAP_DEAL_STATUS_LABEL,
  SAP_DEAL_TYPE_LABEL,
  type SapPartner,
} from "@/lib/sap";
import { SapForm } from "./SapForm";

type Props = {
  partner: SapPartner;
  onClose: () => void;
  boardView: boolean;
};

// Right-side slide-in panel that holds the SapForm. Closes on Escape,
// backdrop click, or the X button. Locks body scroll while open.

export function PartnerShelf({ partner, onClose, boardView }: Props) {
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
      <aside
        className="sap-shelf"
        role="dialog"
        aria-label={`Edit ${partner.company.name}`}
      >
        <div className="sap-shelf-head">
          <div>
            <div className="sap-shelf-eyebrow">
              {SAP_DEAL_STATUS_LABEL[partner.deal.status]}
              {partner.deal.deal_type && (
                <>
                  {" · "}
                  {SAP_DEAL_TYPE_LABEL[partner.deal.deal_type]}
                  {partner.deal.amount_usd > 0 &&
                    ` · $${partner.deal.amount_usd.toLocaleString()}`}
                </>
              )}
            </div>
            <h2 className="sap-shelf-title">{partner.company.name}</h2>
            {partner.company.industry && (
              <div className="sap-shelf-sub">{partner.company.industry}</div>
            )}
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
          <SapForm
            deal={partner.deal}
            company={partner.company}
            contacts={partner.contacts}
            referredBy={partner.referredBy}
            boardView={boardView}
            onClose={onClose}
          />
        </div>
      </aside>
    </div>
  );
}
