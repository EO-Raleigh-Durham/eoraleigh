import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const SOURCE_ROOT = path.resolve("src");
const APPROVED_PERSON_CREATORS = new Set([
  "src/lib/submission-person-supabase-store.ts",
]);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name) || entry.name.endsWith(".test.ts")) {
      return [];
    }
    return [absolute];
  }));
  return nested.flat();
}

function stringArgument(call) {
  const argument = call.arguments[0];
  return argument && ts.isStringLiteral(argument) ? argument.text : null;
}

function directPeopleMutation(call) {
  if (!ts.isPropertyAccessExpression(call.expression)) return null;
  const operation = call.expression.name.text;
  if (!['insert', 'upsert', 'update'].includes(operation)) return null;

  const receiver = call.expression.expression;
  if (!ts.isCallExpression(receiver) || !ts.isPropertyAccessExpression(receiver.expression)) {
    return null;
  }
  if (receiver.expression.name.text !== "from" || stringArgument(receiver) !== "people") {
    return null;
  }
  return operation;
}

function completeChain(call) {
  let current = call;
  while (
    ts.isPropertyAccessExpression(current.parent) &&
    current.parent.expression === current &&
    ts.isCallExpression(current.parent.parent) &&
    current.parent.parent.expression === current.parent
  ) {
    current = current.parent.parent;
  }
  return current;
}

function identityMutationViolations(source, filename) {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations = [];

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const operation = directPeopleMutation(node);
      if (operation === "insert" || operation === "upsert") {
        if (!APPROVED_PERSON_CREATORS.has(filename)) {
          violations.push(`${filename}: direct people.${operation} must use the identity adapter`);
        }
      } else if (operation === "update") {
        const chain = completeChain(node).getText(file);
        if (!/\.eq\(\s*["']id["']\s*,/.test(chain)) {
          violations.push(`${filename}: people.update must be scoped by canonical id`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(file);
  return violations;
}

test("runtime person creation stays behind the alias-aware adapter", async () => {
  const files = await sourceFiles(SOURCE_ROOT);
  const violations = [];

  for (const absolute of files) {
    const relative = path.relative(process.cwd(), absolute).split(path.sep).join("/");
    violations.push(
      ...identityMutationViolations(await readFile(absolute, "utf8"), relative),
    );
  }

  assert.deepEqual(violations, []);
});

test("a new direct person insert or upsert fails the guardrail", () => {
  assert.equal(
    identityMutationViolations(
      'await client.from("people").insert({ email });',
      "src/lib/new-writer.ts",
    ).length,
    1,
  );
  assert.equal(
    identityMutationViolations(
      'await client.from("people").upsert({ email });',
      "src/lib/new-writer.ts",
    ).length,
    1,
  );
});

test("profile updates remain id-scoped and cannot switch to email matching", () => {
  assert.deepEqual(
    identityMutationViolations(
      'await client.from("people").update({ city }).eq("id", personId);',
      "src/app/profile/actions.ts",
    ),
    [],
  );
  assert.equal(
    identityMutationViolations(
      'await client.from("people").update({ city }).eq("email", email);',
      "src/app/profile/actions.ts",
    ).length,
    1,
  );
});
