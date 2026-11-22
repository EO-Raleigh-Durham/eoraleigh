import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { reachOf } from "./access.ts";
import { toolsFor, writeTool } from "./tools.ts";
import type { McpCaller } from "./caller.ts";

process.env.MCP_RECEIPT_SECRET = "test-secret";

function caller(role: "super_admin" | "board" | "contractor", portfolio: string[] = [], clientId = "claude"): McpCaller {
  return {
    user: { id: "p1", userId: "u1", email: "a@b.c", fullName: "A", role, active: true, personId: null },
    reach: reachOf(role, portfolio, [])!,
    portfolio,
    clientId,
  };
}

function demoWrite(c: McpCaller, applied: string[]) {
  return writeTool(c, {
    name: "demo_write",
    area: "sap",
    title: "Demo",
    description: "Demo write.",
    input: z.object({ dealId: z.string(), note: z.string() }),
    properties: {},
    plan: async (f) =>
      f.dealId === "missing"
        ? { error: "Not found" }
        : { summary: `Note on ${f.dealId}`, warnings: f.note === "bulk" ? ["This changes 9 deals."] : [] },
    apply: async (f) => {
      applied.push(f.dealId);
      return { id: f.dealId };
    },
  });
}

test("a write previews, then runs only with its own receipt for the same fields", async () => {
  const applied: string[] = [];
  const tool = demoWrite(caller("super_admin"), applied);
  const preview = (await tool.run({ dealId: "d1", note: "bulk" })) as { preview: boolean; receipt: string; warnings: string[] };
  assert.equal(preview.preview, true);
  assert.deepEqual(preview.warnings, ["This changes 9 deals."]);
  assert.deepEqual(applied, [], "a preview writes nothing");

  const changed = (await tool.run({ dealId: "d2", note: "bulk", receipt: preview.receipt })) as { error: string };
  assert.match(changed.error, /does not match/);
  const forgedConfirm = (await tool.run({ dealId: "d1", note: "bulk", receipt: "true" })) as { error: string };
  assert.match(forgedConfirm.error, /needs the receipt/);
  const otherApp = demoWrite(caller("super_admin", [], "chatgpt"), applied);
  assert.match(((await otherApp.run({ dealId: "d1", note: "bulk", receipt: preview.receipt })) as { error: string }).error, /does not match/);
  assert.deepEqual(applied, []);

  const done = (await tool.run({ dealId: "d1", note: "bulk", receipt: preview.receipt })) as { done: boolean };
  assert.equal(done.done, true);
  assert.deepEqual(applied, ["d1"]);
});

test("a write's own refusal comes back before any preview or receipt", async () => {
  const applied: string[] = [];
  const out = (await demoWrite(caller("super_admin"), applied).run({ dealId: "missing", note: "x" })) as { error: string };
  assert.equal(out.error, "Not found");
});

const SAP_READS = ["sap_today", "sap_pipeline", "sap_deal"];
const SAP_WRITES = ["sap_log_contact", "sap_snooze", "sap_update_deal", "sap_close_deal", "sap_add_deal", "sap_add_note"];
const MEMBERSHIP_READS = ["prospects_contact_next", "prospects_clear_out", "prospect", "onboarding"];
const MEMBERSHIP_WRITES = [
  "prospects_log_contact",
  "prospects_move_stage",
  "prospects_close_lost",
  "prospects_add_note",
  "onboarding_move_stage",
];

const OWN_READS = ["my_commitments"];
const OWN_WRITES = ["goal_check_in", "card_update", "meeting_update_write", "issue_file", "issue_update"];
const OWN = [...OWN_READS, ...OWN_WRITES];
const DATA_READS = ["database_schema", "query_database"];

function names(c: McpCaller, filter?: Parameters<typeof toolsFor>[2]): string[] {
  return toolsFor(c, "https://x", filter).map((t) => t.name).sort();
}
const sorted = (...lists: string[][]) => lists.flat().sort();

test("whoami is handed to every level; nothing to a filter that names no group", () => {
  for (const c of [caller("super_admin"), caller("board", ["Finance"]), caller("contractor")]) {
    assert.ok(names(c).includes("whoami"));
    assert.deepEqual(toolsFor(c, "https://x", "none"), []);
  }
});

test("a board member reads SAP and membership but writes only their portfolio", () => {
  assert.deepEqual(names(caller("board", ["Finance"])), sorted(["whoami"], OWN, SAP_READS, MEMBERSHIP_READS, DATA_READS));
  assert.deepEqual(names(caller("board", ["Strategic Alliance Partner"])), sorted(["whoami"], OWN, SAP_READS, SAP_WRITES, MEMBERSHIP_READS, DATA_READS));
  assert.deepEqual(names(caller("board", ["Membership"])), sorted(["whoami"], OWN, SAP_READS, MEMBERSHIP_READS, MEMBERSHIP_WRITES, DATA_READS));
  assert.deepEqual(
    names(caller("board", ["President"])),
    sorted(["whoami"], OWN, SAP_READS, SAP_WRITES, MEMBERSHIP_READS, MEMBERSHIP_WRITES, DATA_READS),
  );
  assert.deepEqual(names(caller("super_admin")), names(caller("board", ["President"])));
});

test("?portfolio= narrows to one group and never adds", () => {
  assert.deepEqual(names(caller("super_admin"), "sap"), sorted(["whoami"], OWN, SAP_READS, SAP_WRITES));
  assert.deepEqual(names(caller("board", ["Strategic Alliance Partner"]), "membership"), sorted(["whoami"], OWN, MEMBERSHIP_READS));
  assert.deepEqual(names(caller("board", ["Finance"]), "sap"), sorted(["whoami"], OWN, SAP_READS));
  assert.deepEqual(names(caller("board", ["Finance"]), "chapter"), sorted(["whoami"], OWN, DATA_READS));
});

test("a contractor gets SAP only with a live grant, writes only with an edit grant", () => {
  const contractor = (grants: { area: string; canEdit: boolean; active: boolean }[]): McpCaller => ({
    ...caller("contractor"),
    reach: reachOf("contractor", [], grants)!,
  });
  const CONTRACTOR_OWN = OWN.filter((n) => n !== "issue_file");
  assert.deepEqual(names(contractor([])), sorted(["whoami"], CONTRACTOR_OWN));
  assert.deepEqual(names(contractor([{ area: "sap_pipeline", canEdit: true, active: false }])), sorted(["whoami"], CONTRACTOR_OWN));
  assert.deepEqual(names(contractor([{ area: "sap_pipeline", canEdit: false, active: true }])), sorted(["whoami"], CONTRACTOR_OWN, SAP_READS));
  assert.deepEqual(names(contractor([{ area: "sap_pipeline", canEdit: true, active: true }])), sorted(["whoami"], CONTRACTOR_OWN, SAP_READS, SAP_WRITES));
});

test("every write tool previews first and every tool has a schema", () => {
  for (const t of toolsFor(caller("super_admin"), "https://x")) {
    assert.equal(t.inputJsonSchema.type, "object", t.name);
    if (!t.readOnly) assert.match(t.description, /Previews first/, t.name);
  }
  const destructive = toolsFor(caller("super_admin"), "https://x").filter((t) => t.destructive).map((t) => t.name).sort();
  assert.deepEqual(destructive, ["prospects_close_lost", "sap_close_deal"]);
});

test("writes refuse bad input before touching anything", async () => {
  const tools = toolsFor(caller("super_admin"), "https://x");
  const run = (name: string, input: Record<string, unknown>) => tools.find((t) => t.name === name)!.run(input);
  assert.match(((await run("sap_update_deal", { dealId: "not-a-uuid" })) as { error: string }).error, /Invalid arguments/);
  assert.match(((await run("prospects_close_lost", { dealIds: [] })) as { error: string }).error, /Invalid arguments/);
  assert.match(
    ((await run("prospects_move_stage", { dealId: "00000000-0000-4000-8000-000000000000", stage: "Closed Won" })) as { error: string }).error,
    /Invalid arguments/,
  );
});

test("own-record writes refuse a caller with no person record before reading anything", async () => {
  const tools = toolsFor(caller("board"), "https://x");
  const run = (name: string, input: Record<string, unknown>) => tools.find((t) => t.name === name)!.run(input);
  const id = "00000000-0000-4000-8000-000000000000";
  for (const [name, input] of [
    ["goal_check_in", { keyResultId: id, value: 3, status: "on_track" }],
    ["card_update", { cardId: id, column: "Done" }],
    ["meeting_update_write", { body: "All good" }],
    ["issue_file", { title: "x", diagnosis: "system" }],
  ] as const) {
    assert.match(((await run(name, input)) as { error: string }).error, /not linked to a person record/, name);
  }
  assert.match(((await run("goal_check_in", { keyResultId: "nope", value: 3, status: "on_track" })) as { error: string }).error, /Invalid arguments/);
});

test("an issue is yours when assigned to you or filed by you", async () => {
  const { ownsIssue } = await import("./own-tools.ts");
  assert.ok(ownsIssue({ assignee_person_id: "p1", filed_by: "x@y.z" }, "p1", "a@b.c"));
  assert.ok(ownsIssue({ assignee_person_id: null, filed_by: "A@B.c" }, "p1", "a@b.c"));
  assert.ok(!ownsIssue({ assignee_person_id: "p2", filed_by: "x@y.z" }, "p1", "a@b.c"));
  assert.ok(!ownsIssue({ assignee_person_id: null, filed_by: "x@y.z" }, null, "a@b.c"));
});
