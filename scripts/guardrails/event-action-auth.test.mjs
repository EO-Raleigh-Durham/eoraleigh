import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const actionPath = new URL("../../src/app/board/events/actions.ts", import.meta.url);
const PUBLIC_ACTIONS = new Set([
  "previewEventVoucher",
  "publicRsvp",
  // MyEO Family Day (PR #350 commit 2): same intentionally-public RSVP flow
  // as publicRsvp, just a bespoke shape. See AGENTS.md: "Do not add
  // authentication mechanically to intentionally public RSVP ... flows."
  "registerMyeoFamilyDay",
]);

function hasExportModifier(node) {
  return node.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  );
}

function exportedActions(file) {
  const actions = [];
  for (const node of file.statements) {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.body &&
      hasExportModifier(node)
    ) {
      actions.push({ name: node.name.getText(file), body: node.body });
      continue;
    }
    if (!ts.isVariableStatement(node) || !hasExportModifier(node)) continue;
    for (const declaration of node.declarationList.declarations) {
      const initializer = declaration.initializer;
      if (
        initializer &&
        (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) &&
        ts.isBlock(initializer.body)
      ) {
        actions.push({ name: declaration.name.getText(file), body: initializer.body });
      }
    }
  }
  return actions;
}

function isBoardGuard(statement) {
  let expression = null;
  if (ts.isExpressionStatement(statement)) {
    expression = statement.expression;
  } else if (ts.isVariableStatement(statement)) {
    const declarations = statement.declarationList.declarations;
    if (declarations.length === 1) expression = declarations[0].initializer ?? null;
  }
  if (!expression || !ts.isAwaitExpression(expression)) return false;
  const call = expression.expression;
  return (
    ts.isCallExpression(call) &&
    ts.isIdentifier(call.expression) &&
    call.expression.text === "requireBoardOrAbove"
  );
}

test("every private board event action authorizes before privileged work", async () => {
  const source = await readFile(actionPath, "utf8");
  const file = ts.createSourceFile(
    "actions.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const exported = exportedActions(file);

  assert(exported.length > PUBLIC_ACTIONS.size, "could not locate exported event actions");
  for (const action of exported) {
    const { name, body } = action;
    const hasGuard = body.statements.some(isBoardGuard);
    if (PUBLIC_ACTIONS.has(name)) {
      assert.equal(hasGuard, false, `${name} must remain callable from the public event flow`);
      continue;
    }

    assert(
      isBoardGuard(body.statements[0]),
      `${name} must begin with await requireBoardOrAbove()`,
    );
  }
});

test("exported action discovery includes arrow functions", () => {
  const file = ts.createSourceFile(
    "fixture.ts",
    "export const archiveEvent = async () => { await mutate(); };",
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  assert.deepEqual(exportedActions(file).map((action) => action.name), ["archiveEvent"]);
});

test("door check-in identification is read-only and attendance writes are event-scoped", async () => {
  const source = await readFile(actionPath, "utf8");
  const file = ts.createSourceFile(
    "actions.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const actions = new Map(
    exportedActions(file).map((action) => [action.name, action.body.getText(file)]),
  );
  const resolve = actions.get("resolveCheckInByCode");
  const confirm = actions.get("confirmDoorCheckIn");
  const undo = actions.get("setRsvpAttendance");

  assert(resolve, "resolveCheckInByCode was not found");
  assert(confirm, "confirmDoorCheckIn was not found");
  assert(undo, "setRsvpAttendance was not found");
  assert.equal(resolve.includes(".update("), false, "ticket resolution must not mutate");
  assert.match(confirm, /\.eq\("event_id", eventId\)/);
  assert.match(confirm, /\.eq\("status", "registered"\)/);
  assert.match(confirm, /waiver_accepted_at: found\.row\.waiver_accepted_at \?\? now/);
  assert.match(undo, /\.eq\("event_id", eventId\)/);
  assert.match(undo, /checked_in_at: null/);
  assert.equal(undo.includes("waiver_accepted_at"), false, "undo must preserve policy acceptance");
});

test("global cohort actions stay isolated from registration operations and use audited soft removal", async () => {
  const source = await readFile(actionPath, "utf8");
  const file = ts.createSourceFile(
    "actions.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const actions = new Map(
    exportedActions(file).map((action) => [action.name, action.body.getText(file)]),
  );

  const add = actions.get("addGlobalEventParticipants");
  const update = actions.get("updateGlobalEventParticipant");
  const remove = actions.get("removeGlobalEventParticipant");
  assert(add, "addGlobalEventParticipants was not found");
  assert(update, "updateGlobalEventParticipant was not found");
  assert(remove, "removeGlobalEventParticipant was not found");

  for (const [name, body] of [["add", add], ["update", update], ["remove", remove]]) {
    assert.match(body, /global_event_participation/, `${name} must use the dedicated cohort table`);
    assert.equal(body.includes("event_registrations"), false, `${name} must not use registrations`);
    assert.equal(body.includes("sendTicketEmail"), false, `${name} must not send ticket email`);
    assert.equal(body.includes('revalidatePath("/events/'), false, `${name} must stay private`);
  }
  assert.match(remove, /\.update\(/, "removal must retain an audited row");
  assert.match(remove, /removed_by_profile_id: actor\.id/);
  assert.equal(remove.includes(".delete("), false, "normal cohort removal must never delete rows");
  assert.match(add, /canAssignGlobalParticipationStatus/);
  assert.match(update, /canAssignGlobalParticipationStatus/);
  assert.match(source, /\.in\("status", \["active", "on_leave"\]\)/);
  assert.match(
    source,
    /\.in\("membership_type", \["Primary Membership", "Secondary Membership"\]\)/,
  );
  assert.match(source, /revalidatePath\("\/board\/member-engagement-review"\)/);
  assert.match(source, /revalidatePath\("\/board\/the-pulse-of-the-chapter"\)/);
  assert.equal(
    source.includes("loadGlobalParticipationCounts"),
    false,
    "successful mutations must not replace a failed count read with authoritative zero counts",
  );
  for (const [name, body] of [["add", add], ["update", update], ["remove", remove]]) {
    assert.equal(
      body.includes("counts:"),
      false,
      `${name} must let the refreshed page load authoritative cohort counts`,
    );
  }
});

test("global event boundaries reject stale or direct registration actions", async () => {
  const source = await readFile(actionPath, "utf8");
  const file = ts.createSourceFile(
    "actions.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const actions = new Map(
    exportedActions(file).map((action) => [action.name, action.body.getText(file)]),
  );
  const create = actions.get("createRsvp");
  const publicAction = actions.get("publicRsvp");
  const updateEvent = actions.get("updateEvent");

  assert(create, "createRsvp was not found");
  assert(publicAction, "publicRsvp was not found");
  assert(updateEvent, "updateEvent was not found");

  const createScopeGuard = create.indexOf('rsvpEvent.scope === "global"');
  assert(createScopeGuard >= 0, "createRsvp must reject global events");
  assert(
    createScopeGuard < create.indexOf('formData.get("email")'),
    "createRsvp must reject global scope before reading registration fields",
  );
  assert(
    createScopeGuard < create.indexOf("resolveSubmissionPersonWithSupabase"),
    "createRsvp must reject global scope before creating or resolving a person",
  );

  const publicScopeGuard = publicAction.indexOf('event.scope === "global"');
  assert(publicScopeGuard >= 0, "publicRsvp must reject global events");
  for (const sideEffect of [
    "event_ticket_types",
    "resolveSubmissionPersonWithSupabase",
    'rpc("register_for_event"',
  ]) {
    assert(
      publicScopeGuard < publicAction.indexOf(sideEffect),
      `publicRsvp must reject global scope before ${sideEffect}`,
    );
  }

  const dependencyCheck = updateEvent.indexOf('from("event_registrations")');
  const eventUpdate = updateEvent.indexOf('from("events")\n    .update(patch)');
  assert(dependencyCheck >= 0 && dependencyCheck < eventUpdate);
  assert.match(updateEvent, /globalEventMetadataPatch\(built\.patch\)/);
  assert.match(updateEvent, /currentEvent\.scope === "global" \|\| targetIsGlobal/);
});
