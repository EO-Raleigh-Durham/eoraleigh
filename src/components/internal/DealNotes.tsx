import { CHAPTER_NAME } from "@/kernel/config/chapter";
import { ClampText } from "./ClampText";
import { listDealNotes, type DealKind } from "@/lib/deal-notes";

// The meeting notes timeline under a deal's form (SAP deals, prospects and
// onboarding). Notes are added from the chapter connector today.
// Server component: reads through the server-only notes module.

function fmt(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function DealNotes({ kind, dealId }: { kind: DealKind; dealId: string }) {
  const notes = await listDealNotes(kind, dealId);
  return (
    <section className="deal-notes" aria-label="Meeting notes">
      <h2 className="deal-notes-title">Meeting notes</h2>
      {notes.length === 0 ? (
        <p className="deal-notes-empty">
          No meeting notes yet. Log one from Claude through the {CHAPTER_NAME} connector.
        </p>
      ) : (
        <ol className="deal-notes-list">
          {notes.map((n) => (
            <li key={n.id} className="deal-note">
              <div className="deal-note-head">
                <span className="deal-note-date">{fmt(n.met_on)}</span>
                {n.title && <span className="deal-note-heading">{n.title}</span>}
                <span className="deal-note-by">
                  {n.author ?? "Unknown"}
                  {n.source === "connector" && " · via connector"}
                </span>
              </div>
              <ClampText className="deal-note-body" text={n.body} />
              {n.next_step && (
                <p className="deal-note-next">
                  <strong>Next step:</strong> {n.next_step}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
