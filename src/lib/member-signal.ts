// The member engagement rule (Dave, 20 Nov 2026).
//
// Showing up: at least one chapter event in the last 90 days. Forum members
// are healthy by nature; missing chapter events for 90 days moves them to
// drifting.
//
// Sentiment: the Transformational Growth Pulse (last 12 months) weighted twice
// the member's average event rating. With only one of the two, that one counts.
// A score under 4 is a value risk. No ratings at all is not a low score.
//
//   event in 90 days, score 4+ or none   -> healthy
//   event in 90 days, score under 4      -> value_risk
//   no event, score under 4              -> at_risk
//   no event, in a forum                 -> drifting
//   no event, not in a forum             -> at_risk, even with a good pulse
// Every paying member is scored, secondary members included. There is no
// separate quiet group: no events and no forum is at risk.
// New members are never flagged in their first 30 days.

export type Signal = "healthy" | "value_risk" | "drifting" | "at_risk" | "quiet" | "new";

export const PULSE_WEIGHT = 2;
export const EVENT_WEIGHT = 1;
export const VALUE_FLOOR = 4;

export type SignalInput = {
  isNew: boolean;
  inForum: boolean;
  eventsLast90: number; // chapter events checked in, last 90 days
  eventsLast180: number; // chapter events checked in, last 180 days
  responses: number; // surveys and event feedback answered, last 180 days
  latestPulse: number | null; // latest Transformational Growth Pulse in the last 12 months, 1 to 5
  avgEventRating: number | null; // their event value ratings, last 180 days, 1 to 5
};

export function sentimentScore(latestPulse: number | null, avgEventRating: number | null): number | null {
  if (latestPulse === null && avgEventRating === null) return null;
  if (latestPulse === null) return avgEventRating;
  if (avgEventRating === null) return latestPulse;
  return (latestPulse * PULSE_WEIGHT + avgEventRating * EVENT_WEIGHT) / (PULSE_WEIGHT + EVENT_WEIGHT);
}

export function engagementSignal(i: SignalInput): Signal {
  if (i.isNew) return "new";
  const score = sentimentScore(i.latestPulse, i.avgEventRating);
  const low = score !== null && score < VALUE_FLOOR;
  if (i.eventsLast90 > 0) return low ? "value_risk" : "healthy";
  if (low || !i.inForum) return "at_risk";
  return "drifting";
}

// One line on why a member sits where they do, for the Pulse of the Chapter.
export type WhyInput = {
  eventsLast90: number;
  inForum: boolean;
  secondary: boolean;
  latestPulse: number | null;
  avgEventRating: number | null;
};

export function whyLine(i: WhyInput): string {
  const parts: string[] = [];
  parts.push(i.eventsLast90 === 0 ? "No chapter event in 90 days" : `${i.eventsLast90} event${i.eventsLast90 === 1 ? "" : "s"} in 90 days`);
  parts.push(i.inForum ? "in a forum" : i.secondary ? "secondary member" : "no forum");
  if (i.latestPulse !== null) parts.push(`Growth Pulse ${i.latestPulse}`);
  if (i.avgEventRating !== null) parts.push(`rates events ${Math.round(i.avgEventRating * 10) / 10}`);
  const score = sentimentScore(i.latestPulse, i.avgEventRating);
  if (score !== null) parts.push(`score ${Math.round(score * 10) / 10}`);
  return parts.join(", ");
}

// A suggested next step for the Member Engagement chair; null when none is
// needed. She decides whether to put it on her Workboard.
export function suggestedStep(signal: Signal, i: WhyInput): string | null {
  const score = sentimentScore(i.latestPulse, i.avgEventRating);
  switch (signal) {
    case "value_risk":
      if (score !== null && score < 3) return "Ask the President to call: what isn't working?";
      if (i.avgEventRating !== null && i.avgEventRating <= 3) return "Ask which events miss the mark for them";
      return "Coffee: what would make this year transformative?";
    case "drifting":
      return "Personal invitation to the next chapter event";
    case "at_risk":
      if (i.secondary) return "Confirm they still want their secondary membership";
      if (!i.inForum && i.eventsLast90 === 0) return "Renewal conversation before June";
      return "Call: what would bring you back?";
    default:
      return null;
  }
}
