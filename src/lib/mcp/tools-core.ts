// The connector's tool shape and the write-tool helper (MCP.0), shared by
// every area's tools (./sap-tools.ts, ./membership-tools.ts) and the registry
// (./tools.ts). Pure apart from ./receipt.ts: no data imports.
//
// Every write tool is built with writeTool(): it previews first, leading with
// plain-language warnings when the change is risky, and runs only with its
// preview's receipt (./receipt.ts).
import { z } from "zod";
import type { Area } from "./access.ts";
import type { McpCaller } from "./caller";
import { issueReceipt, receiptProblem } from "./receipt.ts";

/** One tool as tools/list describes it, with the area it belongs to and its body. */
export type Tool = {
  name: string;
  area: Area;
  title: string;
  description: string;
  /** MCP's readOnlyHint. A write tool previews first and runs only with its preview's receipt. */
  readOnly: boolean;
  /** MCP's destructiveHint: the write can't be taken back (an email) or closes records. */
  destructive?: boolean;
  /** Validates the call's arguments; its JSON Schema is `inputJsonSchema`. */
  input: z.ZodType<Record<string, unknown>>;
  inputJsonSchema: Record<string, unknown>;
  run: (input: Record<string, unknown>) => Promise<unknown>;
};

export const NO_INPUT = {
  input: z.object({}).passthrough(),
  inputJsonSchema: { type: "object", properties: {} },
};

/** Wraps text that came from outside the chapter so the app knows not to follow it. */
export function untrusted(text: string | null | undefined): { untrusted_text: string } | null {
  if (text == null || text === "") return null;
  return { untrusted_text: text };
}

// ---- Writes ----------------------------------------------------------------

/** What a write's preview tells the person before anything changes. */
export type Preview = {
  /** One line: what will change, e.g. "Lighthouse: In discussion → Proposal, follow-up 21 Nov". */
  summary: string;
  /** Plain-language warnings, most serious first; empty when the change is routine. */
  warnings: string[];
  /** Extra detail to show (the records affected, the email's subject). */
  details?: unknown;
};

/** A refusal a write's own rules raise (not found, not allowed, nothing to change). */
export type Refusal = { error: string };

const RECEIPT_PROPERTY = {
  receipt: {
    type: "string",
    description:
      "Leave out to preview. After showing the preview (and any warning) to the person and getting their yes, call again with exactly the same fields plus the receipt the preview returned.",
  },
};

/**
 * A write tool: called without a receipt it previews (and returns a receipt);
 * called with the receipt from that preview, for exactly the same fields, it
 * runs. `plan` validates and describes the change without writing; `apply`
 * performs it through the page's own function.
 */
export function writeTool<T extends Record<string, unknown>>(
  caller: McpCaller,
  spec: {
    name: string;
    area: Area;
    title: string;
    description: string;
    destructive?: boolean;
    input: z.ZodType<T>;
    properties: Record<string, unknown>;
    required?: string[];
    plan: (fields: T) => Promise<Preview | Refusal>;
    apply: (fields: T) => Promise<unknown>;
  },
): Tool {
  const subject = { personId: caller.user.id, clientId: caller.clientId, tool: spec.name };
  return {
    name: spec.name,
    area: spec.area,
    title: spec.title,
    description: `${spec.description} Previews first; show the preview to the person and act only on their yes.`,
    readOnly: false,
    destructive: spec.destructive,
    input: z.object({ receipt: z.string().max(200).optional() }).passthrough() as unknown as z.ZodType<Record<string, unknown>>,
    inputJsonSchema: {
      type: "object",
      properties: { ...spec.properties, ...RECEIPT_PROPERTY },
      ...(spec.required?.length ? { required: spec.required } : {}),
    },
    run: async (raw) => {
      const { receipt, ...rest } = raw as Record<string, unknown> & { receipt?: string };
      const parsed = spec.input.safeParse(rest);
      if (!parsed.success) return { error: `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join("; ")}` };
      const fields = parsed.data;
      const preview = await spec.plan(fields);
      if ("error" in preview) return preview;
      if (receipt === undefined) {
        return {
          preview: true,
          summary: preview.summary,
          warnings: preview.warnings,
          details: preview.details ?? null,
          receipt: issueReceipt(subject, fields),
          next: preview.warnings.length
            ? "Show the warnings and the summary to the person. Only if they clearly agree, call again with the same fields and this receipt."
            : "Show the summary to the person. If they agree, call again with the same fields and this receipt.",
        };
      }
      const problem = receiptProblem(subject, fields, receipt);
      if (problem) return { error: problem };
      return { done: true, summary: preview.summary, result: (await spec.apply(fields)) ?? null };
    },
  };
}

