import { requirePermission } from "@/kernel/identity/access-request";
import { PageHead } from "@/kernel/ui/PageHead";
import { Tabs } from "@/kernel/ui/Tabs";
import { getCompanyGoals } from "@/entities/team";
import { listAssignablePeople } from "@/entities/crm";
import { fiscalYearLabel } from "@/entities/org";
import { CompanyGoalsEditor } from "./CompanyGoalsEditor";
import { ChairGoalsEditor } from "./ChairGoalsEditor";
import { NeedsCheckin } from "./NeedsCheckin";
import { FirstReadings, PriorityOverview } from "./GoalsOverview";
import { krProgress, type KrTone } from "@/entities/org/lib/company/kr-progress";

export const metadata = {
  title: "Chapter Goals",
  description: "The chapter priorities for the fiscal year, their key results, and the goals of every chair seat that ladder to them.",
};

// The chapter app's version of edge8-web's company goals page (EO-owned), at
// /board/goals. Tab one is the chapter priorities (objectives) and their key
// results, with inline add / edit / check-in. Tab two is every chair seat's
// goals, laddered to a priority or a key result. Both feed the member-visible
// read at /member/priorities.
export default async function AdminCompanyGoalsPage() {
  await requirePermission("org.company");
  const [goals, people] = await Promise.all([getCompanyGoals(), listAssignablePeople()]);
  const { quarter, tree, initialsById, ladderedByKr, unmeasuredKrIds, pacePct, chairGoals } = goals;
  const fy = fiscalYearLabel(quarter.fiscalYearStart);

  const companyPanel = (
    <>
      <PriorityOverview tree={tree} unmeasuredKrIds={unmeasuredKrIds} pacePct={pacePct} />
      <NeedsCheckin tree={tree} unmeasuredKrIds={unmeasuredKrIds} />
      <FirstReadings tree={tree} unmeasuredKrIds={unmeasuredKrIds} people={people} initialsById={initialsById} />
      <CompanyGoalsEditor
        tree={tree}
        initialsById={initialsById}
        ladderedByKr={ladderedByKr}
        unmeasuredKrIds={unmeasuredKrIds}
        pacePct={pacePct}
        quarter={quarter.label}
        year={quarter.fiscalYearStart}
        people={people}
        emptyLabel={`No priorities for ${fy} yet. Add the first one.`}
      />
    </>
  );

  const chairPanel = <ChairGoalsEditor goals={chairGoals} tree={tree} />;

  // The headline counts the key results by how they read (edge8-web's Company
  // section design), so the state of the year shows before any priority is
  // opened. A key result nobody has measured counts as not measured, never as
  // on track.
  const unmeasured = new Set(unmeasuredKrIds);
  const tones = tree.flatMap((o) => o.krs).map((kr) => krProgress(kr, !unmeasured.has(kr.id)).tone);
  const by = (t: KrTone) => tones.filter((x) => x === t).length;
  const parts = [
    by("hit") && `${by("hit")} hit`,
    by("on") && `${by("on")} on track`,
    by("risk") && `${by("risk")} at risk`,
    by("off") && `${by("off")} off track`,
    by("unmeasured") && `${by("unmeasured")} not measured yet`,
  ].filter(Boolean);
  const title =
    tones.length === 0
      ? `No key results for ${fy} yet`
      : `${tones.length} key ${tones.length === 1 ? "result" : "results"}: ${parts.join(", ")}`;

  return (
    <div className="ats">
      <PageHead
        eyebrow="Chapter · Goals"
        title={title}
        sub={`${quarter.label}, week ${quarter.week} of ${quarter.totalWeeks}. Every board member sees these goals.`}
      />
      <Tabs
        tabs={[
          { key: "company", label: "Priorities and key results", content: companyPanel },
          { key: "chairs", label: "Chair goals", count: chairGoals.length, content: chairPanel },
        ]}
      />
    </div>
  );
}
