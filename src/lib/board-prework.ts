// Board pre-work worksheet (FY2027-2028): the questions, what may be saved,
// the deadline, and how answers are combined. Pure and dependency-free so the
// form, the server action, the combined view and the tests share one source.

import { CHAPTER_NAME } from "../kernel/config/chapter.ts";

export const PREWORK_CYCLE = "fy2027-28";
export const PREWORK_TITLE = "Board pre-work FY2027–2028";

// The form locks at the end of 24 November 2026 in the chapter's time zone (UTC+7).
export const PREWORK_DEADLINE = "2026-11-24T17:00:00.000Z";
export const PREWORK_DEADLINE_LABEL = "24 November 2026";

export const MAX_ANSWER_CHARS = 4000;

export type PreworkAnswers = Record<string, string>;

type Base = { id: string; number: string; title: string; hint: string };
export type PreworkQuestion =
  | (Base & { kind: "text" })
  | (Base & { kind: "list"; count: number })
  | (Base & { kind: "ranked"; count: number })
  | (Base & { kind: "labelled"; parts: { key: string; label: string }[] });

export type PreworkSection = { number: string; title: string; questions: PreworkQuestion[] };

export const PREWORK_SECTIONS: PreworkSection[] = [
  {
    number: "01",
    title: "The Board Member Standard",
    questions: [
      {
        id: "q1",
        number: "Q1",
        kind: "text",
        title: `Why should someone serve on the ${CHAPTER_NAME} Board?`,
        hint: "What is the true purpose of the role, and what responsibilities come with the privilege?",
      },
      {
        id: "q2",
        number: "Q2",
        kind: "list",
        count: 5,
        title: "What defines an excellent Board member?",
        hint: "List five specific qualities or behaviors every Board member should demonstrate.",
      },
      {
        id: "q3",
        number: "Q3",
        kind: "list",
        count: 3,
        title: "What are the three non-negotiable requirements to join the Board?",
        hint: "Consider eligibility, character, EO contribution, experience, and availability.",
      },
      {
        id: "q4",
        number: "Q4",
        kind: "text",
        title: "What measurable commitments should every Board member make?",
        hint: "Consider attendance, responsiveness, delivering portfolio goals, teamwork, event participation, and handover.",
      },
    ],
  },
  {
    number: "02",
    title: "The Presidential Leadership Standard",
    questions: [
      {
        id: "q5",
        number: "Q5",
        kind: "text",
        title: "What is the President’s most important responsibility?",
        hint: "Beyond chairing meetings and representing the chapter, what should the President personally be accountable for?",
      },
      {
        id: "q6",
        number: "Q6",
        kind: "ranked",
        count: 5,
        title: "What five criteria matter most in selecting the President?",
        hint: "Rank the criteria by importance; include a brief explanation for each.",
      },
      {
        id: "q7",
        number: "Q7",
        kind: "list",
        count: 3,
        title: "What would make someone unsuitable to serve as President?",
        hint: "Identify two or three red flags, even if the individual is successful or popular.",
      },
    ],
  },
  {
    number: "03",
    title: "Building the FY2027–2028 Board",
    questions: [
      {
        id: "q8",
        number: "Q8",
        kind: "text",
        title: `What kind of Board does ${CHAPTER_NAME} need?`,
        hint: "Think about complementary skills, leadership styles, EO experience, diversity of perspectives, and willingness to contribute.",
      },
      {
        id: "q9",
        number: "Q9",
        kind: "list",
        count: 3,
        title: "What would make the selection process fair and credible?",
        hint: "Name three principles that should guide nominations, assessment, succession, and Board composition.",
      },
    ],
  },
  {
    number: "04",
    title: "Personal Reflection",
    questions: [
      {
        id: "q10",
        number: "Q10",
        kind: "labelled",
        title: "Are we holding ourselves to the same standards?",
        hint: `Reflect honestly on your own service to ${CHAPTER_NAME}.`,
        parts: [
          { key: "proud", label: "One contribution I am proud of" },
          { key: "improve", label: "One area where I should improve" },
          { key: "commit", label: "One commitment I will make going forward" },
        ],
      },
    ],
  },
  {
    number: "",
    title: "Final Reflection",
    questions: [
      {
        id: "final",
        number: "",
        kind: "text",
        title: `The next President of ${CHAPTER_NAME} should be someone who…`,
        hint: "",
      },
    ],
  },
];

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

export const listKey = (id: string, n: number) => `${id}_${n}`;
export const rankedKeys = (id: string, n: number) => ({
  criterion: `${id}_${n}_criterion`,
  why: `${id}_${n}_why`,
});
export const partKey = (id: string, key: string) => `${id}_${key}`;

export function questionKeys(q: PreworkQuestion): string[] {
  switch (q.kind) {
    case "text":
      return [q.id];
    case "list":
      return range(q.count).map((n) => listKey(q.id, n));
    case "ranked":
      return range(q.count).flatMap((n) => Object.values(rankedKeys(q.id, n)));
    case "labelled":
      return q.parts.map((p) => partKey(q.id, p.key));
  }
}

const QUESTION_KEYS = PREWORK_SECTIONS.flatMap((s) => s.questions.flatMap(questionKeys));

// Keep only the worksheet's own fields, as trimmed text of a sane length.
// Anything else the browser sends is dropped.
export function sanitizeAnswers(input: unknown): PreworkAnswers {
  const out: PreworkAnswers = {};
  if (!input || typeof input !== "object") return out;
  const source = input as Record<string, unknown>;
  for (const key of QUESTION_KEYS) {
    const value = source[key];
    if (typeof value !== "string") continue;
    const text = value.trim().slice(0, MAX_ANSWER_CHARS);
    if (text) out[key] = text;
  }
  return out;
}

// True when at least one question has an answer.
export function hasAnyAnswer(answers: PreworkAnswers): boolean {
  return QUESTION_KEYS.some((key) => Boolean(answers[key]));
}

export function isPreworkOpen(now: Date = new Date()): boolean {
  return now.getTime() < new Date(PREWORK_DEADLINE).getTime();
}

// ---------------------------------------------------------------------------
// Combined view
// ---------------------------------------------------------------------------

export type CombinedEntry = { text: string; note?: string };
export type CombinedBlock = { label: string | null; entries: CombinedEntry[] };
export type CombinedQuestion = { question: PreworkQuestion; blocks: CombinedBlock[] };
export type CombinedSection = { number: string; title: string; questions: CombinedQuestion[] };

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th"];

// Everyone's answers under each question. It takes answers only, never names
// or roles, and mixes the order inside every block so one person's answers
// cannot be followed from question to question.
export function combineAnswers(
  responses: PreworkAnswers[],
  mix: <T>(items: T[]) => T[] = shuffled,
): CombinedSection[] {
  const collect = (keys: string[]): CombinedEntry[] =>
    mix(responses.flatMap((r) => keys.map((k) => r[k]).filter(Boolean).map((text) => ({ text }))));

  const blocksFor = (q: PreworkQuestion): CombinedBlock[] => {
    switch (q.kind) {
      case "text":
      case "list":
        return [{ label: null, entries: collect(questionKeys(q)) }];
      case "labelled":
        return q.parts.map((p) => ({ label: p.label, entries: collect([partKey(q.id, p.key)]) }));
      case "ranked":
        return range(q.count).map((n) => {
          const keys = rankedKeys(q.id, n);
          const entries = responses
            .filter((r) => r[keys.criterion])
            .map((r) => ({ text: r[keys.criterion], ...(r[keys.why] ? { note: r[keys.why] } : {}) }));
          return { label: `Ranked ${ORDINALS[n - 1] ?? `#${n}`}`, entries: mix(entries) };
        });
    }
  };

  return PREWORK_SECTIONS.map((s) => ({
    number: s.number,
    title: s.title,
    questions: s.questions.map((question) => ({ question, blocks: blocksFor(question) })),
  }));
}
