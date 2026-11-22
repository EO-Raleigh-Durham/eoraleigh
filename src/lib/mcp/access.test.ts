import assert from "node:assert/strict";
import test from "node:test";
import { handed, levelOf, portfolioFilterOf, reachOf } from "./access.ts";

const read = (area: string) => ({ area: area as never, readOnly: true });
const write = (area: string) => ({ area: area as never, readOnly: false });

test("only super admin, board and contractor get the connector", () => {
  assert.equal(levelOf("super_admin"), "super_admin");
  assert.equal(levelOf("board"), "board");
  assert.equal(levelOf("contractor"), "contractor");
  assert.equal(levelOf("member"), null);
  assert.equal(levelOf("guest"), null);
  assert.equal(levelOf(null), null);
  assert.equal(reachOf("member", ["President"], []), null);
});

test("super admin reads and writes everything", () => {
  const r = reachOf("super_admin", [], [])!;
  for (const a of ["sap", "membership", "events", "surveys", "comms", "forum", "goals", "chapter", "workboards"]) {
    assert.ok(handed(r, read(a)), a);
    assert.ok(handed(r, write(a)), a);
  }
});

test("board reads everything, writes only its portfolio plus board-wide areas", () => {
  const sap = reachOf("board", ["Strategic Alliance Partner"], [])!;
  assert.ok(handed(sap, read("membership")));
  assert.ok(handed(sap, write("sap")));
  assert.ok(handed(sap, write("workboards")));
  assert.ok(!handed(sap, write("membership")));
  assert.ok(!handed(sap, write("comms")));
  const finance = reachOf("board", ["Finance"], [])!;
  assert.ok(handed(finance, read("sap")));
  assert.ok(!handed(finance, write("sap")));
  const engagement = reachOf("board", ["Member Engagement"], [])!;
  assert.ok(handed(engagement, write("surveys")) && handed(engagement, write("events")));
  assert.ok(!handed(engagement, write("comms")));
  const president = reachOf("board", ["President"], [])!;
  for (const a of ["sap", "membership", "events", "surveys", "comms", "forum", "goals"]) assert.ok(handed(president, write(a)), a);
  assert.ok(!handed(president, write("chapter")), "chapter-wide data has no write tools for the board");
});

test("contractor gets only an active grant's area; edit grants write", () => {
  const edit = reachOf("contractor", ["President"], [{ area: "sap_pipeline", canEdit: true, active: true }])!;
  assert.ok(handed(edit, read("sap")) && handed(edit, write("sap")));
  assert.ok(!handed(edit, read("membership")));
  assert.ok(!handed(edit, write("goals")), "a board role name never widens a contractor");
  const view = reachOf("contractor", [], [{ area: "sap_pipeline", canEdit: false, active: true }])!;
  assert.ok(handed(view, read("sap")) && !handed(view, write("sap")));
  const ended = reachOf("contractor", [], [{ area: "sap_pipeline", canEdit: true, active: false }])!;
  assert.ok(!handed(ended, read("sap")));
  assert.ok(handed(ended, read("me")), "whoami still answers");
});

test("the portfolio filter only narrows, and an unknown value hands nothing", () => {
  const r = reachOf("super_admin", [], [])!;
  assert.equal(portfolioFilterOf(null), null);
  assert.equal(portfolioFilterOf("sap"), "sap");
  assert.equal(portfolioFilterOf("everything"), "none");
  assert.ok(handed(r, read("sap"), "sap"));
  assert.ok(!handed(r, read("membership"), "sap"));
  assert.ok(handed(r, read("me"), "sap"), "whoami is in every group");
  assert.ok(!handed(r, read("me"), "none"));
  const finance = reachOf("board", ["Finance"], [])!;
  assert.ok(!handed(finance, write("sap"), "sap"), "a filter never adds a write");
});

test("board and super admin read the whole database; contractors never do", () => {
  assert.ok(handed(reachOf("board", ["Finance"], [])!, read("data")));
  assert.ok(handed(reachOf("super_admin", [], [])!, read("data")));
  const contractor = reachOf("contractor", [], [{ area: "sap_pipeline", canEdit: true, active: true }])!;
  assert.ok(!handed(contractor, read("data")));
});

test("everyone the connector serves writes their own records", () => {
  for (const r of [
    reachOf("board", [], [])!,
    reachOf("super_admin", [], [])!,
    reachOf("contractor", [], [])!,
  ]) {
    assert.ok(handed(r, read("me")) && handed(r, write("me")));
  }
});
