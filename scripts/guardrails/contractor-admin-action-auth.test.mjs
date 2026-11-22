import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// The contractor access actions (src/app/admin/users/contractors/actions.ts)
// grant, renew, change and revoke access. Only a super admin may call them
// (plan 10, decided 17 Nov 2026), and the check must run before any data is
// read or written. requireSuperAdmin redirects everyone else.

const root = new URL("../../", import.meta.url);

function load(relative, require) {
  const source = readFileSync(new URL(relative, root), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext("(function(require, exports) {\n" + compiled + "\n})", { console, FormData, Date, URL })(require, exports);
  return exports;
}

function form() {
  const f = new FormData();
  f.set("email", "new@example.com");
  f.set("full_name", "New Contractor");
  f.set("area", "sap_pipeline");
  f.set("sponsor_person_id", "sponsor-1");
  f.set("access", "edit");
  f.set("expires_at", "2999-12-31");
  return f;
}

const CALLS = [
  ["addContractorAction", (a) => a.addContractorAction(form())],
  ["renewGrantAction", (a) => a.renewGrantAction("g1", "2999-12-31")],
  ["setGrantEditAction", (a) => a.setGrantEditAction("g1", false)],
  ["revokeGrantAction", (a) => a.revokeGrantAction("g1")],
];

for (const superAdmin of [false, true]) {
  for (const [name, call] of CALLS) {
    test(`${name}: ${superAdmin ? "super admin may act" : "anyone else is refused before any write"}`, async () => {
      const redirected = new Error("REDIRECT");
      const writes = [];
      const record = (fn) => async (...args) => { writes.push([fn, ...args]); return { ok: true }; };
      const actions = load("src/app/admin/users/contractors/actions.ts", (s) => {
        if (s === "next/cache") return { revalidatePath: () => {} };
        if (s === "@/lib/auth") {
          return {
            requireSuperAdmin: async () => {
              if (!superAdmin) throw redirected;
              return { id: "admin-1", role: "super_admin" };
            },
          };
        }
        if (s === "@/lib/contractor-admin") {
          return {
            expiryError: () => null,
            parseContractorForm: (raw) => ({ ok: true, input: raw }),
          };
        }
        if (s === "@/lib/access-grants-admin") {
          return {
            grantContractorAccess: record("grant"),
            renewGrant: record("renew"),
            setGrantEdit: record("setEdit"),
            revokeGrant: record("revoke"),
          };
        }
        throw new Error(`Unexpected actions dependency ${s}`);
      });

      let thrown;
      try { await call(actions); } catch (e) { thrown = e; }
      if (!superAdmin) {
        assert.equal(thrown, redirected, "non super admins must be redirected");
        assert.equal(writes.length, 0, "wrote before authorising");
        return;
      }
      assert.equal(thrown, undefined);
      assert.equal(writes.length, 1);
      if (name === "addContractorAction") assert.equal(writes[0][2], "admin-1", "granted_by is the acting admin");
    });
  }
}

test("grant updates only touch live grants", () => {
  const src = readFileSync(new URL("src/lib/access-grants-admin.ts", root), "utf8");
  const body = src.slice(src.indexOf("async function updateLiveGrant"));
  const fn = body.slice(0, body.indexOf("\n}\n"));
  assert.match(fn, /\.eq\("id", grantId\)/);
  assert.match(fn, /\.is\("revoked_at", null\)/);
});
