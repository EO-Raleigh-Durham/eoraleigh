import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// marketing left this list when /board/marketing became the ported edge8 Marketing
// System; its actions are checked by edge8-action-auth.test.mjs.
// strategic-alliance-partners left this list when contractors gained grant-based
// SAP access; sap-area-action-auth.test.mjs runs the same boundary for it.
const labels = ["historical-metrics", "members", "surveys", "the-pulse-of-the-chapter", "inquiries"];
const root = new URL("../../", import.meta.url);

function load(relative, require) {
  const source = readFileSync(new URL(relative, root), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext("(function(require, exports) {\n" + compiled + "\n})", { console, FormData })(require, exports);
  return exports;
}

const access = load("src/lib/access.ts", () => { throw new Error("Unexpected access dependency"); });

for (const label of labels) {
  for (const role of [null, "guest", "member", "board", "super_admin"]) {
    test(`${label}: ${role ?? "anonymous"} crosses the real board role gate before action work`, async () => {
      const denied = new Error("AUTH_REDIRECT");
      const workReached = new Error("PRIVILEGED_WORK_REACHED");
      let guardCalls = 0;
      let privilegedCalls = 0;
      const work = () => { privilegedCalls++; throw workReached; };
      const auth = load("src/lib/auth.ts", (specifier) => {
        if (specifier === "./access") return access;
        if (specifier === "react") return { cache: (fn) => fn };
        if (specifier === "next/navigation") return { redirect: () => { throw denied; } };
        return {};
      });
      // Mock only the resolved session. Execute the application's real
      // requireBoardOrAbove -> requireAtLeast -> roleAtLeast chain.
      auth.getSessionUser = async () => role ? { role, active: true } : null;
      const actions = load(`src/app/board/${label}/actions.ts`, (specifier) => {
        if (specifier === "@/lib/auth") return {
          requireBoardOrAbove: async () => { guardCalls++; return auth.requireBoardOrAbove(); },
        };
        if (specifier === "@/lib/supabase") return { supabase: { from: work } };
        if (specifier === "next/cache") return { revalidatePath: work };
        if (specifier === "next/navigation") return { redirect: work };
        return new Proxy({}, { get: () => work });
      });
      assert(Object.keys(actions).length > 0);
      for (const [name, action] of Object.entries(actions)) {
        guardCalls = 0;
        privilegedCalls = 0;
        let thrown;
        try { await action(); } catch (error) { thrown = error; }
        assert.equal(guardCalls, 1, `${name} must await its board guard`);
        if (role !== "board" && role !== "super_admin") {
          assert.equal(thrown, denied, `${name} must reject through authentication`);
          assert.equal(privilegedCalls, 0, `${name} reached privileged work before authorization`);
        } else {
          // Invalid arguments may fail validation; they must not fail the
          // role gate. Privileged helpers are stubs, so no real data is read.
          assert.notEqual(thrown, denied, `${name} rejected an authorized staff role`);
        }
      }
    });
  }
}
