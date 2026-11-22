"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { quickAction } from "./actions";

export type ContactRow = {
  dealId: string;
  name: string;
  stage: string;
  phone: string | null;
  email: string | null;
  manager: string | null;
  reasons: { text: string; tone: "hot" | "warm" | "info" }[];
  daysSinceTouch: number;
};

type Kind = "contacted" | "close_ghosted";

const DONE_TEXT: Record<Kind, string> = {
  contacted: "Contact logged",
  close_ghosted: "Closed as ghosted",
};

function useQuick() {
  const router = useRouter();
  const [done, setDone] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function act(row: ContactRow, kind: Kind) {
    setError(null);
    startTransition(async () => {
      const res = await quickAction(row.dealId, kind);
      if (!res.ok) {
        setError(`${row.name}: ${res.error}`);
        return;
      }
      setDone((d) => ({ ...d, [row.dealId]: DONE_TEXT[kind] }));
      router.refresh();
    });
  }
  return { done, error, pending, act };
}

function Who({ r }: { r: ContactRow }) {
  return (
    <div className="sap-queue-main">
      <div className="sap-queue-title">
        <Link href={`/board/prospects/${r.dealId}`}>{r.name}</Link>
        <span className="sap-queue-meta">
          {r.manager ? `Owner ${r.manager}` : "No owner"}
        </span>
      </div>
      <div className="pc-contact">
        {r.phone && <a href={`tel:${r.phone.replace(/\s+/g, "")}`}>{r.phone}</a>}
        {r.email && <a href={`mailto:${r.email}`}>{r.email}</a>}
        {!r.phone && !r.email && <span>No contact details</span>}
      </div>
    </div>
  );
}

// "Who should I contact next?": open prospects ranked by priority (stage,
// recent or upcoming events, referrals), not by age.
export function ContactNext({ rows }: { rows: ContactRow[] }) {
  const { done, error, pending, act } = useQuick();
  const [showAll, setShowAll] = useState(false);
  const remaining = rows.filter((r) => !done[r.dealId]).length;
  const visible = showAll ? rows : rows.slice(0, 8);
  return (
    <section className="sap-panel sap-today" aria-label="Contact next">
      <div className="sap-today-head">
        <h2 className="sap-panel-title">Contact next</h2>
        <span className="sap-today-count">{remaining === 0 ? "All clear" : `${remaining} to call`}</span>
      </div>
      <p className="pc-sub">Highest priority first: warm from a recent or upcoming event, further along, or referred.</p>
      {error && <div className="admin-banner admin-banner--err">{error}</div>}
      {rows.length === 0 ? (
        <p className="sap-today-empty">Everyone live has been contacted in the last few days. Nice work.</p>
      ) : (
        <ol className="sap-queue pc-queue">
          {visible.map((r, i) => {
            const d = done[r.dealId];
            return (
              <li key={r.dealId} className={`sap-queue-row ${d ? "is-done" : ""}`}>
                <span className="pc-rank" aria-hidden>{i + 1}</span>
                <Who r={r} />
                <div className="pc-reasons">
                  {r.reasons.map((x) => (
                    <span key={x.text} className={`sap-tag pc-tag--${x.tone}`}>{x.text}</span>
                  ))}
                </div>
                <div className="sap-queue-actions">
                  {d ? (
                    <span className="sap-queue-done">✓ {d}</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost sap-btn-sm"
                        disabled={pending}
                        onClick={() => act(r, "contacted")}
                      >
                        Contacted today
                      </button>
                      <Link href={`/board/prospects/${r.dealId}`} className="admin-btn admin-btn--primary sap-btn-sm">
                        Open
                      </Link>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {rows.length > 8 && (
        <button type="button" className="sap-today-more" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </section>
  );
}

// Dead leads: open, quiet 90+ days, nothing upcoming. Close them so the
// pipeline count stays honest, or mark them still active.
export function ClearOut({ rows }: { rows: ContactRow[] }) {
  const { done, error, pending, act } = useQuick();
  if (rows.length === 0) return null;
  const remaining = rows.filter((r) => !done[r.dealId]).length;
  return (
    <details className="sap-panel pc-clear">
      <summary>
        <span className="sap-panel-title">Clear out</span>
        <span className="pc-clear-count">
          {remaining === 0 ? "All cleared" : `${remaining} dead ${remaining === 1 ? "lead" : "leads"}`}
        </span>
      </summary>
      <p className="pc-sub">No contact or event in 90+ days and nothing upcoming. Close them, or mark them still active if you have spoken recently.</p>
      {error && <div className="admin-banner admin-banner--err">{error}</div>}
      <ul className="sap-queue">
        {rows.map((r) => {
          const d = done[r.dealId];
          return (
            <li key={r.dealId} className={`sap-queue-row ${d ? "is-done" : ""}`}>
              <span className="sap-tag sap-tag--bad">Quiet {r.daysSinceTouch}d</span>
              <Who r={r} />
              <span className="sap-tag sap-tag--info">{r.stage}</span>
              <div className="sap-queue-actions">
                {d ? (
                  <span className="sap-queue-done">✓ {d}</span>
                ) : (
                  <>
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost sap-btn-sm"
                      disabled={pending}
                      onClick={() => {
                        if (window.confirm(`Close ${r.name} as lost (Process Stalled / Ghosted)?`)) act(r, "close_ghosted");
                      }}
                    >
                      Close as ghosted
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost sap-btn-sm"
                      disabled={pending}
                      onClick={() => act(r, "contacted")}
                    >
                      Still active
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
