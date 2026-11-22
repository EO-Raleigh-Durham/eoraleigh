import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// SAP pipeline actions are reachable by board+ and by contractors with an
// active sap_pipeline grant (docs/plans/10-contractor-access.html). Each
// action must authorize before privileged work, through the REAL guard chain:
// requireArea -> getLiveGrant -> areaAllows -> grantState, and
// requireBoardOrAbove -> requireAtLeast -> roleAtLeast for delete.

const root = new URL("../../", import.meta.url);
const EXPECTED = {
  createPartner: "edit",
  updatePartner: "edit",
  changeStatus: "edit",
  quickAction: "edit",
  deletePartner: "board",
};

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

const ACTIVE = {
  area: "sap_pipeline", can_edit: true, expires_at: "2999-12-31", revoked_at: null,
  nda_version: nda.CONTRACTOR_NDA_VERSION, nda_accepted_at: "2026-11-17T00:00:00Z",
};
const SCENARIOS = [
  { name: "anonymous", role: null, grant: null, edit: false, board: false },
  { name: "guest", role: "guest", grant: null, edit: false, board: false },
  { name: "member", role: "member", grant: null, edit: false, board: false },
  { name: "contractor without grant", role: "contractor", grant: null, edit: false, board: false },
  { name: "contractor with expired grant", role: "contractor", grant: { ...ACTIVE, expires_at: "2000-01-01" }, edit: false, board: false },
  { name: "contractor without NDA", role: "contractor", grant: { ...ACTIVE, nda_accepted_at: null }, edit: false, board: false },
  { name: "contractor with view-only grant", role: "contractor", grant: { ...ACTIVE, can_edit: false }, edit: false, board: false },
  { name: "contractor with active grant", role: "contractor", grant: ACTIVE, edit: true, board: false },
  { name: "board", role: "board", grant: null, edit: true, board: true },
  { name: "super_admin", role: "super_admin", grant: null, edit: true, board: true },
];

for (const sc of SCENARIOS) {
  test(`sap actions: ${sc.name} crosses the real guard before action work`, async () => {
    const denied = new Error("AUTH_REDIRECT");
    const workReached = new Error("PRIVILEGED_WORK_REACHED");
    let guardCalls = 0;
    let privilegedCalls = 0;
    const work = () => { privilegedCalls++; throw workReached; };
    const session = async () => (sc.role ? { id: "profile-1", role: sc.role, active: true } : null);

    const auth = load("src/lib/auth.ts", (s) => {
      if (s === "./access") return access;
      if (s === "react") return { cache: (fn) => fn };
      if (s === "next/navigation") return { redirect: () => { throw denied; } };
      return {};
    });
    auth.getSessionUser = session;

    // Grant lookup: a stub of the supabase query chain returning this scenario's grant.
    const chain = { select: () => chain, eq: () => chain, is: () => chain, maybeSingle: async () => ({ data: sc.grant, error: null }) };
    const server = load("src/lib/access-grants-server.ts", (s) => {
      if (s === "next/navigation") return { redirect: () => { throw denied; } };
      if (s === "./supabase") return { supabase: { from: (t) => { assert.equal(t, "access_grants"); return chain; } } };
      if (s === "./auth") return { getSessionUser: session };
      if (s === "./access-grants") return grants;
      throw new Error(`Unexpected access-grants-server dependency ${s}`);
    });

    const actions = load("src/app/board/strategic-alliance-partners/actions.ts", (s) => {
      if (s === "@/lib/auth") return { requireBoardOrAbove: async () => { guardCalls++; return auth.requireBoardOrAbove(); } };
      if (s === "@/lib/access-grants-server") return { requireArea: async (...a) => { guardCalls++; return server.requireArea(...a); } };
      if (s === "@/lib/supabase") return { supabase: { from: work } };
      if (s === "next/cache") return { revalidatePath: work };
      if (s === "next/navigation") return { redirect: work };
      return new Proxy({}, { get: () => work });
    });

    assert.deepEqual(Object.keys(actions).sort(), Object.keys(EXPECTED).sort(), "SAP action list changed: update this guardrail");
    for (const [name, action] of Object.entries(actions)) {
      guardCalls = 0;
      privilegedCalls = 0;
      let thrown;
      try { await action(); } catch (error) { thrown = error; }
      assert.equal(guardCalls, 1, `${name} must await exactly one guard`);
      const allowed = EXPECTED[name] === "board" ? sc.board : sc.edit;
      if (allowed) {
        assert.notEqual(thrown, denied, `${name} rejected an authorized ${sc.name}`);
      } else {
        assert.equal(thrown, denied, `${name} must reject ${sc.name}`);
        assert.equal(privilegedCalls, 0, `${name} reached privileged work for ${sc.name}`);
      }
    }
  });
}

// updatePartner takes the company ID from the browser. It must only ever edit
// the company that belongs to the deal being saved.
test("sap actions: updatePartner refuses a company that is not the deal's own", async () => {
  const updated = [];
  const dealChain = { select: () => dealChain, eq: () => dealChain, maybeSingle: async () => ({ data: { company_id: "company-of-deal" }, error: null }) };
  const actions = load("src/app/board/strategic-alliance-partners/actions.ts", (s) => {
    if (s === "@/lib/access-grants-server") return { requireArea: async () => ({ id: "profile-1", role: "contractor" }) };
    if (s === "@/lib/supabase") return { supabase: { from: (t) => { assert.equal(t, "sap_deals"); return dealChain; } } };
    if (s === "@/lib/sap") return { SAP_PIPELINE_STAGES: [], SAP_DEAL_TYPE_AMOUNT: {}, updateCompany: async (id) => { updated.push(id); }, updateSapDeal: async () => {} };
    if (s === "next/cache") return { revalidatePath: () => {} };
    return {};
  });
  const form = new FormData();
  form.set("name", "Acme");
  form.set("status", "lead");

  const refused = await actions.updatePartner("deal-1", "someone-elses-company", form);
  assert.equal(refused.ok, false);
  assert.deepEqual(updated, [], "a mismatched company was written");

  const saved = await actions.updatePartner("deal-1", "company-of-deal", form);
  assert.equal(saved.ok, true);
  assert.deepEqual(updated, ["company-of-deal"]);
});
