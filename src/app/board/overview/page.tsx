import Link from "next/link";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Overview",
  description: `A guide to every part of the ${CHAPTER_NAME} chapter admin and where to find it.`,
};

type Feature = {
  href: string;
  label: string;
  title: string;
  desc: string;
};

type Group = {
  heading: string;
  blurb: string;
  features: Feature[];
};

const GROUPS: Group[] = [
  {
    heading: "Reporting",
    blurb:
      "The board-facing picture of how the chapter is doing, assembled live from the data the team enters below.",
    features: [
      {
        href: "/board/chapter-dashboard",
        label: "Dashboard",
        title: "State of the Chapter",
        desc: "The home screen. Fiscal-year KPIs vs last year, nine-year trends, the historical metrics table, SAP pipeline, events, marketing reach, member sentiment, and the membership funnel, all on one page.",
      },
      {
        href: "/board/membership-pipeline",
        label: "Pipeline",
        title: "Prospect Dashboard",
        desc: "The acquisition funnel as analytics: open prospects by stage, win rate, time to join, channel efficacy, and why deals are lost. Find the constraint, then work it.",
      },
      {
        href: "/board/marketing",
        label: "Marketing",
        title: "Marketing & reach",
        desc: "Headline LinkedIn, Facebook, and website figures for the trailing year, the chapter's digital reach at a glance.",
      },
      {
        href: "/board/historical-metrics",
        label: "Metrics",
        title: "Historical Metrics",
        desc: "The editable year-over-year KPI table that feeds the dashboard trends: members, retention, revenue, forums, events, reserves, grants, and SAP, one column per fiscal year.",
      },
    ],
  },
  {
    heading: "Membership",
    blurb:
      "Everything that moves a prospect from first contact to an active, renewing member.",
    features: [
      {
        href: "/board/members",
        label: "Members",
        title: "Member directory",
        desc: "The active roster: contact details, company, and membership status. The source of truth for who is in the chapter today.",
      },
      {
        href: "/board/prospects",
        label: "Prospects",
        title: "Prospect funnel",
        desc: "The Member Acquisition kanban: drag deals across the eight stages from Connect & Qualify to Closed Won, with qualification checks and loss reasons. Closing a deal hands it off to onboarding automatically.",
      },
      {
        href: "/board/onboarding",
        label: "Onboarding",
        title: "New-member onboarding",
        desc: "The post-join track from Welcome Email through Forum Placed to Active Member, so nobody falls through the cracks in their first months.",
      },
    ],
  },
  {
    heading: "Programming",
    blurb: "Events, content, partnerships, and the member voice.",
    features: [
      {
        href: "/board/events",
        label: "Events",
        title: "Event management",
        desc: "Upcoming and past events with RSVPs, ticketing, check-in, materials, and post-event feedback. Event performance feeds the dashboard.",
      },
      {
        href: "/board/surveys",
        label: "Surveys",
        title: "Member surveys",
        desc: "Transformational Growth Pulse responses, the rating and renewal-intent signal that drives the sentiment section of the dashboard.",
      },
      {
        href: "/board/blogs",
        label: "Blogs",
        title: "Blog posts",
        desc: "Drafts, scheduled posts, and published articles synced to the public marketing site, with built-in SEO preview.",
      },
      {
        href: "/board/strategic-alliance-partners",
        label: "SAPs",
        title: "Strategic Alliance Partners",
        desc: "The sponsor pipeline: leads, deals in discussion, won partners and tiers, and cash secured. Feeds the SAP section of the dashboard.",
      },
    ],
  },
  {
    heading: "Operations",
    blurb: "Site health and the annual leadership transition.",
    features: [
      {
        href: "/board/seo",
        label: "SEO",
        title: "SEO overview",
        desc: "Every public page with its title, description, keyword, and share image, so gaps get caught before they cost ranking.",
      },
      {
        href: "/board/handover",
        label: "Handover",
        title: "2026/7 Handover",
        desc: "The board transition pack: what the incoming board needs to pick up each area of the chapter.",
      },
    ],
  },
];

const SHARE = [
  { slug: "state-of-the-chapter", title: "State of the Chapter" },
  { slug: "membership-pipeline", title: "Membership Pipeline" },
  { slug: "marketing", title: "Marketing" },
];

export default function AdminOverview() {
  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">Overview</div>
        <h1 className="admin-page-title">Everything in the chapter admin</h1>
        <p className="admin-page-sub">
          A guide to every part of this admin. The{" "}
          <Link href="/board/chapter-dashboard" className="admin-link-action">
            Chapter Dashboard
          </Link>{" "}
          is the home screen and pulls everything together; the tools below are
          where the team enters the data behind it. Internal use only, do not
          share these URLs externally.
        </p>
      </div>

      {GROUPS.map((group) => (
        <section key={group.heading} style={{ marginBottom: 36 }}>
          <h2 className="admin-section-title">{group.heading}</h2>
          <p className="admin-page-sub" style={{ marginBottom: 16, maxWidth: 720 }}>
            {group.blurb}
          </p>
          <div className="admin-card-grid">
            {group.features.map((f) => (
              <Link key={f.href} href={f.href} className="admin-card">
                <div className="admin-card-label">{f.label}</div>
                <div className="admin-card-title">{f.title}</div>
                <div className="admin-card-desc">{f.desc}</div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section style={{ marginBottom: 12 }}>
        <h2 className="admin-section-title">Sharing with regional leadership</h2>
        <p className="admin-page-sub" style={{ marginBottom: 16, maxWidth: 720 }}>
          Password-protected snapshots of the dashboards, safe to send outside
          the board. These live behind a separate share password (not the admin
          login) and show a frozen snapshot rather than live data.
        </p>
        <div className="admin-card-grid">
          {SHARE.map((s) => (
            <a
              key={s.slug}
              href={`/share/${s.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-card"
            >
              <div className="admin-card-label">Share ↗</div>
              <div className="admin-card-title">{s.title}</div>
              <div className="admin-card-desc">
                Public snapshot at /share/{s.slug}, gated by the share password.
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
