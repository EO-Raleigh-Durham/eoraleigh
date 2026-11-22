import { remark } from "remark";
import remarkHtml from "remark-html";
import { parseSections, parseSubsections, parseThemes } from "@/entities/org/lib/company/strategy";

// Chapter app only (no edge8-web counterpart). How the chapter strategy reads. The strategy row's body_md is `##`
// sections. This designs the ones the chapter writes: Overview (the headline),
// the "We are / We have / We are known for / We are not" statements, Themes,
// and any section of `###` pillars with numbered commitments. Anything else
// stays prose, so a board edit never vanishes from the page.

export type Commitment = { label: string | null; text: string };
export type Pillar = { title: string; items: Commitment[] };

export type ChapterStrategy = {
  overview: string | null;
  statements: { label: string; body: string }[];
  // The "We are not" statement, split into the things the chapter is not.
  notList: { label: string; items: string[]; body: string } | null;
  themes: { year: number; title: string }[];
  pillarsHeading: string | null;
  pillars: Pillar[];
  extras: { heading: string; html: string }[];
};

// "Succession: every key role..." reads as a short label and its sentence. A
// colon further in than a few words is part of the sentence, not a label.
export function splitCommitment(line: string): Commitment {
  const m = line.match(/^([^:]{2,40}):\s+(.+)$/);
  if (!m) return { label: null, text: line.trim() };
  // Under its own label the sentence starts the line, so it takes a capital.
  const text = m[2].trim();
  return { label: m[1].trim(), text: text.charAt(0).toUpperCase() + text.slice(1) };
}

function listItems(body: string): string[] {
  return [...body.matchAll(/^\s*(?:\d+[.)]|[-*])\s+(.+)$/gm)].map((m) => m[1].trim());
}

// "We are not a networking group, a status symbol, or an executive
// organization." becomes the three things it names.
export function splitNot(body: string): string[] {
  const rest = body.replace(/^we are not\s+/i, "").replace(/\.\s*$/, "");
  return rest
    .split(/,\s*(?:or\s+|and\s+)?|\s+or\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function parseChapterStrategy(md: string): Promise<ChapterStrategy> {
  const sections = parseSections(md);
  const out: ChapterStrategy = {
    overview: null,
    statements: [],
    notList: null,
    themes: [],
    pillarsHeading: null,
    pillars: [],
    extras: [],
  };
  for (const s of sections) {
    const key = s.heading.toLowerCase();
    if (key === "overview") {
      out.overview = s.body || null;
    } else if (key === "themes") {
      out.themes = parseThemes(s.body);
    } else if (key === "we are not") {
      const items = splitNot(s.body);
      out.notList = { label: s.heading, items: items.length > 1 ? items : [], body: s.body };
    } else if (/^we\s/.test(key)) {
      out.statements.push({ label: s.heading, body: s.body });
    } else if (!out.pillars.length && /^###\s/m.test(s.body)) {
      out.pillarsHeading = s.heading;
      out.pillars = parseSubsections(s.body).map((p) => ({ title: p.heading, items: listItems(p.body).map(splitCommitment) }));
    } else {
      out.extras.push({
        heading: s.heading,
        html: String(await remark().use(remarkHtml, { sanitize: true }).process(s.body)),
      });
    }
  }
  return out;
}
