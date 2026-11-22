// Pure helpers for the role-based board home (/board). No I/O, so the client
// sidebar and the tests can import them.

// Who the board home is for. A person can hold several chair roles; the
// President and the chapter manager (staff) get extra panels on top.
export type BoardHomeRole = "president" | "manager" | "chair";

// The tools each chair role sees under "My tools" in the sidebar. Keys are
// board_roles.key. Every chair's tools also stay reachable under Chairs.
export const ROLE_TOOLS: Record<string, { label: string; href: string }[]> = {
  president: [
    { label: "Goals", href: "/board/goals" },
    { label: "Member Engagement", href: "/board/the-pulse-of-the-chapter" },
    { label: "Prospect Funnel", href: "/board/membership-pipeline" },
  ],
  "president-elect": [
    { label: "Strategy", href: "/board/strategy" },
    { label: "Goals", href: "/board/goals" },
  ],
  membership: [
    { label: "Prospects", href: "/board/prospects" },
    { label: "Leads", href: "/board/leads" },
    { label: "Onboarding", href: "/board/onboarding" },
  ],
  marcoms: [
    { label: "Marketing", href: "/board/marketing" },
    { label: "Campaigns", href: "/board/marketing/campaigns" },
    { label: "Calendar", href: "/board/marketing/calendar" },
    { label: "Blog", href: "/board/blogs" },
    { label: "Brands", href: "/board/marketing/brands" },
  ],
  sap: [
    { label: "SAP Partners", href: "/board/strategic-alliance-partners" },
    { label: "Member Companies", href: "/board/member-companies" },
  ],
  finance: [
    { label: "Finance", href: "/board/dues-invoices" },
    { label: "Chapter Dashboard", href: "/board/chapter-dashboard" },
  ],
  governance: [
    { label: "On the Radar", href: "/board/radar" },
    { label: "Member Roster", href: "/board/members" },
  ],
  forum: [
    { label: "Forum", href: "/board/forum" },
    { label: "Member Roster", href: "/board/members" },
  ],
  myeo: [{ label: "Events", href: "/board/events" }],
  learning: [
    { label: "Events", href: "/board/events" },
    { label: "Event Metrics", href: "/board/events/performance" },
  ],
  "member-engagement": [
    { label: "Member Engagement", href: "/board/the-pulse-of-the-chapter" },
    { label: "Member Roster", href: "/board/members" },
    { label: "Surveys", href: "/board/surveys" },
  ],
  manager: [
    { label: "Member Roster", href: "/board/members" },
    { label: "Events", href: "/board/events" },
    { label: "Onboarding", href: "/board/onboarding" },
    { label: "On the Radar", href: "/board/radar" },
  ],
};

// The sidebar's "My tools": every tool for the viewer's roles, in role order,
// without repeats.
export function myTools(roleKeys: string[]): { label: string; href: string }[] {
  const seen = new Set<string>();
  const out: { label: string; href: string }[] = [];
  for (const key of roleKeys) {
    for (const t of ROLE_TOOLS[key] ?? []) {
      if (seen.has(t.href)) continue;
      seen.add(t.href);
      out.push(t);
    }
  }
  return out;
}

// Board meetings are at 3pm on the second Tuesday of the month (the board's
// own rule, recorded on the Radar). The next one on or after `today`.
export function nextBoardMeeting(today: string): string {
  const [y, m] = today.split("-").map(Number);
  for (let i = 0; i < 3; i++) {
    const year = y + Math.floor((m - 1 + i) / 12);
    const month = ((m - 1 + i) % 12) + 1;
    const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const day = 1 + ((2 - first + 7) % 7) + 7;
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (iso >= today) return iso;
  }
  return today;
}

// "40 / 65 members", "$0 / $30k", "84 days, target 90 or under",
// "1 issues, target 0", "4.1 / 4.5 out of 5".
export function goalValueText(value: number, target: number | null, unit: string | null, direction: string): string {
  const u = (unit ?? "").toLowerCase();
  const fmt = (n: number) => {
    if (u === "usd") return n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
    if (u === "%") return `${n}%`;
    return String(Math.round(n * 10) / 10);
  };
  const tail = u && u !== "usd" && u !== "%" ? ` ${unit}` : "";
  if (target === null) return `${fmt(value)}${tail}`;
  // Lower is better: the value, then the ceiling, never "1 / 0".
  if (direction === "down") return `${fmt(value)}${tail}, target ${fmt(target)}${target > 0 ? " or under" : ""}`;
  return `${fmt(value)} / ${fmt(target)}${tail}`;
}

export const STATUS_LABEL: Record<string, string> = {
  on_track: "On track",
  at_risk: "At risk",
  off_track: "Off track",
  done: "Hit",
};

// How many board meetings (second Tuesdays) have happened since a date, up to
// and including today. An issue raised on a meeting day counts that meeting
// once it has been held: 0 means it has not been to a meeting yet.
export function meetingsSince(raisedOn: string, today: string): number {
  let count = 0;
  let next = nextBoardMeeting(raisedOn.slice(0, 10));
  while (next <= today) {
    count += 1;
    const [y, m] = next.split("-").map(Number);
    next = nextBoardMeeting(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`);
  }
  return count;
}
