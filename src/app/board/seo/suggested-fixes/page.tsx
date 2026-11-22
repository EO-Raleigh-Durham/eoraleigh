import Link from "next/link";
import { CHAPTER_DOMAIN } from "@/kernel/config/chapter";
import { FIXES, type Fix, type Priority, type Status } from "@/content/seo-suggested-fixes";

export const metadata = {
  title: "Suggested SEO fixes",
  description: `Prioritized SEO fixes for ${CHAPTER_DOMAIN} with effort and status.`,
};

const PRIORITY_TONE: Record<Priority, string> = {
  "Quick win": "admin-badge--ok",
  "Medium lift": "admin-badge--neutral",
  "High lift": "admin-badge--err",
};

const STATUS_TONE: Record<Status, string> = {
  Done: "admin-badge--ok",
  "In progress": "admin-badge--neutral",
  Open: "admin-badge--err",
};

function summarize(fixes: Fix[]) {
  const total = fixes.length;
  const done = fixes.filter((f) => f.status === "Done").length;
  const inProgress = fixes.filter((f) => f.status === "In progress").length;
  const open = fixes.filter((f) => f.status === "Open").length;
  return { total, done, inProgress, open };
}

export default function SuggestedFixesPage() {
  const summary = summarize(FIXES);
  const allDone = summary.done === summary.total;

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">SEO</div>
        <h1 className="admin-page-title">Suggested fixes</h1>
        <p className="admin-page-sub">
          Eight changes that compound. Quick wins ship in under an hour each and lift technical SEO from B to A. Medium-lift items pay back across every page once they&apos;re in.
        </p>
        <div style={{ marginTop: 16 }}>
          <Link href="/board/seo" className="admin-link-action">
            ← Back to SEO overview
          </Link>
        </div>
      </div>

      <div
        className="seo-fix-summary"
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          margin: "0 0 24px",
          padding: "16px 20px",
          background: allDone ? "rgba(34,197,94,0.08)" : "rgba(0,0,0,0.04)",
          border: `1px solid ${allDone ? "rgba(34,197,94,0.25)" : "rgba(0,0,0,0.08)"}`,
          borderRadius: 8,
          fontSize: 14,
        }}
      >
        <strong>
          {allDone
            ? `All ${summary.total} fixes shipped`
            : `${summary.done} of ${summary.total} fixes shipped`}
        </strong>
        <span style={{ color: "var(--text-muted)" }}>
          Done {summary.done} · In progress {summary.inProgress} · Open {summary.open}
        </span>
        <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>
          Last sweep: 2026-05-29
        </span>
      </div>

      <div className="seo-fix-list">
        {FIXES.map((fix, i) => (
          <FixCard key={i} index={i + 1} fix={fix} />
        ))}
      </div>
    </div>
  );
}

function FixCard({ index, fix }: { index: number; fix: Fix }) {
  return (
    <div
      className="seo-fix"
      style={fix.status === "Done" ? { opacity: 0.92 } : undefined}
    >
      <div className="seo-fix-head">
        <span className="seo-fix-num">{String(index).padStart(2, "0")}</span>
        <h2 className="seo-fix-title">{fix.title}</h2>
        <span className={`admin-badge ${PRIORITY_TONE[fix.priority]}`}>
          {fix.priority}
        </span>
        <span className={`admin-badge ${STATUS_TONE[fix.status]}`}>
          {fix.status}
          {fix.status === "Done" && fix.shippedAt ? ` · ${fix.shippedAt}` : ""}
        </span>
      </div>
      <p className="seo-fix-why">{fix.why}</p>
      <div className="seo-fix-action">
        <span className="seo-fix-action-label">Action</span>
        <p>{fix.action}</p>
        <code className="seo-fix-ref">{fix.ref}</code>
      </div>
      {fix.shipNote && (
        <div
          className="seo-fix-action"
          style={{
            marginTop: 12,
            background: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.18)",
          }}
        >
          <span className="seo-fix-action-label">What shipped</span>
          <p>{fix.shipNote}</p>
        </div>
      )}
    </div>
  );
}
