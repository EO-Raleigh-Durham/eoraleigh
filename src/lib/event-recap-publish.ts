import { revalidatePath } from "next/cache";
import { supabase } from "./supabase";
import { generateEventRecap } from "./event-recap-generate.ts";
import { sendRecapReadyEmail } from "./email";
import { SITE_URL } from "./page-metadata";

// Generate, publish, notify. One path, shared by the board button and the
// auto-trigger that fires when a tagged post is published, so the two can
// never drift apart.
//
// This module does NOT authorize. Both callers are server actions that
// authorize first; keeping the guard at the action boundary matches the rest
// of the codebase and keeps this callable from a future cron.

export type PublishRecapResult = { ok: true } | { ok: false; error: string };

export async function publishRecapForEvent(
  eventId: string,
): Promise<PublishRecapResult> {
  const result = await generateEventRecap(eventId);

  if (!result.ok) {
    // Record the failure so it is visible on the board, without touching a
    // recap that may already be live.
    await supabase
      .from("events")
      .update({ recap_status: "failed" })
      .eq("id", eventId);
    return { ok: false, error: result.error };
  }

  const { error } = await supabase
    .from("events")
    .update({
      recap_blocks: result.blocks,
      recap_published: true,
      recap_status: "published",
      recap_generated_at: new Date().toISOString(),
      recap_stats_snapshot: result.report,
    })
    .eq("id", eventId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/events");
  revalidatePath("/past-events");
  revalidatePath(`/events/${eventId}`);

  // The recap is already live, so a mail failure is not a publish failure.
  await notifyMarketing(eventId, result.report);

  return { ok: true };
}

async function notifyMarketing(
  eventId: string,
  report: {
    statsIncluded: string[];
    statsSuppressed: { key: string; reason: string }[];
    testimonialCount: number;
    postSlug: string;
  },
): Promise<void> {
  const { data } = await supabase
    .from("events")
    .select("title, slug")
    .eq("id", eventId)
    .maybeSingle();
  const event = data as { title: string; slug: string | null } | null;
  if (!event) return;

  await sendRecapReadyEmail({
    eventTitle: event.title,
    recapUrl: `${SITE_URL}/events/${event.slug ?? eventId}`,
    postUrl: `${SITE_URL}/post/${report.postSlug}`,
    editUrl: `${SITE_URL}/board/events/${eventId}`,
    statsIncluded: report.statsIncluded,
    statsSuppressed: report.statsSuppressed,
    testimonialCount: report.testimonialCount,
  });
}
