import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const ROOT = process.cwd();

async function source(relativePath: string): Promise<string> {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

test("deal people performs email-shaped alias search and canonical deduplication", async () => {
  const text = await source("src/lib/deal-people.ts");

  assert.match(text, /import ["']server-only["']/);
  assert.match(text, /createSubmissionPersonStore\(client\)\.findByEmail\(email\)/);
  assert.match(
    text,
    /normalizedTerm\.includes\("@"\)[\s\S]*?canonicalPersonForAlias\(client, normalizedTerm\)/,
  );
  assert.match(text, /const byId = new Map<string, DealPerson>\(\)/);
  assert.match(text, /Array\.from\(byId\.values\(\)\)\.slice\(0, boundedLimit\)/);
  assert.match(text, /\.select\(DEAL_PERSON_SELECT\)/);
  assert.match(text, /const personId = lookup\.data\?\.id/);
  assert.doesNotMatch(text, /\.from\("person_emails"\)[\s\S]*\.select\("[^\"]*email/);
});

test("new board contacts pass every typed identity field through the shared resolver", async () => {
  const text = await source("src/lib/deal-people.ts");

  for (const field of ["name", "first_name", "last_name", "phone", "city"]) {
    assert.match(text, new RegExp(`${field}:`));
  }
  assert.match(text, /resolveSubmissionPerson\(/);
  assert.match(text, /createSubmissionPersonStore\(client\)/);
  assert.match(text, /mode: "created"/);
  assert.match(text, /normalizedEmail\(input\.email\)/);
});

test("prospect and onboarding new-contact mode stops before company or deal writes", async () => {
  for (const relativePath of [
    "src/app/board/prospects/actions.ts",
    "src/app/board/onboarding/actions.ts",
  ]) {
    const text = await source(relativePath);
    const stop = text.indexOf('if (person.kind === "existing")');
    assert.notEqual(stop, -1, `${relativePath} must handle an existing person result`);
    assert.match(text, /formatExistingPersonError\(person\.person\)/);
    assert(stop < text.indexOf('if (s(fd.get("company_mode")) === "new")'));
    assert(stop < text.indexOf("insertDeal("));
  }
});

function exportedActionBodies(text: string, filename: string) {
  const file = ts.createSourceFile(
    filename,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  return file.statements
    .filter(
      (node): node is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(node) &&
        Boolean(
          node.modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
          ),
        ) &&
        Boolean(node.body),
    )
    .map((node) => ({ name: node.name?.text ?? "<anonymous>", body: node.body! }));
}

test("all exported prospect and onboarding actions retain the first board guard", async () => {
  for (const relativePath of [
    "src/app/board/prospects/actions.ts",
    "src/app/board/onboarding/actions.ts",
  ]) {
    const text = await source(relativePath);
    const actions = exportedActionBodies(text, relativePath);
    assert(actions.length >= 6, `${relativePath} action discovery is unexpectedly small`);
    for (const { name, body } of actions) {
      const first = body.statements[0]?.getText();
      assert.equal(first, "await requireBoardOrAbove();", `${name} lost its first board guard`);
    }
  }
});
