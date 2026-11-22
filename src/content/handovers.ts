// Handover notes from the outgoing board, shown on /board/handover. Add one
// entry per role at the end of each term.
export type Handover = {
  role: string;
  person: string;
  term: string;
  href: string;
  lede: string;
  highlights: string[];
  accent: "blue" | "pink" | "orange";
};

export const HANDOVERS: Handover[] = [];
