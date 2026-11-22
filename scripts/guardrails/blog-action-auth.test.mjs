import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Blog server actions write to blog_posts through the secret client, which
// bypasses RLS. The /board layout guard only protects page rendering, so each
// action has to authorize itself. Mirrors event-action-auth.test.mjs.

const actionPath = new URL("../../src/app/board/blogs/actions.ts", import.meta.url);

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

async function parseActions() {
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

test("every blog action authorizes before privileged work", async () => {
  const { actions } = await parseActions();

  assert(actions.length >= 3, "could not locate exported blog actions");
  for (const { name, body } of actions) {
    assert(
      isBoardGuard(body.statements[0]),
      `${name} must begin with await requireBoardOrAbove()`,
    );
  }
});

test("the three known write actions are covered", async () => {
  const { actions } = await parseActions();
  const names = actions.map((action) => action.name);
  for (const required of ["createBlogPost", "updateBlogPost", "deleteBlogPost"]) {
    assert(names.includes(required), `${required} was not found, has it been renamed?`);
  }
});
