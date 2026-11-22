// Splits a deal's free-text notes blob (deals.description) into separate
// entries. Notes are appended as "[YYYY-MM-DD] text" blocks; each tag at
// the start of a line begins a new entry. Text before the first tag becomes
// one undated entry. Returned newest first; entries sharing a date keep the
// later-written one on top, and undated text sinks to the bottom.

export type NoteEntry = { date: string | null; body: string };

const TAG = /^\[(\d{4}-\d{2}-\d{2})\][ \t]*/gm;

export function parseNoteEntries(text: string | null | undefined): NoteEntry[] {
  if (!text?.trim()) return [];
  const notes: { date: string | null; body: string; i: number }[] = [];
  const matches = [...text.matchAll(TAG)];
  const lead = text.slice(0, matches[0]?.index ?? text.length).trim();
  if (lead) notes.push({ date: null, body: lead, i: 0 });
  matches.forEach((m, k) => {
    const end = matches[k + 1]?.index ?? text.length;
    const body = text.slice(m.index! + m[0].length, end).trim();
    if (body) notes.push({ date: m[1], body, i: k + 1 });
  });
  return notes
    .sort((a, b) => {
      if (a.date === b.date) return b.i - a.i;
      if (a.date === null) return 1;
      if (b.date === null) return -1;
      return a.date < b.date ? 1 : -1;
    })
    .map(({ date, body }) => ({ date, body }));
}

// Appends a new note to the blob as a "[YYYY-MM-DD] text" block, so it
// shows as its own entry. Returns the blob unchanged when the note is empty.
export function appendNote(text: string | null, note: string, today: string): string | null {
  const body = note.trim();
  if (!body) return text;
  const entry = `[${today}] ${body}`;
  return text?.trim() ? `${text.trimEnd()}\n\n${entry}` : entry;
}
