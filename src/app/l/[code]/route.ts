import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  buildShortLinkDestination,
  normalizeShortCode,
  type ShortLinkTarget,
} from "@/lib/short-links";

// Public short-link redirect: /l/<code> sends the visitor to the stored
// site page with the stored UTM tags attached (307, so links can be
// repointed or deactivated at any time). Codes are managed by the board
// at /board/marketing/links; an unknown, inactive or malformed code lands
// on /events rather than erroring.
//
// The click counter is best-effort: a failed bump (for example before
// migration 112 is applied) never blocks the redirect.

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const origin = request.nextUrl.origin;
  const normalized = normalizeShortCode(code);
  if (!normalized) {
    return NextResponse.redirect(new URL("/events", origin), 307);
  }

  const { data, error } = await supabase
    .from("short_links")
    .select("target_path, utm_source, utm_medium, utm_campaign, utm_content, utm_term")
    .eq("code", normalized)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) {
    if (error) {
      console.warn("short link lookup failed (migration pending?):", error.message);
    }
    return NextResponse.redirect(new URL("/events", origin), 307);
  }

  const { error: bumpError } = await supabase.rpc("bump_short_link_clicks", {
    p_code: normalized,
  });
  if (bumpError) {
    console.warn("short link click not counted:", bumpError.message);
  }

  return NextResponse.redirect(
    buildShortLinkDestination(origin, data as ShortLinkTarget),
    307,
  );
}
