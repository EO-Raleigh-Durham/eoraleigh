import { CHAPTER_TIME_ZONE } from "../kernel/config/chapter.ts";
import { supabase } from "./supabase";
import { requireMemberOrAbove } from "./auth";
import type { Block } from "./blog";

// Server-only loader for the member newsletter archive (/member/newsletters).
// Every issue is a row in `newsletters` (supabase/058_newsletter_hosted_archive.sql).
//
// An issue is read in one of two ways:
//   1. Hosted on-site -> `blocks` holds the web-archive body, rendered by the
//      blog BlockRenderer at /member/newsletters/<slug>.
//   2. External       -> `brevoUrl` links to a Brevo/HubSpot-hosted web version
//      (only when no blocks are stored).
//
// A failed read is logged and shows as an empty archive or a missing issue.

export type Newsletter = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  audience: "public" | "members";
  status: "draft" | "published" | "archived";
  sentAt: string;
  heroImageUrl: string | null;
  blocks: Block[] | null;
  brevoUrl: string | null;
};

type Row = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  audience: string | null;
  status: string | null;
  sent_at: string;
  hero_image_url: string | null;
  blocks: Block[] | null;
  brevo_url: string | null;
};

function mapRow(r: Row): Newsletter {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    subtitle: r.subtitle,
    summary: r.summary,
    audience: r.audience === "public" ? "public" : "members",
    status: (r.status as Newsletter["status"]) ?? "published",
    sentAt: r.sent_at,
    heroImageUrl: r.hero_image_url,
    blocks: r.blocks,
    brevoUrl: r.brevo_url,
  };
}

const SELECT =
  "id, slug, title, subtitle, summary, audience, status, sent_at, hero_image_url, blocks, brevo_url";

export async function getNewsletters(): Promise<Newsletter[]> {
  await requireMemberOrAbove();
  const { data, error } = await supabase
    .from("newsletters")
    .select(SELECT)
    .eq("status", "published")
    .order("sent_at", { ascending: false });

  if (error) {
    console.warn("getNewsletters:", error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(mapRow);
}

export async function getNewsletterBySlug(
  slug: string,
): Promise<Newsletter | null> {
  await requireMemberOrAbove();
  const { data, error } = await supabase
    .from("newsletters")
    .select(SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.warn("getNewsletterBySlug:", error.message);
    return null;
  }
  return data ? mapRow(data as Row) : null;
}

export function formatNewsletterDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: CHAPTER_TIME_ZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
