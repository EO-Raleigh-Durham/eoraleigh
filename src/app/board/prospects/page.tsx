import Link from "next/link";
import {
  fullName,
  getDealsByPipeline,
  getEoStaff,
  getNewMemberTarget,
  getProspectEventTouches,
  listDealFiscalYears,
  type DealCard,
  type DealFilters,
} from "@/lib/deals";
import { currentFyStart, fyLabel, fyWindow } from "@/lib/fiscal-year";
import {
  clearOut,
  daysBetween,
  priorityQueue,
  prospectFunnel,
  prospectScoreboard,
  type ProspectDeal,
} from "@/lib/prospect-pipeline";
import { vnToday } from "@/lib/access-grants";
import { ProspectFunnel, ProspectScorecard } from "./ProspectCockpit";
import { ClearOut, ContactNext, type ContactRow } from "./ContactNext";
import { FiltersBar } from "./FiltersBar";
import { ProspectsShell } from "./ProspectsShell";
import "../funnel.css";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Prospects",
  description: `The ${CHAPTER_NAME} membership prospect pipeline by stage and fiscal year.`,
};
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  view?: string;
  q?: string;
  fy?: string;
  saved?: string;
  deleted?: string;
  error?: string;
}>;

function one(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function ProspectsAdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const view = sp.view === "list" ? "list" : "kanban";

  // Fiscal-year scope for closed deals. No param defaults to the current FY
  // (so prior-year closed deals fall away as the year rolls over); "all"
  // lifts the scope entirely; a year value pins a specific FY.
  const fyParam = one(sp.fy);
  const fyStart =
    fyParam === "all"
      ? undefined
      : fyParam && Number.isFinite(Number(fyParam))
        ? Number(fyParam)
        : currentFyStart();

  const filters: DealFilters = {
    q: one(sp.q)?.trim() || undefined,
    fyStart,
  };

  // The cockpit always reads the current FY, independent of the board's
  // search and year filters below it.
  const cockpitFy = currentFyStart();
  const [deals, staff, fiscalYears, cockpitDeals, target] = await Promise.all([
    getDealsByPipeline("Member Acquisition", filters),
    getEoStaff(),
    listDealFiscalYears("Member Acquisition"),
    getDealsByPipeline("Member Acquisition", { fyStart: cockpitFy }),
    getNewMemberTarget(),
  ]);

  const today = vnToday();
  const pipelineDeals: ProspectDeal[] = cockpitDeals.map((c) => ({
    id: c.deal.id,
    name: dealLabel(c),
    stage: c.deal.stage,
    deal_status: c.deal.deal_status,
    close_date: c.deal.close_date,
    channel_source: c.deal.channel_source,
    last_activity_at: c.deal.last_activity_at,
    created_at: c.deal.created_at,
    person_id: c.deal.person_id,
  }));
  const touches = await getProspectEventTouches(
    cockpitDeals
      .filter((c) => c.deal.deal_status === "open" && c.deal.person_id)
      .map((c) => c.deal.person_id!),
  );
  const byId = new Map(cockpitDeals.map((c) => [c.deal.id, c]));
  const toRow = (
    d: ProspectDeal,
    reasons: ContactRow["reasons"],
    lastTouchDay: string,
  ): ContactRow => {
    const c = byId.get(d.id)!;
    return {
      dealId: d.id,
      name: d.name,
      stage: d.stage,
      phone: c.person?.phone ?? null,
      email: c.person?.email ?? null,
      manager: c.manager ? fullName(c.manager) : null,
      reasons,
      daysSinceTouch: daysBetween(lastTouchDay, today),
    };
  };
  const contactRows = priorityQueue(pipelineDeals, touches, today).map((q) =>
    toRow(q.deal, q.reasons, q.signals.lastTouchDay),
  );
  const deadRows = clearOut(pipelineDeals, touches, today).map((q) =>
    toRow(q.deal, [], q.signals.lastTouchDay),
  );
  const score = prospectScoreboard(pipelineDeals, touches, fyWindow(cockpitFy), target, today);

  // Tab links preserve the active filters and only flip the view.
  function tabHref(target: "kanban" | "list"): string {
    const params = new URLSearchParams();
    const q = one(sp.q);
    if (q) params.set("q", q);
    if (fyParam) params.set("fy", fyParam);
    if (target === "list") params.set("view", "list");
    const qs = params.toString();
    return `/board/prospects${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="admin-page-head admin-page-head--row">
        <div>
          <div className="admin-eyebrow">Member Acquisition</div>
          <h1 className="admin-page-title">Prospects</h1>
          <p className="admin-page-sub">
            Track membership applicants through the acquisition funnel. Start with
            Contact next: it ranks live prospects by who is warmest, not who is
            oldest. Clear out closes dead leads. The board below holds every
            deal; drag cards across columns to change stage.
          </p>
        </div>
        <Link
          href="/board/prospects/new"
          className="admin-btn admin-btn--primary"
        >
          New deal
        </Link>
      </div>

      {sp.deleted && (
        <div className="admin-banner admin-banner--ok">Deal deleted.</div>
      )}
      {sp.saved && <div className="admin-banner admin-banner--ok">Saved.</div>}
      {sp.error && (
        <div className="admin-banner admin-banner--err">{sp.error}</div>
      )}

      <ProspectScorecard score={score} fyLabel={fyLabel(cockpitFy)} />

      <div className="sap-cockpit">
        <div>
          <ContactNext rows={contactRows} />
          <ClearOut rows={deadRows} />
        </div>
        <div className="sap-cockpit-side">
          <ProspectFunnel rows={prospectFunnel(pipelineDeals)} />
        </div>
      </div>

      <h2 className="sap-section-title">All prospects</h2>

      <FiltersBar
        view={view}
        q={one(sp.q) ?? ""}
        fy={fyParam === "all" ? "all" : String(fyStart)}
        years={fiscalYears}
      />

      <div className="sap-tabs">
        <Link
          href={tabHref("kanban")}
          className={`sap-tab ${view === "kanban" ? "is-active" : ""}`}
        >
          Kanban
        </Link>
        <Link
          href={tabHref("list")}
          className={`sap-tab ${view === "list" ? "is-active" : ""}`}
        >
          List
        </Link>
      </div>

      <ProspectsShell deals={deals} staff={staff} view={view} />
    </div>
  );
}

// The prospect's name for the cockpit lists: the person, else the deal name.
function dealLabel(c: DealCard): string {
  const person = c.person ? fullName(c.person) : "";
  return person || c.deal.name;
}
