import type { Goal, ReportRow } from "@/lib/board-home";
import { goalValueText, STATUS_LABEL } from "@/lib/board-home-shared";

// Every board member's goal, status and cards, off track first. Used on
// Chair Reports and on the President's and chapter manager's My Commitments.

export function StatusPill({ goal }: { goal: Goal | null }) {
  if (!goal) return <span className="bh-pill bh-pill--none">No goal set</span>;
  if (!goal.measured) return <span className="bh-pill bh-pill--none">Not measured yet</span>;
  return <span className={`bh-pill bh-pill--${goal.status}`}>{STATUS_LABEL[goal.status] ?? goal.status}</span>;
}

export function ChairReportTable({ reports }: { reports: ReportRow[] }) {
  const missing = reports.filter((r) => !r.goal?.measured);
  return (
    <>
      <div className="bh-table-wrap">
        <table className="bh-table">
          <thead>
            <tr><th>Chair</th><th>Goal</th><th>Now</th><th>Status</th><th>Cards</th></tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.personId}>
                <td><b>{r.name}</b><br /><span className="bh-muted">{r.roles.join(", ")}</span></td>
                <td>{r.goal?.title ?? <span className="bh-muted">None</span>}</td>
                <td>
                  {r.goal && r.goal.measured
                    ? goalValueText(r.goal.value, r.goal.target, r.goal.unit, r.goal.direction)
                    : <span className="bh-muted">Not measured</span>}
                </td>
                <td><StatusPill goal={r.goal} /></td>
                <td>{r.openCards} open{r.overdueCards ? <span className="bh-overdue"> · {r.overdueCards} overdue</span> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {missing.length > 0 && <p className="bh-sub">No goal reading yet: {missing.map((r) => r.name).join(", ")}.</p>}
    </>
  );
}
