"use client";

import { useState } from "react";
import type { SapPartner } from "@/lib/sap";
import { KanbanBoard } from "./KanbanBoard";
import { PartnersList } from "./PartnersList";
import { PartnerShelf } from "./PartnerShelf";

type Props = {
  partners: SapPartner[];
  view: "kanban" | "list";
  boardView: boolean;
};

// Top-level client wrapper for the SAP admin views. Holds the
// "which partner is selected" state and renders the shelf when set,
// so both kanban and list views share one open/close flow.

export function PartnersShell({ partners, view, boardView }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId
    ? partners.find((p) => p.deal.id === selectedId) ?? null
    : null;

  return (
    <>
      {view === "kanban" ? (
        <KanbanBoard partners={partners} onSelect={setSelectedId} />
      ) : (
        <PartnersList partners={partners} onSelect={setSelectedId} />
      )}

      {selected && (
        <PartnerShelf
          partner={selected}
          boardView={boardView}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
