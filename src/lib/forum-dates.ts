// Rules for forum dates (Plan 45, migration 133). No imports, so both the
// server and the browser can use it and the unit tests run without a database.
//
// A forum meets once a month. Its moderator sets the date for each of the
// coming months, and only members of that forum may see those dates.

/** How many months ahead a moderator can plan, counting the current month. */
export const FORUM_MONTHS_AHEAD = 6;

/** Length of the calendar entry. A forum meeting normally runs about this long. */
export const FORUM_MEETING_HOURS = 4;

export const FORUM_PLACE_MAX = 200;

export type ForumMeeting = {
  month: string; // YYYY-MM-01
  meetsOn: string; // YYYY-MM-DD
  startTime: string; // HH:MM, chapter time
  place: string | null;
  updatedAt: string;
};

/**
 * Who may see and set a forum's dates. Role is deliberately not an input: a
 * board member or staff user who is not in the forum gets nothing.
 */
export function forumAccess(v: {
  personId: string | null;
  personForumId: string | null;
  forumId: string;
  moderatorPersonId: string | null;
}): { canView: boolean; canSet: boolean } {
  const inForum = Boolean(v.personId) && v.personForumId === v.forumId;
  return { canView: inForum, canSet: inForum && v.moderatorPersonId === v.personId };
}

/** The current month and the ones after it, each as YYYY-MM-01. `today` is YYYY-MM-DD. */
export function comingMonths(today: string, count: number = FORUM_MONTHS_AHEAD): string[] {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)) - 1;
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(year, month + i, 1)).toISOString().slice(0, 10),
  );
}

/** "March 2027" for 2027-03-01. */
export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}T00:00:00Z`),
  );
}

/** "Thu 12 Mar 2027" for 2027-03-12. */
export function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${date}T00:00:00Z`))
    .replace(",", "");
}

/** "6:30 PM" for 18:30. */
export function timeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** The first meeting on or after `today`, if any. */
export function nextMeeting(meetings: ForumMeeting[], today: string): ForumMeeting | null {
  return (
    meetings
      .filter((m) => m.meetsOn >= today)
      .sort((a, b) => a.meetsOn.localeCompare(b.meetsOn))[0] ?? null
  );
}

export type MeetingInput = { month: string; date: string; time: string; place: string };

export function validateMeeting(
  input: MeetingInput,
  today: string,
):
  | { ok: true; value: { month: string; meetsOn: string; startTime: string; place: string | null } }
  | { ok: false; error: string } {
  if (!comingMonths(today).includes(input.month)) {
    return { ok: false, error: "Pick one of the coming months." };
  }
  // The 32nd parses to NaN, and 31 November rolls over to 1 December, so a
  // real date is one that survives the round trip.
  const ms = /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? Date.parse(`${input.date}T00:00:00Z`) : NaN;
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== input.date) {
    return { ok: false, error: "Pick a date." };
  }
  if (input.date.slice(0, 7) !== input.month.slice(0, 7)) {
    return { ok: false, error: `Pick a date in ${monthLabel(input.month)}.` };
  }
  if (input.date < today) return { ok: false, error: "That date has already passed." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return { ok: false, error: "Pick a start time." };
  const place = input.place.trim();
  if (place.length > FORUM_PLACE_MAX) {
    return { ok: false, error: `Keep the place under ${FORUM_PLACE_MAX} characters.` };
  }
  return {
    ok: true,
    value: { month: input.month, meetsOn: input.date, startTime: input.time, place: place || null },
  };
}

function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/**
 * A calendar file for one forum meeting. The UID is the same every time for a
 * given forum and month, so a changed date updates the entry instead of adding
 * a second one. Times are written in the chapter's time zone.
 */
export function meetingIcs(v: {
  forumId: string;
  forumName: string;
  meeting: ForumMeeting;
  timeZone: string;
  domain: string;
  now?: Date;
}): string {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = `${v.meeting.meetsOn.replace(/-/g, "")}T${v.meeting.startTime.replace(":", "")}00`;
  const updated = new Date(v.meeting.updatedAt);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chapter//Forum dates//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:forum-${v.forumId}-${v.meeting.month.slice(0, 7)}@${v.domain || "forum"}`,
    `DTSTAMP:${stamp(v.now ?? new Date())}`,
    `SEQUENCE:${Math.floor(updated.getTime() / 1000)}`,
    `DTSTART;TZID=${v.timeZone}:${start}`,
    `DURATION:PT${FORUM_MEETING_HOURS}H`,
    `SUMMARY:${icsText(`${v.forumName} forum`)}`,
    ...(v.meeting.place ? [`LOCATION:${icsText(v.meeting.place)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
