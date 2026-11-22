"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { parseNoteEntries, type NoteEntry } from "@/lib/note-entries";

function fmtNoteDate(date: string | null): string {
  if (!date) return "Undated";
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function NoteCard({ note }: { note: NoteEntry }) {
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);

  // Re-measure on resize too: fonts and the drawer's width settle after
  // first paint, which changes whether three lines are enough.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || open) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, note.body]);

  const expandable = clamped || open;
  return (
    <li className={`note-feed${open ? " note-feed--open" : ""}`}>
      <button
        type="button"
        className="note-feed__toggle"
        onClick={() => expandable && setOpen((o) => !o)}
        aria-expanded={expandable ? open : undefined}
        disabled={!expandable}
      >
        <span className="note-feed__date">{fmtNoteDate(note.date)}</span>
        <p ref={bodyRef} className="note-feed__body">
          {note.body}
        </p>
        {expandable && (
          <span className="note-feed__more">{open ? "Show less" : "Read more"}</span>
        )}
      </button>
    </li>
  );
}

export function NoteFeed({ text }: { text: string | null }) {
  const notes = parseNoteEntries(text);
  if (notes.length === 0) return <p className="funnel-empty-tab">No notes yet.</p>;
  return (
    <ol className="note-feed-list">
      {notes.map((note, i) => (
        <NoteCard key={`${note.date}-${i}`} note={note} />
      ))}
    </ol>
  );
}
