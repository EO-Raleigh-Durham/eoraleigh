import Link from "next/link";
import { LinkedText } from "@/kernel/ui/LinkedText";
import { notFound } from "next/navigation";
import { requireBoardOrAbove } from "@/lib/auth";
import { canRunMeetings, getMeeting, loadMeetingPage, rolesHeld } from "@/lib/board-meetings";
import { loadChairReports } from "@/lib/board-home";
import { meetingsSince } from "@/lib/board-home-shared";
import { chapterToday } from "@/kernel/config/dates";
import { ChairReportTable } from "../../ChairReportTable";
import {
  addAnnouncement,
  createNextMeeting,
  addComment,
  rateMeeting,
  removeAnnouncement,
  saveIssueOutcome,
  saveMeetingDetails,
  saveMinutes,
  saveUpdate,
} from "../actions";
import "../meetings.css";
import "../../board-home.css";

export const dynamic = "force-dynamic";

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return { title: `Board meeting ${date}` };
}

// One board meeting: details, the agenda (opening, announcements, open
// issues, goals, chair updates), minutes and the rating. Plan 35.
export default async function MeetingPage({ params }: { params: Promise<{ date: string }> }) {
  const user = await requireBoardOrAbove();
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const meeting = await getMeeting(date);
  if (!meeting) {
    // The next meeting is linked from My Commitments before anyone sets it up.
    if (date < chapterToday()) notFound();
    const runnerNow = await canRunMeetings(user);
    return (
      <div className="mt">
        <div className="admin-page-head">
          <div className="admin-eyebrow"><Link href="/board/meetings">Board Meetings</Link></div>
          <h1 className="admin-page-title">{fmt(date)}</h1>
          <p className="admin-page-sub">This meeting is not set up yet.</p>
        </div>
        <section className="mt-panel mt-next">
          <p className="mt-muted">Once it is set up, the agenda, chair updates and rating live here.</p>
          {runnerNow ? (
            <form action={createNextMeeting}>
              <input type="hidden" name="meeting_on" value={date} />
              <button className="admin-btn admin-btn--primary">Set up this meeting</button>
            </form>
          ) : (
            <p className="mt-muted">The President or chapter staff will set it up.</p>
          )}
        </section>
      </div>
    );
  }

  const [page, runner, held, reports] = await Promise.all([
    loadMeetingPage(meeting, user.personId),
    canRunMeetings(user),
    rolesHeld(user.personId, meeting.fiscal_year_start),
    loadChairReports(),
  ]);
  const { announcements, issues, chairUpdates, rating, previous } = page;
  const today = chapterToday();
  const written = chairUpdates.filter((c) => c.update).length;
  // Only your own chair opens an editor; a super admin can still save any
  // chair's update through the action, but the page stays readable.
  const canWrite = (roleId: string) => held.includes(roleId);
  const id = meeting.id;

  return (
    <div className="mt">
      <div className="admin-page-head">
        <div className="admin-eyebrow">
          <Link href="/board/meetings">Board Meetings</Link>
        </div>
        <h1 className="admin-page-title">{fmt(meeting.meeting_on)}</h1>
        <p className="admin-page-sub">
          {meeting.status === "cancelled" ? "Cancelled · " : meeting.status === "held" ? "Held · " : ""}
          {hhmm(meeting.starts_at)}
          {meeting.ends_at ? ` to ${hhmm(meeting.ends_at)}` : ""}
          {meeting.location ? ` · ${meeting.location}` : ""}
          {meeting.online_link ? (
            <>
              {" · "}
              <a href={meeting.online_link} target="_blank" rel="noreferrer">Online link</a>
            </>
          ) : null}
          {previous?.ratingAvg !== null && previous ? ` · Last meeting rated ${previous.ratingAvg} by ${previous.ratingCount}` : ""}
        </p>
      </div>

      {runner && (
        <details className="mt-panel mt-edit">
          <summary>Meeting details</summary>
          <form action={saveMeetingDetails} className="mt-form">
            <input type="hidden" name="meeting_id" value={id} />
            <div className="mt-grid">
              <label>Starts<input className="admin-input" type="time" name="starts_at" defaultValue={hhmm(meeting.starts_at)} /></label>
              <label>Ends<input className="admin-input" type="time" name="ends_at" defaultValue={hhmm(meeting.ends_at)} /></label>
              <label>Location<input className="admin-input" name="location" defaultValue={meeting.location ?? ""} /></label>
              <label>Online link<input className="admin-input" name="online_link" defaultValue={meeting.online_link ?? ""} /></label>
              <label>Recording<input className="admin-input" name="recording_url" defaultValue={meeting.recording_url ?? ""} /></label>
              <label>
                Status
                <select className="admin-select" name="status" defaultValue={meeting.status}>
                  <option value="upcoming">Upcoming</option>
                  <option value="held">Held</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>
            <label className="mt-check">
              <input type="checkbox" name="previous_minutes_approved" defaultChecked={Boolean(meeting.previous_minutes_approved)} /> Previous minutes approved
            </label>
            <button className="admin-btn admin-btn--primary admin-btn--sm">Save details</button>
          </form>
        </details>
      )}

      {/* 1. Opening */}
      <section className="mt-panel">
        <h2 className="mt-h2"><span className="mt-n">1</span>Opening</h2>
        <p className="mt-muted">
          One-word opening or a success to celebrate. Previous minutes {meeting.previous_minutes_approved ? "approved" : "not yet approved"}.
        </p>
      </section>

      {/* 2. Announcements */}
      <section className="mt-panel">
        <h2 className="mt-h2"><span className="mt-n">2</span>Announcements</h2>
        {announcements.length === 0 && <p className="mt-muted">No announcements.</p>}
        <ul className="mt-rows">
          {announcements.map((a) => (
            <li key={a.id}>
              <span>
                <b>{a.title}</b>
                {a.details_md && <span className="mt-block mt-muted">{a.details_md}</span>}
              </span>
              {runner && (
                <form action={removeAnnouncement}>
                  <input type="hidden" name="meeting_id" value={id} />
                  <input type="hidden" name="item_id" value={a.id} />
                  <button className="admin-edges-minibtn">Remove</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {runner && (
          <form action={addAnnouncement} className="mt-inline">
            <input type="hidden" name="meeting_id" value={id} />
            <input className="admin-input" name="title" placeholder="Add an announcement" required />
            <button className="admin-btn admin-btn--sm">Add</button>
          </form>
        )}
      </section>

      {/* 3. Open issues */}
      <section className="mt-panel">
        <h2 className="mt-h2"><span className="mt-n">3</span>Open issues <span className="mt-count">{issues.length}</span></h2>
        <p className="mt-muted">
          From <Link href="/board/radar">On the Radar</Link>, oldest first. Record what the board decided on each.
        </p>
        <ol className="mt-issues">
          {issues.map((i) => {
            const since = i.raisedOn ? meetingsSince(i.raisedOn, today) : 0;
            return (
              <li key={i.issueId} className={since >= 2 ? "mt-issue mt-issue--stale" : "mt-issue"}>
                <div className="mt-issue-head">
                  <b>{i.title}</b>
                  {i.row && <span className={`mt-pill mt-pill--${i.row.status}`}>{i.row.status === "deferred" ? "Deferred" : "Discussed"}</span>}
                </div>
                <div className="mt-muted">
                  {i.ownerName ? `Owner ${i.ownerName}` : meeting.status === "upcoming" ? "No owner" : ""}
                  {i.raisedOn ? ` · ${since === 0 ? "new for this meeting" : `carried ${since} meeting${since === 1 ? "" : "s"}`}` : ""}
                </div>
                {i.row?.outcome_md && <p className="mt-outcome">{i.row.outcome_md}</p>}
                {runner && (
                  <details className="mt-edit-inline">
                    <summary>{i.row ? "Edit outcome" : "Record outcome"}</summary>
                    <form action={saveIssueOutcome} className="mt-form">
                      <input type="hidden" name="meeting_id" value={id} />
                      <input type="hidden" name="issue_id" value={i.issueId} />
                      <textarea className="admin-textarea" name="outcome_md" rows={3} defaultValue={i.row?.outcome_md ?? ""} placeholder="What the board decided, who does what by when" />
                      <div className="mt-inline">
                        <select className="admin-select" name="status" defaultValue={i.row?.status === "deferred" ? "deferred" : "discussed"}>
                          <option value="discussed">Discussed</option>
                          <option value="deferred">Deferred to next meeting</option>
                        </select>
                        <button className="admin-btn admin-btn--sm admin-btn--primary">Save outcome</button>
                      </div>
                    </form>
                  </details>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* 4. Goals */}
      <section className="mt-panel">
        <h2 className="mt-h2"><span className="mt-n">4</span>Goals</h2>
        <p className="mt-muted">Each board member&apos;s goal, off track first. Updated on the 1st of each month.</p>
        <ChairReportTable reports={reports} />
      </section>

      {/* 5. Chair updates */}
      <section className="mt-panel">
        <h2 className="mt-h2">
          <span className="mt-n">5</span>Chair updates <span className="mt-count">{written} of {chairUpdates.length} written</span>
        </h2>
        <p className="mt-muted">Read before the meeting, not read out. Questions go in the comments.</p>
        <div className="mt-updates">
          {chairUpdates.map((c) => {
            const mine = canWrite(c.roleId);
            return (
              <article key={c.roleId} className={`mt-update${mine ? " mt-update--mine" : ""}${c.update ? "" : " mt-update--empty"}`}>
                <header>
                  <b>{c.roleName}</b>
                  <span className="mt-muted">{c.holderName ?? c.update?.authorName ?? ""}</span>
                </header>
                {c.update ? (
                  <details className="mt-body">
                    <summary className="mt-clamp"><LinkedText text={c.update.body_md} /></summary>
                    <p><LinkedText text={c.update.body_md} /></p>
                  </details>
                ) : (
                  <p className="mt-muted">{mine ? "Write your update below." : "Not written yet."}</p>
                )}
                {mine && (
                  <details className="mt-edit-inline" open={!c.update}>
                    <summary>{c.update ? "Edit my update" : "My update"}</summary>
                    <form action={saveUpdate} className="mt-form">
                      <input type="hidden" name="meeting_id" value={id} />
                      <input type="hidden" name="board_role_id" value={c.roleId} />
                      <textarea className="admin-textarea" name="body_md" rows={5} defaultValue={c.update?.body_md ?? ""} placeholder="Short talking points. Put anything that needs the board on the Radar." />
                      <button className="admin-btn admin-btn--sm admin-btn--primary">Save update</button>
                    </form>
                  </details>
                )}
                {c.comments.length > 0 && (
                  <ul className="mt-comments">
                    {c.comments.map((cm) => (
                      <li key={cm.id}><b>{cm.author}</b> <LinkedText text={cm.body} /></li>
                    ))}
                  </ul>
                )}
                {c.update && (
                  <form action={addComment} className="mt-inline mt-comment-form">
                    <input type="hidden" name="meeting_id" value={id} />
                    <input type="hidden" name="update_id" value={c.update.id} />
                    <input className="admin-input" name="body" placeholder="Comment or question" />
                    <button className="admin-btn admin-btn--sm">Reply</button>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* 6. Minutes */}
      <section className="mt-panel">
        <h2 className="mt-h2"><span className="mt-n">6</span>Minutes</h2>
        {meeting.recording_url && (
          <p><a href={meeting.recording_url} target="_blank" rel="noreferrer">Recording</a></p>
        )}
        {runner ? (
          <form action={saveMinutes} className="mt-form">
            <input type="hidden" name="meeting_id" value={id} />
            <textarea className="admin-textarea" name="minutes_md" rows={8} defaultValue={meeting.minutes_md ?? ""} placeholder="Decisions, owners and dates" />
            <button className="admin-btn admin-btn--sm admin-btn--primary">Save minutes</button>
          </form>
        ) : meeting.minutes_md ? (
          <p className="mt-pre">{meeting.minutes_md}</p>
        ) : (
          <p className="mt-muted">No minutes yet.</p>
        )}
      </section>

      {/* 7. Rating */}
      <section className="mt-panel mt-rate">
        <h2 className="mt-h2"><span className="mt-n">7</span>Rate this meeting</h2>
        <p className="mt-muted">
          {rating.count ? `${rating.count} rated · average ${rating.average} out of 10` : "Nobody has rated this meeting yet."}
        </p>
        <form action={rateMeeting} className="mt-form">
          <input type="hidden" name="meeting_id" value={id} />
          <div className="mt-scores" role="radiogroup" aria-label="Score from 1 to 10">
            {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => (
              <label key={n} className="mt-score">
                <input type="radio" name="score" value={n} defaultChecked={rating.mine?.score === n} required />
                <span>{n}</span>
              </label>
            ))}
          </div>
          <div className="mt-grid">
            <label>What went well<input className="admin-input" name="went_well" defaultValue={rating.mine?.went_well ?? ""} /></label>
            <label>What to change next time<input className="admin-input" name="change_next_time" defaultValue={rating.mine?.change_next_time ?? ""} /></label>
          </div>
          <button className="admin-btn admin-btn--primary admin-btn--sm">{rating.mine ? "Update my rating" : "Rate this meeting"}</button>
        </form>
        {runner && rating.notes.length > 0 && (
          <ul className="mt-comments">
            {rating.notes.map((n, i) => (
              <li key={i}>
                {n.went_well && <span><b>Went well</b> {n.went_well} </span>}
                {n.change_next_time && <span><b>Change</b> {n.change_next_time}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
