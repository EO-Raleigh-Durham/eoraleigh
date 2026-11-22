"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBoardOrAbove } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Block, BlogStatus } from "@/lib/blog";
import { uniqueViolationMessage } from "@/lib/blog-conflicts";
import { publishRecapForEvent } from "@/lib/event-recap-publish";

type ActionResult = { ok: true } | { ok: false; error: string };

const VALID_STATUSES: BlogStatus[] = ["draft", "scheduled", "published", "archived"];

function s(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function nullable(v: string): string | null {
  return v === "" ? null : v;
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function parseBlocks(raw: string): { ok: true; blocks: Block[] | null } | { ok: false; error: string } {
  if (!raw.trim()) return { ok: true, blocks: null };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { ok: false, error: "Body JSON must be an array of block objects" };
    }
    return { ok: true, blocks: parsed as Block[] };
  } catch (err) {
    return {
      ok: false,
      error: `Body JSON could not be parsed: ${err instanceof Error ? err.message : "syntax error"}`,
    };
  }
}

type BuildResult =
  | { ok: true; patch: Record<string, unknown> }
  | { ok: false; error: string };

function buildPatchFromForm(formData: FormData): BuildResult {
  const slug = s(formData.get("slug"));
  const title = s(formData.get("title"));
  const subtitle = s(formData.get("subtitle"));
  const excerpt = s(formData.get("excerpt"));
  const externalUrl = s(formData.get("external_url"));
  const blocksRaw = s(formData.get("blocks"));
  const category = s(formData.get("category"));
  const tagsRaw = s(formData.get("tags"));
  const heroImage = s(formData.get("hero_image_url"));
  const readTimeRaw = s(formData.get("read_time_minutes"));
  const featured = formData.get("featured") === "on";
  const authorName = s(formData.get("author_name"));
  const authorRole = s(formData.get("author_role"));
  const series = s(formData.get("series"));
  const seriesTotalRaw = s(formData.get("series_total"));
  const metaTitle = s(formData.get("meta_title"));
  const metaDescription = s(formData.get("meta_description"));
  const ogImageUrl = s(formData.get("og_image_url"));
  const canonicalUrl = s(formData.get("canonical_url"));
  const primaryKeyword = s(formData.get("primary_keyword"));
  const secondaryKeywordsRaw = s(formData.get("secondary_keywords"));
  const status = s(formData.get("status")) || "draft";
  const publishedAtLocal = s(formData.get("published_at"));
  const eventId = s(formData.get("event_id"));

  if (!title) return { ok: false, error: "Title is required" };
  if (!slug) return { ok: false, error: "Slug is required" };
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { ok: false, error: "Slug must be lowercase letters, numbers, and dashes only" };
  }
  if (!VALID_STATUSES.includes(status as BlogStatus)) {
    return { ok: false, error: "Invalid status" };
  }

  const blocksResult = parseBlocks(blocksRaw);
  if (!blocksResult.ok) return blocksResult;

  const readTime = readTimeRaw === "" ? null : Number(readTimeRaw);
  if (readTime !== null && (!Number.isFinite(readTime) || readTime < 0)) {
    return { ok: false, error: "Read time must be a non-negative number" };
  }
  const seriesTotal = seriesTotalRaw === "" ? null : Number(seriesTotalRaw);
  if (seriesTotal !== null && (!Number.isFinite(seriesTotal) || seriesTotal < 0)) {
    return { ok: false, error: "Series total must be a non-negative number" };
  }

  const patch: Record<string, unknown> = {
    slug,
    title,
    subtitle: nullable(subtitle),
    excerpt: nullable(excerpt),
    external_url: nullable(externalUrl),
    blocks: blocksResult.blocks,
    category: nullable(category),
    tags: parseTags(tagsRaw),
    hero_image_url: nullable(heroImage),
    read_time_minutes: readTime,
    featured,
    author_name: nullable(authorName),
    author_role: nullable(authorRole),
    series: nullable(series),
    series_total: seriesTotal,
    meta_title: nullable(metaTitle),
    meta_description: nullable(metaDescription),
    og_image_url: nullable(ogImageUrl),
    canonical_url: nullable(canonicalUrl),
    primary_keyword: nullable(primaryKeyword),
    secondary_keywords: parseTags(secondaryKeywordsRaw),
    status,
    published_at: publishedAtLocal
      ? new Date(`${publishedAtLocal}T00:00:00+07:00`).toISOString()
      : null,
    event_id: nullable(eventId),
  };

  return { ok: true, patch };
}

// Publishing a post that is tagged to an event is the trigger for the whole
// recap program. Best-effort: the post is already saved, so a generation
// failure must not turn a successful save into an error. The board can always
// retry from the event page.
async function maybeTriggerRecap(patch: Record<string, unknown>): Promise<void> {
  const eventId = patch.event_id;
  if (typeof eventId !== "string" || !eventId) return;
  if (patch.status !== "published") return;

  try {
    await publishRecapForEvent(eventId);
  } catch (err) {
    console.warn(
      "maybeTriggerRecap:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

// Columns added by a migration that may not be applied yet. The app deploys
// before the migration runs, so a write carrying one of these fails with
// PGRST204 until the schema catches up. Reads already treat a missing column
// as absent; writes retry without it. Same pattern as OPTIONAL_EVENT_COLUMNS
// in src/app/board/events/actions.ts.
const OPTIONAL_BLOG_COLUMNS = ["event_id"] as const;

function isMissingOptionalColumn(
  err: { code?: string; message?: string } | null,
): boolean {
  if (!err) return false;
  if (err.code === "42703" || err.code === "PGRST204") return true;
  const m = err.message ?? "";
  return (
    new RegExp(`(${OPTIONAL_BLOG_COLUMNS.join("|")})`, "i").test(m) &&
    /(column|schema cache|does not exist)/i.test(m)
  );
}

function withoutOptionalColumns(
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const rest = { ...patch };
  for (const c of OPTIONAL_BLOG_COLUMNS) delete rest[c];
  return rest;
}

function revalidateBlogPaths(slug?: string) {
  revalidatePath("/board/blogs");
  revalidatePath("/blog");
  if (slug) revalidatePath(`/post/${slug}`);
}

export async function createBlogPost(formData: FormData): Promise<ActionResult> {
  await requireBoardOrAbove();
  const built = buildPatchFromForm(formData);
  if (!built.ok) return built;

  let { data, error } = await supabase
    .from("blog_posts")
    .insert(built.patch)
    .select("id, slug")
    .single();

  if (error && isMissingOptionalColumn(error)) {
    ({ data, error } = await supabase
      .from("blog_posts")
      .insert(withoutOptionalColumns(built.patch))
      .select("id, slug")
      .single());
  }

  if (error) {
    const conflict = uniqueViolationMessage(error);
    if (conflict) return { ok: false, error: conflict };
    return { ok: false, error: error.message };
  }

  if (!data) return { ok: false, error: "Could not create post" };

  revalidateBlogPaths(data.slug);
  await maybeTriggerRecap(built.patch);
  redirect(`/board/blogs/${data.id}?saved=1`);
}

export async function updateBlogPost(id: string, formData: FormData): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!id) return { ok: false, error: "Missing post id" };
  const built = buildPatchFromForm(formData);
  if (!built.ok) return built;

  let { data, error } = await supabase
    .from("blog_posts")
    .update(built.patch)
    .eq("id", id)
    .select("slug")
    .single();

  if (error && isMissingOptionalColumn(error)) {
    ({ data, error } = await supabase
      .from("blog_posts")
      .update(withoutOptionalColumns(built.patch))
      .eq("id", id)
      .select("slug")
      .single());
  }

  if (error) {
    const conflict = uniqueViolationMessage(error);
    if (conflict) return { ok: false, error: conflict };
    return { ok: false, error: error.message };
  }

  if (!data) return { ok: false, error: "Could not save post" };

  revalidateBlogPaths(data.slug);
  await maybeTriggerRecap(built.patch);
  redirect(`/board/blogs/${id}?saved=1`);
}

export async function deleteBlogPost(id: string): Promise<void> {
  await requireBoardOrAbove();
  if (!id) return;
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) {
    redirect(`/board/blogs?error=${encodeURIComponent(error.message)}`);
  }
  revalidateBlogPaths();
  redirect("/board/blogs?deleted=1");
}
