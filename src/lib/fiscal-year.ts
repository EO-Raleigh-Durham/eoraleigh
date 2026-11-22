// ============================================================
// Fiscal-year backbone. Single source of truth for EO's fiscal
// year math and year-over-year deltas.
//
// EO fiscal year runs Jul 1 -> Jun 30. fyStart is the calendar
// year the FY begins (2026 => FY2026/27 => Jul 2026-Jun 2027).
//
// No Supabase import here, so this module is safe to use from
// both server and client components.
// ============================================================

// ISO window for a fiscal year that starts in `startYear` (Jul 1 -> next Jul 1).
export function fyWindow(startYear: number): { start: string; end: string } {
  return { start: `${startYear}-07-01`, end: `${startYear + 1}-07-01` };
}

// The fiscal year an ISO date falls in (month 6 = July is the FY boundary).
export function fyStartForDate(iso: string): number {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  return d.getUTCMonth() >= 6 ? y : y - 1;
}

// The fiscal year today falls in, computed from the clock. Rolls over
// automatically on 1 July each year.
export function currentFyStart(): number {
  const now = new Date();
  const y = now.getUTCFullYear();
  return now.getUTCMonth() >= 6 ? y : y - 1;
}

// "FY2026/27"
export function fyLabel(start: number): string {
  return `FY${start}/${String(start + 1).slice(2)}`;
}

// "Jul 2026 – Jun 2027"
export function fyWindowText(start: number): string {
  return `Jul ${start} – Jun ${start + 1}`;
}

// ============================================================
// Year-over-year deltas
// ============================================================

export type KpiDelta = {
  abs: number | null; // absolute change vs prior period
  pct: number | null; // percent change vs prior period (null if prior is 0 / missing)
  direction: "up" | "down" | "flat";
};

// Change of `current` against `prior`. Either side null (missing) yields a
// flat, null delta so callers can render an em-free "—" instead of a bogus
// swing.
export function delta(current: number | null, prior: number | null): KpiDelta {
  if (current === null || prior === null) {
    return { abs: null, pct: null, direction: "flat" };
  }
  const abs = current - prior;
  const pct = prior !== 0 ? Math.round((abs / prior) * 1000) / 10 : null;
  const direction = abs > 0 ? "up" : abs < 0 ? "down" : "flat";
  return { abs, pct, direction };
}

// ============================================================
// Calendar quarters (for the Pulse survey wave buckets)
// ============================================================

export type QuarterWindow = { label: string; start: string; end: string };

// Calendar quarters from `startIso` (a quarter boundary, e.g. "2026-07-01")
// up to and including the quarter that contains `through`. Q1 = Jan-Apr,
// Q2 = Apr-Jul, Q3 = Jul-Oct, Q4 = Oct-Jan. Used to auto-extend the Pulse
// wave buckets so they never go stale as the fiscal year advances. Must be
// called per request (not memoised at module load) so a long-running server
// still rolls into the next quarter.
export function calendarQuartersFrom(
  startIso: string,
  through: Date = new Date(),
): QuarterWindow[] {
  const out: QuarterWindow[] = [];
  let d = new Date(`${startIso}T00:00:00Z`);
  const endMs = through.getTime();
  // Guard against a malformed anchor spinning forever.
  for (let i = 0; i < 40 && d.getTime() <= endMs; i++) {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth(); // expected 0, 3, 6, 9
    const q = Math.floor(m / 3) + 1;
    const next = new Date(Date.UTC(y, m + 3, 1));
    out.push({
      label: `Q${q} ${y}`,
      start: `${y}-${String(m + 1).padStart(2, "0")}-01`,
      end: `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`,
    });
    d = next;
  }
  return out;
}
