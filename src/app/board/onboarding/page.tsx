import Link from "next/link";
import {
  ONBOARDING_STAGES,
  daysInStage,
  fullName,
  getDealsByPipeline,
  getEoStaff,
  type DealFilters,
} from "@/lib/deals";
import { OnboardingShell } from "./OnboardingShell";
import "../funnel.css";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Onboarding",
  description: `Incoming ${CHAPTER_NAME} members moving through the onboarding pipeline.`,
};
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  view?: string;
  q?: string;
  stage?: string | string[];
  manager?: string;
  stale?: string;
  saved?: string;
  deleted?: string;
  error?: string;
}>;

function one(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

// URL params can be CSV (?stage=A,B) or repeated (?stage=A&stage=B).
function csv(v: string | string[] | undefined): string[] | undefined {
  if (v == null) return undefined;
  const raw = Array.isArray(v) ? v.join(",") : v;
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

export default async function OnboardingAdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const view = sp.view === "list" ? "list" : "kanban";

  const staleNum = sp.stale ? Number(sp.stale) : NaN;
  const filters: DealFilters = {
    stages: csv(sp.stage),
    managerId: one(sp.manager) || undefined,
    staleDays: Number.isFinite(staleNum) ? staleNum : undefined,
    q: one(sp.q)?.trim() || undefined,
  };

  const [deals, staff] = await Promise.all([
    getDealsByPipeline("Onboarding Track", filters),
    getEoStaff(),
  ]);

  const total = deals.length;
  const active = deals.filter((d) => d.deal.stage === "Active Member").length;
  const inProgress = total - active;
  const stale = deals.filter(
    (d) => d.deal.stage !== "Active Member" && daysInStage(d.deal) >= 14,
  ).length;

  // Tab links preserve the active filters and only flip the view.
  function tabHref(target: "kanban" | "list"): string {
    const params = new URLSearchParams();
    const q = one(sp.q);
    const stage = one(sp.stage);
    const manager = one(sp.manager);
    if (q) params.set("q", q);
    if (stage) params.set("stage", stage);
    if (manager) params.set("manager", manager);
    if (sp.stale) params.set("stale", String(one(sp.stale)));
    if (target === "list") params.set("view", "list");
    const qs = params.toString();
    return `/board/onboarding${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="admin-page-head admin-page-head--row">
        <div>
          <div className="admin-eyebrow">Onboarding Track</div>
          <h1 className="admin-page-title">Onboarding</h1>
          <p className="admin-page-sub">
            Guide new members from welcome through forum placement. Click a card
            to open its detail shelf; drag cards across columns to change stage.
          </p>
        </div>
        <Link
          href="/board/onboarding/new"
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

      <div className="admin-card-grid" style={{ marginBottom: 24 }}>
        <Stat label="In view" value={total} />
        <Stat label="Active members" value={active} />
        <Stat label="In progress" value={inProgress} />
        <Stat label="Stale 14d+" value={stale} />
      </div>

      <form method="get" className="funnel-filters">
        <input type="hidden" name="view" value={view} />
        <div className="funnel-filter funnel-filter--grow">
          <label className="funnel-filter-label" htmlFor="f-q">
            Search
          </label>
          <input
            id="f-q"
            name="q"
            type="search"
            defaultValue={one(sp.q) ?? ""}
            placeholder="Name, email, company, or deal"
          />
        </div>
        <div className="funnel-filter">
          <label className="funnel-filter-label" htmlFor="f-stage">
            Stage
          </label>
          <select id="f-stage" name="stage" defaultValue={one(sp.stage) ?? ""}>
            <option value="">All stages</option>
            {ONBOARDING_STAGES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
        <div className="funnel-filter">
          <label className="funnel-filter-label" htmlFor="f-manager">
            Manager
          </label>
          <select
            id="f-manager"
            name="manager"
            defaultValue={one(sp.manager) ?? ""}
          >
            <option value="">All managers</option>
            {staff.map((m) => (
              <option key={m.id} value={m.id}>
                {fullName(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="funnel-filter funnel-filter-check">
          <input
            id="f-stale"
            name="stale"
            type="checkbox"
            value="14"
            defaultChecked={Boolean(sp.stale)}
          />
          <label htmlFor="f-stale" style={{ fontSize: 13 }}>
            Stale 14d+
          </label>
        </div>
        <div className="funnel-filter-actions">
          <button type="submit" className="admin-btn admin-btn--primary">
            Apply
          </button>
          <Link
            href={view === "list" ? "/board/onboarding?view=list" : "/board/onboarding"}
            className="admin-btn admin-btn--ghost"
          >
            Clear
          </Link>
        </div>
      </form>

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

      <OnboardingShell deals={deals} staff={staff} view={view} />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="admin-card" style={{ cursor: "default" }}>
      <div className="admin-card-label">{label}</div>
      <div className="admin-card-title">{value}</div>
      {sub && <div className="admin-card-desc">{sub}</div>}
    </div>
  );
}
