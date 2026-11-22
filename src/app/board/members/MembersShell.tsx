"use client";

import { useState } from "react";
import type { RosterMember } from "@/lib/people";
import { MembersList } from "./MembersList";
import { MemberShelf } from "./MemberShelf";

type Props = {
  members: RosterMember[];
  forums: { id: string; name: string }[];
  // Whether the viewer may see revenue. When false the server has already
  // stripped the values; this flag only switches the UI to "Restricted".
  revenueAccess: boolean;
};

// Top-level client wrapper for the members roster. Holds the selected
// row's id and renders the slide-in shelf when set. The list calls
// onSelect on row click; the shelf calls onClose to clear.

export function MembersShell({ members, forums, revenueAccess }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showOnLeave, setShowOnLeave] = useState(false);
  const selected = selectedId
    ? members.find((m) => m.id === selectedId) ?? null
    : null;

  const onLeaveCount = members.filter(
    (m) => m.membership_status === "on_leave"
  ).length;
  const visible = showOnLeave
    ? members
    : members.filter((m) => m.membership_status !== "on_leave");

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showOnLeave}
            onChange={(e) => setShowOnLeave(e.target.checked)}
          />
          Show members on leave ({onLeaveCount})
        </label>
      </div>
      <MembersList members={visible} onSelect={setSelectedId} />
      {selected && (
        <MemberShelf
          key={selected.id}
          member={selected}
          forums={forums}
          revenueAccess={revenueAccess}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
