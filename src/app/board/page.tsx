import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { roleAtLeast } from "@/lib/access";
import { loadBoardHome } from "@/lib/board-home";
import { ensureMeeting, lastMeetingBefore } from "@/lib/board-meetings";
import { goalValueText, nextBoardMeeting } from "@/lib/board-home-shared";
import { ChairReportTable, StatusPill } from "./ChairReportTable";
import { getWorkboard } from "@/entities/boards/lib/workboard";
import { Workboard } from "@/entities/boards/ui/Workboard";
import { Edge8Frame } from "./edge8/Edge8Frame";
import { moveCardColumn } from "@/entities/boards";
import "./board-home.css";

export const metadata = { title: "My Commitments" };
export const dynamic = "force-dynamic";

// My Commitments: the board workspace's home. Each person sees their own
// commitments first (their goal, the next meeting, their cards); the President
// adds "My reports" across every chair, and the chapter manager adds the
// accountability panel. Plan 35, phase 5.

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default async function MyBoard({ searchParams }: { searchParams: Promise<{ as?: string; cards?: string }> }) {
  const user = await getSessionUser();
  if (!user || !roleAtLeast(user.role, "board")) redirect("/admin/login");
  const { as, cards: cardView } = await searchParams;
  const listView = cardView === "list";
  const previewAs = user.role === "super_admin" && as ? as : null;

  const home = await loadBoardHome(user.personId, user.fullName, previewAs);
  const { viewer, goal, cards, reports, accountability, today } = home;
  const myBoard = viewer.personId && !listView ? await getWorkboard({ scope: { kind: "all" }, assigneeId: viewer.personId }) : null;
  const openCards = cards.filter((c) => c.stage !== "done");
  const meeting = nextBoardMeeting(today);
  await ensureMeeting(meeting);
  const lastMeeting = await lastMeetingBefore(today);
  const overdue = openCards.filter((c) => c.overdue).length;

  return (
    <div className="bh">
      <div className="admin-page-head">
        <div className="u-min-0">
          <div className="admin-eyebrow">My Commitments{previewAs ? ` · previewing ${previewAs}` : ""}</div>
          <h1 className="admin-page-title">Good to see you, {viewer.firstName}</h1>
          <p className="admin-page-sub">
            {viewer.roleNames.length ? viewer.roleNames.join(" · ") : "Board"} · FY26/27
          </p>
        </div>
      </div>

      <div className="bh-tiles">
        {!viewer.isManager || viewer.personId ? (
          <section className="bh-tile">
            <p className="bh-k">My goal</p>
            {goal ? (
              <>
                <p className="bh-big">{goal.measured ? goalValueText(goal.value, goal.target, goal.unit, goal.direction) : "Not measured yet"}</p>
                <p className="bh-line">{goal.title}</p>
                <StatusPill goal={goal} />
              </>
            ) : (
              <p className="bh-line">No goal on the tracker for you yet.</p>
            )}
            <Link className="bh-link" href="/board/goals">All chapter goals</Link>
          </section>
        ) : null}

        <section className="bh-tile">
          <p className="bh-k">Next board meeting</p>
          <p className="bh-big">{fmtDay(meeting)}, 3pm</p>
          <p className="bh-line">Write your update on the agenda before the meeting. The open issues come from the Radar.</p>
          <Link className="bh-link" href={`/board/meetings/${meeting}`}>Open the agenda</Link>
        </section>

        <section className="bh-tile">
          <p className="bh-k">My cards</p>
          <p className="bh-big">{openCards.length}</p>
          <p className="bh-line">{overdue ? `${overdue} overdue` : "Nothing overdue"}</p>
          <Link className="bh-link" href="/board/workboards/my-week">My week</Link>
        </section>
      </div>

      {accountability && (
        <section className="bh-panel">
          <h2 className="bh-h2">Before {fmtDay(meeting)}</h2>
          <div className="bh-tiles bh-tiles--small">
            <div className="bh-tile"><p className="bh-k">Overdue cards across the board</p><p className="bh-big">{accountability.overdueCards}</p></div>
            <div className="bh-tile"><p className="bh-k">Radar issues open 60+ days</p><p className="bh-big">{accountability.issuesOpen60}</p><Link className="bh-link" href="/board/radar">On the Radar</Link></div>
            <div className="bh-tile"><p className="bh-k">Chairs with no goal reading</p><p className="bh-big">{accountability.missingGoalReadings}</p><Link className="bh-link" href="/board/goals">Goals</Link></div>
          </div>
        </section>
      )}

      {reports && (
        <section className="bh-panel">
          <h2 className="bh-h2">{viewer.isPresident ? "My reports" : "Every chair"}</h2>
          <p className="bh-sub">Off track first. Goals update on the 1st of each month.</p>
          <ChairReportTable reports={reports} />
        </section>
      )}

      <section className="bh-panel">
        <div className="bh-cards-head">
          <h2 className="bh-h2">My cards</h2>
          <nav className="bh-toggle" aria-label="Card view">
            <Link href={`?${new URLSearchParams({ ...(as ? { as } : {}) }).toString()}`} className={listView ? "" : "is-on"} scroll={false}>Board</Link>
            <Link href={`?${new URLSearchParams({ ...(as ? { as } : {}), cards: "list" }).toString()}`} className={listView ? "is-on" : ""} scroll={false}>List</Link>
          </nav>
        </div>
        {!listView && myBoard ? (
          <Edge8Frame>
            <Workboard data={myBoard} onMove={moveCardColumn} viewerPersonId={viewer.personId} bare />
          </Edge8Frame>
        ) : cards.length === 0 ? (
          <p className="bh-sub">No cards assigned to you.</p>
        ) : (
          <ul className="bh-cards">
            {cards.map((c) => (
              <li key={c.id}>
                <Link href={c.boardSlug ? `/board/workboards/boards/${c.boardSlug}` : "/board/workboards"}>{c.title}</Link>
                <span className={c.overdue ? "bh-pill bh-pill--off_track" : "bh-pill bh-pill--none"}>
                  {c.overdue ? `Overdue ${fmtDay(c.dueDate!)}` : c.stage === "done" ? "Done" : c.column ?? "To do"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bh-panel">
        <h2 className="bh-h2">Board meetings</h2>
        <div className="bh-meetings">
          <Link className="bh-meeting is-next" href={`/board/meetings/${meeting}`}>
            <span className="bh-k">Next meeting</span>
            <b>{fmtDay(meeting)}, 3pm</b>
            <span>Open the agenda and write your update</span>
          </Link>
          {lastMeeting && (
            <Link className="bh-meeting" href={`/board/meetings/${lastMeeting}`}>
              <span className="bh-k">Last meeting</span>
              <b>{fmtDay(lastMeeting)}</b>
              <span>Minutes, decisions and ratings</span>
            </Link>
          )}
        </div>
        <Link className="bh-link" href="/board/meetings">All meetings</Link>
      </section>
    </div>
  );
}
