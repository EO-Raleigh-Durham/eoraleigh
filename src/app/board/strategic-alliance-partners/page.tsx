import Link from "next/link";
import { getAllSapPartners, getSapCashTarget, type SapPartner } from "@/lib/sap";
import {
  actionQueue,
  dealFyStart,
  funnel,
  ownerRollup,
  resolveStage,
  scoreboard,
  STAGE_LABEL,
  type PipelineDeal,
} from "@/lib/sap-pipeline";
import { vnToday } from "@/lib/access-grants";
import { currentFyStart, fyWindow } from "@/lib/fiscal-year";
import { PartnersShell } from "./PartnersShell";
import { requireArea } from "@/lib/access-grants-server";
import { roleAtLeast } from "@/lib/access";
import { Funnel, Owners, Scorecard } from "./PipelineCockpit";
import { TodayQueue, type QueueRow } from "./TodayQueue";

function toPipelineDeal(p: SapPartner): PipelineDeal {
  return {
    id: p.deal.id,
    companyName: p.company.name,
    status: p.deal.status,
    pipeline_stage: p.deal.pipeline_stage ?? null,
    amount_usd: p.deal.amount_usd ?? 0,
    cash_usd: p.deal.cash_usd ?? null,
    in_kind_usd: p.deal.in_kind_usd ?? null,
    deal_owner: p.deal.deal_owner,
    last_contact_at: p.deal.last_contact_at,
    next_followup_at: p.deal.next_followup_at,
    next_step: p.deal.next_step ?? null,
    closed_won_at: p.deal.closed_won_at,
    created_at: p.deal.created_at,
  };
}

export const metadata = {
  title: "Strategic Alliance Partners",
  description: "The Strategic Alliance Partner pipeline: leads, deals in progress, and signed partners.",
};
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  view?: string;
  saved?: string;
  deleted?: string;
  error?: string;
  fy?: string;
}>;

export default async function SAPAdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const viewer = await requireArea("sap_pipeline");
  const boardView = roleAtLeast(viewer.role, "board");
  const sp = await searchParams;
  const view = sp.view === "list" ? "list" : "kanban";
  const [partners, target] = await Promise.all([getAllSapPartners(), getSapCashTarget()]);
  const deals = partners.map(toPipelineDeal);
  const today = vnToday();
  const fyStart = currentFyStart();
  const fy = fyWindow(fyStart);
  const fyLabel = `FY${String(fyStart).slice(2)}/${String(fyStart + 1).slice(2)}`;
  const score = scoreboard(deals, fy, target);

  // "All partners" shows the current fiscal year by default; ?fy=all shows
  // every year, including won deals with no close date.
  const showAll = sp.fy === "all";
  const fyOf = (p: SapPartner) =>
    dealFyStart(
      { status: p.deal.status, closed_won_at: p.deal.closed_won_at, lost_at: p.deal.stage_changed_at ?? p.deal.updated_at },
      fyStart,
    );
  const fyPartners = partners.filter((p) => fyOf(p) === fyStart);
  const undatedWon = partners.filter((p) => p.deal.status === "active" && !p.deal.closed_won_at).length;
  const shownPartners = showAll ? partners : fyPartners;
  const href = (q: { view?: string; fy?: string }) => {
    const params = new URLSearchParams();
    const v = q.view ?? view;
    const f = q.fy ?? (showAll ? "all" : "");
    if (v !== "kanban") params.set("view", v);
    if (f) params.set("fy", f);
    const qs = params.toString();
    return `/board/strategic-alliance-partners${qs ? `?${qs}` : ""}`;
  };
  const wonNames = deals
    .filter((d) => d.status === "active" && d.closed_won_at && d.closed_won_at >= fy.start && d.closed_won_at < fy.end)
    .map((d) => d.companyName);
  const queue: QueueRow[] = actionQueue(deals, today).map((q) => ({
    dealId: q.deal.id,
    company: q.deal.companyName,
    stage: STAGE_LABEL[resolveStage(q.deal)],
    amount: q.deal.amount_usd,
    owner: q.deal.deal_owner,
    reason: q.reason,
    days: q.days,
    nextStep: q.deal.next_step,
    nextFollowup: q.deal.next_followup_at,
  }));

  return (
    <div>
      <div className="admin-page-head admin-page-head--row">
        <div>
          <div className="admin-eyebrow">Strategic Alliance Partners</div>
          <h1 className="admin-page-title">Strategic Alliance Partners</h1>
          <p className="admin-page-sub">
            Start with Today: clear each deal that needs a touch. The scoreboard tracks cash against the year&apos;s target; the board below holds every partner (drag cards to change status).
          </p>
        </div>
        <Link
          href="/board/strategic-alliance-partners/new"
          className="admin-btn admin-btn--primary"
        >
          New partner
        </Link>
      </div>

      {sp.deleted && (
        <div className="admin-banner admin-banner--ok">Partner deleted.</div>
      )}
      {sp.saved && <div className="admin-banner admin-banner--ok">Saved.</div>}
      {sp.error && (
        <div className="admin-banner admin-banner--err">{sp.error}</div>
      )}

      <Scorecard score={score} fyLabel={fyLabel} wonNames={wonNames} />

      <div className="sap-cockpit">
        <TodayQueue rows={queue} />
        <div className="sap-cockpit-side">
          <Funnel rows={funnel(deals)} />
          <Owners rows={ownerRollup(deals, today)} />
        </div>
      </div>

      <div className="sap-section-head">
        <h2 className="sap-section-title">{showAll ? "All partners" : `Partners · ${fyLabel}`}</h2>
        <div className="sap-fy-filter" role="group" aria-label="Fiscal year">
          <Link href={href({ fy: "" })} className={`sap-fy-chip ${showAll ? "" : "is-active"}`}>
            {fyLabel} <span className="sap-fy-count">{fyPartners.length}</span>
          </Link>
          <Link href={href({ fy: "all" })} className={`sap-fy-chip ${showAll ? "is-active" : ""}`}>
            All years <span className="sap-fy-count">{partners.length}</span>
          </Link>
        </div>
      </div>
      {!showAll && (
        <p className="sap-fy-note">
          Open deals plus deals won or lost since 1 July.
          {undatedWon > 0 &&
            ` ${undatedWon} won ${undatedWon === 1 ? "partner has" : "partners have"} no close date and ${undatedWon === 1 ? "shows" : "show"} only under All years.`}
        </p>
      )}
      <div className="sap-tabs">
        <Link
          href={href({ view: "kanban" })}
          className={`sap-tab ${view === "kanban" ? "is-active" : ""}`}
        >
          Kanban
        </Link>
        <Link
          href={href({ view: "list" })}
          className={`sap-tab ${view === "list" ? "is-active" : ""}`}
        >
          List
        </Link>
      </div>

      <PartnersShell partners={shownPartners} view={view} boardView={boardView} />
    </div>
  );
}
