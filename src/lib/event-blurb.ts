// Lightweight formatting for event descriptions (events.blurb).
// Board members type plain text; three opt-in markers add emphasis:
//   "## Heading"   a line rendered as a subheading
//   "> Highlight"  a line rendered as a large accent callout
//   "**bold**"     inline bold anywhere
// Blurbs without markers render exactly as before (plain paragraphs).

export type BlurbSpan = { text: string; bold: boolean };

export type BlurbBlock =
  | { kind: "heading"; spans: BlurbSpan[] }
  | { kind: "highlight"; spans: BlurbSpan[] }
  | { kind: "text"; spans: BlurbSpan[] };

export function parseInline(line: string): BlurbSpan[] {
  const spans: BlurbSpan[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) spans.push({ text: line.slice(last, m.index), bold: false });
    spans.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) spans.push({ text: line.slice(last), bold: false });
  return spans;
}

// Consecutive plain lines stay together in one text block (newlines kept),
// so the page's pre-line paragraph spacing is unchanged.
export function parseBlurb(blurb: string): BlurbBlock[] {
  const blocks: BlurbBlock[] = [];
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.join("\n").replace(/^\n+|\n+$/g, "");
    if (text) blocks.push({ kind: "text", spans: parseInline(text) });
    buffer = [];
  };
  for (const raw of blurb.replace(/\r\n/g, "\n").split("\n")) {
    const heading = raw.match(/^##\s+(.+)$/);
    const highlight = raw.match(/^>\s+(.+)$/);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", spans: parseInline(heading[1].trim()) });
    } else if (highlight) {
      flush();
      blocks.push({ kind: "highlight", spans: parseInline(highlight[1].trim()) });
    } else {
      buffer.push(raw);
    }
  }
  flush();
  return blocks;
}

// Marker-free text for meta descriptions, JSON-LD, listing cards and emails.
export function plainBlurb(blurb: string | null | undefined): string | undefined {
  if (!blurb) return undefined;
  return blurb
    .replace(/\r\n/g, "\n")
    .replace(/^##\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1");
}
