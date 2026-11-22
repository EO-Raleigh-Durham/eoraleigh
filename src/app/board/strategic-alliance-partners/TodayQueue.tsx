"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { quickAction } from "./actions";

export type QueueRow = {
  dealId: string;
  company: string;
  stage: string;
  amount: number;
  owner: string | null;
  reason: "overdue" | "due_soon" | "no_next_step" | "stale";
  days: number;
  nextStep: string | null;
  nextFollowup: string | null;
};

function reasonTag(r: QueueRow): { text: string; tone: string } {
  switch (r.reason) {
    case "overdue":
      return { text: `Overdue ${r.days}d`, tone: "bad" };
    case "due_soon":
      return { text: r.days === 0 ? "Due today" : `Due in ${r.days}d`, tone: "warn" };
    case "no_next_step":
      return { text: "No next step", tone: "warn" };
    case "stale":
      return { text: `Quiet ${r.days}d`, tone: "info" };
  }
}

function money(n: number): string {
  return n > 0 ? `$${n.toLocaleString()}` : "";
}

// The daily action list: every open deal that needs a touch, most urgent
// first. One click logs a contact or snoozes the follow-up a week; anything
// bigger opens the deal.
export function TodayQueue({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const [cleared, setCleared] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);

  const remaining = rows.filter((r) => !cleared[r.dealId]).length;
  const visible = showAll ? rows : rows.slice(0, 8);

  function act(row: QueueRow, kind: "contacted" | "snooze") {
    setError(null);
    startTransition(async () => {
      const res = await quickAction(row.dealId, kind);
      if (!res.ok) {
        setError(`${row.company}: ${res.error}`);
        return;
      }
      setCleared((c) => ({
        ...c,
        [row.dealId]: kind === "contacted" ? "Contact logged" : "Snoozed a week",
      }));
      router.refresh();
    });
  }

  return (
    <section className="sap-panel sap-today" aria-label="Today">
      <div className="sap-today-head">
        <h2 className="sap-panel-title">Today</h2>
        <span className="sap-today-count">
          {remaining === 0 ? "All clear" : `${remaining} to clear`}
        </span>
      </div>

      {error && <div className="admin-banner admin-banner--err">{error}</div>}

      {rows.length === 0 ? (
        <p className="sap-today-empty">
          Every open deal has a recent contact and a dated next step. Nice work.
        </p>
      ) : (
        <ul className="sap-queue">
          {visible.map((r) => {
            const tag = reasonTag(r);
            const done = cleared[r.dealId];
            return (
              <li key={r.dealId} className={`sap-queue-row ${done ? "is-done" : ""}`}>
                <span className={`sap-tag sap-tag--${tag.tone}`}>{tag.text}</span>
                <div className="sap-queue-main">
                  <div className="sap-queue-title">
                    <Link href={`/board/strategic-alliance-partners/${r.dealId}`}>{r.company}</Link>
                    <span className="sap-queue-meta">
                      {r.stage}
                      {money(r.amount) && ` · ${money(r.amount)}`}
                      {r.owner && ` · ${r.owner}`}
                    </span>
                  </div>
                  <div className="sap-queue-next">
                    {r.nextStep
                      ? r.nextStep
                      : r.reason === "no_next_step"
                        ? "Set a next step and a date"
                        : "No next step written"}
                  </div>
                </div>
                <div className="sap-queue-actions">
                  {done ? (
                    <span className="sap-queue-done">✓ {done}</span>
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
                      {r.nextFollowup && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost sap-btn-sm"
                          disabled={pending}
                          onClick={() => act(r, "snooze")}
                        >
                          Snooze 7d
                        </button>
                      )}
                      <Link
                        href={`/board/strategic-alliance-partners/${r.dealId}`}
                        className="admin-btn admin-btn--primary sap-btn-sm"
                      >
                        Open
                      </Link>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {rows.length > 8 && (
        <button type="button" className="sap-today-more" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </section>
  );
}
