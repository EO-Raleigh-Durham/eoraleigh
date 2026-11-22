import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// acceptNda (src/app/contractor/nda/actions.ts) is an externally callable
// Server Action. It must check the session, require role === "contractor",
// load the caller's own live grant and validate it with the real policy
// (ndaAcceptanceError) before recording anything, and it must record only
// against the caller's own profile id. Plan: docs/plans/10-contractor-access.html

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

const access = load("src/lib/access.ts", () => { throw new Error("Unexpected access dependency"); });
const nda = load("src/content/legal/contractor-nda.ts", () => { throw new Error("Unexpected nda dependency"); });
const grants = load("src/lib/access-grants.ts", (s) => {
  if (s === "./access.ts") return access;
  if (s === "../content/legal/contractor-nda.ts") return nda;
  throw new Error(`Unexpected access-grants dependency ${s}`);
});

const PENDING = {
  area: "sap_pipeline", can_edit: true, expires_at: "2999-12-31", revoked_at: null,
  nda_version: null, nda_accepted_at: null,
};

function form(over = {}) {
  const f = new FormData();
  const v = { agreed: "on", name: "Linh Tran", version: nda.CONTRACTOR_NDA_VERSION, ...over };
  for (const [k, val] of Object.entries(v)) if (val !== undefined) f.set(k, val);
  return f;
}

const SCENARIOS = [
  { name: "anonymous", user: null, grant: null, form: form(), allowed: false },
  { name: "member", user: { id: "p1", role: "member" }, grant: PENDING, form: form(), allowed: false },
  { name: "board", user: { id: "p1", role: "board" }, grant: PENDING, form: form(), allowed: false },
  { name: "contractor without grant", user: { id: "p1", role: "contractor" }, grant: null, form: form(), allowed: false },
  { name: "contractor with expired grant", user: { id: "p1", role: "contractor" }, grant: { ...PENDING, expires_at: "2000-01-01" }, form: form(), allowed: false },
  { name: "contractor not agreeing", user: { id: "p1", role: "contractor" }, grant: PENDING, form: form({ agreed: undefined }), allowed: false },
  { name: "contractor with stale version", user: { id: "p1", role: "contractor" }, grant: PENDING, form: form({ version: "v0" }), allowed: false },
  { name: "contractor with blank name", user: { id: "p1", role: "contractor" }, grant: PENDING, form: form({ name: "   " }), allowed: false },
  { name: "contractor accepting", user: { id: "p1", role: "contractor" }, grant: PENDING, form: form(), allowed: true },
];

for (const sc of SCENARIOS) {
  test(`acceptNda: ${sc.name}`, async () => {
    const redirected = new Error("REDIRECT");
    const lookups = [];
    const writes = [];
    const actions = load("src/app/contractor/nda/actions.ts", (s) => {
      if (s === "@/lib/auth") return { getSessionUser: async () => sc.user };
      if (s === "@/lib/access-grants") return grants;
      if (s === "@/lib/access-grants-server") {
        return {
          getLiveGrant: async (profileId, area) => { lookups.push({ profileId, area }); return sc.grant; },
          recordNdaAcceptance: async (profileId, area, acceptance) => { writes.push({ profileId, area, acceptance }); },
        };
      }
      if (s === "next/headers") return { headers: async () => new Map([["x-forwarded-for", "203.0.113.9, 10.0.0.1"]]) };
      if (s === "next/navigation") return { redirect: (to) => { redirected.to = to; throw redirected; } };
      throw new Error(`Unexpected actions dependency ${s}`);
    });

    let result;
    let thrown;
    try { result = await actions.acceptNda(sc.form); } catch (e) { thrown = e; }

    if (!sc.allowed) {
      assert.equal(writes.length, 0, "recorded an acceptance it must refuse");
      if (!sc.user) assert.equal(thrown, redirected, "anonymous callers are sent to login");
      else assert.equal(result?.ok, false, "refusal must return an error");
      return;
    }
    assert.equal(thrown, redirected);
    assert.equal(redirected.to, grants.CONTRACTOR_HOME);
    assert.deepEqual(lookups, [{ profileId: "p1", area: "sap_pipeline" }], "grant must be the caller's own");
    assert.equal(writes.length, 1);
    assert.equal(writes[0].profileId, "p1", "must record against the caller's own profile");
    assert.equal(writes[0].area, "sap_pipeline");
    assert.equal(writes[0].acceptance.version, nda.CONTRACTOR_NDA_VERSION);
    assert.equal(writes[0].acceptance.name, "Linh Tran");
    assert.equal(writes[0].acceptance.ip, "203.0.113.9");
  });
}

test("recordNdaAcceptance scopes its update to the caller's live grant", () => {
  const src = readFileSync(new URL("src/lib/access-grants-server.ts", root), "utf8");
  const body = src.slice(src.indexOf("export async function recordNdaAcceptance"));
  const fn = body.slice(0, body.indexOf("\n}\n"));
  assert.match(fn, /\.eq\("user_profile_id", profileId\)/);
  assert.match(fn, /\.eq\("area", area\)/);
  assert.match(fn, /\.is\("revoked_at", null\)/);
});
