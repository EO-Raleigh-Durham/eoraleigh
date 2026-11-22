"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RosterMember } from "@/lib/people";
import { setMemberForum } from "./actions";

// Maps a member's stored placement to the select's value. A placed member is
// "placed:<forumId>"; otherwise the forum_status, defaulting to "unclassified".
function forumValueFor(member: RosterMember): string {
  if (member.forum_id) return `placed:${member.forum_id}`;
  if (
    member.forum_status === "forum_trained" ||
    member.forum_status === "waiting_ftp" ||
    member.forum_status === "no_forum" ||
    member.forum_status === "other_chapter"
  ) {
    return member.forum_status;
  }
  return "unclassified";
}

// Inline forum editor. Saves on change via the setMemberForum server action,
// then refreshes the route so the roster and the forum page reflect the move.
// Shared by the roster shelf and the member detail page.
export function ForumPicker({
  member,
  forums,
}: {
  member: RosterMember;
  forums: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(() => forumValueFor(member));
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  function change(next: string) {
    const previous = value;
    setValue(next);
    setStatus("idle");
    startTransition(async () => {
      const res = await setMemberForum(member.id, next);
      if (res.ok) {
        setStatus("saved");
        router.refresh();
      } else {
        setValue(previous);
        setStatus("error");
      }
    });
  }

  return (
    <div className="admin-field">
      <label className="admin-label" htmlFor="member-forum-select">
        Forum placement
      </label>
      <select
        id="member-forum-select"
        value={value}
        onChange={(e) => change(e.target.value)}
        disabled={pending}
      >
        <optgroup label="In a forum">
          {forums.map((f) => (
            <option key={f.id} value={`placed:${f.id}`}>
              {f.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Not in a forum">
          <option value="forum_trained">Forum trained, needs placement</option>
          <option value="waiting_ftp">Waiting for FTP</option>
          <option value="other_chapter">Other chapter forum</option>
          <option value="no_forum">No forum</option>
          <option value="unclassified">Unclassified</option>
        </optgroup>
      </select>
      <span className="admin-hint">
        {pending
          ? "Saving…"
          : status === "saved"
            ? "Saved. Forum rosters updated"
            : status === "error"
              ? "Could not save, try again"
              : "Changes save immediately"}
      </span>
    </div>
  );
}
