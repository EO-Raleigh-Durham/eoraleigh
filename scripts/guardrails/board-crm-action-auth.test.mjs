import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Protected board action modules use the secret Supabase client directly or
// through data helpers, which bypasses RLS. The /board layout guard only protects
// page rendering, so each exported action must authorize itself first.

const EXPECTED_ACTIONS = {
  prospects: ["changeStage", "quickAction", "createDeal", "updateDeal", "deleteDeal", "findPeople", "findCompanies"],
  onboarding: ["changeStage", "createDeal", "updateDeal", "deleteDeal", "findPeople", "findCompanies"],
  "historical-metrics": ["updateCell", "addYear", "deleteYear"],
  // marketing: now the ported edge8 Marketing System, checked by edge8-action-auth.test.mjs.
  members: ["loadMemberActivity", "setMemberForum", "updateMemberProfile"],
  // strategic-alliance-partners: grant-based, checked by sap-area-action-auth.test.mjs.
  surveys: ["createSurvey", "updateSurveyMeta", "setSurveyStatus", "deleteSurvey", "createSurveyField", "updateSurveyField", "deleteSurveyField", "moveSurveyField"],
  "the-pulse-of-the-chapter": ["updateChapterGoal"],
  inquiries: ["markInboxRead"],
};

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
  if (!statement) return false;
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

async function parseActions(actionPath) {
  const source = await readFile(actionPath, "utf8");
  const file = ts.createSourceFile(
    "actions.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  return { file, actions: exportedActions(file) };
}

for (const label of Object.keys(EXPECTED_ACTIONS)) {
  const actionPath = new URL(`../../src/app/board/${label}/actions.ts`, import.meta.url);
  test(`${label} actions authorize before privileged work`, async () => {
    const { actions } = await parseActions(actionPath);
    assert(
      actions.length >= EXPECTED_ACTIONS[label].length,
      `expected ${EXPECTED_ACTIONS[label].length} exported ${label} actions to be discovered`,
    );

    const names = actions.map((action) => action.name);
    for (const expected of EXPECTED_ACTIONS[label]) {
      assert(names.includes(expected), `${expected} was not found, has it been renamed?`);
    }
    for (const { name, body } of actions) {
      assert(
        isBoardGuard(body.statements[0]),
        `${name} must begin with await requireBoardOrAbove()`,
      );
    }
  });
}

test("exported action discovery includes arrow functions", () => {
  const file = ts.createSourceFile(
    "fixture.ts",
    "export const archiveDeal = async () => { await mutate(); };",
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  assert.deepEqual(exportedActions(file).map((action) => action.name), ["archiveDeal"]);
});
