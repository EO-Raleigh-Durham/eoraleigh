// Server-only. Once a month (/api/cron/goals-monthly) the board tracker's goals
// that can be measured from live data are recalculated: each key result whose
// source is 'agent' carries a metric key in source_detail, the value below is
// written to kr_logs and onto the key result, and its status follows from the
// value (src/lib/goal-status.ts). Manual goals (MyEO communities, governance
// issues) are left alone.
import { supabase } from "@/lib/supabase";
import { loadChapterOverview } from "@/lib/chapter-overview";
import { loadChapterPulse, loadMemberEngagementReview } from "@/lib/engagement";
import { currentFyStart } from "@/lib/fiscal-year";
import { chapterToday } from "@/kernel/config/dates";
import { recordAudit } from "@/kernel/audit/audit";
import {
  fiscalYearElapsed,
  forumDaysAverage,
  goalStatus,
  type GoalMode,
  type KrStatus,
} from "@/lib/goal-status";

// Members on 1 July, the start line for the members goal. From the growth
// forecast on The Pulse of the Chapter; add a line each fiscal year.
const MEMBERS_AT_FY_START: Record<number, number> = { 2026: 38 };

type Ctx = { fyStart: number; fyFrom: string; today: string };
type Metric = { mode: (ctx: Ctx) => GoalMode; value: (ctx: Ctx) => Promise<{ value: number | null; note: string }> };

const round1 = (n: number) => Math.round(n * 10) / 10;

export const GOAL_METRICS: Record<string, Metric> = {
  members_active: {
    mode: ({ fyStart }) => ({ kind: "growth", baseline: MEMBERS_AT_FY_START[fyStart] ?? 0 }),
    value: async () => {
      const { count, error } = await supabase
        .from("chapter_memberships")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      if (error) throw new Error(`members_active: ${error.message}`);
      return { value: count ?? 0, note: "Active chapter memberships" };
    },
  },
  engagement_healthy_pct: {
    mode: () => ({ kind: "level" }),
    value: async () => {
      const review = await loadMemberEngagementReview();
      // Same count as The Pulse of the Chapter: new members are not scored.
      const scored = review.members.filter((m) => m.signal !== "new");
      const healthy = scored.filter((m) => m.signal === "healthy").length;
      const total = scored.length;
      return {
        value: total ? Math.round((healthy / total) * 100) : null,
        note: `${healthy} of ${total} members healthy on The Pulse of the Chapter`,
      };
    },
  },
  sap_cash_fy: {
    mode: () => ({ kind: "cumulative" }),
    value: async ({ fyStart }) => {
      const o = await loadChapterOverview(fyStart);
      return { value: o.revenue?.sapCash ?? 0, note: "Partner cash in this fiscal year's revenue (in-kind value not counted)" };
    },
  },
  revenue_total_fy: {
    mode: () => ({ kind: "cumulative" }),
    value: async ({ fyStart }) => {
      const o = await loadChapterOverview(fyStart);
      return { value: o.revenue?.total ?? null, note: "Live chapter revenue, as on the chapter dashboard" };
    },
  },
  forum_days_avg: {
    mode: () => ({ kind: "ceiling" }),
    value: async ({ today }) => {
      const { data, error } = await supabase
        .from("chapter_memberships")
        .select("start_date, membership_type, person:people!chapter_memberships_person_id_fkey(forum_status, forum_placed_on, forum_clock_start_on)")
        .eq("status", "active");
      if (error) throw new Error(`forum_days_avg: ${error.message}`);
      type Row = {
        start_date: string | null;
        membership_type: string | null;
        person: { forum_status: string | null; forum_placed_on: string | null; forum_clock_start_on: string | null } | null;
      };
      const r = forumDaysAverage(
        ((data ?? []) as unknown as Row[]).map((m) => ({
          clockStart: m.person?.forum_clock_start_on ?? m.start_date,
          forumStatus: m.person?.forum_status ?? null,
          placedOn: m.person?.forum_placed_on ?? null,
          primary: m.membership_type !== "Secondary Membership",
        })),
        today,
      );
      const undated = r.undated ? `; ${r.undated} placed without a date left out` : "";
      return { value: r.average, note: `${r.counted} new members in the last 365 days${undated}` };
    },
  },
  prospects_added_fy: {
    mode: () => ({ kind: "cumulative" }),
    value: async ({ fyFrom }) => {
      const { count, error } = await supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("pipeline", "Member Acquisition")
        .gte("created_at", fyFrom);
      if (error) throw new Error(`prospects_added_fy: ${error.message}`);
      return { value: count ?? 0, note: "Prospects added to the deal board since 1 July" };
    },
  },
  events_per_member_fy: {
    mode: () => ({ kind: "level" }),
    value: async ({ fyStart }) => {
      const p = await loadChapterPulse(fyStart);
      return { value: p.fyAvgEventsPerMember, note: "Event check-ins this fiscal year per active member" };
    },
  },
  learning_rating_fy: {
    mode: () => ({ kind: "level" }),
    value: async ({ fyFrom, today }) => {
      const { data, error } = await supabase
        .from("event_feedback")
        .select("event_value_rating, event:events!inner(type, starts_at)")
        .eq("event.type", "learning")
        .gte("event.starts_at", fyFrom)
        .lte("event.starts_at", `${today}T23:59:59Z`)
        .not("event_value_rating", "is", null);
      if (error) throw new Error(`learning_rating_fy: ${error.message}`);
      const ratings = ((data ?? []) as { event_value_rating: number }[]).map((r) => r.event_value_rating);
      return {
        value: ratings.length ? round1(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null,
        note: `${ratings.length} attendee ratings of Learning events this fiscal year, out of 5`,
      };
    },
  },
};

export type GoalUpdate = { title: string; metric: string; value: number | null; status: KrStatus | null; note: string; error?: string };

// Recalculates every agent-sourced key result for the current fiscal year.
// `write` false returns what would change without touching the database.
export async function updateGoalMetrics(write: boolean): Promise<GoalUpdate[]> {
  const fyStart = currentFyStart();
  const today = chapterToday();
  const ctx: Ctx = { fyStart, fyFrom: `${fyStart}-07-01`, today };
  const elapsed = fiscalYearElapsed(today, fyStart);
  const weekStart = `${today.slice(0, 7)}-01`;

  const { data, error } = await supabase
    .from("key_results")
    .select("id, title, target_value, current_value, status, source_detail, objective:objectives!key_results_objective_id_fkey!inner(year)")
    .eq("source", "agent")
    .eq("objective.year", fyStart);
  if (error) throw new Error(`key_results: ${error.message}`);
  type Kr = { id: string; title: string; target_value: number | null; current_value: number; status: KrStatus; source_detail: string | null };

  const out: GoalUpdate[] = [];
  for (const kr of (data ?? []) as unknown as Kr[]) {
    const metric = kr.source_detail ? GOAL_METRICS[kr.source_detail] : undefined;
    if (!metric) {
      out.push({ title: kr.title, metric: kr.source_detail ?? "", value: null, status: null, note: "", error: "Unknown metric key" });
      continue;
    }
    try {
      const { value, note } = await metric.value(ctx);
      if (value === null || kr.target_value === null) {
        out.push({ title: kr.title, metric: kr.source_detail!, value, status: null, note: note || "No data yet" });
        continue;
      }
      const status = goalStatus(value, Number(kr.target_value), metric.mode(ctx), elapsed);
      out.push({ title: kr.title, metric: kr.source_detail!, value, status, note });
      if (!write) continue;
      const { error: logError } = await supabase.from("kr_logs").insert({
        key_result_id: kr.id,
        week_start: weekStart,
        value,
        note_md: note,
        author_kind: "agent",
        author_agent: "goals-monthly",
      });
      if (logError) throw new Error(logError.message);
      const updates = { current_value: value, status, updated_at: new Date().toISOString() };
      const { error: krError } = await supabase.from("key_results").update(updates).eq("id", kr.id);
      if (krError) throw new Error(krError.message);
      await recordAudit({
        table: "key_results",
        recordId: kr.id,
        operation: "update",
        actor: "goals-monthly",
        oldData: { current_value: kr.current_value, status: kr.status },
        newData: updates,
      });
    } catch (e) {
      out.push({ title: kr.title, metric: kr.source_detail!, value: null, status: null, note: "", error: (e as Error).message });
    }
  }
  return out;
}
