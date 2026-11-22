"use client";

import { useState } from "react";
import type { DealCard, DealPerson } from "@/lib/deals";
import { KanbanBoard } from "./KanbanBoard";
import { OnboardingList } from "./OnboardingList";
import { OnboardingShelf } from "./OnboardingShelf";

type Props = {
  deals: DealCard[];
  staff: DealPerson[];
  view: "kanban" | "list";
};

// Top-level client wrapper for the Onboarding views. Holds the
// "which deal is selected" state and renders the shelf when set, so
// both kanban and list views share one open/close flow (mirrors the
// Prospects shell).

export function OnboardingShell({ deals, staff, view }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId
    ? deals.find((d) => d.deal.id === selectedId) ?? null
    : null;

  return (
    <>
      {view === "kanban" ? (
        <KanbanBoard deals={deals} onSelect={setSelectedId} />
      ) : (
        <OnboardingList deals={deals} onSelect={setSelectedId} />
      )}

      {selected && (
        <OnboardingShelf
          card={selected}
          staff={staff}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
