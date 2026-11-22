// Events whose public date is not confirmed. The DB row still carries a
// placeholder starts_at, so public surfaces show this label instead of it.
const DATE_TBC_EVENT_SLUGS: Record<string, string> = {
  "leadership-ai-era-2026": "2027",
};

export type TbcEventDate = {
  day: string;
  month: string;
  monthUpper: string;
  year: string;
  full: string;
};

export function isEventDateTbc(event: { slug?: string | null }): boolean {
  return !!event.slug && event.slug in DATE_TBC_EVENT_SLUGS;
}

export function tbcEventDate(event: { slug?: string | null }): TbcEventDate | null {
  const year = event.slug ? DATE_TBC_EVENT_SLUGS[event.slug] : undefined;
  if (!year) return null;
  return {
    day: "TBC",
    month: year,
    monthUpper: year,
    year,
    full: `${year} · Date to be confirmed`,
  };
}
