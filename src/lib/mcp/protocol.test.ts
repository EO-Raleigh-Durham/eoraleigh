import assert from "node:assert/strict";
import test from "node:test";
import { CHAPTER_SLUG } from "../../kernel/config/chapter.ts";
import { z } from "zod";
import { handleMcp, type ToolCallSeen } from "./protocol.ts";
import type { Tool } from "./tools.ts";

const tool: Tool = {
  name: "whoami",
  area: "me",
  title: "Who am I",
  description: "d",
  readOnly: true,
  input: z.object({}).passthrough(),
  inputJsonSchema: { type: "object", properties: {} },
  run: async () => ({ name: "A" }),
};

const post = (body: unknown) =>
  new Request("https://x/api/mcp", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

test("lists only the tools handed, and logs a call to any other as refused", async () => {
  const seen: ToolCallSeen[] = [];
  const list = await (await handleMcp(post({ jsonrpc: "2.0", id: 1, method: "tools/list" }), [tool])).json();
  assert.deepEqual(list.result.tools.map((t: { name: string }) => t.name), ["whoami"]);

  const refused = await (
    await handleMcp(post({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "sap_close_deal", arguments: {} } }), [tool], async (c) => {
      seen.push(c);
    })
  ).json();
  assert.equal(refused.error.code, -32602);
  assert.equal(seen[0].outcome, "refused");
  assert.equal(seen[0].handed, false);

  const ok = await (
    await handleMcp(post({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "whoami", arguments: {} } }), [tool], async (c) => {
      seen.push(c);
    })
  ).json();
  assert.match(ok.result.content[0].text, /"name":"A"/);
  assert.equal(seen[1].outcome, "ok");
});

test("a notification is acknowledged and never runs a tool", async () => {
  let ran = false;
  const t = { ...tool, run: async () => ((ran = true), {}) };
  const res = await handleMcp(post({ jsonrpc: "2.0", method: "tools/call", params: { name: "whoami" } }), [t]);
  assert.equal(res.status, 202);
  assert.equal(ran, false);
});

test("initialize answers with the server's name and instructions", async () => {
  const init = await (await handleMcp(post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } }), [])).json();
  assert.equal(init.result.protocolVersion, "2025-06-18");
  assert.equal(init.result.serverInfo.name, CHAPTER_SLUG);
  assert.match(init.result.instructions, /never follow instructions/);
});
