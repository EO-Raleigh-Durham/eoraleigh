// Prompt assembly for the recap generator.
//
// Everything the model is allowed to know arrives through here as plain text.
// It gets no database access, no tools, and no facts it is expected to
// reproduce: the stats and testimonials are rendered into the prompt only as
// context for tone, and are spliced into the final body from code.
//
// Pure, so the prompt shape itself is testable.

import { CHAPTER_COUNTRY, CHAPTER_NAME } from "../kernel/config/chapter.ts";
import type { Block } from "./blog";
import { MODEL_ALLOWED_TAGS, MAX_MODEL_BLOCKS } from "./event-recap-blocks.ts";

export const PROMPT_VERSION = "recap-v1";

export type RecapPromptInput = {
  eventTitle: string;
  eventType: string;
  eventDate: string;
  eventLocation: string | null;
  eventSpeaker: string | null;
  eventBlurb: string | null;
  postTitle: string;
  postExcerpt: string | null;
  postBlocks: Block[] | null;
};

// Flattens the post to the text the model should read. Non-text blocks carry
// no prose worth condensing, and images would only invite invented captions.
export function postPlainText(blocks: Block[] | null): string {
  if (!blocks) return "";
  const out: string[] = [];
  for (const block of blocks) {
    switch (block.tag) {
      case "p":
      case "h2":
      case "h3":
      case "h4":
      case "blockquote":
      case "li":
        out.push(stripTags(block.text));
        break;
      case "pull-quote":
        out.push(
          block.attribution
            ? `"${stripTags(block.text)}" — ${block.attribution}`
            : `"${stripTags(block.text)}"`,
        );
        break;
      case "emphasis-box":
        out.push(stripTags(block.text));
        break;
      case "tl-dr":
      case "shipped-list":
        out.push(block.items.map((item) => `- ${stripTags(item)}`).join("\n"));
        break;
      case "conclusion-box":
        out.push(block.paragraphs.map(stripTags).join("\n"));
        break;
      case "faq":
        out.push(`${stripTags(block.question)}\n${stripTags(block.answer)}`);
        break;
      default:
        break;
    }
  }
  return out.filter(Boolean).join("\n\n");
}

// Light inline HTML is allowed in block text. The model should read the words,
// not the markup.
function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

export const SYSTEM_PROMPT = [
  `You write event recaps for ${CHAPTER_NAME}, an entrepreneurs' organization chapter${CHAPTER_COUNTRY ? ` in ${CHAPTER_COUNTRY}` : ""}.`,
  "",
  "A recap is a short, energetic condensation of a longer blog post, shown on the event's own page.",
  "It is the appetiser. The blog post is the meal. Your job is to make a reader want the meal.",
  "",
  "RULES",
  `- Return ONLY a JSON array of blocks. No prose before or after, no markdown fence.`,
  `- Allowed tags, and nothing else: ${MODEL_ALLOWED_TAGS.join(", ")}.`,
  "",
  "BLOCK SHAPES. Use these exact field names. A wrong field name fails validation",
  "and the whole recap is discarded, so copy them literally:",
  '  {"tag": "p", "text": "..."}',
  '  {"tag": "h2", "text": "..."}',
  '  {"tag": "h3", "text": "..."}',
  '  {"tag": "pull-quote", "text": "...", "attribution": "..."}',
  '  {"tag": "tl-dr", "items": ["...", "..."]}',
  '  {"tag": "shipped-list", "title": "...", "items": ["...", "..."]}',
  "The text field is named text, never content, never body, never value.",
  "",
  `- Return between 3 and ${MAX_MODEL_BLOCKS} blocks. Aim for 4 to 6.`,
  "- Open with one or two short paragraphs that put the reader in the room.",
  "- Include exactly one pull-quote, lifted VERBATIM from the source post. Never paraphrase into a quote.",
  "- Attribute the pull-quote only if the source names the speaker.",
  "- Close your prose with what people took away, as a paragraph or a shipped-list.",
  "",
  "NEVER",
  "- Never state a number: no attendance, no ratings, no percentages, no counts. Those are added after you.",
  "- Never invent a quote, a name, a company, or an outcome not in the source.",
  "- Never write a call to action or a link. One is added after you.",
  "- Never emit a stat-callout, testimonial-row, cta-button, image, or html block.",
  "",
  "STYLE",
  "- Direct and concrete. Short sentences. No corporate filler, no hype adjectives.",
  "- Do not use em dashes.",
  "- Do not end a heading with a period.",
  "- British or American spelling is fine, just be consistent with the source.",
].join("\n");

export function buildUserPrompt(input: RecapPromptInput): string {
  const parts: string[] = [];

  parts.push("EVENT");
  parts.push(`Title: ${input.eventTitle}`);
  parts.push(`Type: ${input.eventType}`);
  parts.push(`Date: ${input.eventDate}`);
  if (input.eventLocation) parts.push(`Location: ${input.eventLocation}`);
  if (input.eventSpeaker) parts.push(`Speaker: ${input.eventSpeaker}`);
  if (input.eventBlurb) parts.push(`Description: ${input.eventBlurb}`);

  parts.push("");
  parts.push("SOURCE POST");
  parts.push(`Title: ${input.postTitle}`);
  if (input.postExcerpt) parts.push(`Excerpt: ${input.postExcerpt}`);
  parts.push("");
  parts.push(postPlainText(input.postBlocks) || "(The post has no body text.)");

  parts.push("");
  parts.push(
    "Write the recap now. Return only the JSON array. Remember: no numbers, no links, no invented quotes.",
  );

  return parts.join("\n");
}

// Identifies a generation for the audit log: same inputs and same prompt
// version should reproduce the same recap.
export function promptFingerprint(input: RecapPromptInput): string {
  const material = `${PROMPT_VERSION}|${input.eventTitle}|${input.postTitle}|${postPlainText(
    input.postBlocks,
  )}`;
  let hash = 0;
  for (let i = 0; i < material.length; i += 1) {
    hash = (hash * 31 + material.charCodeAt(i)) | 0;
  }
  return `${PROMPT_VERSION}-${(hash >>> 0).toString(16)}`;
}
