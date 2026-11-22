import { describe, expect, it } from "vitest";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { authConfigSchema, globalConfigSchema } from "@vercel/cli-config";
import { z } from "zod";
import { commentInput, createCardInput, firstIssue, MAX_MENTIONS } from "@/entities/boards/lib/schemas";
import { broadcastBlocksSchema, parseBroadcastBlocks } from "@/entities/campaigns/lib/marketing-email-blocks";

// Zod 3's uuid() accepted this shape without checking RFC variant bits.
// Stored IDs must retain that contract when the root export moves to Zod 4.
const storedId = "12345678-1234-1234-1234-123456789abc";

describe("dependency schema compatibility", () => {
  it("keeps stored ID shapes across cards, comments and broadcast blocks", () => {
    expect(createCardInput.parse({ boardId: "b", columnId: "c", title: " Card ", ideaId: storedId }).title).toBe("Card");
    expect(commentInput.parse({ body: " Reply ", parentCommentId: storedId, mentions: [storedId] })).toEqual({
      body: "Reply", parentCommentId: storedId, mentions: [storedId],
    });
    expect(broadcastBlocksSchema.parse({ posts: [storedId] })).toEqual({ posts: [storedId], cta: null, layout: "cards" });
    expect(broadcastBlocksSchema.safeParse({ posts: ["invalid"] }).success).toBe(false);
  });

  it("keeps comment defaults, required feedback and mention ceilings", () => {
    expect(commentInput.parse({ body: "Hello" })).toEqual({ body: "Hello", mentions: [] });
    for (const input of [{}, { body: "  " }]) {
      const parsed = commentInput.safeParse(input);
      expect(parsed.success).toBe(false);
      if (!parsed.success) expect(firstIssue(parsed.error.issues)).toBe("Write a comment first.");
    }
    expect(commentInput.safeParse({ body: "Hi", mentions: Array(MAX_MENTIONS).fill(storedId) }).success).toBe(true);
    expect(commentInput.safeParse({ body: "Hi", mentions: Array(MAX_MENTIONS + 1).fill(storedId) }).success).toBe(false);
  });

  it("keeps malformed stored broadcasts on the plain-letter fallback", () => {
    expect(parseBroadcastBlocks({ posts: Array(7).fill(storedId), layout: "feature" })).toEqual({ posts: [], cta: null, layout: "cards" });
    expect(parseBroadcastBlocks({ cta: { tagline: "Read", label: "Open", url: "https://example.com" } }).cta?.line).toBe("");
  });

  it("rejects oversized constrained collections before accumulating element errors", () => {
    const parsed = commentInput.safeParse({ body: "Hi", mentions: Array(1000).fill("invalid") });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toHaveLength(1);
      expect(parsed.error.issues[0]).toMatchObject({ code: "too_big", path: ["mentions"], maximum: MAX_MENTIONS });
    }
  });

  it("keeps Anthropic schema emission and local parsing compatible with the root export", () => {
    const format = zodOutputFormat(z.object({ title: z.string(), tags: z.array(z.string()).max(2) }));
    expect(format.type).toBe("json_schema");
    expect(format.schema.additionalProperties).toBe(false);
    expect(format.parse('{"title":"Example","tags":["one"]}')).toEqual({ title: "Example", tags: ["one"] });
    expect(() => format.parse('{"title":123,"tags":[]}')).toThrow();
  });

  it("keeps Vercel config schema validation and unknown-key passthrough without reading host files", () => {
    const config = { currentTeam: "fixture", telemetry: { enabled: false, future: true }, future: "kept" };
    expect(globalConfigSchema.parse(config)).toEqual(config);
    expect(globalConfigSchema.safeParse({ credStorage: "invalid" }).success).toBe(false);
    expect(authConfigSchema.parse({ token: "fictional-test-token", expiresAt: 123, future: true })).toEqual({
      token: "fictional-test-token", expiresAt: 123, future: true,
    });
    expect(authConfigSchema.safeParse({ expiresAt: "invalid" }).success).toBe(false);
  });
});
