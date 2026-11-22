import { requirePermission } from "@/kernel/identity/access-request";
import { companyOs } from "@/kernel/data/supabase";
import { selectKeyResults } from "@/entities/org";
import { listAssignablePeople, listPeopleNames } from "@/entities/crm";
import { ISSUE_SELECT, type IssueRow } from "@/entities/org";
import { IssuesBoard } from "./IssuesBoard";
import { chapterToday } from "@/kernel/config/dates";
import "./radar.css";

export const metadata = {
  title: "On the Radar",
  description: "Anything a board member raises for the board: assigned to someone, then solved, dropped, or turned into work.",
};

// The chapter app's version of edge8-web's issues page (EO-owned): the chapter
// board tracker's On the Radar tab.

export default async function IssuesPage() {
  // The page's declared permission (ADR 0013).
  await requirePermission("ideas.manage");
  const [issuesRes, krRes, teamOptions] = await Promise.all([
    companyOs.from("issues").select(ISSUE_SELECT).order("created_at", { ascending: false }),
    selectKeyResults("id, title"),
    listAssignablePeople(),
  ]);

  const issues = (issuesRes.data ?? []) as IssueRow[];
  const krs = ((krRes.data ?? []) as { id: string; title: string }[]).sort((a, b) => a.title.localeCompare(b.title));

  // The picker offers the current roster. Names are also needed for assignees
  // who have since left, so their closed issues still read as theirs.
  const personName = await listPeopleNames([
    ...teamOptions.map((p) => p.id),
    ...(issues.map((i) => i.assignee_person_id).filter(Boolean) as string[]),
  ]);

  // Each active issue's mirror card on the Board workboard (subject_type issue).
  const activeIds = issues.filter((i) => i.status === "open" || i.status === "solving").map((i) => i.id);
  const { data: cardRows } = activeIds.length
    ? await companyOs.from("tasks").select("id, subject_id").eq("subject_type", "issue").in("subject_id", activeIds).is("archived_at", null)
    : { data: [] as { id: string; subject_id: string }[] };
  const cards = Object.fromEntries(((cardRows ?? []) as { id: string; subject_id: string }[]).map((c) => [c.subject_id, c.id]));

  const error = issuesRes.error?.message ?? krRes.error?.message ?? null;

  return (
    <div className="ats">
      <div className="ats-hero eo-strat-hero">
        <p className="ats-k">Chapter · On the Radar</p>
        <h1 className="ats-h eo-strat-headline">What the board needs to deal with</h1>
        <p className="ats-sub">
            Each item has one owner and a card on their Workboard. Keep the list short by merging repeats and closing what is done.
          </p>
      </div>
      {error && (
        <div className="admin-alert admin-alert--err u-mb-4">
          {error}
        </div>
      )}
      <IssuesBoard
        issues={issues}
        krs={krs}
        personNames={Object.fromEntries(personName)}
        teamOptions={teamOptions}
        cards={cards}
        today={chapterToday()}
      />
    </div>
  );
}
