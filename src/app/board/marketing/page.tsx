import Link from "next/link";
import { PageHead } from "@/kernel/ui/PageHead";
import { requirePermission } from "@/kernel/identity/access-request";
import { supabase } from "@/lib/supabase";
import { currentFyStart, fyLabel } from "@/lib/fiscal-year";
import { listPublishedSitePosts } from "@/lib/site-posts";
import { OPEN_STAGES } from "@/lib/prospect-pipeline";
import { getAnalyticsOverview } from "@/entities/company-os/lib/vercel-analytics";
import "./marketing.css";
import { CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

export const metadata = { title: "Marketing" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// The MarCom chair's page: the funnel from page views to new members, with
// the 100-lead goal for the year, then what we published and which events
// people signed up for.
const LEAD_GOAL = 100;

type DealRow = { stage: string; deal_status: string; created_at: string; close_date: string | null; channel_source: string | null };

const fmtDay = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: CHAPTER_TIME_ZONE });

// All data and date maths live outside render.
async function loadMarketing() {
  const fyStart = currentFyStart();
  const fyFrom = `${fyStart}-07-01`;
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

  const [traffic, dealsRes, unique, regsRes] = await Promise.all([
    getAnalyticsOverview("all", "public"),
    supabase.from("deals").select("stage, deal_status, created_at, close_date, channel_source").eq("pipeline", "Member Acquisition").gte("created_at", fyFrom),
    listPublishedSitePosts(),
    supabase
      .from("event_registrations")
      .select("events(id, title, slug)")
      .gte("created_at", since30)
      .neq("review_classification", "spam")
      .limit(2000),
  ]);
  if (dealsRes.error) throw new Error(`deals: ${dealsRes.error.message}`);
  if (regsRes.error) throw new Error(`registrations: ${regsRes.error.message}`);

  // Funnel, this fiscal year.
  const totals = "error" in traffic ? null : traffic.totals;
  const deals = (dealsRes.data ?? []) as DealRow[];
  const leads = deals.length;
  const pastFirstStage = deals.filter((d) => d.deal_status === "closed_won" || (d.deal_status === "open" && OPEN_STAGES.indexOf(d.stage as (typeof OPEN_STAGES)[number]) >= 1)).length;
  const joined = deals.filter((d) => d.deal_status === "closed_won").length;
  const monthsIn = Math.max(1, (Date.now() - Date.parse(fyFrom)) / (30.44 * 86400000));
  const pace = Math.round((leads / monthsIn) * 12);
  const steps = [
    { label: "Page views", value: totals?.pageviews ?? null, note: totals ? "public site" : "counting from 20 Nov" },
    { label: "Visitors", value: totals?.visitors ?? null, note: "unique people" },
    { label: "Leads", value: leads, note: `goal ${LEAD_GOAL}` },
    { label: "Experienced EO", value: pastFirstStage, note: "past first contact" },
    { label: "Joined", value: joined, note: "new members" },
  ];

  const bySource = new Map<string, number>();
  for (const d of deals) bySource.set(d.channel_source || "Not recorded", (bySource.get(d.channel_source || "Not recorded") ?? 0) + 1);
  const sources = [...bySource.entries()].sort((a, b) => b[1] - a[1]);

  // Content, this fiscal year.
  const thisFy = unique.filter((p) => p.date.slice(0, 10) >= fyFrom);
  const daysSinceLast = unique[0] ? Math.floor((Date.now() - Date.parse(unique[0].date)) / 86400000) : null;

  // Event sign-ups, last 30 days.
  const byEvent = new Map<string, { title: string; slug: string | null; count: number }>();
  for (const r of (regsRes.data ?? []) as unknown as { events: { id: string; title: string; slug: string | null } | null }[]) {
    if (!r.events) continue;
    const e = byEvent.get(r.events.id) ?? { title: r.events.title, slug: r.events.slug, count: 0 };
    e.count += 1;
    byEvent.set(r.events.id, e);
  }
  const signups = [...byEvent.values()].sort((a, b) => b.count - a.count);
  const signupTotal = signups.reduce((n, e) => n + e.count, 0);

  return { fyStart, leads, pace, steps, sources, thisFy, unique, daysSinceLast, signups, signupTotal };
}

export default async function MarketingPage() {
  await requirePermission("campaigns.marketing");
  const { fyStart, leads, pace, steps, sources, thisFy, unique, daysSinceLast, signups, signupTotal } = await loadMarketing();

  return (
    <div className="mk">
      <PageHead
        eyebrow="Marketing"
        title="Marketing"
        sub={`From page views to new members, ${fyLabel(fyStart)}. The goal is ${LEAD_GOAL} leads in the prospect funnel this year.`}
      />

      <section className="mk-panel">
        <div className="mk-goal">
          <div>
            <p className="mk-k">Leads this year</p>
            <p className="mk-goal-n">
              {leads} <span>of {LEAD_GOAL}</span>
            </p>
            <p className="mk-muted">On pace for about {pace} by 30 June.</p>
          </div>
          <div className="mk-bar" aria-hidden>
            <span style={{ width: `${Math.min(100, (leads / LEAD_GOAL) * 100)}%` }} />
          </div>
          <Link className="mk-link" href="/board/prospects">
            Open the prospect board
          </Link>
        </div>

        <ol className="mk-funnel">
          {steps.map((s, i) => (
            <li key={s.label} className={s.label === "Leads" ? "is-goal" : undefined}>
              <p className="mk-k">{s.label}</p>
              <p className="mk-n">{s.value == null ? "–" : s.value.toLocaleString()}</p>
              <p className="mk-muted">{s.note}</p>
              {i < steps.length - 1 && <span className="mk-arrow" aria-hidden>›</span>}
            </li>
          ))}
        </ol>

        {sources.length > 0 && (
          <div className="mk-sources">
            <p className="mk-k">Where this year&apos;s leads came from</p>
            <ul>
              {sources.map(([s, n]) => (
                <li key={s}>
                  <span>{s}</span>
                  <b>{n}</b>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="mk-grid">
        <section className="mk-panel">
          <div className="mk-head">
            <h2 className="mk-h2">Published</h2>
            <span className="mk-count">{thisFy.length} this year</span>
          </div>
          {daysSinceLast !== null && (
            <p className={`mk-muted${daysSinceLast > 14 ? " mk-warn" : ""}`}>
              {daysSinceLast === 0 ? "Last post today" : `Last post ${daysSinceLast} day${daysSinceLast === 1 ? "" : "s"} ago`}
            </p>
          )}
          <ul className="mk-rows">
            {unique.slice(0, 6).map((p) => (
              <li key={p.href}>
                <a href={p.href} target="_blank" rel="noopener noreferrer">
                  {p.title}
                </a>
                <span>{fmtDay(p.date)}</span>
              </li>
            ))}
          </ul>
          <Link className="mk-link" href="/board/blogs">
            Write a post
          </Link>
        </section>

        <section className="mk-panel">
          <div className="mk-head">
            <h2 className="mk-h2">Event sign-ups</h2>
            <span className="mk-count">{signupTotal} in 30 days</span>
          </div>
          {signups.length === 0 ? (
            <p className="mk-muted">No sign-ups in the last 30 days.</p>
          ) : (
            <ul className="mk-rows">
              {signups.slice(0, 8).map((e) => (
                <li key={e.title}>
                  <span>{e.title}</span>
                  <b>{e.count}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mk-panel">
        <h2 className="mk-h2">Not connected yet</h2>
        <ul className="mk-rows">
          <li>
            <span>Social reach: the LinkedIn sync stopped on 20 Apr, and Facebook and Instagram are not connected</span>
          </li>
          <li>
            <span>Newsletter audience: no contact has email consent recorded yet</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
