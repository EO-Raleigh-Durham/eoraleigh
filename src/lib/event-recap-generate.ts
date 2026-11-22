import { CHAPTER_TIME_ZONE } from "../kernel/config/chapter.ts";
import Anthropic from "@anthropic-ai/sdk";
import type { Block } from "./blog";
import { supabase } from "./supabase";
import { getEventRecapStats } from "./event-recap-stats-server.ts";
import { getEventTestimonials } from "./event-recap-testimonials-server.ts";
import { testimonialBlock, teaserBlock } from "./event-recap-testimonials.ts";
import { assembleRecap, validateModelBlocks } from "./event-recap-blocks.ts";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  promptFingerprint,
  PROMPT_VERSION,
  type RecapPromptInput,
} from "./event-recap-prompt.ts";

// The recap generator.
//
// The model writes connective prose and nothing else. Stats, testimonials and
// the teaser link are assembled in code and spliced in, so no fact on the
// published page ever passes through generation. That split is what makes
// publishing without human approval defensible.
//
// A validation failure publishes nothing and leaves any existing recap alone.

const MODEL = process.env.CHATBOT_MODEL ?? "claude-opus-4-8";
const MAX_TOKENS = 2000;

export type GenerateResult =
  | {
      ok: true;
      blocks: Block[];
      report: {
        promptVersion: string;
        fingerprint: string;
        model: string;
        statsIncluded: string[];
        statsSuppressed: { key: string; reason: string }[];
        testimonialCount: number;
        postSlug: string;
      };
    }
  | { ok: false; error: string };

type EventForRecap = {
  id: string;
  title: string;
  type: string;
  starts_at: string;
  location: string | null;
  speaker: string | null;
  blurb: string | null;
};

type PostForRecap = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  blocks: Block[] | null;
  status: string;
};

export async function generateEventRecap(eventId: string): Promise<GenerateResult> {
  const event = await loadEvent(eventId);
  if (!event) return { ok: false, error: "Event not found" };

  const post = await loadTaggedPost(eventId);
  if (!post) {
    return {
      ok: false,
      error: "No published blog post is tagged to this event yet",
    };
  }
  if (!post.blocks || post.blocks.length === 0) {
    return { ok: false, error: "The tagged post has no body to condense" };
  }

  // Facts first. Gathered in code, never asked of the model.
  const [stats, testimonials] = await Promise.all([
    getEventRecapStats(eventId),
    getEventTestimonials(eventId),
  ]);

  const promptInput: RecapPromptInput = {
    eventTitle: event.title,
    eventType: event.type,
    eventDate: new Date(event.starts_at).toLocaleDateString("en-GB", {
      timeZone: CHAPTER_TIME_ZONE,
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    eventLocation: event.location,
    eventSpeaker: event.speaker,
    eventBlurb: event.blurb,
    postTitle: post.title,
    postExcerpt: post.excerpt,
    postBlocks: post.blocks,
  };

  const generated = await callModel(promptInput);
  if (!generated.ok) return generated;

  const validated = validateModelBlocks(generated.text);
  if (!validated.ok) {
    // Nothing is written. A partial recap is worse than none.
    return { ok: false, error: `Generation rejected: ${validated.error}` };
  }

  const blocks = assembleRecap({
    // No stat block inside the recap body. The event page renders the stat
    // band live from the database, so embedding a snapshot here would print
    // the numbers twice and let the copy drift out of date the moment another
    // survey response lands. Stats still gate what the report tells marketing.
    modelBlocks: validated.blocks,
    statBlock: null,
    testimonialBlock: testimonialBlock(testimonials),
    teaserBlock: teaserBlock(post.slug),
  });

  return {
    ok: true,
    blocks,
    report: {
      promptVersion: PROMPT_VERSION,
      fingerprint: promptFingerprint(promptInput),
      model: MODEL,
      statsIncluded: stats.stats.map((stat) => stat.key),
      statsSuppressed: stats.suppressed.map((note) => ({
        key: note.key,
        reason: note.reason,
      })),
      testimonialCount: testimonials.length,
      postSlug: post.slug,
    },
  };
}

async function callModel(
  input: RecapPromptInput,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY is not configured" };
  }

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!text) return { ok: false, error: "Model returned no text" };
    return { ok: true, text: stripFence(text) };
  } catch (err) {
    return {
      ok: false,
      error: `Model call failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

// The system prompt forbids markdown fences, but a stray one should not fail a
// perfectly good generation.
function stripFence(text: string): string {
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(text.trim());
  return fenced ? fenced[1].trim() : text;
}

async function loadEvent(eventId: string): Promise<EventForRecap | null> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, type, starts_at, location, speaker, blurb")
    .eq("id", eventId)
    .maybeSingle();
  if (error) {
    console.warn("generateEventRecap event:", error.message);
    return null;
  }
  return (data as EventForRecap | null) ?? null;
}

async function loadTaggedPost(eventId: string): Promise<PostForRecap | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, blocks, status")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) {
    console.warn("generateEventRecap post:", error.message);
    return null;
  }
  const post = (data as PostForRecap | null) ?? null;
  if (!post || post.status !== "published") return null;
  return post;
}
