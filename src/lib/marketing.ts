import { supabase } from "@/lib/supabase";

// ============================================================
// Marketing readers.
//
// Channel reach comes from marketing_channel_metrics (027): the
// latest period's rows, assembled into per-channel cards. This
// replaces the hardcoded snapshot that the marketing page and the
// chapter dashboard used to carry.
//
// Campaign performance comes from the marketing_campaign_summary
// view (055): each cross-channel campaign with the activity it ran
// and the members it produced.
//
// Server-only: imports the secret-key client.
// ============================================================

// ---------- channel reach (027) ----------

export type ReachStat = { value: string; label: string };
export type ChannelReach = {
  key: string;
  name: string;
  headline: ReachStat;
  stats: ReachStat[];
};
export type ChannelReachResult = {
  period: string | null; // human label, e.g. "12 months to May 2026"
  channels: ChannelReach[];
};

type MetricRow = {
  platform: string;
  metric: string;
  value: number;
  unit: string;
  period_start: string;
  period_end: string;
};

// Which metric is the headline for each channel, and which two sit
// below it. Presentation is fixed here; the numbers come live.
const CHANNEL_DISPLAY = [
  { platform: "LinkedIn", key: "linkedin", headline: "impressions", stats: ["followers", "engagement_rate"] },
  { platform: "Facebook", key: "facebook", headline: "views", stats: ["interactions", "visits"] },
  { platform: "Website", key: "website", headline: "pageviews", stats: ["unique_visitors", "sessions"] },
] as const;

const METRIC_LABEL: Record<string, string> = {
  impressions: "Impressions",
  followers: "Followers",
  engagement_rate: "Engagement",
  views: "Video views",
  interactions: "Interactions",
  visits: "Visits",
  new_follows: "New follows",
  pageviews: "Pageviews",
  sessions: "Sessions",
  unique_visitors: "Unique visitors",
  bounce_rate: "Bounce rate",
  clicks: "Clicks",
};

function fmtMetric(value: number, unit: string): string {
  if (unit === "percent") return `${value}%`;
  if (unit === "usd") return `$${Math.round(value).toLocaleString("en-US")}`;
  return Math.round(value).toLocaleString("en-US");
}

function monthsBetween(startIso: string, endIso: string): number {
  const a = new Date(startIso + "T00:00:00Z");
  const b = new Date(endIso + "T00:00:00Z");
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

function periodLabel(start: string, end: string): string {
  const d = new Date(end + "T00:00:00Z");
  const month = d.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const year = d.getUTCFullYear();
  const span = monthsBetween(start, end);
  if (span >= 11 && span <= 12) return `12 months to ${month} ${year}`;
  const ds = new Date(start + "T00:00:00Z");
  const sm = ds.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${sm} ${ds.getUTCFullYear()} to ${month} ${year}`;
}

export async function getChannelReach(): Promise<ChannelReachResult> {
  const { data: latest } = await supabase
    .from("marketing_channel_metrics")
    .select("period_end")
    .order("period_end", { ascending: false })
    .limit(1);
  const periodEnd = latest?.[0]?.period_end as string | undefined;
  if (!periodEnd) return { period: null, channels: [] };

  const { data } = await supabase
    .from("marketing_channel_metrics")
    .select("platform, metric, value, unit, period_start, period_end")
    .eq("period_end", periodEnd);
  const rows = (data ?? []) as MetricRow[];

  const byKey = new Map<string, MetricRow>();
  let periodStart = periodEnd;
  for (const r of rows) {
    byKey.set(`${r.platform}::${r.metric}`, r);
    periodStart = r.period_start;
  }

  const channels: ChannelReach[] = [];
  for (const cfg of CHANNEL_DISPLAY) {
    const head = byKey.get(`${cfg.platform}::${cfg.headline}`);
    if (!head) continue;
    const stats: ReachStat[] = [];
    for (const m of cfg.stats) {
      const row = byKey.get(`${cfg.platform}::${m}`);
      if (row) stats.push({ value: fmtMetric(row.value, row.unit), label: METRIC_LABEL[m] ?? m });
    }
    channels.push({
      key: cfg.key,
      name: cfg.platform,
      headline: { value: fmtMetric(head.value, head.unit), label: METRIC_LABEL[cfg.headline] ?? cfg.headline },
      stats,
    });
  }

  return { period: periodLabel(periodStart, periodEnd), channels };
}
