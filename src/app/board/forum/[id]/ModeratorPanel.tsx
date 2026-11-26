"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setForumModerator } from "../actions";
import { CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";
import { fyLabel } from "@/lib/fiscal-year";

type Member = { id: string; name: string };
type YearRow = { year: number; current: { id: string; setByName: string | null; setAt: string | null } | null };

type Props = {
  forumId: string;
  members: Member[];
  years: YearRow[]; // this fiscal year, then the next (year = the year it starts in)
  log: { year: number; personName: string | null; setByName: string | null; setAt: string }[];
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: CHAPTER_TIME_ZONE,
  });

function YearPicker({ forumId, members, row }: { forumId: string; members: Member[]; row: YearRow }) {
  const router = useRouter();
  const [picked, setPicked] = useState(row.current?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = `frm-moderator-${row.year}`;

  async function save() {
    setError(null);
    setSaving(true);
    const result = await setForumModerator(forumId, row.year, picked || null);
    setSaving(false);
    if (!result.ok) return setError(result.error);
    router.refresh();
  }

  return (
    <div className="frm-mod-year">
      <div className="frm-mod-pick">
        <div className="admin-field">
          <label className="admin-label" htmlFor={id}>
            Moderator {fyLabel(row.year)}
          </label>
          <select id={id} value={picked} disabled={saving} onChange={(e) => setPicked(e.target.value)}>
            <option value="">No moderator</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={picked === (row.current?.id ?? "") || saving}
          onClick={save}
        >
          {saving ? "Saving" : "Save"}
        </button>
      </div>
      {row.current?.setAt && (
        <div className="frm-person-meta">
          Named {day(row.current.setAt)}
          {row.current.setByName ? ` by ${row.current.setByName}` : ""}
        </div>
      )}
      {error && (
        <div className="admin-banner admin-banner--err" role="alert" style={{ marginBottom: 0 }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default function ModeratorPanel({ forumId, members, years, log }: Props) {
  return (
    <section className="frm-group frm-mod">
      {members.length === 0 ? (
        <p className="frm-empty">Place members in this forum before naming a moderator</p>
      ) : (
        years.map((row) => <YearPicker key={row.year} forumId={forumId} members={members} row={row} />)
      )}

      <div className="frm-person-meta">
        Moderators change with the fiscal year on 1 July, so next year&apos;s can be named ahead. The moderator
        sets the forum&apos;s monthly dates for their year on their My forum page. Only members of the forum see the dates.
      </div>

      {log.length > 0 && (
        <ul className="frm-mod-log">
          {log.map((entry) => (
            <li key={entry.setAt} className="frm-person-meta">
              {day(entry.setAt)}: {entry.personName ?? "No moderator"} for {fyLabel(entry.year)}
              {entry.setByName ? `, set by ${entry.setByName}` : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
