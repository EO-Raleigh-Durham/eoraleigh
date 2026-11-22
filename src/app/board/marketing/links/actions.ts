"use server";

import { revalidatePath } from "next/cache";
import { requireBoardOrAbove } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  PLACEMENTS,
  buildCustomSpec,
  buildPlacementSpec,
  describePlacement,
  isInternalPath,
  normalizeShortCode,
  placementByKey,
  type PlacementSpec,
  type ShortLinkTarget,
} from "@/lib/short-links";

export type MadeLink = {
  label: string;
  code: string;
  // True when this call created it, false when an identical link already
  // existed and was reused (so nobody ends up with two of the same link).
  created: boolean;
};

export type MakeLinksResult =
  | { ok: true; links: MadeLink[] }
  | { ok: false; error: string };

export type ShortLinkActionResult = { ok: true } | { ok: false; error: string };

function s(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

// An identical link (same page and tags), if one exists. A link that was
// switched off is switched back on, since asking for it again means it is
// wanted.
async function findExisting(
  target: ShortLinkTarget,
): Promise<{ code: string; active: boolean } | null> {
  let query = supabase
    .from("short_links")
    .select("code, active")
    .eq("target_path", target.target_path);
  const columns = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ] as const;
  for (const column of columns) {
    const value = target[column];
    query = value === null ? query.is(column, null) : query.eq(column, value);
  }
  const { data } = await query.limit(1);
  const row = (data ?? [])[0] as { code: string; active: boolean } | undefined;
  return row ?? null;
}

// Make a link for this spec, or reuse the identical one that already exists.
// If the wanted code belongs to a different link, -2, -3 and so on are tried.
async function ensureLink(
  spec: PlacementSpec,
): Promise<{ ok: true; code: string; created: boolean } | { ok: false; error: string }> {
  const existing = await findExisting(spec);
  if (existing) {
    if (!existing.active) {
      await supabase.from("short_links").update({ active: true }).eq("code", existing.code);
    }
    return { ok: true, code: existing.code, created: false };
  }

  const row = {
    target_path: spec.target_path,
    utm_source: spec.utm_source,
    utm_medium: spec.utm_medium,
    utm_campaign: spec.utm_campaign,
    utm_content: spec.utm_content,
    utm_term: spec.utm_term,
  };
  for (let attempt = 1; attempt <= 9; attempt += 1) {
    const code =
      attempt === 1 ? spec.codeBase : `${spec.codeBase.slice(0, 38)}-${attempt}`;
    const { error } = await supabase.from("short_links").insert({ code, ...row });
    if (!error) return { ok: true, code, created: true };
    if (error.code !== "23505") {
      console.error("ensureLink:", error.message);
      return { ok: false, error: "Could not save the links. Try again." };
    }
  }
  return { ok: false, error: "Could not find a free code for this link. Try again." };
}

// The one-click path: pick a page, then either make the whole standard set
// (WhatsApp Official, WhatsApp Social, Facebook, LinkedIn, Instagram) or one
// placement (optionally with a post or ad name). Idempotent: running it again
// returns the same links and never makes duplicates.
export async function createLinksForPage(
  formData: FormData,
): Promise<MakeLinksResult> {
  await requireBoardOrAbove();

  const pagePath = s(formData.get("path")).slice(0, 500);
  if (!isInternalPath(pagePath)) {
    return {
      ok: false,
      error: 'Pick an event, or type a page on the site starting with "/", for example /join',
    };
  }

  const placementKey = s(formData.get("placement"));
  const label = s(formData.get("label")).slice(0, 60);

  // "Something else": a platform or place that is not in the list.
  if (placementKey === "custom") {
    const spec = buildCustomSpec(pagePath, s(formData.get("source")).slice(0, 60), label);
    if ("error" in spec) return { ok: false, error: spec.error };
    const made = await ensureLink(spec);
    if (!made.ok) return made;
    revalidatePath("/board/marketing/links");
    return {
      ok: true,
      links: [{ label: describePlacement(spec), code: made.code, created: made.created }],
    };
  }
  const chosen =
    placementKey === "" || placementKey === "standard"
      ? PLACEMENTS.filter((p) => p.standard)
      : [placementByKey(placementKey)].filter((p) => p !== null);
  if (chosen.length === 0) return { ok: false, error: "Pick where the link will be posted." };

  const links: MadeLink[] = [];
  for (const placement of chosen) {
    const spec = buildPlacementSpec(pagePath, placement, label);
    if ("error" in spec) return { ok: false, error: spec.error };
    const made = await ensureLink(spec);
    if (!made.ok) return made;
    links.push({ label: placement.label, code: made.code, created: made.created });
  }

  revalidatePath("/board/marketing/links");
  return { ok: true, links };
}

// Turn a link off (or back on). Off means /l/<code> falls back to /events.
export async function setShortLinkActive(
  code: string,
  active: boolean,
): Promise<ShortLinkActionResult> {
  await requireBoardOrAbove();

  const normalized = normalizeShortCode(code);
  if (!normalized) return { ok: false, error: "Unknown code" };

  const { error } = await supabase
    .from("short_links")
    .update({ active })
    .eq("code", normalized);
  if (error) {
    console.error("setShortLinkActive:", error.message);
    return { ok: false, error: "Could not update the link. Try again." };
  }

  revalidatePath("/board/marketing/links");
  return { ok: true };
}
