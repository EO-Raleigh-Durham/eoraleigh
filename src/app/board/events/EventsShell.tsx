"use client";

import { useState } from "react";
import type { EventRow } from "@/lib/events";
import { EventList } from "./EventList";
import { EventShelf } from "./EventShelf";

type SurveyEntry = { url: string; qr: string };

type Props = {
  upcoming: EventRow[];
  past: EventRow[];
  counts: Record<string, number>;
  surveyData: Record<string, SurveyEntry>;
};

// Top-level client wrapper for the events admin. Holds the selected
// event id and renders one shelf shared across both sections (mirrors
// MembersShell). The upcoming/past split is done on the server so this
// component stays pure (no Date.now during render).

export function EventsShell({ upcoming, past, counts, surveyData }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId
    ? [...upcoming, ...past].find((e) => e.id === selectedId) ?? null
    : null;

  return (
    <>
      <h2 className="admin-section-title">Upcoming ({upcoming.length})</h2>
      <EventList
        events={upcoming}
        counts={counts}
        emptyMessage="No upcoming events."
        onSelect={setSelectedId}
      />

      <h2 className="admin-section-title" style={{ marginTop: 40 }}>
        Past ({past.length})
      </h2>
      <EventList
        events={past}
        counts={counts}
        emptyMessage="No past events yet."
        onSelect={setSelectedId}
      />

      {selected && (
        <EventShelf
          event={selected}
          rsvpCount={counts[selected.id] ?? 0}
          survey={surveyData[selected.id]}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
