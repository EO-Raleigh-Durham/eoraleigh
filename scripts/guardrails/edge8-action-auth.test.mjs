// Every server action ported from edge8-web (src/entities) awaits an
// authorization guard (requirePermission, boardMutation, boardActorFor and the
// rest of edge8's GUARDS) before it touches data, because the clients it uses
// bypass RLS. The checker is edge8's own (edge8-action-auth.mjs).
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { checkActionAuth, loadAllowlist } from "./edge8-action-auth.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

test("every ported edge8 server action is gated", () => {
  const allowlist = loadAllowlist(path.join(here, "edge8-action-auth-allowlist.json"));
  const { checked, violations, stale } = checkActionAuth({ root, appDirs: ["src/entities"], allowlist });
  assert.ok(checked > 100, `expected the ported actions to be found, saw ${checked}`);
  assert.deepEqual(violations, []);
  assert.deepEqual(stale, []);
});
