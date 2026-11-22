// Counts event registrations by the platform they came from, for the board's
// "Registrations by platform" page. Pure helpers: no database, no browser.
//
// The platform is the name on the link the person clicked (utm_source), which
// is the only place Facebook and LinkedIn are told apart. When a link carried
// no tag we fall back to the referrer host, then to the coarse channel that
// migration 109 stores, and last to "Untagged or direct".

export type PlatformRow = {
  status?: string | null;
  channel_source?: string | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  referrer?: string | null;
};

export const UNTAGGED = "Untagged or direct";

// utm_source values people actually type, mapped to one display name.
const SOURCE_NAMES: Array<[RegExp, string]> = [
  [/^(facebook|fb|meta)$/, "Facebook"],
  [/^(linkedin|lnkd|li)$/, "LinkedIn"],
  [/^(instagram|ig)$/, "Instagram"],
  [/^(whatsapp|wa)$/, "WhatsApp"],
  [/^zalo$/, "Zalo"],
  [/^(youtube|yt|youtu)$/, "YouTube"],
  [/^tiktok$/, "TikTok"],
  [/^(twitter|x)$/, "X"],
  [/^(email|newsletter|letter|resend|mailchimp|brevo|hubspot)$/, "Email"],
];

const HOST_NAMES: Array<[RegExp, string]> = [
  [/(^|\.)facebook\.[a-z.]+$|(^|\.)fb\.(com|me)$/, "Facebook"],
  [/(^|\.)linkedin\.[a-z.]+$|(^|\.)lnkd\.in$/, "LinkedIn"],
  [/(^|\.)instagram\.[a-z.]+$/, "Instagram"],
  [/(^|\.)zalo\.[a-z.]+$/, "Zalo"],
  [/(^|\.)(youtube\.[a-z.]+|youtu\.be)$/, "YouTube"],
  [/(^|\.)tiktok\.[a-z.]+$/, "TikTok"],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/, "X"],
];

function clean(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function titleCase(raw: string): string {
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// The platform name for one registration.
export function platformOf(row: PlatformRow): string {
  const source = clean(row.utm_source)?.toLowerCase();
  if (source) {
    for (const [pattern, name] of SOURCE_NAMES) {
      if (pattern.test(source)) return name;
    }
    return titleCase(source);
  }
  const host = hostOf(clean(row.referrer));
  if (host) {
    for (const [pattern, name] of HOST_NAMES) {
      if (pattern.test(host)) return name;
    }
  }
  const channel = clean(row.channel_source);
  if (channel && channel !== "Direct Traffic") return channel;
  return UNTAGGED;
}

export type PlatformCount = { label: string; count: number };
export type PostCount = {
  platform: string;
  campaign: string | null;
  post: string | null;
  count: number;
};

export type PlatformSummary = {
  total: number;
  tagged: number;
  byPlatform: PlatformCount[];
  byPost: PostCount[];
};

// Cancelled registrations are left out. Each row counts once, whatever its
// guest count, because the question is where registrations came from.
export function summarisePlatforms(rows: PlatformRow[]): PlatformSummary {
  const counted = rows.filter((r) => r.status !== "cancelled");
  const platforms = new Map<string, number>();
  const posts = new Map<string, PostCount>();
  let tagged = 0;

  for (const row of counted) {
    const platform = platformOf(row);
    platforms.set(platform, (platforms.get(platform) ?? 0) + 1);
    if (platform !== UNTAGGED) tagged += 1;

    const campaign = clean(row.utm_campaign);
    const post = clean(row.utm_content);
    if (campaign || post) {
      const key = `${platform}\u0000${campaign ?? ""}\u0000${post ?? ""}`;
      const existing = posts.get(key);
      if (existing) existing.count += 1;
      else posts.set(key, { platform, campaign, post, count: 1 });
    }
  }

  const byCountThenName = <T extends { count: number }>(
    a: T,
    b: T,
    nameA: string,
    nameB: string,
  ) => b.count - a.count || nameA.localeCompare(nameB);

  return {
    total: counted.length,
    tagged,
    byPlatform: [...platforms.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => byCountThenName(a, b, a.label, b.label)),
    byPost: [...posts.values()].sort((a, b) =>
      byCountThenName(
        a,
        b,
        `${a.platform}${a.campaign}${a.post}`,
        `${b.platform}${b.campaign}${b.post}`,
      ),
    ),
  };
}
