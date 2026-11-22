// Validation and assembly for generated recap bodies.
//
// Recaps publish without human approval, so this module is a large part of the
// safety net. Two rules drive everything here:
//
//   1. The model writes prose only. Every fact on the page (stats,
//      testimonials, the teaser link) is assembled in code and spliced in.
//   2. A block the vocabulary does not know is a failed generation, not a
//      block to drop. Unknown tags render as nothing, so accepting one would
//      silently publish a recap with a hole in it.
//
// Pure, no Supabase client and no SDK, so it is directly testable.

import type { Block } from "./blog";

// The subset of the vocabulary the model is allowed to produce. Deliberately
// narrower than Block: the model has no business emitting a stat-callout or a
// cta-button, because those carry facts and links.
export const MODEL_ALLOWED_TAGS = [
  "p",
  "h2",
  "h3",
  "pull-quote",
  "tl-dr",
  "shipped-list",
] as const;

export type ModelAllowedTag = (typeof MODEL_ALLOWED_TAGS)[number];

// A recap longer than this stops being a recap and starts competing with the
// blog post it is supposed to be teasing.
export const MAX_MODEL_BLOCKS = 12;

export type ValidationResult =
  | { ok: true; blocks: Block[] }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateBlock(block: unknown, index: number): string | null {
  if (!isRecord(block)) return `Block ${index} is not an object`;

  const tag = block.tag;
  if (typeof tag !== "string") return `Block ${index} has no tag`;
  if (!(MODEL_ALLOWED_TAGS as readonly string[]).includes(tag)) {
    return `Block ${index} uses tag "${tag}", which the model may not emit`;
  }

  switch (tag) {
    case "p":
    case "h2":
    case "h3":
      if (!isNonEmptyString(block.text)) return `Block ${index} (${tag}) has no text`;
      return null;
    case "pull-quote":
      if (!isNonEmptyString(block.text)) return `Block ${index} (pull-quote) has no text`;
      if (block.attribution !== undefined && !isNonEmptyString(block.attribution)) {
        return `Block ${index} (pull-quote) has an empty attribution`;
      }
      return null;
    case "tl-dr":
      if (!Array.isArray(block.items) || block.items.length === 0) {
        return `Block ${index} (tl-dr) has no items`;
      }
      if (!block.items.every(isNonEmptyString)) {
        return `Block ${index} (tl-dr) has an empty item`;
      }
      return null;
    case "shipped-list":
      if (!isNonEmptyString(block.title)) return `Block ${index} (shipped-list) has no title`;
      if (!Array.isArray(block.items) || block.items.length === 0) {
        return `Block ${index} (shipped-list) has no items`;
      }
      if (!block.items.every(isNonEmptyString)) {
        return `Block ${index} (shipped-list) has an empty item`;
      }
      return null;
    default:
      return `Block ${index} uses unexpected tag "${tag}"`;
  }
}

// Parses and validates the model's raw output. Any failure rejects the whole
// generation: nothing is published rather than something partial.
export function validateModelBlocks(raw: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      ok: false,
      error: `Model output is not valid JSON: ${err instanceof Error ? err.message : "syntax error"}`,
    };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: "Model output must be an array of blocks" };
  }
  if (parsed.length === 0) {
    return { ok: false, error: "Model returned no blocks" };
  }
  if (parsed.length > MAX_MODEL_BLOCKS) {
    return {
      ok: false,
      error: `Model returned ${parsed.length} blocks, the cap is ${MAX_MODEL_BLOCKS}`,
    };
  }

  for (let i = 0; i < parsed.length; i += 1) {
    const error = validateBlock(parsed[i], i);
    if (error) return { ok: false, error };
  }

  return { ok: true, blocks: parsed as Block[] };
}

// Splices the code-assembled factual blocks into the model's prose. Order is
// fixed here rather than chosen by the model: prose, stats, prose remainder,
// testimonials, teaser.
export function assembleRecap(input: {
  modelBlocks: Block[];
  statBlock: Block | null;
  testimonialBlock: Block | null;
  teaserBlock: Block | null;
}): Block[] {
  const { modelBlocks, statBlock, testimonialBlock, teaserBlock } = input;

  // Stats sit after the opening beat so the page leads with a sentence, not a
  // number. If the model wrote only one block, stats follow it.
  const leadCount = Math.min(2, modelBlocks.length);
  const lead = modelBlocks.slice(0, leadCount);
  const rest = modelBlocks.slice(leadCount);

  const out: Block[] = [...lead];
  if (statBlock) out.push(statBlock);
  out.push(...rest);
  if (testimonialBlock) out.push(testimonialBlock);
  if (teaserBlock) out.push(teaserBlock);
  return out;
}
