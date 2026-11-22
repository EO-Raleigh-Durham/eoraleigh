"use client";

import { useState } from "react";
import type { DealCard, DealPerson } from "@/lib/deals";
import { KanbanBoard } from "./KanbanBoard";
import { ProspectsList } from "./ProspectsList";
import { ProspectShelf } from "./ProspectShelf";

type Props = {
  deals: DealCard[];
  staff: DealPerson[];
  view: "kanban" | "list";
};

// Top-level client wrapper for the Prospects views. Holds the
// "which deal is selected" state and renders the shelf when set, so
// both kanban and list views share one open/close flow (mirrors the
// SAP PartnersShell).

export function ProspectsShell({ deals, staff, view }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId
    ? deals.find((d) => d.deal.id === selectedId) ?? null
    : null;

  return (
    <>
      {view === "kanban" ? (
        <KanbanBoard deals={deals} onSelect={setSelectedId} />
      ) : (
        <ProspectsList deals={deals} onSelect={setSelectedId} />
      )}

      {selected && (
        <ProspectShelf
          card={selected}
          staff={staff}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
