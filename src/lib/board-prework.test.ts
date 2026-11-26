import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ANSWER_CHARS,
  PREWORK_DEADLINE,
  PREWORK_DEADLINE_LABEL,
  PREWORK_SECTIONS,
  combineAnswers,
  hasAnyAnswer,
  isPreworkOpen,
  questionKeys,
  sanitizeAnswers,
} from "./board-prework.ts";

const inOrder = <T>(items: T[]) => items;

test("the worksheet has ten questions plus the final reflection, with unique fields", () => {
  const questions = PREWORK_SECTIONS.flatMap((s) => s.questions);
  assert.equal(questions.length, 11);
  const keys = questions.flatMap(questionKeys);
  assert.equal(new Set(keys).size, keys.length);
  // 4 text + final, 5+3+3+3 list items, 5 ranked rows of two, 3 reflections
  assert.equal(keys.length, 5 + 14 + 10 + 3);
});

test("only the worksheet's own text fields are saved", () => {
  const saved = sanitizeAnswers({
    role: "Membership Chair",
    q1: " To serve ",
    q2_1: "Shows up",
    q2_6: "a sixth item that does not exist",
    q6_1_criterion: "Integrity",
    q6_1_why: "Trust",
    q10_proud: "",
    q4: 42,
    q5: { nested: "object" },
    submitted_at: "2020-01-01",
  });
  assert.deepEqual(saved, {
    q1: "To serve",
    q2_1: "Shows up",
    q6_1_criterion: "Integrity",
    q6_1_why: "Trust",
  });
  assert.deepEqual(sanitizeAnswers(null), {});
  assert.deepEqual(sanitizeAnswers("q1"), {});
  assert.equal(sanitizeAnswers({ q1: "x".repeat(MAX_ANSWER_CHARS + 50) }).q1.length, MAX_ANSWER_CHARS);
});

test("only worksheet questions count as an answer", () => {
  assert.equal(hasAnyAnswer({ role: "President" }), false);
  assert.equal(hasAnyAnswer({ final: "listens" }), true);
});

test("the form is open until 9 PM on 25 November 2026 at UTC+7", () => {
  assert.equal(isPreworkOpen(new Date("2026-11-25T20:59:59+07:00")), true);
  assert.equal(isPreworkOpen(new Date("2026-11-25T21:00:00+07:00")), false);
  const lastMoment = new Date(new Date(PREWORK_DEADLINE).getTime() - 1);
  const label = lastMoment.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Etc/GMT-7", // UTC+7
  });
  assert.equal(`9 PM on ${label}`, PREWORK_DEADLINE_LABEL);
});

test("the combined view groups answers by question", () => {
  const a = { q1: "A-one", q2_1: "A-quality-1", q2_2: "A-quality-2", q6_1_criterion: "A-first", q6_1_why: "A-why", q10_improve: "A-improve" };
  const b = { q1: "B-one", q2_1: "B-quality-1", q6_1_criterion: "B-first", q6_2_criterion: "B-second" };
  const combined = combineAnswers([a, b], inOrder);
  const find = (id: string) => combined.flatMap((s) => s.questions).find((q) => q.question.id === id)!;

  assert.deepEqual(find("q1").blocks, [{ label: null, entries: [{ text: "A-one" }, { text: "B-one" }] }]);
  assert.deepEqual(
    find("q2").blocks[0].entries.map((e) => e.text),
    ["A-quality-1", "A-quality-2", "B-quality-1"],
  );
  const ranked = find("q6").blocks;
  assert.equal(ranked.length, 5);
  assert.equal(ranked[0].label, "Ranked 1st");
  assert.deepEqual(ranked[0].entries, [{ text: "A-first", note: "A-why" }, { text: "B-first" }]);
  assert.deepEqual(ranked[1].entries, [{ text: "B-second" }]);
  const reflection = find("q10").blocks;
  assert.deepEqual(reflection.map((b) => b.label), [
    "One contribution I am proud of",
    "One area where I should improve",
    "One commitment I will make going forward",
  ]);
  assert.deepEqual(reflection[1].entries, [{ text: "A-improve" }]);
  assert.deepEqual(find("q8").blocks, [{ label: null, entries: [] }]);
});

test("the combined view carries only worksheet answers and mixes the order", () => {
  const responses = [
    { role: "SECRET-ROLE-A", q1: "one" },
    { role: "SECRET-ROLE-B", q1: "two" },
    { role: "SECRET-ROLE-C", q1: "three" },
  ];
  const reversed = <T>(items: T[]) => [...items].reverse();
  const combined = combineAnswers(responses, reversed);
  assert.equal(JSON.stringify(combined).includes("SECRET-ROLE"), false);
  assert.deepEqual(
    combined[0].questions[0].blocks[0].entries.map((e) => e.text),
    ["three", "two", "one"],
  );
  // The default mix keeps every answer.
  const mixed = combineAnswers(responses)[0].questions[0].blocks[0].entries.map((e) => e.text);
  assert.deepEqual([...mixed].sort(), ["one", "three", "two"]);
});
