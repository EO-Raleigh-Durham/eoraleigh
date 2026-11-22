// Business time for notices (Z.7): when a notice may reach a person, read in
// the chapter's timezone (CHAPTER_TIME_ZONE), where the chapter works. The
// notification router holds a non-urgent immediate notice that lands outside
// these hours until the next working morning, and every digest goes out on a
// working morning.
//
// The wall clock is read through Intl in the chapter's IANA zone, so a zone
// with daylight saving still opens at 08:30 local time on both sides of a
// change. For a fixed-offset zone (Asia/Bangkok, say, which keeps UTC+7 all year)
// the readings are the same as a constant offset, and the test boundaries
// stay exact.
//
// Public holidays are not known here yet (v1): a holiday weekday counts as a
// working day. The working window is org-level configuration in code; there is
// no per-person setting, which would need a design Khoa approves first.
import { CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

/** The working window on a weekday, in minutes after midnight, chapter time: 08:30 to 18:00. */
export const WORKING_HOURS = { startMinute: 8 * 60 + 30, endMinute: 18 * 60 } as const;

const WALL = new Intl.DateTimeFormat("en-US", {
  timeZone: CHAPTER_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

// The chapter's wall clock for an instant, as the UTC fields of a shifted date.
function wallParts(at: Date): { y: number; m: number; d: number; hour: number; minute: number; second: number } {
  const n: Record<string, number> = {};
  for (const p of WALL.formatToParts(at)) if (p.type !== "literal") n[p.type] = Number(p.value);
  return { y: n.year, m: n.month - 1, d: n.day, hour: n.hour, minute: n.minute, second: n.second };
}

// The zone's offset from UTC at an instant, in ms.
function offsetAt(at: Date): number {
  const w = wallParts(at);
  const wallMs = Date.UTC(w.y, w.m, w.d, w.hour, w.minute, w.second);
  return wallMs - Math.floor(at.getTime() / 1000) * 1000;
}

// The instant the chapter's wall clock reads `minute` after midnight on a calendar day.
function zonedInstant(y: number, m: number, d: number, minute: number): number {
  const guess = Date.UTC(y, m, d, 0, minute);
  const first = guess - offsetAt(new Date(guess));
  return guess - offsetAt(new Date(first));
}

// The chapter's wall clock for an instant: the weekday (0 Sunday), the minute of
// the day, and that calendar day's fields.
function wallClock(at: Date): { weekday: number; minute: number; y: number; m: number; d: number } {
  const w = wallParts(at);
  return {
    weekday: new Date(Date.UTC(w.y, w.m, w.d)).getUTCDay(),
    minute: w.hour * 60 + w.minute,
    y: w.y,
    m: w.m,
    d: w.d,
  };
}

const isWeekday = (weekday: number) => weekday >= 1 && weekday <= 5;

/** Whether `at` falls inside the working window: Monday to Friday, 08:30 up to (not including) 18:00 chapter time. */
export function inWorkingHours(at: Date): boolean {
  const { weekday, minute } = wallClock(at);
  return isWeekday(weekday) && minute >= WORKING_HOURS.startMinute && minute < WORKING_HOURS.endMinute;
}

/** Quiet hours are everything else: weekday nights and the whole weekend. */
export function inQuietHours(at: Date): boolean {
  return !inWorkingHours(at);
}

/**
 * The first working morning (a weekday at 08:30 chapter time) strictly after
 * `at`. A held notice waits for it, and a digest item is sent on it. Strictly
 * after, so a digest queued at 08:30 on the dot goes in the next morning's
 * digest rather than racing the one being sent.
 */
export function nextWorkingMorning(at: Date): Date {
  const { y, m, d } = wallClock(at);
  for (let day = 0; day <= 7; day++) {
    const morning = zonedInstant(y, m, d + day, WORKING_HOURS.startMinute);
    if (morning > at.getTime() && isWeekday(wallClock(new Date(morning)).weekday)) return new Date(morning);
  }
  // Unreachable: any eight consecutive days hold a weekday morning after `at`.
  throw new Error("no working morning within a week");
}
