import Link from "next/link";
import { requireBoardOrAbove } from "@/lib/auth";
import { canRunMeetings, ensureMeeting, listMeetings } from "@/lib/board-meetings";
import { nextBoardMeeting } from "@/lib/board-home-shared";
import { chapterToday } from "@/kernel/config/dates";
import { createNextMeeting } from "./actions";
import "./meetings.css";

export const metadata = { title: "Board Meetings" };
export const dynamic = "force-dynamic";

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// Every board meeting, upcoming first. Plan 35.
export default async function MeetingsPage() {
  const user = await requireBoardOrAbove();
  const next = nextBoardMeeting(chapterToday());
  await ensureMeeting(next);
  const [meetings, runner] = await Promise.all([listMeetings(), canRunMeetings(user)]);
  const hasNext = meetings.some((m) => m.meeting_on === next);
  const upcoming = meetings.filter((m) => m.status === "upcoming").sort((a, b) => a.meeting_on.localeCompare(b.meeting_on));
  const past = meetings.filter((m) => m.status !== "upcoming");

  return (
    <div className="mt">
      <div className="admin-page-head">
        <div className="admin-eyebrow">Chapter</div>
        <h1 className="admin-page-title">Board Meetings</h1>
        <p className="admin-page-sub">Second Tuesday of the month, 3pm. Each meeting runs from its page: open issues, chair updates, minutes and a rating at the end.</p>
      </div>

      {!hasNext && (
        <section className="mt-panel mt-next">
          <div>
            <p className="mt-k">Next meeting</p>
            <p className="mt-big">{fmt(next)}, 3pm</p>
          </div>
          {runner ? (
            <form action={createNextMeeting}>
              <input type="hidden" name="meeting_on" value={next} />
              <button className="admin-btn admin-btn--primary">Set up this meeting</button>
            </form>
          ) : (
            <p className="mt-muted">The President or chapter staff will set it up.</p>
          )}
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mt-panel">
          <h2 className="mt-h2">Upcoming</h2>
          <ul className="mt-rows">
            {upcoming.map((m) => (
              <li key={m.id}>
                <Link href={`/board/meetings/${m.meeting_on}`}>{fmt(m.meeting_on)}</Link>
                <span className="mt-muted">{m.updates} chair updates written</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-panel">
        <h2 className="mt-h2">Past meetings</h2>
        {past.length === 0 ? (
          <p className="mt-muted">None yet.</p>
        ) : (
          <ul className="mt-rows">
            {past.map((m) => (
              <li key={m.id}>
                <Link href={`/board/meetings/${m.meeting_on}`}>{fmt(m.meeting_on)}</Link>
                <span className="mt-muted">
                  {m.status === "cancelled" ? "Cancelled" : `${m.updates} chair updates`}
                  {m.ratingAvg !== null ? ` · rated ${m.ratingAvg}` : ""}
                  {m.source === "sheet_import" ? " · from the tracker sheet" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
