import { Fragment, type ReactNode } from "react";
import { ExternalLink } from "./ExternalLink";

// Plain text somebody wrote, with its links made clickable: a Markdown link
// "[Full summary](https://…)" shows its label, and a bare https:// address
// shows itself. Everything else stays text. Each href goes through
// ExternalLink, so only a real web address ever becomes a link.
const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

export function LinkedText({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const href = m[2] ?? m[3];
    out.push(
      <ExternalLink key={at} href={href} fallback={m[0]}>
        {m[1] ?? href}
      </ExternalLink>,
    );
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <Fragment>{out}</Fragment>;
}
