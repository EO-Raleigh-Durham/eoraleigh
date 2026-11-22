"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DetailDrawer } from "@/kernel/ui/DetailDrawer";
import { PersonSelect } from "@/entities/crm/client";
import type { PersonOption } from "@/entities/crm/client";
import { ISSUE_DIAGNOSES, type IssueRow } from "@/entities/org/client";
import { createIssue, mergeIssue, setIssueAssignee, setIssueStatus } from "./actions";
import { meetingsSince, nextBoardMeeting } from "@/lib/board-home-shared";

const DIAG_LABEL: Record<string, string> = {
  goal: "Decision",
  system: "Process gap",
  execution: "Slipped",
};

// Past this many active items the list is too long for one board meeting.
const MEETING_LIMIT = 6;

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function IssuesBoard({
  issues,
  krs,
  personNames,
  teamOptions,
  cards,
  today,
}: {
  issues: IssueRow[];
  krs: { id: string; title: string }[];
  personNames: Record<string, string>;
  teamOptions: PersonOption[];
  cards: Record<string, string>;
  today: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // A solved or dropped item opened from the list below, to read or reopen.
  const [viewing, setViewing] = useState<IssueRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const krTitle = new Map(krs.map((k) => [k.id, k.title]));
  const personOptions = teamOptions.map((p) => ({ value: p.id, label: p.name }));

  // Oldest first: the longer an item has been carried, the more it needs the board.
  const active = issues
    .filter((i) => i.status === "open" || i.status === "solving")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const closed = issues.filter((i) => i.status === "solved" || i.status === "dropped");
  const unassigned = active.filter((i) => !i.assignee_person_id).length;
  const carried = active.filter((i) => meetingsSince(i.created_at, today) >= 2).length;
  const meeting = nextBoardMeeting(today);

  async function run(id: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusyId(id);
    const res = await fn();
    setBusyId(null);
    if (!res.ok) setErr(res.error ?? "Something went wrong.");
    else {
      setErr(null);
      startTransition(() => router.refresh());
    }
  }

  return (
    <>
      {err && (
        <div className="admin-alert admin-alert--err u-mb-4">
          {err}
        </div>
      )}

      <div className="radar-summary">
        <div className="radar-stat">
          <span className="radar-stat-k">For {fmtDay(meeting)}</span>
          <span className="radar-stat-v">{active.length}</span>
          <span className="radar-stat-s">active items</span>
        </div>
        <div className={`radar-stat${unassigned ? " radar-stat--warn" : ""}`}>
          <span className="radar-stat-k">No owner</span>
          <span className="radar-stat-v">{unassigned}</span>
          <span className="radar-stat-s">need someone</span>
        </div>
        <div className={`radar-stat${carried ? " radar-stat--warn" : ""}`}>
          <span className="radar-stat-k">Carried 2+ meetings</span>
          <span className="radar-stat-v">{carried}</span>
          <span className="radar-stat-s">close or escalate</span>
        </div>
        <button className="admin-btn admin-btn--primary admin-btn--sm radar-raise" onClick={() => setDrawerOpen(true)}>
          + Raise an item
        </button>
      </div>

      {active.length > MEETING_LIMIT && (
        <div className="admin-alert admin-alert--warn u-mb-4">
          {active.length} items is more than one meeting can handle. Merge repeats, close what is done, and keep it to about {MEETING_LIMIT}.
        </div>
      )}

      {active.length === 0 ? (
        <div className="admin-empty u-mb-4">Nothing on the radar. Raise an item for the next meeting.</div>
      ) : (
        <ol className="radar-list">
          {active.map((i, n) => {
            const since = meetingsSince(i.created_at, today);
            const others = active.filter((o) => o.id !== i.id);
            const busy = busyId === i.id;
            return (
              <li key={i.id} className={`radar-item${since >= 2 ? " radar-item--stale" : ""}`}>
                <div className="radar-num">{n + 1}</div>
                <div className="radar-body">
                  <div className="radar-head">
                    <h3 className="radar-title">{i.title}</h3>
                    <span className={`radar-pill radar-pill--${i.status}`}>{i.status === "solving" ? "Being solved" : "Open"}</span>
                  </div>
                  <div className="radar-meta">
                    <span>{DIAG_LABEL[i.diagnosis] ?? i.diagnosis}</span>
                    <span>Raised by {i.filed_by.replace(/:auto$/, "")}</span>
                    <span className={since >= 2 ? "radar-stale" : undefined}>
                      {since === 0 ? "New for this meeting" : `Carried ${since} meeting${since === 1 ? "" : "s"}`}
                    </span>
                    {i.key_result_id && <span>Goal: {krTitle.get(i.key_result_id) ?? "linked"}</span>}
                    {cards[i.id] && (
                      <Link href={`/board/workboards/boards/board?card=${cards[i.id]}`} className="radar-link">
                        View card
                      </Link>
                    )}
                  </div>
                  {i.notes_md && (
                    <details className="radar-notes">
                      <summary>Notes</summary>
                      <p>{i.notes_md}</p>
                    </details>
                  )}
                  <div className="radar-actions">
                    <PersonSelect
                      compact
                      ariaLabel={`Owner of ${i.title}`}
                      className="u-min-2"
                      value={i.assignee_person_id ?? ""}
                      disabled={busy}
                      onChange={(personId) => personId && run(i.id, () => setIssueAssignee(i.id, personId))}
                      emptyLabel="No owner"
                      options={
                        i.assignee_person_id && !teamOptions.some((p) => p.id === i.assignee_person_id)
                          ? [...personOptions, { value: i.assignee_person_id, label: personNames[i.assignee_person_id] ?? "Former board member" }]
                          : personOptions
                      }
                    />
                    {i.status === "open" && (
                      <button className="admin-edges-minibtn" disabled={busy} onClick={() => run(i.id, () => setIssueStatus(i.id, "solving"))}>
                        Start solving
                      </button>
                    )}
                    <button className="admin-edges-minibtn" disabled={busy} onClick={() => run(i.id, () => setIssueStatus(i.id, "solved"))}>
                      Solved
                    </button>
                    <button className="admin-edges-minibtn" disabled={busy} onClick={() => run(i.id, () => setIssueStatus(i.id, "dropped"))}>
                      Drop
                    </button>
                    {others.length > 0 && (
                      <select
                        className="admin-select radar-merge"
                        aria-label={`Merge ${i.title} into another item`}
                        value=""
                        disabled={busy}
                        onChange={(e) => e.target.value && run(i.id, () => mergeIssue(i.id, e.target.value))}
                      >
                        <option value="">Merge into…</option>
                        {others.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.title.slice(0, 70)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {closed.length > 0 && (
        <details className="radar-closed">
          <summary>Solved and dropped ({closed.length})</summary>
          <ul>
            {closed.map((i) => (
              <li key={i.id}>
                <button type="button" className="radar-closed-row" onClick={() => setViewing(i)}>
                  <span className={`radar-pill radar-pill--${i.status}`}>{i.status === "solved" ? "Solved" : "Dropped"}</span>
                  <span className="radar-closed-title">{i.title}</span>
                  <span className="radar-closed-meta">
                    {i.assignee_person_id ? `${personNames[i.assignee_person_id] ?? "Former board member"} · ` : ""}
                    {(i.resolved_at ?? i.created_at).slice(0, 10)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <DetailDrawer
        open={viewing !== null}
        onClose={() => setViewing(null)}
        eyebrow={viewing?.status === "solved" ? "Solved" : "Dropped"}
        title={viewing?.title ?? ""}
      >
        {viewing && (
          <div className="admin-form">
            {err && <div className="admin-alert admin-alert--err">{err}</div>}
            <dl className="radar-facts">
              <dt>Owner</dt>
              <dd>{viewing.assignee_person_id ? personNames[viewing.assignee_person_id] ?? "Former board member" : "No owner"}</dd>
              <dt>{viewing.status === "solved" ? "Solved" : "Dropped"}</dt>
              <dd>{(viewing.resolved_at ?? viewing.created_at).slice(0, 10)}</dd>
              <dt>Type</dt>
              <dd>{DIAG_LABEL[viewing.diagnosis] ?? viewing.diagnosis}</dd>
              {viewing.key_result_id && (
                <>
                  <dt>Goal</dt>
                  <dd>{krTitle.get(viewing.key_result_id) ?? "linked"}</dd>
                </>
              )}
            </dl>
            {viewing.notes_md && <p className="radar-notes-full">{viewing.notes_md}</p>}
            <div className="admin-form-actions">
              <button
                className="admin-btn admin-btn--primary"
                disabled={busyId === viewing.id}
                onClick={async () => {
                  const id = viewing.id;
                  setBusyId(id);
                  const res = await setIssueStatus(id, "open");
                  setBusyId(null);
                  if (!res.ok) setErr(res.error ?? "Could not reopen.");
                  else {
                    setErr(null);
                    setViewing(null);
                    startTransition(() => router.refresh());
                  }
                }}
              >
                {busyId === viewing.id ? "Reopening…" : "Reopen"}
              </button>
            </div>
          </div>
        )}
      </DetailDrawer>

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} eyebrow="Chapter" title="Raise an item">
        <IssueForm
          krs={krs}
          teamOptions={teamOptions}
          onDone={(res) => {
            if (res.ok) {
              setDrawerOpen(false);
              startTransition(() => router.refresh());
            }
          }}
        />
      </DetailDrawer>
    </>
  );
}

function IssueForm({
  krs,
  teamOptions,
  onDone,
}: {
  krs: { id: string; title: string }[];
  teamOptions: PersonOption[];
  onDone: (res: { ok: boolean; error?: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [diagnosis, setDiagnosis] = useState<string>("system");
  const [assignee, setAssignee] = useState<string>("");
  const [krId, setKrId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="admin-form">
      {err && <div className="admin-alert admin-alert--err">{err}</div>}
      <div className="admin-field">
        <label className="admin-label">What should the board know or decide?</label>
        <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="u-grid-2 u-gap-3">
        <div className="admin-field">
          <label className="admin-label">Diagnosis</label>
          <select className="admin-select" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}>
            {ISSUE_DIAGNOSES.map((d) => (
              <option key={d} value={d}>
                {d === "goal" ? "decision needed (a goal or target)" : d === "system" ? "process or system gap" : "execution slipped"}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label className="admin-label">Which key result does it touch?</label>
          <select className="admin-select" value={krId} onChange={(e) => setKrId(e.target.value)}>
            <option value="">none / general</option>
            {krs.map((k) => (
              <option key={k.id} value={k.id}>
                {k.title.slice(0, 60)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="admin-field">
        <label className="admin-label">Assigned to</label>
        <PersonSelect
          value={assignee}
          onChange={setAssignee}
          options={teamOptions.map((p) => ({ value: p.id, label: p.name }))}
          emptyLabel="Pick a board member"
        />
      </div>
      <div className="admin-field">
        <label className="admin-label">Notes (context, proposed fix)</label>
        <textarea className="admin-textarea" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="admin-form-actions">
        <button
          className="admin-btn admin-btn--primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const res = await createIssue({
              title,
              diagnosis,
              assignee_person_id: assignee,
              key_result_id: krId || undefined,
              notes_md: notes,
            });
            setBusy(false);
            if (!res.ok) setErr(res.error ?? "Something went wrong.");
            else onDone(res);
          }}
        >
          {busy ? "Saving…" : "Raise it"}
        </button>
      </div>
    </div>
  );
}
