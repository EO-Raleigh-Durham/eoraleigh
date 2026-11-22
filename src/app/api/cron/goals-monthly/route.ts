import { NextResponse } from "next/server";
import { withRoutineRun } from "@/kernel/audit/routine-runs";
import { updateGoalMetrics } from "@/lib/goal-metrics";

// Vercel cron (see vercel.json): the 1st of each month, 01:00 UTC (08:00
// UTC+7). Recalculates the board tracker's measurable goals from
// live data (src/lib/goal-metrics.ts), logs each value to kr_logs and updates
// the key result's value and status. ?dry=1 reports without writing.
// Refuses any request without the CRON_SECRET bearer; each run is recorded in
// routine_runs.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

async function handler(req: Request): Promise<Response> {
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const results = await updateGoalMetrics(!dry);
  const failed = results.filter((r) => r.error);
  return NextResponse.json(
    { status: failed.length ? "partial" : "ok", dry, updated: dry ? 0 : results.length - failed.length, failed: failed.length, results },
    { status: failed.length === results.length && results.length > 0 ? 500 : 200 },
  );
}

export const GET = (req: Request) => withRoutineRun("/api/cron/goals-monthly", req, handler);
